/**
 * Export utilities for TCO scenarios.
 * Provides JSON download, CSV comparison export, and print support.
 *
 * Two export APIs:
 * 1. Legacy Scenario[] API (used by ExportMenu, compare page)
 * 2. ScenarioInput + CalculationResult API (used by results page)
 */

import type { Scenario } from '@/store/scenario-store'
import type { ScenarioInput, CalculationResult } from '@ocp-tco/model-schema'

// ---------------------------------------------------------------------------
// JSON export
// ---------------------------------------------------------------------------

/**
 * Download a single scenario (or array of scenarios) as a JSON file.
 */
export function exportScenarioJSON(scenarios: Scenario | Scenario[]): void {
  const payload = Array.isArray(scenarios) ? scenarios : [scenarios]
  const json = JSON.stringify({ version: '1.11', exportedAt: new Date().toISOString(), scenarios: payload }, null, 2)
  downloadBlob(json, 'application/json', `tco-scenarios-${timestamp()}.json`)
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

type CsvRow = Record<string, string | number>

function toCsvString(rows: CsvRow[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const v = row[h] ?? ''
          const s = String(v)
          return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s
        })
        .join(','),
    ),
  ]
  return lines.join('\n')
}

/**
 * Export a side-by-side comparison CSV for all provided scenarios.
 * Each metric is a row; each scenario is a column.
 */
export function exportComparisonCSV(scenarios: Scenario[]): void {
  if (scenarios.length === 0) return

  interface MetricDef {
    label: string
    value: (s: Scenario) => string | number
  }

  const metrics: MetricDef[] = [
    // Efficiency
    { label: 'PUE L3', value: (s) => s.kpis.pueL3 },
    { label: 'PUE L4', value: (s) => s.kpis.pueL4 },
    { label: 'ERF', value: (s) => s.kpis.erf },
    { label: 'WUE', value: (s) => s.kpis.wue },
    { label: 'CUE', value: (s) => s.kpis.cue },
    { label: 'Workload Density (kW/m2)', value: (s) => s.kpis.workloadDensity },
    // CAPEX
    { label: 'CAPEX Total', value: (s) => s.financials.capexTotal },
    { label: 'CAPEX Power Equipment', value: (s) => s.capex.powerEquipment },
    { label: 'CAPEX Cooling Equipment', value: (s) => s.capex.coolingEquipment },
    { label: 'CAPEX Data Equipment', value: (s) => s.capex.dataEquipment },
    { label: 'CAPEX Core & Shell', value: (s) => s.capex.coreAndShell },
    { label: 'CAPEX Fit-Out', value: (s) => s.capex.fitOut },
    // OPEX
    { label: 'OPEX Annual Total', value: (s) => s.financials.opexAnnual },
    { label: 'OPEX Electrical', value: (s) => s.opex.electrical },
    { label: 'OPEX Maintenance', value: (s) => s.opex.maintenance },
    { label: 'OPEX Water', value: (s) => s.opex.water },
    { label: 'OPEX Heat Recovery Credit', value: (s) => s.opex.heatRecovery },
    // Financials
    { label: 'NPV (20 yr)', value: (s) => s.financials.npv },
    { label: 'Break-even Annual Revenue', value: (s) => s.financials.breakEvenAnnual },
    { label: 'Break-even Year', value: (s) => s.financials.breakEvenYear ?? 'N/A' },
    // Power
    { label: 'Total Facility Power (kW)', value: (s) => s.power.totalFacility },
    { label: 'L1 Power (kW)', value: (s) => s.power.l1 },
    { label: 'L2 Power (kW)', value: (s) => s.power.l2 },
    { label: 'L3 Power (kW)', value: (s) => s.power.l3 },
    { label: 'L4 IT Load (kW)', value: (s) => s.power.l4 },
    { label: 'Total Losses (kW)', value: (s) => s.power.totalLosses },
    // Floor area
    { label: 'Floor Area Overall (m2)', value: (s) => s.floorArea.overall },
    { label: 'Floor Area Facilities (m2)', value: (s) => s.floorArea.facilities },
    { label: 'Floor Area Data Rooms (m2)', value: (s) => s.floorArea.dataRooms },
    // Environment
    { label: 'CO2e Utility (t/yr)', value: (s) => s.environment.co2eUtility },
    { label: 'Water Consumption (m3/yr)', value: (s) => s.environment.waterConsumption },
  ]

  const rows: CsvRow[] = metrics.map((m) => {
    const row: CsvRow = { Metric: m.label }
    scenarios.forEach((s) => {
      row[s.name] = m.value(s)
    })
    return row
  })

  const csv = toCsvString(rows)
  downloadBlob(csv, 'text/csv', `tco-comparison-${timestamp()}.csv`)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

function downloadBlob(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Engine result export (ScenarioInput + CalculationResult)
// ---------------------------------------------------------------------------

/**
 * Download a JSON file containing the ScenarioInput and CalculationResult
 * for a single scenario computed by the engine.
 */
export function exportCalculationJSON(
  input: ScenarioInput,
  result: CalculationResult,
): void {
  const payload = {
    version: result.modelVersion,
    exportedAt: new Date().toISOString(),
    input,
    result,
  }
  const json = JSON.stringify(payload, null, 2)
  downloadBlob(json, 'application/json', `tco-${input.id}-${timestamp()}.json`)
}

/**
 * Download a CSV with one row per scenario, all metric columns.
 * Accepts an array of { input, result } pairs.
 */
export function exportCalculationComparisonCSV(
  scenarios: Array<{ input: ScenarioInput; result: CalculationResult }>,
): void {
  if (scenarios.length === 0) return

  interface ColDef {
    header: string
    value: (s: { input: ScenarioInput; result: CalculationResult }) => string | number
  }

  const cols: ColDef[] = [
    { header: 'Scenario ID', value: ({ input }) => input.id },
    { header: 'Scenario Name', value: ({ input }) => input.name },
    { header: 'Model Version', value: ({ result }) => result.modelVersion },
    { header: 'Computed At', value: ({ result }) => result.computedAt },
    { header: 'Reference City', value: ({ result }) => result.metrics.referenceCity },
    { header: 'Climate Zone', value: ({ input }) => input.facilities.climateZoneId },
    // Efficiency KPIs
    { header: 'PUE L3', value: ({ result }) => result.metrics.pueL3 },
    { header: 'PUE L4', value: ({ result }) => result.metrics.pueL4 },
    { header: 'ERF', value: ({ result }) => result.metrics.erf },
    { header: 'WUE (L/kWh)', value: ({ result }) => result.metrics.wue },
    { header: 'CUE (kgCO2e/kWh)', value: ({ result }) => result.metrics.cue },
    { header: 'Workload Density (kW/m2)', value: ({ result }) => result.metrics.workloadDensityKwPerM2 },
    // Power
    { header: 'Total Facility Power (kW)', value: ({ result }) => result.resourceBreakdown.power.totalFacilityKw },
    { header: 'ITE L1 (kW)', value: ({ result }) => result.resourceBreakdown.power.itePowerL1Kw },
    { header: 'ITE L2 (kW)', value: ({ result }) => result.resourceBreakdown.power.itePowerL2Kw },
    { header: 'ITE L3 (kW)', value: ({ result }) => result.resourceBreakdown.power.itePowerL3Kw },
    { header: 'ITE L4 (kW)', value: ({ result }) => result.resourceBreakdown.power.itePowerL4Kw },
    { header: 'Losses Critical (kW)', value: ({ result }) => result.resourceBreakdown.power.lossesCriticalKw },
    { header: 'Losses Datarooms (kW)', value: ({ result }) => result.resourceBreakdown.power.lossesDataroomsKw },
    { header: 'Losses Mechanical (kW)', value: ({ result }) => result.resourceBreakdown.power.lossesMechanicalKw },
    // Resources
    { header: 'Water Utility (m3/yr)', value: ({ result }) => result.resourceBreakdown.waterUtilityM3 },
    { header: 'Water Equipment (m3/yr)', value: ({ result }) => result.resourceBreakdown.waterEquipmentM3 },
    { header: 'Floor Area Facilities (m2)', value: ({ result }) => result.resourceBreakdown.floorAreaFacilitiesM2 },
    { header: 'Floor Area Datarooms (m2)', value: ({ result }) => result.resourceBreakdown.floorAreaDataroomsM2 },
    { header: 'Floor Area Overall (m2)', value: ({ result }) => result.resourceBreakdown.floorAreaOverallM2 },
    { header: 'CO2e Utility (t/yr)', value: ({ result }) => result.resourceBreakdown.co2eUtilityTonnes },
    // CAPEX
    { header: 'CAPEX Power', value: ({ result }) => result.financialBreakdown.capex.powerEquipment },
    { header: 'CAPEX Cooling', value: ({ result }) => result.financialBreakdown.capex.coolingEquipment },
    { header: 'CAPEX Data', value: ({ result }) => result.financialBreakdown.capex.dataEquipment },
    { header: 'CAPEX Core & Shell', value: ({ result }) => result.financialBreakdown.capex.coreAndShell },
    { header: 'CAPEX Fit-Out', value: ({ result }) => result.financialBreakdown.capex.fitOut },
    { header: 'CAPEX Total', value: ({ result }) => result.financialMetrics.capexTotal },
    // OPEX
    { header: 'OPEX Electrical', value: ({ result }) => result.financialBreakdown.opex.electrical },
    { header: 'OPEX Maintenance', value: ({ result }) => result.financialBreakdown.opex.maintenance },
    { header: 'OPEX Water', value: ({ result }) => result.financialBreakdown.opex.water },
    { header: 'OPEX Heat Recovery Credit', value: ({ result }) => result.financialBreakdown.opex.heatRecovery },
    { header: 'OPEX Annual Total', value: ({ result }) => result.financialMetrics.opexAnnualPayments },
    // Financials
    { header: 'NPV (20yr)', value: ({ result }) => result.financialMetrics.npv },
    { header: 'Break-even Revenue (annual)', value: ({ result }) => result.financialMetrics.annualRevenueToBreakEven },
    { header: 'Monthly Rev per kW (L4)', value: ({ result }) => result.financialMetrics.monthlyRevenuePerKwCriticalPower },
    { header: 'Depreciation Infrastructure (annual)', value: ({ result }) => result.financialBreakdown.depreciation.annualInfrastructure },
    { header: 'Depreciation IT Equipment (annual)', value: ({ result }) => result.financialBreakdown.depreciation.annualItEquipment },
  ]

  const rows: CsvRow[] = scenarios.map((s) => {
    const row: CsvRow = {}
    for (const col of cols) {
      row[col.header] = col.value(s)
    }
    return row
  })

  const csv = toCsvString(rows)
  downloadBlob(csv, 'text/csv', `tco-comparison-${timestamp()}.csv`)
}
