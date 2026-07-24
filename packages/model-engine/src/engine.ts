/**
 * Main calculation engine entry point.
 *
 * Pipeline (PRD §6.5):
 * 1. Validate schema
 * 2. Resolve hierarchy configurations
 * 3. Build power/heat-flow relationships
 * 4. Solve peak state (sizing, CAPEX, area)
 * 5. Solve annual-average state (OPEX, water, carbon)
 * 6. Aggregate breakdowns
 * 7. Finance, depreciation, NPV, break-even
 * 8. Return results + trace + warnings
 *
 * No network, database, clock, or UI dependencies. Pure function.
 */

import type {
  ScenarioInput, CalculationResult, ResourceMetrics,
  ResourceBreakdown, FinancialMetrics, FinancialBreakdown,
  CalcWarning, CapacityMargin,
} from '@ocp-tco/model-schema'
import { computeEconomization } from './weather'
import { computeCapex, computeOpex, computeFinancials } from './finance'
import { hashInput } from './hash'

// ─── Library resolver types (injected at call site from seed data) ─────────────
export interface LibraryContext {
  getWeatherProfile: (zoneId: string) => { hourlyDryBulbCelsius: number[]; referenceCity: string } | null
  getDataroomConfig: (id: string) => DataroomConfigResolved | null
  getPowerConfig: (id: string) => PowerConfigResolved | null
  getCoolingConfig: (id: string) => CoolingConfigResolved | null
}

export interface DataroomConfigResolved {
  id: string
  name: string
  loadKw: number
  fixedAreaM2: number
  proportionalAreaM2PerKw?: number
  fixedCost: number
  proportionalCostPerKw?: number
  proportionalLoss: number       // fraction
  heatToLtHruFraction: number    // fraction
  iteLoadEfficiencyL2: number
  iteLoadEfficiencyL3: number
  iteLoadEfficiencyL4: number
}

export interface PowerConfigResolved {
  id: string
  name: string
  proportionalLoss: number       // weighted average loss fraction of critical power path
  proportionalAreaM2PerKw: number
  proportionalCostPerKw: number
  hasChiller: boolean
  chillerCop: number
}

export interface CoolingConfigResolved {
  id: string
  name: string
  tcwsCelsius: number
  tappCelsius: number
  pumpCopInverse: number        // pump power / cooling duty
  compressorCop: number         // heat removed / compressor power
  freeCoolerCopInverse: number  // fan power / cooling duty when in free-cooling
  proportionalAreaM2PerKw: number
  proportionalCostPerKw: number
}

export async function runScenario(
  input: ScenarioInput,
  lib: LibraryContext
): Promise<CalculationResult> {
  const startMs = Date.now()
  const warnings: CalcWarning[] = []
  const inputHash = await hashInput(input)

  // ─── 1. Resolve weather ───────────────────────────────────────────────────
  const weatherProfile = lib.getWeatherProfile(input.facilities.climateZoneId)
  if (!weatherProfile) {
    throw new Error(`Weather profile not found for zone ${input.facilities.climateZoneId}`)
  }

  // ─── 2. Resolve cooling config for economization ──────────────────────────
  const coolingCfg = lib.getCoolingConfig(input.facilities.liquidCoolingConfigId)
  if (!coolingCfg) {
    throw new Error(`Cooling configuration not found: ${input.facilities.liquidCoolingConfigId}`)
  }
  const econ = computeEconomization(
    { ...weatherProfile, zoneId: input.facilities.climateZoneId, version: '1.11.0', dataSource: 'PVGIS' } as any,
    coolingCfg.tcwsCelsius,
    coolingCfg.tappCelsius
  )

  // Fraction of hours in economization (free-cooler only mode)
  const econFraction = econ.hoursFullEcon / 8760

  // ─── 3. Resolve dataroom configurations ──────────────────────────────────
  const resolvedDatarooms: DataroomConfigResolved[] = []
  for (const slot of input.it.dataroomSlots) {
    if (!slot) continue
    const dr = lib.getDataroomConfig(slot.dataroomConfigId)
    if (!dr) {
      warnings.push({
        severity: 'blocking',
        code: 'DATAROOM_NOT_FOUND',
        message: `Dataroom configuration not found: ${slot.dataroomConfigId}`,
        affectedFields: ['it.dataroomSlots'],
        remediation: 'Select a valid dataroom configuration from the library.',
      })
      continue
    }
    resolvedDatarooms.push(dr)
  }

  const utilization = parseFloat(input.it.powerCapacityUtilization)

  // ─── 4. Aggregate dataroom load at peak (100% utilization for CAPEX) ──────
  // Peak = 100% utilization for sizing
  let peakItLoadKw = 0
  let annualAvgItLoadKw = 0
  let dataroomFloorAreaM2 = 0
  let dataEquipmentCapex = 0
  let dataEquipmentLossKw = 0
  let dataroomHeatToLtKw = 0

  // L1-L4 efficiency chain
  let peakL1Kw = 0  // UPS output
  let peakL2Kw = 0  // PDU output
  let peakL3Kw = 0  // rPDU output
  let peakL4Kw = 0  // node input

  for (const dr of resolvedDatarooms) {
    const drPeakLoad = dr.loadKw  // at 100% utilization
    const drOpexLoad = dr.loadKw * utilization  // scaled for OPEX

    peakItLoadKw += drPeakLoad
    annualAvgItLoadKw += drOpexLoad
    dataroomFloorAreaM2 += dr.fixedAreaM2 + (dr.proportionalAreaM2PerKw ?? 0) * drPeakLoad
    dataEquipmentCapex += dr.fixedCost + (dr.proportionalCostPerKw ?? 0) * drPeakLoad
    dataEquipmentLossKw += dr.proportionalLoss * drPeakLoad
    dataroomHeatToLtKw += dr.heatToLtHruFraction * drPeakLoad

    // ITE power chain
    peakL1Kw += drPeakLoad
    peakL2Kw += drPeakLoad * dr.iteLoadEfficiencyL2
    peakL3Kw += drPeakLoad * dr.iteLoadEfficiencyL3
    peakL4Kw += drPeakLoad * dr.iteLoadEfficiencyL4
  }

  // Air-side heat from datarooms (not routed to LT HRU)
  const dataroomHeatToAirKw = peakItLoadKw - dataroomHeatToLtKw

  // ─── 5. Power path: critical power losses ─────────────────────────────────
  const criticalCfg = lib.getPowerConfig(input.facilities.criticalPowerConfigId)
  const mechCfg = lib.getPowerConfig(input.facilities.mechanicalPowerConfigId)

  if (!criticalCfg || !mechCfg) {
    warnings.push({
      severity: 'blocking',
      code: 'POWER_CONFIG_NOT_FOUND',
      message: 'Power configuration not found',
      remediation: 'Select valid power configurations from the library.',
    })
  }

  const critLoss = criticalCfg ? criticalCfg.proportionalLoss * peakL1Kw : 0
  const lossesCriticalKw = critLoss

  // ─── 6. Cooling load and losses ───────────────────────────────────────────
  // LT HRU (air cooling path): cools dataroomHeatToAirKw + critical power heat
  const ltCoolingDutyKw = dataroomHeatToAirKw + critLoss

  // Pump power (from critical power, N+1 for redundancy)
  const pumpPowerKw = coolingCfg ? coolingCfg.pumpCopInverse * ltCoolingDutyKw : 0

  // Annual-average compressor power (weighted by non-econ hours)
  const annualCompressorKw = coolingCfg
    ? (1 - econFraction) * ltCoolingDutyKw / coolingCfg.compressorCop
    : 0

  // Fan power (always on)
  const fanPowerKw = coolingCfg
    ? coolingCfg.freeCoolerCopInverse * ltCoolingDutyKw
    : 0

  const lossesMechanicalKw = pumpPowerKw + annualCompressorKw + fanPowerKw
  const lossesDataroomsKw = dataEquipmentLossKw

  // ─── 7. Total facility power ──────────────────────────────────────────────
  // Peak: for sizing and CAPEX
  const totalFacilityPeakKw = peakL1Kw + lossesCriticalKw + lossesMechanicalKw

  // Annual-average: for OPEX (utilization-adjusted IT + annual-avg cooling)
  const annualAvgFacilityKw = annualAvgItLoadKw + lossesCriticalKw + lossesMechanicalKw

  // Annual energy
  const annualHours = parseFloat(input.finance.annualHours)
  const annualElectricityKwh = annualAvgFacilityKw * annualHours
  const annualAvgL2Kw = annualAvgItLoadKw * (resolvedDatarooms[0]?.iteLoadEfficiencyL2 ?? 1)

  // ─── 8. Resource metrics ──────────────────────────────────────────────────
  const pueL3 = peakL3Kw > 0 ? annualAvgFacilityKw / peakL3Kw : 0
  const pueL4 = peakL4Kw > 0 ? annualAvgFacilityKw / peakL4Kw : 0

  // Heat recovery: only HT HRU in v1.11
  const heatRecoveryKw = 0 // placeholder; HT HRU implementation in next iteration

  const erf = annualAvgFacilityKw > 0 ? heatRecoveryKw / annualAvgFacilityKw : 0

  // WUE = equipment water m3/yr * 1000 / (ITE L2 kW * annual hours)
  // Equipment water from HRU cooling towers etc. — placeholder for full HRU model
  const waterEquipmentM3 = 0 // populated when HRU model is wired in
  const wue = annualAvgL2Kw > 0 ? (waterEquipmentM3 * 1000) / (annualAvgL2Kw * annualHours) : 0

  // CUE = PUE L3 * CO2 g/kWh / 1000 (PRD §6.6)
  const co2GPerKwh = parseFloat(input.finance.electricityCo2GPerKwh)
  const cue = pueL3 * co2GPerKwh / 1000

  // CO2e: total facility power * CO2 impact * hours / 1,000,000
  const co2eUtilityTonnes = annualAvgFacilityKw * co2GPerKwh * annualHours / 1_000_000

  // Utility water: facility power * electricity water impact * hours / 1000
  const waterLPerKwh = parseFloat(input.finance.electricityWaterLPerKwh)
  const waterUtilityM3 = annualAvgFacilityKw * waterLPerKwh * annualHours / 1000

  // Workload density: L4 workload power / dataroom floor area (kW/m²)
  const workloadDensityKwPerM2 = dataroomFloorAreaM2 > 0 ? peakL4Kw / dataroomFloorAreaM2 : 0

  // ─── 9. Floor area ────────────────────────────────────────────────────────
  const facilitiesAreaM2 = criticalCfg
    ? criticalCfg.proportionalAreaM2PerKw * totalFacilityPeakKw
    : 0

  // PRD §6.6: overall = 0.7 * (sqrt(facilities) + sqrt(datarooms))^2
  const overallAreaM2 =
    0.7 * Math.pow(Math.sqrt(facilitiesAreaM2) + Math.sqrt(dataroomFloorAreaM2), 2)

  // ─── 10. CAPEX ────────────────────────────────────────────────────────────
  const powerEquipmentCost = criticalCfg
    ? criticalCfg.proportionalCostPerKw * totalFacilityPeakKw
    : 0
  const coolingEquipmentCost = coolingCfg
    ? coolingCfg.proportionalCostPerKw * ltCoolingDutyKw
    : 0

  const capex = computeCapex({
    powerEquipmentCost,
    coolingEquipmentCost,
    dataEquipmentCost: dataEquipmentCapex,
    coreAndShellCostPerM2: parseFloat(input.finance.coreAndShellUnitCostPerM2),
    fitOutCostPerM2: parseFloat(input.finance.fitOutUnitCostPerM2),
    // Cost basis = raw sum of facilities + dataroom areas (workbook Paris!G40/G41),
    // NOT the 0.7-compacted overallAreaM2 (used for floor area reporting only).
    facilitiesAreaM2,
    dataroomAreaM2: dataroomFloorAreaM2,
  })

  // ─── 11. OPEX ─────────────────────────────────────────────────────────────
  const opex = computeOpex({
    annualElectricityKwh,
    electricityUnitCostPerKwh: parseFloat(input.finance.electricityUnitCostPerKwh),
    equipmentCapex: capex.power + capex.cooling + capex.data,
    equipmentMaintenanceFraction: parseFloat(input.finance.equipmentMaintenanceFraction),
    coreAndShellCapex: capex.coreAndShell,
    coreAndShellMaintenanceFraction: parseFloat(input.finance.coreAndShellMaintenanceFraction),
    waterEquipmentM3,
    waterUnitCostPerM3: parseFloat(input.finance.waterUnitCostPerM3),
    heatRecoveryKwh: heatRecoveryKw * annualHours,
    heatRecoveryValuePerKwh: parseFloat(input.finance.heatRecoveryValuePerKwh),
  })

  // ─── 12. Financials ───────────────────────────────────────────────────────
  const financials = computeFinancials(capex, opex, {
    capexTotal: capex.total,
    financingRateFraction: parseFloat(input.finance.capexFinancingRateFraction),
    financedFraction: parseFloat(input.finance.capexFinancedFraction),
    financingTermYr: parseFloat(input.finance.capexFinancingTermYr),
    infrastructureLifespanYr: parseFloat(input.finance.facilityPowerCoolingLifespanYr),
    itEquipmentLifespanYr: parseFloat(input.finance.itEquipmentLifespanYr),
    dataEquipmentCapex,
    discountRateFraction: parseFloat(input.finance.discountRateFraction),
  }, peakL4Kw)

  // ─── 13. Capacity margins ─────────────────────────────────────────────────
  const margins: CapacityMargin[] = []
  // Placeholder: detailed margins require per-equipment-slot capacity knowledge
  // (populated when full equipment library resolver is wired in)

  // ─── 14. Assemble result ──────────────────────────────────────────────────
  const metrics: ResourceMetrics = {
    pueL3, pueL4, erf, wue, cue,
    workloadDensityKwPerM2,
    referenceCity: weatherProfile.referenceCity,
  }

  const resourceBreakdown: ResourceBreakdown = {
    power: {
      totalFacilityKw: annualAvgFacilityKw,
      itePowerL1Kw: peakL1Kw,
      itePowerL2Kw: peakL2Kw,
      itePowerL3Kw: peakL3Kw,
      itePowerL4Kw: peakL4Kw,
      lossesCriticalKw,
      lossesDataroomsKw,
      lossesMechanicalKw,
    },
    waterUtilityM3,
    waterEquipmentM3,
    floorAreaFacilitiesM2: facilitiesAreaM2,
    floorAreaDataroomsM2: dataroomFloorAreaM2,
    floorAreaOverallM2: overallAreaM2,
    heatRecoveryRateKw: heatRecoveryKw,
    co2eUtilityTonnes,
  }

  const financialMetrics: FinancialMetrics = {
    capexTotal: capex.total,
    capexPerWorkloadKw: financials.monthlyRevenuePerKwCriticalPower,
    initialCapexInvestment: financials.initialCapexInvestment,
    capexAnnualLoanPayment: financials.annualLoanPayment,
    opexAnnualPayments: financials.opexAnnual,
    npv: financials.npv,
    annualRevenueToBreakEven: financials.annualRevenueToBreakEven,
    monthlyRevenuePerKwCriticalPower: financials.monthlyRevenuePerKwCriticalPower,
  }

  const financialBreakdown: FinancialBreakdown = {
    capex: {
      powerEquipment: capex.power,
      coolingEquipment: capex.cooling,
      dataEquipment: capex.data,
      coreAndShell: capex.coreAndShell,
      fitOut: capex.fitOut,
    },
    opex: {
      electrical: opex.electrical,
      maintenance: opex.maintenance,
      water: opex.water,
      heatRecovery: opex.heatRecovery,
    },
    depreciation: {
      annualInfrastructure: financials.depreciationInfrastructureAnnual,
      annualItEquipment: financials.depreciationItAnnual,
    },
  }

  return {
    scenarioId: input.id,
    inputHash,
    modelVersion: input.modelVersion,
    computedAt: new Date().toISOString(),
    durationMs: Date.now() - startMs,
    metrics,
    resourceBreakdown,
    financialMetrics,
    financialBreakdown,
    capacityMargins: margins,
    warnings,
  }
}
