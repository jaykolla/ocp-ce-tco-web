'use client'

/**
 * Sensitivity analysis utilities for the OCP CE TCO Calculator.
 *
 * Provides one-variable parameter sweeps and tornado chart data generation.
 * All computation runs on the main thread via the model-engine fallback.
 */

import type { ScenarioInput } from '@ocp-tco/model-schema'

// ─── Parameter definitions ────────────────────────────────────────────────────

export interface SweepParameter {
  id: string
  label: string
  defaultRange: number
  /** Finance field name on ScenarioInput.finance (numeric string fields) */
  financeField?: keyof {
    electricityUnitCostPerKwh: number
    coreAndShellUnitCostPerM2: number
    fitOutUnitCostPerM2: number
    waterUnitCostPerM3: number
    equipmentMaintenanceFraction: number
    discountRateFraction: number
  }
  /** Top-level field in ScenarioInput.it */
  itField?: 'powerCapacityUtilization'
}

export const SWEEP_PARAMETERS: SweepParameter[] = [
  {
    id: 'electricityUnitCost',
    label: 'Electricity Cost (€/kWh)',
    defaultRange: 0.3,
    financeField: 'electricityUnitCostPerKwh',
  },
  {
    id: 'coreAndShellUnitCost',
    label: 'Core & Shell Cost (€/m²)',
    defaultRange: 0.3,
    financeField: 'coreAndShellUnitCostPerM2',
  },
  {
    id: 'fitOutUnitCost',
    label: 'Fit-Out Cost (€/m²)',
    defaultRange: 0.3,
    financeField: 'fitOutUnitCostPerM2',
  },
  {
    id: 'waterUnitCost',
    label: 'Water Cost (€/m³)',
    defaultRange: 0.5,
    financeField: 'waterUnitCostPerM3',
  },
  {
    id: 'equipmentMaintenancePct',
    label: 'Equipment Maintenance (%)',
    defaultRange: 0.5,
    financeField: 'equipmentMaintenanceFraction',
  },
  {
    id: 'discountRatePct',
    label: 'Discount Rate (%)',
    defaultRange: 0.5,
    financeField: 'discountRateFraction',
  },
  {
    id: 'powerCapacityUtilization',
    label: 'IT Utilization (%)',
    defaultRange: 0.2,
    itField: 'powerCapacityUtilization',
  },
]

// ─── Target metric definitions ────────────────────────────────────────────────

export interface TargetMetric {
  id: string
  label: string
}

export const TARGET_METRICS: TargetMetric[] = [
  { id: 'capexTotal', label: 'CAPEX Total' },
  { id: 'opexAnnual', label: 'OPEX Annual' },
  { id: 'pueL3', label: 'PUE L3' },
  { id: 'npv', label: 'NPV' },
  { id: 'annualRevenueToBreakEven', label: 'Break-Even Revenue' },
]

// ─── Result types ─────────────────────────────────────────────────────────────

export interface SweepResult {
  paramValue: number
  metricValue: number
  isBase: boolean
}

export interface TornadoBar {
  parameterId: string
  label: string
  baseValue: number
  loValue: number
  hiValue: number
  impact: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Read the base numeric value for a sweep parameter from a ScenarioInput */
function getBaseParamValue(input: ScenarioInput, param: SweepParameter): number {
  if (param.financeField) {
    return Number(input.finance[param.financeField as keyof typeof input.finance])
  }
  if (param.itField === 'powerCapacityUtilization') {
    return Number(input.it.powerCapacityUtilization)
  }
  return 0
}

/** Apply a new numeric value to a parameter, returning a modified ScenarioInput */
function applyParamValue(
  input: ScenarioInput,
  param: SweepParameter,
  value: number,
): ScenarioInput {
  if (param.financeField) {
    return {
      ...input,
      finance: {
        ...input.finance,
        [param.financeField]: String(value) as `${number}`,
      },
    }
  }
  if (param.itField === 'powerCapacityUtilization') {
    return {
      ...input,
      it: {
        ...input.it,
        powerCapacityUtilization: String(value) as `${number}`,
      },
    }
  }
  return input
}

/** Extract the target metric value from a CalculationResult */
function extractMetricValue(result: import('@ocp-tco/model-schema').CalculationResult, metricId: string): number {
  switch (metricId) {
    case 'capexTotal':
      return result.financialMetrics.capexTotal
    case 'opexAnnual':
      return result.financialMetrics.opexAnnualPayments
    case 'pueL3':
      return result.metrics.pueL3
    case 'npv':
      return result.financialMetrics.npv
    case 'annualRevenueToBreakEven':
      return result.financialMetrics.annualRevenueToBreakEven
    default:
      return 0
  }
}

/** Run the model engine on the main thread */
async function computeMetric(input: ScenarioInput, metricId: string): Promise<number> {
  const { runScenario } = await import('@ocp-tco/model-engine')
  const { buildLibraryContext } = await import('@ocp-tco/seed-data')
  const lib = buildLibraryContext()
  const result = await runScenario(input, lib)
  return extractMetricValue(result, metricId)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run N scenario variations sweeping one parameter ±rangePercent from its base value.
 */
export async function runSweep(
  baseInput: ScenarioInput,
  parameterId: string,
  rangePercent: number,
  steps: number,
  metricId: string,
  onProgress?: (pct: number) => void,
): Promise<SweepResult[]> {
  const param = SWEEP_PARAMETERS.find((p) => p.id === parameterId)
  if (!param) throw new Error(`Unknown parameter: ${parameterId}`)

  const baseValue = getBaseParamValue(baseInput, param)
  if (baseValue === 0) throw new Error(`Base value for ${param.label} is 0; cannot compute ±%`)

  const lo = baseValue * (1 - rangePercent)
  const hi = baseValue * (1 + rangePercent)
  const stepValues: number[] = []

  for (let i = 0; i <= steps; i++) {
    stepValues.push(lo + (hi - lo) * (i / steps))
  }

  const results: SweepResult[] = []
  for (let i = 0; i < stepValues.length; i++) {
    const v = stepValues[i]
    const modifiedInput = applyParamValue(baseInput, param, v)
    const metricValue = await computeMetric(modifiedInput, metricId)
    const isBase = Math.abs(v - baseValue) < Math.abs((hi - lo) / steps) * 0.01
    results.push({ paramValue: v, metricValue, isBase })
    onProgress?.((i + 1) / stepValues.length)
  }

  return results
}

/**
 * Run all parameters at ±rangePercent (2 points each) for a tornado chart.
 */
export async function runTornado(
  baseInput: ScenarioInput,
  targetMetricId: string,
  rangePercent: number,
  onProgress?: (pct: number) => void,
): Promise<TornadoBar[]> {
  // Get base metric value once
  const baseValue = await computeMetric(baseInput, targetMetricId)

  const bars: TornadoBar[] = []
  for (let i = 0; i < SWEEP_PARAMETERS.length; i++) {
    const param = SWEEP_PARAMETERS[i]
    const baseParamValue = getBaseParamValue(baseInput, param)

    if (baseParamValue === 0) {
      // Skip parameters with zero base value
      onProgress?.((i + 1) / SWEEP_PARAMETERS.length)
      continue
    }

    const loInput = applyParamValue(baseInput, param, baseParamValue * (1 - rangePercent))
    const hiInput = applyParamValue(baseInput, param, baseParamValue * (1 + rangePercent))

    const [loValue, hiValue] = await Promise.all([
      computeMetric(loInput, targetMetricId),
      computeMetric(hiInput, targetMetricId),
    ])

    bars.push({
      parameterId: param.id,
      label: param.label,
      baseValue,
      loValue,
      hiValue,
      impact: Math.abs(hiValue - loValue),
    })

    onProgress?.((i + 1) / SWEEP_PARAMETERS.length)
  }

  // Sort by impact descending
  return bars.sort((a, b) => b.impact - a.impact)
}
