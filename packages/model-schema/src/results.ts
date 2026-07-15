import { z } from 'zod'

// All result values are raw numbers (full precision).
// Display layer applies 3-significant-figure formatting.

// ─── Resource metrics (top-level KPIs) ───────────────────────────────────────
export const ResourceMetrics = z.object({
  // Power Use Effectiveness: total facility power / ITE rPDU power (annual avg)
  pueL3: z.number(),
  // PUE L4: total facility power / ITE node input power (annual avg)
  pueL4: z.number(),
  // Energy Reuse Factor: heat recovery / total facility power
  erf: z.number(),
  // Water Use Effectiveness: equipment water m³/yr * 1000 / (ITE L2 kW * annual hours)
  wue: z.number(),
  // Carbon Use Effectiveness: PUE L3 * CO2 g/kWh / 1000
  cue: z.number(),
  // ITE L4 workload power / dataroom floor area
  workloadDensityKwPerM2: z.number(),
  // Reference city name confirming weather selection
  referenceCity: z.string(),
})
export type ResourceMetrics = z.infer<typeof ResourceMetrics>

// ─── Power breakdown ──────────────────────────────────────────────────────────
export const PowerBreakdown = z.object({
  totalFacilityKw: z.number(),
  itePowerL1Kw: z.number(),     // UPS output
  itePowerL2Kw: z.number(),     // PDU output
  itePowerL3Kw: z.number(),     // rPDU output
  itePowerL4Kw: z.number(),     // node input (net of chassis fans/PSUs)
  lossesCriticalKw: z.number(),
  lossesDataroomsKw: z.number(),
  lossesMechanicalKw: z.number(),
})
export type PowerBreakdown = z.infer<typeof PowerBreakdown>

// ─── Water and carbon ─────────────────────────────────────────────────────────
export const ResourceBreakdown = z.object({
  power: PowerBreakdown,
  waterUtilityM3: z.number(),
  waterEquipmentM3: z.number(),
  floorAreaFacilitiesM2: z.number(),
  floorAreaDataroomsM2: z.number(),
  floorAreaOverallM2: z.number(),   // 0.7 compaction assumption applied
  heatRecoveryRateKw: z.number(),
  co2eUtilityTonnes: z.number(),
})
export type ResourceBreakdown = z.infer<typeof ResourceBreakdown>

// ─── Financial metrics ────────────────────────────────────────────────────────
export const FinancialMetrics = z.object({
  capexTotal: z.number(),
  capexPerWorkloadKw: z.number(),       // CAPEX / L4 workload kW
  initialCapexInvestment: z.number(),   // down payment (negative = outflow)
  capexAnnualLoanPayment: z.number(),
  opexAnnualPayments: z.number(),
  npv: z.number(),
  annualRevenueToBreakEven: z.number(),
  monthlyRevenuePerKwCriticalPower: z.number(),
})
export type FinancialMetrics = z.infer<typeof FinancialMetrics>

// ─── Financial breakdown ──────────────────────────────────────────────────────
export const FinancialBreakdown = z.object({
  capex: z.object({
    powerEquipment: z.number(),
    coolingEquipment: z.number(),
    dataEquipment: z.number(),
    coreAndShell: z.number(),
    fitOut: z.number(),
  }),
  opex: z.object({
    electrical: z.number(),
    maintenance: z.number(),
    water: z.number(),
    heatRecovery: z.number(),   // negative (revenue)
  }),
  depreciation: z.object({
    annualInfrastructure: z.number(),  // 18-year linear default
    annualItEquipment: z.number(),     // 6-year linear default
  }),
})
export type FinancialBreakdown = z.infer<typeof FinancialBreakdown>

// ─── Capacity margin check ────────────────────────────────────────────────────
export const CapacityMargin = z.object({
  equipment: z.string(),
  capacityKw: z.number(),
  loadKw: z.number(),
  marginFraction: z.number(),      // (capacity - load) / load
  redundancyMet: z.boolean(),
})
export type CapacityMargin = z.infer<typeof CapacityMargin>

// ─── Calculation warning ──────────────────────────────────────────────────────
export const CalcWarning = z.object({
  severity: z.enum(['blocking', 'warning', 'info']),
  code: z.string(),
  message: z.string(),
  affectedFields: z.array(z.string()).optional(),
  remediation: z.string().optional(),
})
export type CalcWarning = z.infer<typeof CalcWarning>

// ─── Full calculation result ──────────────────────────────────────────────────
export const CalculationResult = z.object({
  scenarioId: z.string(),
  inputHash: z.string(),
  modelVersion: z.string(),
  computedAt: z.string().datetime(),
  durationMs: z.number(),
  metrics: ResourceMetrics,
  resourceBreakdown: ResourceBreakdown,
  financialMetrics: FinancialMetrics,
  financialBreakdown: FinancialBreakdown,
  capacityMargins: z.array(CapacityMargin),
  warnings: z.array(CalcWarning),
})
export type CalculationResult = z.infer<typeof CalculationResult>
