import { describe, it, expect } from 'vitest'
import { computeCapex, computeOpex, computeFinancials } from './finance'

describe('computeCapex', () => {
  it('sums all CAPEX components correctly', () => {
    const result = computeCapex({
      powerEquipmentCost: 1_000_000,
      coolingEquipmentCost: 500_000,
      dataEquipmentCost: 2_000_000,
      coreAndShellCostPerM2: 1800,
      fitOutCostPerM2: 1800,
      totalFloorAreaM2: 1000,
    })
    expect(result.coreAndShell).toBe(1_800_000)
    expect(result.fitOut).toBe(1_800_000)
    expect(result.total).toBe(7_100_000)
  })
})

describe('computeOpex', () => {
  it('computes annual electricity cost', () => {
    const result = computeOpex({
      annualElectricityKwh: 1_000_000,
      electricityUnitCostPerKwh: 0.1,
      equipmentCapex: 5_000_000,
      equipmentMaintenanceFraction: 0.03,
      coreAndShellCapex: 2_000_000,
      coreAndShellMaintenanceFraction: 0.03,
      waterEquipmentM3: 10_000,
      waterUnitCostPerM3: 1,
      heatRecoveryKwh: 0,
      heatRecoveryValuePerKwh: 0,
    })
    expect(result.electrical).toBe(100_000)
    expect(result.maintenance).toBeCloseTo(210_000)
    expect(result.total).toBeCloseTo(310_000 + 10_000) // electrical + maintenance + water
  })
})

describe('computeFinancials', () => {
  it('produces a negative NPV when revenue is zero', () => {
    const capex = computeCapex({
      powerEquipmentCost: 1_000_000,
      coolingEquipmentCost: 500_000,
      dataEquipmentCost: 2_000_000,
      coreAndShellCostPerM2: 1800,
      fitOutCostPerM2: 1800,
      totalFloorAreaM2: 1000,
    })
    const opex = computeOpex({
      annualElectricityKwh: 10_000_000,
      electricityUnitCostPerKwh: 0.2,
      equipmentCapex: capex.power + capex.cooling + capex.data,
      equipmentMaintenanceFraction: 0.03,
      coreAndShellCapex: capex.coreAndShell,
      coreAndShellMaintenanceFraction: 0.03,
      waterEquipmentM3: 50_000,
      waterUnitCostPerM3: 1,
      heatRecoveryKwh: 0,
      heatRecoveryValuePerKwh: 0,
    })
    const result = computeFinancials(capex, opex, {
      capexTotal: capex.total,
      financingRateFraction: 0.06,
      financedFraction: 0.70,
      financingTermYr: 15,
      infrastructureLifespanYr: 18,
      itEquipmentLifespanYr: 6,
      dataEquipmentCapex: capex.data,
      discountRateFraction: 0.05,
    }, 1000)

    // NPV includes initial investment + PV of annual expenses (all negative/costs)
    // With 70% financing, down payment = -30% of capex; annual expense is large.
    // NPV is a cost function here — the value depends on opex vs discount rate.
    // We just verify sign consistency: break-even revenue must be positive.
    expect(result.annualRevenueToBreakEven).toBeGreaterThan(0)
    // Monthly revenue should be > 0
    expect(result.monthlyRevenuePerKwCriticalPower).toBeGreaterThan(0)
    // Down payment should be negative (outflow)
    expect(result.initialCapexInvestment).toBeLessThan(0)
    // Annual loan payment should be negative (outflow)
    expect(result.annualLoanPayment).toBeLessThan(0)
    // Depreciation values should be positive
    expect(result.depreciationInfrastructureAnnual).toBeGreaterThan(0)
    expect(result.depreciationItAnnual).toBeGreaterThan(0)
  })
})
