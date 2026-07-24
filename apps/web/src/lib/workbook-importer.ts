'use client'

/**
 * workbook-importer.ts
 *
 * CLIENT-SIDE ONLY parser for OCP CE TCO Tool v1.11 .xlsx files.
 * Uses the SheetJS community edition (xlsx package).
 *
 * Strategy: scan the "Input" worksheet for known label text in column A,
 * then read the value from column B or C (Paris scenario column).
 */

import * as XLSX from 'xlsx'

// ─── Result type ──────────────────────────────────────────────────────────────

export interface ImportResult {
  success: boolean
  scenarioName: string
  inputs: Partial<WizardImportState>
  warnings: string[]
  errors: string[]
}

/** The subset of wizard/scenario-input state we can extract */
export interface WizardImportState {
  // IT
  powerCapacityUtilization: number
  dataroomSlots: (string | null)[]

  // Power
  criticalPowerConfigId: string
  mechanicalPowerConfigId: string
  powerRedundancy: 'N' | 'N+1' | '2N'

  // Cooling
  airCoolingConfigId: string
  liquidCoolingConfigId: string
  coolingRedundancy: 'N' | 'N+1' | '2N'
  temperatureCategory: string
  humidityCategory: string

  // Finance (raw numbers)
  electricityUnitCostPerKwh: number
  coreAndShellUnitCostPerM2: number
  fitOutUnitCostPerM2: number
  waterUnitCostPerM3: number
  heatRecoveryValuePerKwh: number
  coreAndShellMaintenanceFraction: number
  equipmentMaintenanceFraction: number
  electricityCo2GPerKwh: number
  electricityWaterLPerKwh: number
  facilityPowerCoolingLifespanYr: number
  itEquipmentLifespanYr: number
  discountRateFraction: number
  capexFinancingRateFraction: number
  capexFinancedFraction: number
  capexFinancingTermYr: number
  annualHours: number
}

// ─── Label → field mapping ────────────────────────────────────────────────────

/** Map of label text (lowercased, trimmed) to the field we extract */
const FINANCE_LABEL_MAP: Array<{
  /** Partial string that must appear in the cell text to match */
  match: string
  field: keyof WizardImportState
  /** Optional transform: multiply by factor before storing */
  factor?: number
}> = [
  { match: 'electricity unit cost', field: 'electricityUnitCostPerKwh' },
  { match: 'electricity cost', field: 'electricityUnitCostPerKwh' },
  { match: 'core & shell unit cost', field: 'coreAndShellUnitCostPerM2' },
  { match: 'core and shell unit cost', field: 'coreAndShellUnitCostPerM2' },
  { match: 'fit-out unit cost', field: 'fitOutUnitCostPerM2' },
  { match: 'fit out unit cost', field: 'fitOutUnitCostPerM2' },
  { match: 'water unit cost', field: 'waterUnitCostPerM3' },
  { match: 'heat recovery value', field: 'heatRecoveryValuePerKwh' },
  { match: 'core & shell maintenance', field: 'coreAndShellMaintenanceFraction', factor: 0.01 },
  { match: 'core and shell maintenance', field: 'coreAndShellMaintenanceFraction', factor: 0.01 },
  { match: 'equipment maintenance', field: 'equipmentMaintenanceFraction', factor: 0.01 },
  { match: 'electricity co2', field: 'electricityCo2GPerKwh' },
  { match: 'electricity water', field: 'electricityWaterLPerKwh' },
  { match: 'facility lifespan', field: 'facilityPowerCoolingLifespanYr' },
  { match: 'it lifespan', field: 'itEquipmentLifespanYr' },
  { match: 'discount rate', field: 'discountRateFraction', factor: 0.01 },
  { match: 'financing rate', field: 'capexFinancingRateFraction', factor: 0.01 },
  { match: 'financed fraction', field: 'capexFinancedFraction', factor: 0.01 },
  { match: 'financed %', field: 'capexFinancedFraction', factor: 0.01 },
  { match: 'financing term', field: 'capexFinancingTermYr' },
  { match: 'annual hours', field: 'annualHours' },
  { match: 'hours per year', field: 'annualHours' },
]

const IT_LABEL_MAP: Array<{
  match: string
  field: keyof WizardImportState
  factor?: number
}> = [
  { match: 'power capacity utilization', field: 'powerCapacityUtilization', factor: 0.01 },
  { match: 'it utilization', field: 'powerCapacityUtilization', factor: 0.01 },
]

// ─── Worksheet helpers ────────────────────────────────────────────────────────

/** Get the string value of a cell, trimmed and lowercased */
function cellStr(ws: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col })
  const cell = ws[addr]
  if (!cell) return ''
  return String(cell.v ?? '').trim().toLowerCase()
}

/** Get the numeric value of a cell, or undefined */
function cellNum(ws: XLSX.WorkSheet, row: number, col: number): number | undefined {
  const addr = XLSX.utils.encode_cell({ r: row, c: col })
  const cell = ws[addr]
  if (!cell) return undefined
  const v = Number(cell.v)
  return isFinite(v) ? v : undefined
}

/** Get the raw string value of a cell */
function cellRaw(ws: XLSX.WorkSheet, row: number, col: number): string {
  const addr = XLSX.utils.encode_cell({ r: row, c: col })
  const cell = ws[addr]
  if (!cell) return ''
  return String(cell.v ?? '').trim()
}

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse an uploaded v1.11 .xlsx file and return extracted inputs.
 * All parsing happens CLIENT-SIDE.
 */
export async function importWorkbook(file: File): Promise<ImportResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const inputs: Partial<WizardImportState> = {}

  // Read file as ArrayBuffer
  let arrayBuffer: ArrayBuffer
  try {
    arrayBuffer = await file.arrayBuffer()
  } catch (err) {
    return {
      success: false,
      scenarioName: file.name,
      inputs,
      warnings,
      errors: [`Failed to read file: ${String(err)}`],
    }
  }

  // Parse workbook
  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(arrayBuffer, { type: 'array' })
  } catch (err) {
    return {
      success: false,
      scenarioName: file.name,
      inputs,
      warnings,
      errors: [`Failed to parse Excel file: ${String(err)}`],
    }
  }

  // Find the "Input" sheet (case-insensitive)
  const inputSheetName = workbook.SheetNames.find(
    (name) => name.trim().toLowerCase() === 'input' ||
              name.trim().toLowerCase() === 'inputs',
  )

  if (!inputSheetName) {
    errors.push(
      `Could not find an "Input" worksheet. Available sheets: ${workbook.SheetNames.join(', ')}`,
    )
    return { success: false, scenarioName: file.name, inputs, warnings, errors }
  }

  const ws = workbook.Sheets[inputSheetName]
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:Z200')

  // Try to find a scenario name from a "Scenario" or "Name" label
  let scenarioName = file.name.replace(/\.xlsx?$/i, '')

  // ── Scan all rows ──────────────────────────────────────────────────────────
  const financeMatched = new Set<string>()
  const itMatched = new Set<string>()

  for (let r = range.s.r; r <= range.e.r; r++) {
    // Column A = label, try B, C, D for values (col 1, 2, 3)
    const labelA = cellStr(ws, r, 0)
    if (!labelA) continue

    // Scenario name detection
    if (labelA.includes('scenario name') || labelA.includes('scenario:')) {
      const nameCandidate = cellRaw(ws, r, 1) || cellRaw(ws, r, 2)
      if (nameCandidate) scenarioName = nameCandidate
    }

    // Finance fields
    for (const mapping of FINANCE_LABEL_MAP) {
      if (financeMatched.has(mapping.field)) continue
      if (labelA.includes(mapping.match)) {
        // Try columns B, C, D
        for (const col of [1, 2, 3]) {
          const v = cellNum(ws, r, col)
          if (v !== undefined) {
            const stored = mapping.factor ? v * mapping.factor : v
            ;(inputs as Record<string, number>)[mapping.field as string] = stored
            financeMatched.add(mapping.field)
            break
          }
        }
      }
    }

    // IT fields
    for (const mapping of IT_LABEL_MAP) {
      if (itMatched.has(mapping.field)) continue
      if (labelA.includes(mapping.match)) {
        for (const col of [1, 2, 3]) {
          const v = cellNum(ws, r, col)
          if (v !== undefined) {
            const stored = mapping.factor ? v * mapping.factor : v
            // Clamp utilization to [0, 1]
            const final = mapping.field === 'powerCapacityUtilization'
              ? Math.max(0, Math.min(1, stored > 1 ? stored / 100 : stored))
              : stored
            ;(inputs as Record<string, number>)[mapping.field as string] = final
            itMatched.add(mapping.field)
            break
          }
        }
      }
    }
  }

  // ── Build warnings for anything we couldn't find ──────────────────────────

  const financeFields: (keyof WizardImportState)[] = [
    'electricityUnitCostPerKwh',
    'coreAndShellUnitCostPerM2',
    'fitOutUnitCostPerM2',
    'waterUnitCostPerM3',
    'heatRecoveryValuePerKwh',
    'coreAndShellMaintenanceFraction',
    'equipmentMaintenanceFraction',
    'electricityCo2GPerKwh',
    'electricityWaterLPerKwh',
    'facilityPowerCoolingLifespanYr',
    'itEquipmentLifespanYr',
    'discountRateFraction',
    'capexFinancingRateFraction',
    'capexFinancedFraction',
    'capexFinancingTermYr',
    'annualHours',
  ]

  const financeFieldLabels: Record<string, string> = {
    electricityUnitCostPerKwh: 'Electricity unit cost',
    coreAndShellUnitCostPerM2: 'Core & shell unit cost',
    fitOutUnitCostPerM2: 'Fit-out unit cost',
    waterUnitCostPerM3: 'Water unit cost',
    heatRecoveryValuePerKwh: 'Heat recovery value',
    coreAndShellMaintenanceFraction: 'Core & shell maintenance %',
    equipmentMaintenanceFraction: 'Equipment maintenance %',
    electricityCo2GPerKwh: 'Electricity CO₂ (g/kWh)',
    electricityWaterLPerKwh: 'Electricity water (L/kWh)',
    facilityPowerCoolingLifespanYr: 'Facility lifespan (yr)',
    itEquipmentLifespanYr: 'IT lifespan (yr)',
    discountRateFraction: 'Discount rate',
    capexFinancingRateFraction: 'Financing rate',
    capexFinancedFraction: 'Financed fraction',
    capexFinancingTermYr: 'Financing term (yr)',
    annualHours: 'Annual hours',
  }

  for (const field of financeFields) {
    if (!(field in inputs)) {
      warnings.push(`Could not detect: ${financeFieldLabels[field] ?? field}`)
    }
  }

  if (!('powerCapacityUtilization' in inputs)) {
    warnings.push('Could not detect: Power capacity utilization')
  }

  // Config IDs (dataroom names, cooling, power) — always warn since we can't
  // map free-text names to config IDs without a lookup
  warnings.push('Could not detect: Dataroom configuration names (manual selection required)')
  warnings.push('Could not detect: Cooling config names (manual selection required)')
  warnings.push('Could not detect: Power redundancy (manual selection required)')

  const success = financeMatched.size > 0 || itMatched.size > 0

  if (!success && errors.length === 0) {
    errors.push(
      'No recognizable fields were found in the Input sheet. ' +
      'Ensure this is an OCP CE TCO Tool v1.11 workbook.',
    )
  }

  return {
    success,
    scenarioName,
    inputs,
    warnings,
    errors,
  }
}
