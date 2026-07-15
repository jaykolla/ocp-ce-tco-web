/**
 * Equipment count derivation with redundancy.
 *
 * PRD §6.7:
 *   base = ceil(peakLoadKw / capacityKw / utilization)
 *   N  => base
 *   N+1 => base + 1
 *   2N  => 2 * base
 *
 * For characteristic equipment (no discrete capacity), count is not meaningful;
 * area and cost are computed from proportional characteristics instead.
 */

import type { RedundancyLevel } from '@ocp-tco/model-schema'

export function computeRedundancyCount(
  peakLoadKw: number,
  capacityKw: number | null,
  utilization: number,
  redundancy: RedundancyLevel
): number | null {
  if (capacityKw === null || capacityKw <= 0) {
    // Characteristic equipment — count is not applicable
    return null
  }
  if (utilization <= 0 || utilization > 1) {
    throw new Error(`Utilization must be in (0, 1], got ${utilization}`)
  }
  const base = Math.ceil(peakLoadKw / capacityKw / utilization)
  switch (redundancy) {
    case 'N': return base
    case 'N+1': return base + 1
    case '2N': return 2 * base
  }
}
