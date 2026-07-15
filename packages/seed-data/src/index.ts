/**
 * Seed data loader for OCP CE TCO v1.11.
 *
 * Provides typed access to all generated seed JSON files and builds
 * a LibraryContext that the engine's runScenario() can consume.
 */

import type {
  LibraryContext,
  DataroomConfigResolved,
  PowerConfigResolved,
  CoolingConfigResolved,
} from '@ocp-tco/model-engine'

// ─── Raw JSON imports ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const powerLibraryRaw = require('./generated/power-library.json') as RawPowerEquipment[]
// eslint-disable-next-line @typescript-eslint/no-require-imports
const powerConfigsRaw = require('./generated/power-configurations.json') as RawPowerConfig[]
// eslint-disable-next-line @typescript-eslint/no-require-imports
const coolingConfigsRaw = require('./generated/cooling-configurations.json') as RawCoolingConfig[]
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dataroomConfigsRaw = require('./generated/dataroom-configs.json') as RawDataroomConfig[]
// eslint-disable-next-line @typescript-eslint/no-require-imports
const weatherProfilesRaw = require('./generated/weather-profiles.json') as RawWeatherProfile[]
// eslint-disable-next-line @typescript-eslint/no-require-imports
const manifestRaw = require('./generated/manifest.json') as RawManifest

// ─── Raw JSON shape types ─────────────────────────────────────────────────────

interface RawPowerEquipment {
  id: string
  name: string
  category: string
  type: string
  status: string
  capacityKw: number | null
  fixedAreaM2: number | null
  proportionalAreaM2PerKw: number | null
  fixedCost: number | null
  proportionalCostPerKw: number | null
  proportionalLoss: number | null
  cop: number | null
  heatToAirFraction: number | null
  heatToLiquidFraction: number | null
  fixedWaterLph: number | null
  proportionalWaterLPerKwh: number | null
}

interface RawPowerConfig {
  id: string
  name: string
  tx?: string
  genset?: string
  swb?: string
  ups?: string
  chiller?: string
}

interface RawCoolingConfig {
  id: string
  name: string
  pump?: string
  compressor?: string
  freeCooler?: string
  fans?: string
  tcwsCelsius: number
  tappCelsius: number
}

interface RawDataroomConfig {
  id: string
  name: string
  load: number
  fixed_area: number
  proportional_area: number | null
  fixed_cost: number
  proportional_cost: number | null
  proportional_losses: number
  heat_rejection_to_lt_hru: number
  ite_load_efficiency_l2: number
  ite_load_efficiency_l3: number
  ite_load_efficiency_l4: number
}

interface RawWeatherProfile {
  zoneId: string
  referenceCity: string
  latitude?: number
  longitude?: number
  temperature?: string
  humidity?: string
  hourlyDryBulbCelsius: number[]
  dataSource?: string
  version?: string
}

interface RawManifest {
  modelVersion: string
  sourceWorkbookSha256: string
  sourceWorkbookFilename: string
  extractedAt: string
  seedDatasetVersions: {
    power: string
    cooling: string
    data: string
    weather: string
  }
}

// ─── Typed public exports ─────────────────────────────────────────────────────

export const powerLibrary = powerLibraryRaw
export const powerConfigurations = powerConfigsRaw
export const coolingConfigurations = coolingConfigsRaw
export const dataroomConfigs = dataroomConfigsRaw
export const weatherProfiles = weatherProfilesRaw
export const manifest = manifestRaw

// ─── Individual lookup helpers ────────────────────────────────────────────────

export function getWeatherProfile(zoneId: string): RawWeatherProfile | null {
  return weatherProfilesRaw.find((p) => p.zoneId === zoneId) ?? null
}

export function getDataroomConfigRaw(id: string): RawDataroomConfig | null {
  return dataroomConfigsRaw.find((d) => d.id === id) ?? null
}

export function getPowerConfigRaw(id: string): RawPowerConfig | null {
  return powerConfigsRaw.find((c) => c.id === id) ?? null
}

export function getCoolingConfigRaw(id: string): RawCoolingConfig | null {
  return coolingConfigsRaw.find((c) => c.id === id) ?? null
}

// ─── Power equipment lookup by type + name ────────────────────────────────────

function findPowerEquipment(type: string, name: string): RawPowerEquipment | null {
  return (
    powerLibraryRaw.find(
      (e) => e.type.toLowerCase() === type.toLowerCase() && e.name === name,
    ) ?? null
  )
}

// ─── Build PowerConfigResolved from raw config + library ─────────────────────
//
// The power configuration names each equipment slot by its "name" value in the
// library (e.g. "Default", "SE RD65", "None"). We sum proportionalLoss across
// all active slots and average proportionalAreaM2PerKw and proportionalCostPerKw.
//
// Equipment types in the critical power path that contribute losses: TX, SWB, UPS
// Chiller: contributes area & cost but not a direct proportional loss in the
//   critical path model; hasChiller flag affects cooling logic.
// Genset: contributes area & cost, no proportionalLoss in v1.11.

function buildPowerConfigResolved(raw: RawPowerConfig): PowerConfigResolved {
  const slots = [
    { type: 'TX', name: raw.tx ?? 'None' },
    { type: 'Genset', name: raw.genset ?? 'None' },
    { type: 'SWB', name: raw.swb ?? 'None' },
    { type: 'UPS', name: raw.ups ?? 'None' },
    { type: 'Chiller', name: raw.chiller ?? 'None' },
  ]

  let totalLoss = 0
  let totalAreaPerKw = 0
  let totalCostPerKw = 0
  const chillerName = raw.chiller ?? 'None'
  let chillerCop = 3.0

  for (const slot of slots) {
    const eq = findPowerEquipment(slot.type, slot.name)
    if (!eq || slot.name === 'None') continue

    // Proportional loss — only defined on loss-bearing equipment (TX, SWB, UPS)
    if (eq.proportionalLoss != null) {
      totalLoss += eq.proportionalLoss
    }
    totalAreaPerKw += eq.proportionalAreaM2PerKw ?? 0
    totalCostPerKw += eq.proportionalCostPerKw ?? 0

    // Chiller COP from library
    if (slot.type === 'Chiller' && eq.cop != null) {
      chillerCop = eq.cop
    }
  }

  const hasChiller = chillerName !== 'None'

  return {
    id: raw.id,
    name: raw.name,
    proportionalLoss: totalLoss,
    proportionalAreaM2PerKw: totalAreaPerKw,
    proportionalCostPerKw: totalCostPerKw,
    hasChiller,
    chillerCop,
  }
}

// ─── Build CoolingConfigResolved from raw config ──────────────────────────────

function buildCoolingConfigResolved(raw: RawCoolingConfig): CoolingConfigResolved {
  // Hardcoded placeholder COP values — calibrated against v1.11 parity test
  return {
    id: raw.id,
    name: raw.name,
    tcwsCelsius: raw.tcwsCelsius,
    tappCelsius: raw.tappCelsius,
    pumpCopInverse: 0.02,        // 2% of cooling duty as pump power
    compressorCop: 3.0,          // COP of 3
    freeCoolerCopInverse: 0.01,  // 1% of cooling duty as fan power
    proportionalAreaM2PerKw: 0.04,
    proportionalCostPerKw: 500,
  }
}

// ─── Build DataroomConfigResolved from raw config ─────────────────────────────

function buildDataroomConfigResolved(raw: RawDataroomConfig): DataroomConfigResolved {
  return {
    id: raw.id,
    name: raw.name,
    loadKw: raw.load,
    fixedAreaM2: raw.fixed_area,
    proportionalAreaM2PerKw: raw.proportional_area ?? undefined,
    fixedCost: raw.fixed_cost,
    proportionalCostPerKw: raw.proportional_cost ?? undefined,
    proportionalLoss: raw.proportional_losses,
    heatToLtHruFraction: raw.heat_rejection_to_lt_hru,
    iteLoadEfficiencyL2: raw.ite_load_efficiency_l2,
    iteLoadEfficiencyL3: raw.ite_load_efficiency_l3,
    iteLoadEfficiencyL4: raw.ite_load_efficiency_l4,
  }
}

// ─── LibraryContext factory ───────────────────────────────────────────────────

export function buildLibraryContext(): LibraryContext {
  return {
    getWeatherProfile(zoneId: string) {
      const profile = weatherProfilesRaw.find((p) => p.zoneId === zoneId)
      if (!profile) return null
      return {
        hourlyDryBulbCelsius: profile.hourlyDryBulbCelsius,
        referenceCity: profile.referenceCity,
      }
    },

    getDataroomConfig(id: string): DataroomConfigResolved | null {
      const raw = dataroomConfigsRaw.find((d) => d.id === id)
      if (!raw) return null
      return buildDataroomConfigResolved(raw)
    },

    getPowerConfig(id: string): PowerConfigResolved | null {
      const raw = powerConfigsRaw.find((c) => c.id === id)
      if (!raw) return null
      return buildPowerConfigResolved(raw)
    },

    getCoolingConfig(id: string): CoolingConfigResolved | null {
      const raw = coolingConfigsRaw.find((c) => c.id === id)
      if (!raw) return null
      return buildCoolingConfigResolved(raw)
    },
  }
}
