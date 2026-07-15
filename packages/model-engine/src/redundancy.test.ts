/**
 * Unit tests for redundancy count computation.
 *
 * PRD §6.7 spec:
 *   base = ceil(peakLoadKw / capacityKw / utilization)
 *   N    → base
 *   N+1  → base + 1
 *   2N   → 2 * base
 *
 * For characteristic equipment (capacityKw = null), count is not applicable.
 */

import { describe, it, expect } from 'vitest'
import { computeRedundancyCount } from './redundancy'

describe('computeRedundancyCount', () => {
  // ── N mode ──────────────────────────────────────────────────────────────────

  describe('N mode', () => {
    it('N: ceil(5000 / 600 / 1.0) = 9', () => {
      const count = computeRedundancyCount(5000, 600, 1.0, 'N')
      expect(count).toBe(9)  // ceil(8.333) = 9
    })

    it('N: exact division gives exact count', () => {
      // ceil(6000 / 600 / 1.0) = ceil(10) = 10
      const count = computeRedundancyCount(6000, 600, 1.0, 'N')
      expect(count).toBe(10)
    })

    it('N: fractional result rounds up (ceil semantics)', () => {
      // ceil(5001 / 600 / 1.0) = ceil(8.335) = 9
      const count = computeRedundancyCount(5001, 600, 1.0, 'N')
      expect(count).toBe(9)
    })

    it('N: utilization < 1 increases count (more units needed)', () => {
      // ceil(5000 / 600 / 0.80) = ceil(10.417) = 11
      const count = computeRedundancyCount(5000, 600, 0.80, 'N')
      expect(count).toBe(11)
    })

    it('N: small load, large capacity → 1 unit', () => {
      // ceil(100 / 600 / 1.0) = ceil(0.167) = 1
      const count = computeRedundancyCount(100, 600, 1.0, 'N')
      expect(count).toBe(1)
    })
  })

  // ── N+1 mode ─────────────────────────────────────────────────────────────────

  describe('N+1 mode', () => {
    it('N+1: base = ceil(5000/600/1.0)=9, so N+1 = 10', () => {
      const count = computeRedundancyCount(5000, 600, 1.0, 'N+1')
      expect(count).toBe(10)
    })

    it('N+1: is always base + 1', () => {
      const nCount = computeRedundancyCount(3600, 500, 0.9, 'N')!
      const np1Count = computeRedundancyCount(3600, 500, 0.9, 'N+1')!
      expect(np1Count).toBe(nCount + 1)
    })

    it('N+1: minimum is 2 (1 active + 1 spare)', () => {
      // ceil(100 / 600 / 1.0) = 1; N+1 = 2
      const count = computeRedundancyCount(100, 600, 1.0, 'N+1')
      expect(count).toBe(2)
    })

    it('N+1: utilization scaling works correctly', () => {
      // ceil(4000 / 600 / 0.75) = ceil(8.889) = 9; N+1 = 10
      const count = computeRedundancyCount(4000, 600, 0.75, 'N+1')
      expect(count).toBe(10)
    })
  })

  // ── 2N mode ───────────────────────────────────────────────────────────────────

  describe('2N mode', () => {
    it('2N: base = ceil(5000/600/1.0)=9, so 2N = 18', () => {
      const count = computeRedundancyCount(5000, 600, 1.0, '2N')
      expect(count).toBe(18)
    })

    it('2N: is always 2 * base', () => {
      const nCount = computeRedundancyCount(7200, 800, 0.85, 'N')!
      const twonCount = computeRedundancyCount(7200, 800, 0.85, '2N')!
      expect(twonCount).toBe(2 * nCount)
    })

    it('2N: minimum is 2 (1 active + 1 full mirror)', () => {
      // ceil(50 / 600 / 1.0) = 1; 2N = 2
      const count = computeRedundancyCount(50, 600, 1.0, '2N')
      expect(count).toBe(2)
    })

    it('2N > N+1 >= N for all valid inputs', () => {
      const load = 5000
      const cap = 600
      const util = 0.9
      const n = computeRedundancyCount(load, cap, util, 'N')!
      const np1 = computeRedundancyCount(load, cap, util, 'N+1')!
      const twon = computeRedundancyCount(load, cap, util, '2N')!
      expect(twon).toBeGreaterThan(np1)
      expect(np1).toBeGreaterThanOrEqual(n)
    })
  })

  // ── Characteristic equipment (capacityKw = null) ───────────────────────────

  describe('characteristic equipment (null capacity)', () => {
    it('returns null for null capacity', () => {
      const count = computeRedundancyCount(5000, null, 1.0, 'N')
      expect(count).toBeNull()
    })

    it('returns null for null capacity with N+1', () => {
      expect(computeRedundancyCount(5000, null, 0.9, 'N+1')).toBeNull()
    })

    it('returns null for null capacity with 2N', () => {
      expect(computeRedundancyCount(5000, null, 1.0, '2N')).toBeNull()
    })

    it('returns null for zero capacity', () => {
      // capacityKw = 0 treated as non-applicable
      expect(computeRedundancyCount(5000, 0, 1.0, 'N')).toBeNull()
    })
  })

  // ── Invalid inputs ────────────────────────────────────────────────────────────

  describe('invalid utilization', () => {
    it('throws for utilization = 0', () => {
      expect(() => computeRedundancyCount(5000, 600, 0, 'N')).toThrow()
    })

    it('throws for utilization > 1', () => {
      expect(() => computeRedundancyCount(5000, 600, 1.5, 'N')).toThrow()
    })

    it('throws for negative utilization', () => {
      expect(() => computeRedundancyCount(5000, 600, -0.5, 'N')).toThrow()
    })

    it('accepts utilization = 1.0 (100%)', () => {
      expect(() => computeRedundancyCount(5000, 600, 1.0, 'N')).not.toThrow()
    })
  })

  // ── Paris workbook benchmark validation ────────────────────────────────────────

  describe('Paris v1.11 workbook consistency', () => {
    it('reproduces Paris UPS count at 2N with typical Paris UPS sizing', () => {
      // Paris: ITE L1 = 3910.18 kW, UPS units typically 600-1000 kW each
      // With 2N redundancy and 100% utilization: base = ceil(3910.18 / 600 / 1.0) = 7
      // 2N = 14 UPS units
      const count = computeRedundancyCount(3910.18, 600, 1.0, '2N')
      expect(count).toBe(14)  // 2 * ceil(3910.18/600) = 2*7 = 14
    })

    it('N+1 count is always between N and 2N', () => {
      const load = 3910.18
      const capacity = 600
      const util = 1.0
      const n = computeRedundancyCount(load, capacity, util, 'N')!
      const np1 = computeRedundancyCount(load, capacity, util, 'N+1')!
      const twon = computeRedundancyCount(load, capacity, util, '2N')!
      expect(np1).toBeGreaterThan(n - 1)
      expect(twon).toBeGreaterThan(np1 - 1)
    })
  })
})
