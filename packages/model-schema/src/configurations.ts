import { z } from 'zod'
import { RedundancyLevel, NonNegativeDecimal, Provenance } from './units.js'

// A named slot binding: which equipment ID + how many units
const EquipmentSlot = z.object({
  equipmentId: z.string(),
  quantity: z.number().int().nonnegative(),
})

// ─── Power configurations (Critical and Mechanical) ───────────────────────────
// Maps to the Power Configurator table in the workbook Power tab.
export const PowerConfiguration = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  // Equipment for critical power path: TX, Genset, SWB, UPS, Chiller
  tx: EquipmentSlot.optional(),
  genset: EquipmentSlot.optional(),
  swb: EquipmentSlot.optional(),
  ups: EquipmentSlot.optional(),
  chiller: EquipmentSlot.optional(),
  provenance: Provenance.optional(),
})
export type PowerConfiguration = z.infer<typeof PowerConfiguration>

// ─── Cooling configurations (Air HRU and Liquid HRU) ─────────────────────────
// Maps to the Cooling Configurator table in the workbook Cooling tab.
export const CoolingConfiguration = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  pump: EquipmentSlot.optional(),
  compressor: EquipmentSlot.optional(),
  freeCooler: EquipmentSlot.optional(),
  fans: EquipmentSlot.optional(),
  // Chilled water temperature setpoint (°C) for this configuration
  tcwsCelsius: NonNegativeDecimal,
  // Approach temperature of heat exchanger network (°C)
  tappCelsius: NonNegativeDecimal,
  provenance: Provenance.optional(),
})
export type CoolingConfiguration = z.infer<typeof CoolingConfiguration>

// ─── Rack solution (containment geometry + CAPEX) ─────────────────────────────
// Maps to the rack_solutions table in the Data tab.
export const RackSolution = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  widthM: NonNegativeDecimal,
  depthM: NonNegativeDecimal,
  aisleM: NonNegativeDecimal,
  solutionAreaM2: NonNegativeDecimal,
  structureCost: NonNegativeDecimal,
  aisleContCost: NonNegativeDecimal,
  solutionCost: NonNegativeDecimal,
})
export type RackSolution = z.infer<typeof RackSolution>

// ─── Cluster solution (space-factor for equipment around racks) ───────────────
export const ClusterSolution = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  // Additional space around racks as fraction of rack area
  spaceFactor: NonNegativeDecimal,
})
export type ClusterSolution = z.infer<typeof ClusterSolution>

// ─── Redundancy selector for power and cooling ───────────────────────────────
export const RedundancyConfig = z.object({
  power: RedundancyLevel,
  cooling: RedundancyLevel,
})
export type RedundancyConfig = z.infer<typeof RedundancyConfig>
