import { z } from 'zod'
import { NonNegativeDecimal, FractionDecimal, Provenance } from './units.js'

// ─── Chassis configuration ────────────────────────────────────────────────────
// Up to 3 chassis types per rack, each with a quantity.
const ChassisSlot = z.object({
  chassisId: z.string(),
  quantity: z.number().int().nonnegative(),
})

export const RackConfig = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  rackSolutionId: z.string(),
  // Up to 3 chassis slots (PRD §6.4)
  chassisSlots: z.array(ChassisSlot).max(3),
  rPduId: z.string().optional(),
  rPduQuantity: z.number().int().nonnegative().optional(),
  rCduId: z.string().optional(),
  rCduQuantity: z.number().int().nonnegative().optional(),
  provenance: Provenance.optional(),
})
export type RackConfig = z.infer<typeof RackConfig>

// ─── Cluster configuration ────────────────────────────────────────────────────
// Up to 3 rack types per cluster, each with a quantity.
const RackSlot = z.object({
  rackConfigId: z.string(),
  quantity: z.number().int().nonnegative(),
})

export const ClusterConfig = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  clusterSolutionId: z.string(),
  // Up to 3 rack slots
  rackSlots: z.array(RackSlot).max(3),
  pduId: z.string().optional(),
  pduQuantity: z.number().int().nonnegative().optional(),
  provenance: Provenance.optional(),
})
export type ClusterConfig = z.infer<typeof ClusterConfig>

// ─── Dataroom configuration ───────────────────────────────────────────────────
// Up to 4 cluster types per dataroom.
const ClusterSlot = z.object({
  clusterConfigId: z.string(),
  quantity: z.number().int().nonnegative(),
})

// Performance/efficiency metrics stored in the Dataroom Library row
// Populated by running the sub-model, then copied into library by user (or automatically).
// NOTE: must be declared before DataroomConfig so it can be referenced in the schema.
export const DataroomMetrics = z.object({
  loadKw: NonNegativeDecimal,
  fixedAreaM2: NonNegativeDecimal,
  proportionalAreaM2PerKw: NonNegativeDecimal.optional(),
  fixedCost: NonNegativeDecimal,
  proportionalCostPerKw: NonNegativeDecimal.optional(),
  proportionalLoss: FractionDecimal,
  heatToLtHruFraction: FractionDecimal,
  iteLoadEfficiencyL2: FractionDecimal,
  iteLoadEfficiencyL3: FractionDecimal,
  iteLoadEfficiencyL4: FractionDecimal,
})
export type DataroomMetrics = z.infer<typeof DataroomMetrics>

export const DataroomConfig = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  // Up to 4 cluster slots (workbook and PRES are the authority; UG text says 3 but workbook = 4)
  clusterSlots: z.array(ClusterSlot).max(4),
  // CRAH for air-cooled path
  crahId: z.string().optional(),
  crahQuantity: z.number().int().nonnegative().optional(),
  // CDU for liquid-cooled path
  cduId: z.string().optional(),
  cduQuantity: z.number().int().nonnegative().optional(),
  // Derived performance metrics (populated by the configurator calculator, not user-editable)
  metrics: DataroomMetrics.optional(),
  provenance: Provenance.optional(),
})
export type DataroomConfig = z.infer<typeof DataroomConfig>
