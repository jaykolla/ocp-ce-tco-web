import { z } from 'zod'
import {
  DecimalString, NonNegativeDecimal, PositiveDecimal,
  FractionDecimal, LibraryItemStatus, Provenance
} from './units.js'

// ─── Power equipment types (from v1.11 Power Library) ───────────────────────
export const PowerEquipmentType = z.enum(['TX', 'Genset', 'SWB', 'UPS', 'Chiller'])
export type PowerEquipmentType = z.infer<typeof PowerEquipmentType>

// ─── Cooling equipment types (from v1.11 Cooling Library) ───────────────────
export const CoolingEquipmentType = z.enum([
  'Pump', 'Compressor', 'FreeCooler', 'Fans'
])
export type CoolingEquipmentType = z.infer<typeof CoolingEquipmentType>

// ─── Dataroom-local cooling equipment ────────────────────────────────────────
export const DataroomCoolingType = z.enum(['CRAH', 'CDU'])
export type DataroomCoolingType = z.infer<typeof DataroomCoolingType>

// ─── Common equipment spec (shared across Power and Cooling libraries) ────────
// Fixed values: known for specific SKUs
// Proportional values: per kW rated capacity (characteristic equipment)
// Either fixed OR proportional may be present (or both for area/cost).
const EquipmentBase = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  status: LibraryItemStatus,
  provenance: Provenance,

  // Optional discrete capacity; absent = characteristic (proportional only)
  capacityKw: PositiveDecimal.optional(),

  // Floor area: m², m²/kW, or both
  fixedAreaM2: NonNegativeDecimal.optional(),
  proportionalAreaM2PerKw: NonNegativeDecimal.optional(),

  // Capital cost in project currency
  fixedCost: NonNegativeDecimal.optional(),
  proportionalCostPerKw: NonNegativeDecimal.optional(),

  // Losses: fraction of load rejected as heat for subsequent cooling
  proportionalLoss: FractionDecimal.optional(),

  // Coefficient of Performance (fans, compressors, pumps)
  cop: PositiveDecimal.optional(),

  // Heat rejection split (fractions must sum to <= 1; remainder = ambient)
  heatToAirFraction: FractionDecimal.optional(),
  heatToLiquidFraction: FractionDecimal.optional(),

  // Water consumption
  fixedWaterLph: NonNegativeDecimal.optional(),
  proportionalWaterLPerKwh: NonNegativeDecimal.optional(),
})

export const PowerEquipmentSpec = EquipmentBase.extend({
  category: z.literal('power'),
  type: PowerEquipmentType,
})
export type PowerEquipmentSpec = z.infer<typeof PowerEquipmentSpec>

export const CoolingEquipmentSpec = EquipmentBase.extend({
  category: z.literal('cooling'),
  type: CoolingEquipmentType,
  // Cooling-specific: chilled water temperature setpoint and approach temp
  tcwsCelsius: DecimalString.optional(),
  tappCelsius: NonNegativeDecimal.optional(),
})
export type CoolingEquipmentSpec = z.infer<typeof CoolingEquipmentSpec>

// CRAH / CDU use the same extended schema
export const DataroomCoolingSpec = EquipmentBase.extend({
  category: z.literal('data-local'),
  type: DataroomCoolingType,
  // COP for CRAH (fan duty) and CDU (pump duty) relative to liquid-cooling duty
  cop: PositiveDecimal.optional(),
  // Proportion of heat rejection routed to LT HRU
  heatToLtHruFraction: FractionDecimal.optional(),
  iteLoadEfficiencyL2: FractionDecimal.optional(),
  iteLoadEfficiencyL3: FractionDecimal.optional(),
  iteLoadEfficiencyL4: FractionDecimal.optional(),
})
export type DataroomCoolingSpec = z.infer<typeof DataroomCoolingSpec>

// ─── Chassis spec ─────────────────────────────────────────────────────────────
export const ChassisSpec = EquipmentBase.extend({
  category: z.literal('chassis'),
  type: z.literal('Chassis'),
  // Non-value overhead (fans, PSUs) as fraction of chassis load
  proportionalLoss: FractionDecimal,
  // Rack units height (1U, 2U, 4U…)
  heightRu: z.number().int().positive(),
  // Fraction of chassis heat routed to air-side cooling
  heatToAirFraction: FractionDecimal,
  iteLoadEfficiencyL3: FractionDecimal.optional(),
  iteLoadEfficiencyL4: FractionDecimal,
})
export type ChassisSpec = z.infer<typeof ChassisSpec>

// ─── rPDU spec ────────────────────────────────────────────────────────────────
export const RPduSpec = EquipmentBase.extend({
  category: z.literal('data-local'),
  type: z.literal('rPDU'),
  // Air-cooled or liquid-cooled (immersed power shelves)
  cooling: z.enum(['air', 'liquid']),
  proportionalLoss: FractionDecimal,
})
export type RPduSpec = z.infer<typeof RPduSpec>

// ─── PDU spec ─────────────────────────────────────────────────────────────────
export const PduSpec = EquipmentBase.extend({
  category: z.literal('data-local'),
  type: z.literal('PDU'),
  proportionalLoss: FractionDecimal,
})
export type PduSpec = z.infer<typeof PduSpec>

// ─── rCDU spec (in-row, RDHX, DTC, immersion sidecar) ────────────────────────
export const RCduSpec = EquipmentBase.extend({
  category: z.literal('data-local'),
  type: z.literal('rCDU'),
  rCduVariant: z.enum(['in-row', 'RDHX', 'L2A-sidecar', 'immersion']),
  cop: PositiveDecimal,
  heatToAirFraction: FractionDecimal,
})
export type RCduSpec = z.infer<typeof RCduSpec>

// Union of all equipment types for library polymorphism
export const AnyEquipmentSpec = z.discriminatedUnion('category', [
  PowerEquipmentSpec,
  CoolingEquipmentSpec,
  DataroomCoolingSpec,
  ChassisSpec,
  RPduSpec,
  PduSpec,
  RCduSpec,
])
export type AnyEquipmentSpec = z.infer<typeof AnyEquipmentSpec>
