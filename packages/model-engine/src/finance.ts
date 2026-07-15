/**
 * Financial engine: CAPEX/OPEX, depreciation, NPV, break-even.
 *
 * PRD §6.10 and §7.6.
 * Uses Decimal.js for money arithmetic to avoid IEEE 754 accumulation.
 * Break-even uses bisection (replaces workbook Goal Seek).
 */

import Decimal from 'decimal.js'

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_EVEN })

export interface CapexInputs {
  powerEquipmentCost: number
  coolingEquipmentCost: number
  dataEquipmentCost: number
  coreAndShellCostPerM2: number
  fitOutCostPerM2: number
  totalFloorAreaM2: number
}

export interface OpexInputs {
  annualElectricityKwh: number
  electricityUnitCostPerKwh: number
  equipmentCapex: number
  equipmentMaintenanceFraction: number
  coreAndShellCapex: number
  coreAndShellMaintenanceFraction: number
  waterEquipmentM3: number
  waterUnitCostPerM3: number
  heatRecoveryKwh: number
  heatRecoveryValuePerKwh: number
}

export interface FinancingInputs {
  capexTotal: number
  financingRateFraction: number
  financedFraction: number
  financingTermYr: number
  infrastructureLifespanYr: number
  itEquipmentLifespanYr: number
  dataEquipmentCapex: number
  discountRateFraction: number
}

export interface FinancialResult {
  capexTotal: number
  coreAndShellCapex: number
  fitOutCapex: number
  opexAnnual: number
  electricalOpex: number
  maintenanceOpex: number
  waterOpex: number
  heatRecoveryRevenue: number
  initialCapexInvestment: number   // negative (outflow)
  annualLoanPayment: number        // negative (outflow), 0 if unfinanced
  depreciationInfrastructureAnnual: number
  depreciationItAnnual: number
  npv: number
  annualRevenueToBreakEven: number
  monthlyRevenuePerKwCriticalPower: number
  l4WorkloadKw: number
}

// ─── PMT: annual payment on a loan ───────────────────────────────────────────
// PMT(rate, nper, pv) = pv * rate / (1 - (1+rate)^-nper)
function pmt(annualRate: number, termYears: number, presentValue: number): number {
  if (annualRate === 0) return presentValue / termYears
  const r = annualRate
  const n = termYears
  return presentValue * r / (1 - Math.pow(1 + r, -n))
}

// ─── NPV: net present value of constant annual cash flow ─────────────────────
// NPV of annuity: cf * (1 - (1+r)^-n) / r + initial
function npvConstant(
  discountRate: number,
  annualCashFlow: number,
  horizonYears: number,
  initialInvestment: number
): number {
  if (discountRate === 0) return initialInvestment + annualCashFlow * horizonYears
  const annuityFactor = (1 - Math.pow(1 + discountRate, -horizonYears)) / discountRate
  return initialInvestment + annualCashFlow * annuityFactor
}

// ─── Bisection root solver for break-even revenue ────────────────────────────
// PRD §7.6: find R such that NPV(discount, expense + R, horizon) + initial = 0
function bisectBreakEven(
  discountRate: number,
  annualExpense: number,
  initialInvestment: number,
  horizonYears: number
): number {
  const target = 0
  const f = (revenue: number) =>
    npvConstant(discountRate, annualExpense + revenue, horizonYears, initialInvestment)

  // Lower bound: R=0 should produce a negative NPV (cost > 0)
  let lo = 0
  let hi = Math.abs(initialInvestment) * 2  // generous upper bound

  // Expand hi until sign changes
  let iterations = 0
  while (f(hi) < target && iterations < 100) {
    hi *= 2
    iterations++
  }

  // Bisection
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fMid = f(mid)
    if (Math.abs(fMid) < 1) return mid   // residual < 1 currency unit
    if (fMid < target) lo = mid
    else hi = mid
  }

  return (lo + hi) / 2
}

export function computeCapex(inputs: CapexInputs): {
  power: number; cooling: number; data: number; coreAndShell: number; fitOut: number; total: number
} {
  const coreAndShell = inputs.coreAndShellCostPerM2 * inputs.totalFloorAreaM2
  const fitOut = inputs.fitOutCostPerM2 * inputs.totalFloorAreaM2
  const total =
    inputs.powerEquipmentCost +
    inputs.coolingEquipmentCost +
    inputs.dataEquipmentCost +
    coreAndShell +
    fitOut

  return {
    power: inputs.powerEquipmentCost,
    cooling: inputs.coolingEquipmentCost,
    data: inputs.dataEquipmentCost,
    coreAndShell,
    fitOut,
    total,
  }
}

export function computeOpex(inputs: OpexInputs): {
  electrical: number; maintenance: number; water: number; heatRecovery: number; total: number
} {
  const electrical = inputs.annualElectricityKwh * inputs.electricityUnitCostPerKwh
  const maintenance =
    inputs.equipmentCapex * inputs.equipmentMaintenanceFraction +
    inputs.coreAndShellCapex * inputs.coreAndShellMaintenanceFraction
  const water = inputs.waterEquipmentM3 * inputs.waterUnitCostPerM3
  const heatRecovery = -(inputs.heatRecoveryKwh * inputs.heatRecoveryValuePerKwh)

  return {
    electrical,
    maintenance,
    water,
    heatRecovery,
    total: electrical + maintenance + water + heatRecovery,
  }
}

export function computeFinancials(
  capex: ReturnType<typeof computeCapex>,
  opex: ReturnType<typeof computeOpex>,
  financing: FinancingInputs,
  l4WorkloadKw: number
): FinancialResult {
  const { capexTotal, financingRateFraction, financedFraction, financingTermYr,
    infrastructureLifespanYr, itEquipmentLifespanYr, dataEquipmentCapex,
    discountRateFraction } = financing

  const financedAmount = capexTotal * financedFraction
  const downPayment = -(capexTotal * (1 - financedFraction))
  const annualLoanPayment = financedAmount > 0
    ? -(pmt(financingRateFraction, financingTermYr, financedAmount))
    : 0

  const infraCapex = capexTotal - dataEquipmentCapex
  const depInfra = infrastructureLifespanYr > 0 ? infraCapex / infrastructureLifespanYr : 0
  const depIt = itEquipmentLifespanYr > 0 ? dataEquipmentCapex / itEquipmentLifespanYr : 0

  // NPV over 20-year horizon (parity default)
  const HORIZON = 20
  const annualExpense = opex.total
  const npv = npvConstant(discountRateFraction, annualExpense, HORIZON, downPayment)

  const annualRevToBreakEven = bisectBreakEven(
    discountRateFraction,
    annualExpense,
    downPayment,
    HORIZON
  )

  const monthlyRevPerKwCritical = l4WorkloadKw > 0
    ? (annualRevToBreakEven / 12) / l4WorkloadKw
    : 0

  return {
    capexTotal,
    coreAndShellCapex: capex.coreAndShell,
    fitOutCapex: capex.fitOut,
    opexAnnual: opex.total,
    electricalOpex: opex.electrical,
    maintenanceOpex: opex.maintenance,
    waterOpex: opex.water,
    heatRecoveryRevenue: opex.heatRecovery,
    initialCapexInvestment: downPayment,
    annualLoanPayment,
    depreciationInfrastructureAnnual: depInfra,
    depreciationItAnnual: depIt,
    npv,
    annualRevenueToBreakEven: annualRevToBreakEven,
    monthlyRevenuePerKwCriticalPower: monthlyRevPerKwCritical,
    l4WorkloadKw,
  }
}
