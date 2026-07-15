/**
 * OCP CE TCO v1.11 XLSX Extractor — direct OOXML reader
 *
 * Reads the workbook as a zip, parses shared strings + sheet XML,
 * and emits seed JSON + baseline fixtures.
 *
 * Uses no Excel formula engine. Cached cell values are read from
 * the <v> element inside each <c> cell node.
 */

import { createReadStream, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { createHash } from 'crypto'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { XMLParser } from 'fast-xml-parser'
import unzipper from 'unzipper'

const __dirname = dirname(fileURLToPath(import.meta.url))
// __dirname = .../ocp-ce-tco-web/tools/xlsx-extractor/src
// ROOT      = .../TCO_Calculator_OCP_DC
const ROOT = resolve(__dirname, '../../../..')
const WORKBOOK_PATH = resolve(
  ROOT,
  'OCP CE TCO tool v1.11/OCP CE TCO tool v1.11.xlsx'
)
const OUT_SEED = resolve(ROOT, 'ocp-ce-tco-web/packages/seed-data/src/generated')
const OUT_FIXTURES = resolve(ROOT, 'ocp-ce-tco-web/packages/test-fixtures')

mkdirSync(OUT_SEED, { recursive: true })
mkdirSync(resolve(OUT_FIXTURES, 'scenarios'), { recursive: true })

function emit(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`  ✓ ${path.split('/').slice(-3).join('/')}`)
}

// ─── Read zip entries ─────────────────────────────────────────────────────────

async function readZipEntry(zipPath: string, entryName: string): Promise<Buffer | null> {
  return new Promise((res) => {
    const zip = createReadStream(zipPath).pipe(unzipper.Parse({ forceStream: true }))
    let found = false
    zip.on('entry', (entry: unzipper.Entry) => {
      if (entry.path === entryName) {
        found = true
        const chunks: Buffer[] = []
        entry.on('data', (c: Buffer) => chunks.push(c))
        entry.on('end', () => res(Buffer.concat(chunks)))
      } else {
        entry.autodrain()
      }
    })
    zip.on('close', () => { if (!found) res(null) })
    zip.on('error', () => res(null))
  })
}

async function listZipEntries(zipPath: string): Promise<string[]> {
  return new Promise((res) => {
    const entries: string[] = []
    const zip = createReadStream(zipPath).pipe(unzipper.Parse({ forceStream: true }))
    zip.on('entry', (entry: unzipper.Entry) => {
      entries.push(entry.path)
      entry.autodrain()
    })
    zip.on('close', () => res(entries))
    zip.on('error', () => res(entries))
  })
}

// ─── XML parser ───────────────────────────────────────────────────────────────

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ['row', 'c', 'si', 'r', 't', 'sheet', 'Relationship'].includes(name),
})

// ─── Parse shared strings ─────────────────────────────────────────────────────

function parseSharedStrings(buf: Buffer): string[] {
  const parsed = xmlParser.parse(buf.toString('utf8'))
  const sst = parsed.sst
  if (!sst) return []
  const items: string[] = []
  const siArr = Array.isArray(sst.si) ? sst.si : (sst.si ? [sst.si] : [])
  for (const si of siArr) {
    if (si.t !== undefined) {
      items.push(String(si.t?.['#text'] ?? si.t ?? ''))
    } else if (si.r) {
      const parts = Array.isArray(si.r) ? si.r : [si.r]
      items.push(parts.map((r: any) => String(r.t?.['#text'] ?? r.t ?? '')).join(''))
    } else {
      items.push('')
    }
  }
  return items
}

// ─── Parse a single worksheet ─────────────────────────────────────────────────
// Returns a 2D array indexed [row][col] (0-based), values as strings/numbers.

type CellValue = string | number | null

function colLetterToIndex(col: string): number {
  let idx = 0
  for (const ch of col) idx = idx * 26 + (ch.charCodeAt(0) - 64)
  return idx - 1
}

function parseCellRef(ref: string): [number, number] {
  const match = ref.match(/^([A-Z]+)(\d+)$/)
  if (!match) return [0, 0]
  return [parseInt(match[2]!) - 1, colLetterToIndex(match[1]!)]
}

function parseSheet(buf: Buffer, sharedStrings: string[]): CellValue[][] {
  const parsed = xmlParser.parse(buf.toString('utf8'))
  const ws = parsed.worksheet
  const sheetData = ws?.sheetData
  if (!sheetData) return []

  const rows: CellValue[][] = []
  const rowArr = Array.isArray(sheetData.row) ? sheetData.row : (sheetData.row ? [sheetData.row] : [])

  for (const row of rowArr) {
    const rowIdx = parseInt(row['@_r']) - 1
    while (rows.length <= rowIdx) rows.push([])
    const cells = Array.isArray(row.c) ? row.c : (row.c ? [row.c] : [])
    for (const cell of cells) {
      const [, colIdx] = parseCellRef(cell['@_r'])
      while (rows[rowIdx]!.length <= colIdx) rows[rowIdx]!.push(null)
      const t = cell['@_t']
      const v = cell.v
      let value: CellValue = null
      if (v !== undefined && v !== null) {
        if (t === 's') {
          // Shared string reference
          value = sharedStrings[parseInt(String(v))] ?? null
        } else if (t === 'str' || t === 'inlineStr') {
          value = String(v)
        } else {
          const n = parseFloat(String(v))
          value = isNaN(n) ? String(v) : n
        }
      }
      rows[rowIdx]![colIdx] = value
    }
  }
  return rows
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCell(sheet: CellValue[][], row: number, col: number): CellValue {
  return sheet[row]?.[col] ?? null
}

function findRowWithLabel(sheet: CellValue[][], label: string, startRow = 0): number {
  for (let r = startRow; r < sheet.length; r++) {
    if (String(sheet[r]?.[0] ?? '').trim() === label) return r
  }
  return -1
}

function findRowContaining(sheet: CellValue[][], label: string, startRow = 0, col = 0): number {
  for (let r = startRow; r < sheet.length; r++) {
    if (String(sheet[r]?.[col] ?? '').toLowerCase().includes(label.toLowerCase())) return r
  }
  return -1
}

// ─── Extract equipment table from a column-per-item structure ─────────────────

function extractEquipmentTable(
  sheet: CellValue[][],
  typeRow: number,
  rowLabels: string[]
): Array<{ name: string; [key: string]: unknown }> {
  const typeName = String(sheet[typeRow]?.[0] ?? '')
  const items: Array<{ name: string; [key: string]: unknown }> = []

  // Collect column names (item instances) from row B onward
  const names: string[] = []
  for (let c = 1; c <= 30; c++) {
    const n = getCell(sheet, typeRow, c)
    if (n !== null && String(n).trim()) names.push(String(n).trim())
    else if (c > 3) break
  }
  if (!names.length) return items

  // Build per-column data from subsequent rows
  const colData: Record<string, (CellValue)[]> = {}
  for (const label of rowLabels) {
    colData[label] = names.map(() => null)
  }

  let checkRow = typeRow + 1
  let labelsFound = 0
  while (checkRow < sheet.length && labelsFound < rowLabels.length && checkRow < typeRow + rowLabels.length + 5) {
    const rowLabel = String(sheet[checkRow]?.[0] ?? '').trim()
    if (rowLabels.includes(rowLabel)) {
      names.forEach((_, idx) => {
        colData[rowLabel]![idx] = getCell(sheet, checkRow, idx + 1)
      })
      labelsFound++
    }
    if (rowLabel === '<<Show/Hide') break
    checkRow++
  }

  names.forEach((name, idx) => {
    const entry: { name: string; [key: string]: unknown } = { name }
    rowLabels.forEach(label => {
      const slug = label.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_')
      entry[slug] = colData[label]?.[idx] ?? null
    })
    entry['_type'] = typeName
    items.push(entry)
  })

  return items
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('OCP CE TCO v1.11 Extractor (OOXML direct reader)')
  console.log('─'.repeat(52))

  const sha = createHash('sha256').update(readFileSync(WORKBOOK_PATH)).digest('hex')
  console.log(`Source SHA-256: ${sha}`)

  const entries = await listZipEntries(WORKBOOK_PATH)
  console.log(`Zip entries: ${entries.length} files`)

  // Install fast-xml-parser if missing — it was added to package.json
  const sharedStringsBuf = await readZipEntry(WORKBOOK_PATH, 'xl/sharedStrings.xml')
  const sharedStrings = sharedStringsBuf ? parseSharedStrings(sharedStringsBuf) : []
  console.log(`Shared strings: ${sharedStrings.length}`)

  // Discover worksheet names from workbook.xml
  const wbBuf = await readZipEntry(WORKBOOK_PATH, 'xl/workbook.xml')
  const wbXml = wbBuf ? xmlParser.parse(wbBuf.toString('utf8')) : {}
  const wbSheets = wbXml?.workbook?.sheets?.sheet ?? []
  const sheetsArr = Array.isArray(wbSheets) ? wbSheets : [wbSheets]
  console.log(`Worksheets: ${sheetsArr.map((s: any) => s['@_name']).join(', ')}`)

  // Map sheet names to zip paths via relationships
  const relsBuf = await readZipEntry(WORKBOOK_PATH, 'xl/_rels/workbook.xml.rels')
  const relsXml = relsBuf ? xmlParser.parse(relsBuf.toString('utf8')) : {}
  const relsArr: any[] = relsXml?.Relationships?.Relationship ?? []
  const idToPath: Record<string, string> = {}
  for (const rel of (Array.isArray(relsArr) ? relsArr : [relsArr])) {
    idToPath[rel['@_Id']] = `xl/${rel['@_Target']}`
  }

  const sheetMap: Record<string, CellValue[][]> = {}
  for (const s of sheetsArr) {
    const name: string = s['@_name']
    const id: string = s['@_r:id']
    const path = idToPath[id]
    if (!path) continue
    const buf = await readZipEntry(WORKBOOK_PATH, path)
    if (buf) {
      sheetMap[name] = parseSheet(buf, sharedStrings)
      console.log(`  Loaded sheet "${name}": ${sheetMap[name].length} rows`)
    }
  }

  const extractedAt = new Date().toISOString()
  const PROV = (sheetName: string, row: number) => ({
    source: `OCP CE TCO v1.11 ${sheetName} sheet`,
    sourceCells: [`${sheetName}!row${row + 1}`],
    extractedAt,
    sha256: sha,
  })

  // ─── Power Library ────────────────────────────────────────────────────────
  const powerSheet = sheetMap['Power'] ?? []
  const POWER_LABELS = [
    'Capacity', 'Fixed area', 'Proportional area', 'Fixed cost',
    'Proportional cost', 'Proportional losses', 'COP',
    'Heat rejection to air-side', 'Heat rejection to liquid-side',
    'Fixed water usage', 'Proportional water usage',
  ]
  const POWER_TYPES = ['TX', 'Genset', 'SWB', 'UPS', 'Chiller']
  const powerEquipment: unknown[] = []
  const powerConfigs: unknown[] = []

  for (let r = 0; r < powerSheet.length; r++) {
    const cell0 = String(powerSheet[r]?.[0] ?? '').trim()

    if (cell0 === 'Power') {
      // Power Configurator header
      const cfgNames: string[] = []
      for (let c = 1; c <= 20; c++) {
        const n = String(getCell(powerSheet, r, c) ?? '').trim()
        if (n) cfgNames.push(n)
        else if (c > 3) break
      }
      // Read equipment rows for this configurator
      const eqRows: Record<string, number> = {}
      for (let nr = r + 1; nr < r + 10 && nr < powerSheet.length; nr++) {
        const lbl = String(powerSheet[nr]?.[0] ?? '').trim()
        if (POWER_TYPES.includes(lbl)) eqRows[lbl] = nr
      }
      cfgNames.forEach((name, idx) => {
        const col = idx + 1
        powerConfigs.push({
          id: `power-config-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          version: 1,
          name,
          tx: getCell(powerSheet, eqRows['TX'] ?? r, col),
          genset: getCell(powerSheet, eqRows['Genset'] ?? r, col),
          swb: getCell(powerSheet, eqRows['SWB'] ?? r, col),
          ups: getCell(powerSheet, eqRows['UPS'] ?? r, col),
          chiller: getCell(powerSheet, eqRows['Chiller'] ?? r, col),
          provenance: PROV('Power', r),
        })
      })
    }

    if (POWER_TYPES.includes(cell0)) {
      const items = extractEquipmentTable(powerSheet, r, POWER_LABELS)
      items.forEach(item => {
        powerEquipment.push({
          id: `power-${item['_type']}-${item.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          version: 1,
          name: item.name,
          category: 'power',
          type: item['_type'],
          status: 'published',
          provenance: PROV('Power', r),
          capacityKw: item.capacity,
          fixedAreaM2: item.fixed_area,
          proportionalAreaM2PerKw: item.proportional_area,
          fixedCost: item.fixed_cost,
          proportionalCostPerKw: item.proportional_cost,
          proportionalLoss: item.proportional_losses,
          cop: item.cop,
          heatToAirFraction: item.heat_rejection_to_air_side,
          heatToLiquidFraction: item.heat_rejection_to_liquid_side,
          fixedWaterLph: item.fixed_water_usage,
          proportionalWaterLPerKwh: item.proportional_water_usage,
        })
      })
    }
  }

  emit(resolve(OUT_SEED, 'power-library.json'), powerEquipment)
  emit(resolve(OUT_SEED, 'power-configurations.json'), powerConfigs)

  // ─── Cooling Library ──────────────────────────────────────────────────────
  const coolingSheet = sheetMap['Cooling'] ?? []
  const COOLING_TYPES = ['Pump', 'Compressor', 'FreeCooler', 'Fans']
  const COOLING_LABELS = [
    'Capacity', 'Fixed area', 'Proportional area', 'Fixed cost',
    'Proportional cost', 'Proportional losses', 'COP',
    'Heat rejection to air-side', 'Heat rejection to liquid-side',
    'Fixed water usage', 'Proportional water usage',
  ]
  const coolingEquipment: unknown[] = []
  const coolingConfigs: unknown[] = []

  for (let r = 0; r < coolingSheet.length; r++) {
    const cell0 = String(coolingSheet[r]?.[0] ?? '').trim()

    if (cell0 === 'Cooling') {
      const cfgNames: string[] = []
      for (let c = 1; c <= 20; c++) {
        const n = String(getCell(coolingSheet, r, c) ?? '').trim()
        if (n) cfgNames.push(n)
        else if (c > 3) break
      }
      const eqRows: Record<string, number> = {}
      for (let nr = r + 1; nr < r + 10 && nr < coolingSheet.length; nr++) {
        const lbl = String(coolingSheet[nr]?.[0] ?? '').trim()
        if ([...COOLING_TYPES, 'Tcws', 'Tapp'].includes(lbl)) eqRows[lbl] = nr
      }
      cfgNames.forEach((name, idx) => {
        const col = idx + 1
        coolingConfigs.push({
          id: `cooling-config-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          version: 1,
          name,
          pump: getCell(coolingSheet, eqRows['Pump'] ?? r, col),
          compressor: getCell(coolingSheet, eqRows['Compressor'] ?? r, col),
          freeCooler: getCell(coolingSheet, eqRows['FreeCooler'] ?? r, col),
          fans: getCell(coolingSheet, eqRows['Fans'] ?? r, col),
          tcwsCelsius: getCell(coolingSheet, eqRows['Tcws'] ?? r, col),
          tappCelsius: getCell(coolingSheet, eqRows['Tapp'] ?? r, col),
          provenance: PROV('Cooling', r),
        })
      })
    }

    if (COOLING_TYPES.includes(cell0)) {
      const items = extractEquipmentTable(coolingSheet, r, COOLING_LABELS)
      items.forEach(item => {
        coolingEquipment.push({
          id: `cooling-${item['_type']}-${item.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          version: 1,
          name: item.name,
          category: 'cooling',
          type: item['_type'],
          status: 'published',
          provenance: PROV('Cooling', r),
          capacityKw: item.capacity,
          fixedAreaM2: item.fixed_area,
          proportionalAreaM2PerKw: item.proportional_area,
          fixedCost: item.fixed_cost,
          proportionalCostPerKw: item.proportional_cost,
          proportionalLoss: item.proportional_losses,
          cop: item.cop,
          heatToAirFraction: item.heat_rejection_to_air_side,
          heatToLiquidFraction: item.heat_rejection_to_liquid_side,
          fixedWaterLph: item.fixed_water_usage,
          proportionalWaterLPerKwh: item.proportional_water_usage,
        })
      })
    }
  }

  emit(resolve(OUT_SEED, 'cooling-library.json'), coolingEquipment)
  emit(resolve(OUT_SEED, 'cooling-configurations.json'), coolingConfigs)

  // ─── Weather Data ─────────────────────────────────────────────────────────
  const weatherSheet = sheetMap['weather'] ?? []
  const weatherProfiles: unknown[] = []
  let zoneHeaderRow = -1
  for (let r = 0; r < weatherSheet.length; r++) {
    if (String(weatherSheet[r]?.[0] ?? '').trim() === 'Zone ID') {
      zoneHeaderRow = r
      break
    }
  }

  if (zoneHeaderRow >= 0) {
    // Read zone reference table rows
    const zoneRows: Array<{ zoneId: string; city: string; lat: number; lon: number; temp: string; hum: string; rowIdx: number }> = []
    for (let r = zoneHeaderRow + 1; r < weatherSheet.length; r++) {
      const zoneId = String(weatherSheet[r]?.[0] ?? '').trim()
      if (!zoneId || !zoneId.match(/^\d/)) break
      zoneRows.push({
        zoneId,
        city: String(weatherSheet[r]?.[1] ?? '').trim(),
        lat: Number(weatherSheet[r]?.[2] ?? 0),
        lon: Number(weatherSheet[r]?.[3] ?? 0),
        temp: String(weatherSheet[r]?.[4] ?? '').trim(),
        hum: String(weatherSheet[r]?.[5] ?? '').trim(),
        rowIdx: r,
      })
    }

    // Find where hourly data starts: look for a row with col 0 = 1 or numeric sequence
    let hourlyStart = -1
    for (let r = zoneHeaderRow + zoneRows.length + 2; r < weatherSheet.length; r++) {
      const v = weatherSheet[r]?.[0]
      if (v === 1 || v === '1') { hourlyStart = r; break }
    }

    if (hourlyStart >= 0 && zoneRows.length > 0) {
      const hourlyData: number[][] = zoneRows.map(() => [])
      for (let h = 0; h < 8760; h++) {
        const row = weatherSheet[hourlyStart + h] ?? []
        zoneRows.forEach((_, zi) => {
          hourlyData[zi]!.push(Number(row[zi + 1] ?? 0))
        })
      }

      zoneRows.forEach((zone, zi) => {
        weatherProfiles.push({
          zoneId: zone.zoneId,
          referenceCity: zone.city,
          latitude: zone.lat,
          longitude: zone.lon,
          temperature: zone.temp,
          humidity: zone.hum,
          hourlyDryBulbCelsius: hourlyData[zi] ?? [],
          dataSource: 'PVGIS 5.3 TMY 2005-2013',
          version: '1.11.0',
        })
      })
    }
  }

  emit(resolve(OUT_SEED, 'weather-profiles.json'), weatherProfiles)

  // ─── Scenario Fixture: Output sheet (cached values for Paris + Singapore) ─
  for (const scenarioName of ['Paris', 'Singapore']) {
    const sSheet = sheetMap[scenarioName] ?? []
    const cells: Record<string, unknown> = {}
    sSheet.forEach((row, ri) => {
      row.forEach((val, ci) => {
        if (val !== null) {
          const colLetter = String.fromCharCode(65 + ci) + (ci >= 26 ? '' : '')
          cells[`${scenarioName}!${toColLetter(ci)}${ri + 1}`] = val
        }
      })
    })
    emit(resolve(OUT_FIXTURES, `scenarios/baseline-${scenarioName.toLowerCase()}.json`), {
      scenario: scenarioName,
      extractedAt,
      sourceWorkbook: 'OCP CE TCO tool v1.11.xlsx',
      sourceWorkbookSha256: sha,
      cachedCellValues: cells,
    })
  }

  // ─── Data Libraries (partial — chassis, CRAH, CDU) ────────────────────────
  const dataSheet = sheetMap['Data'] ?? []
  const chassisItems: unknown[] = []
  const crahItems: unknown[] = []
  const cduItems: unknown[] = []

  for (let r = 0; r < dataSheet.length; r++) {
    const cell0 = String(dataSheet[r]?.[0] ?? '').trim()
    if (cell0 === 'Chassis') {
      const CHASSIS_LABELS = [
        'Load', 'Fixed area', 'Proportional area', 'Unit cost (if known)',
        'Power-based cost estimate', 'Losses (eg. fans, PSUs)', 'COP',
        'Heat rejection to air-side', 'Height', 'ITE load efficiency (L3)', 'ITE load efficiency (L4)',
      ]
      const items = extractEquipmentTable(dataSheet, r, CHASSIS_LABELS)
      items.forEach(item => {
        chassisItems.push({
          id: `chassis-${item.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          version: 1, category: 'chassis', type: 'Chassis', status: 'published',
          provenance: PROV('Data', r), ...item,
        })
      })
    }
    if (cell0 === 'CRAH') {
      const CRAH_LABELS = ['Capacity', 'Fixed area', 'Proportional area', 'Fixed cost', 'Proportional cost', 'Proportional losses', 'COP']
      const items = extractEquipmentTable(dataSheet, r, CRAH_LABELS)
      items.forEach(item => {
        crahItems.push({
          id: `crah-${item.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          version: 1, category: 'data-local', type: 'CRAH', status: 'published',
          provenance: PROV('Data', r), ...item,
        })
      })
    }
    if (cell0 === 'CDU') {
      const CDU_LABELS = ['Capacity', 'Fixed area', 'Proportional area', 'Fixed cost', 'Proportional cost', 'Proportional losses', 'COP', 'Heat rejection to LT HRU']
      const items = extractEquipmentTable(dataSheet, r, CDU_LABELS)
      items.forEach(item => {
        cduItems.push({
          id: `cdu-${item.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          version: 1, category: 'data-local', type: 'CDU', status: 'published',
          provenance: PROV('Data', r), ...item,
        })
      })
    }
  }

  emit(resolve(OUT_SEED, 'chassis-library.json'), chassisItems)
  emit(resolve(OUT_SEED, 'crah-library.json'), crahItems)
  emit(resolve(OUT_SEED, 'cdu-library.json'), cduItems)

  // ─── Manifest ─────────────────────────────────────────────────────────────
  const manifest = {
    modelVersion: 'ocp-ce-tco-1.11-web-1',
    sourceWorkbookSha256: sha,
    sourceWorkbookFilename: 'OCP CE TCO tool v1.11.xlsx',
    extractedAt,
    seedDatasetVersions: { power: '1.11.0', cooling: '1.11.0', data: '1.11.0', weather: '1.11.0' },
    worksheetsExtracted: Object.keys(sheetMap),
    powerEquipmentCount: powerEquipment.length,
    powerConfigCount: powerConfigs.length,
    coolingEquipmentCount: coolingEquipment.length,
    coolingConfigCount: coolingConfigs.length,
    weatherProfileCount: weatherProfiles.length,
    chassisCount: chassisItems.length,
    metricDefinitions: {
      pueL3: { formulaId: 'M-PUE-L3-001', unit: 'ratio', description: 'Total facility power / ITE L3 rPDU output', sourceCells: ['Paris!G5'] },
      pueL4: { formulaId: 'M-PUE-L4-001', unit: 'ratio', description: 'Total facility power / ITE L4 node input', sourceCells: ['Paris!G6'] },
      erf:   { formulaId: 'M-ERF-001', unit: 'ratio', description: 'Heat recovery / total facility power', sourceCells: ['Paris!G7'] },
      wue:   { formulaId: 'M-WUE-001', unit: 'L/kWh', description: 'Equipment water * 1000 / (L2 kW * hours)', sourceCells: ['Paris!G8'] },
      cue:   { formulaId: 'M-CUE-001', unit: 'kgCO2e/kWh', description: 'PUE L3 * CO2_g/kWh / 1000', sourceCells: ['Paris!G9'] },
    },
    assumptions: [
      'A-AREA-70PCT: Overall area = 0.7 * (sqrt(facilities) + sqrt(datarooms))^2',
      'A-CAPEX-PEAK: CAPEX sized at 100% utilization peak',
      'A-OPEX-AVG: OPEX uses annual-average load with economization',
      'A-LAND-EXCLUDED: Land cost excluded',
      'A-ITE-EXCLUDED: Server/node purchase cost excluded',
    ],
  }

  emit(resolve(OUT_SEED, 'manifest.json'), manifest)
  console.log('\n✅ Extraction complete.')
}

function toColLetter(col: number): string {
  let result = ''
  col++
  while (col > 0) {
    const rem = (col - 1) % 26
    result = String.fromCharCode(65 + rem) + result
    col = Math.floor((col - 1) / 26)
  }
  return result
}

main().catch(err => {
  console.error('Extraction failed:', err)
  process.exit(1)
})
