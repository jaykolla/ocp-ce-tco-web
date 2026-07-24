/**
 * Custom equipment library — localStorage persistence for user-added items.
 * Key: ocp-tco-custom-library
 *
 * Custom items are merged with seed data at runtime in the Library page.
 */

export type PowerEquipmentType = 'TX' | 'Genset' | 'SWB' | 'UPS' | 'Chiller'
export type CoolingEquipmentType = 'Pump' | 'Compressor' | 'FreeCooler' | 'Fan' | 'CRAH' | 'CDU'
export type DataEquipmentType = 'Chassis' | 'CRAH' | 'CDU'

export interface CustomEquipmentItem {
  id: string
  addedAt: string  // ISO timestamp
  category: 'power' | 'cooling' | 'data'
  // Power equipment fields
  name: string
  type: string
  proportionalAreaM2PerKw?: number
  proportionalCostPerKw?: number
  proportionalLoss?: number
  cop?: number
  heatToAirFraction?: number
  heatToLiquidFraction?: number
  // Chassis / data fields
  loadKw?: number
  lossesPercent?: number
  heightRu?: number
  iteL4EfficiencyPct?: number
}

const STORAGE_KEY = 'ocp-tco-custom-library'

function loadRaw(): CustomEquipmentItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRaw(items: CustomEquipmentItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function getCustomEquipment(): CustomEquipmentItem[] {
  return loadRaw()
}

export function addCustomEquipment(
  item: Omit<CustomEquipmentItem, 'id' | 'addedAt'>,
): CustomEquipmentItem {
  const items = loadRaw()
  const newItem: CustomEquipmentItem = {
    ...item,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    addedAt: new Date().toISOString(),
  }
  items.push(newItem)
  saveRaw(items)
  return newItem
}

export function updateCustomEquipment(
  id: string,
  updates: Partial<Omit<CustomEquipmentItem, 'id' | 'addedAt'>>,
): void {
  const items = loadRaw()
  const idx = items.findIndex((i) => i.id === id)
  if (idx === -1) return
  items[idx] = { ...items[idx], ...updates }
  saveRaw(items)
}

export function deleteCustomEquipment(id: string): void {
  const items = loadRaw().filter((i) => i.id !== id)
  saveRaw(items)
}

export function exportCustomLibrary(): void {
  const items = loadRaw()
  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    items,
  }
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ocp-tco-custom-library-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importCustomLibrary(file: File): Promise<void> {
  const text = await file.text()
  const parsed = JSON.parse(text)
  const incoming: CustomEquipmentItem[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.items)
      ? parsed.items
      : []

  const existing = loadRaw()
  const existingIds = new Set(existing.map((i) => i.id))

  // Merge: skip items whose id already exists
  const merged = [
    ...existing,
    ...incoming.filter((i) => !existingIds.has(i.id)),
  ]
  saveRaw(merged)
}
