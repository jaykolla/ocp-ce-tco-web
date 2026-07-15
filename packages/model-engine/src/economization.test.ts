/**
 * Unit tests for economization mode computation.
 *
 * PRD §6.9:
 *   criticalTemp = Tcws - Tapp
 *   Hours below criticalTemp → full free-cooling (no compressor)
 *   Hours above criticalTemp → compressor required
 *   v1.11 uses a binary split: full-econ vs no-econ (hoursPartialEcon = 0)
 *
 * Paris workbook benchmark (zone 4A, Warm/Mixed):
 *   Tcws = 20°C, Tapp = 5°C → criticalTemp = 15°C
 *
 * Singapore workbook benchmark (zone 0A, Extremely hot):
 *   Near-zero free-cooling hours (ambient almost always > 15°C)
 *   Singapore!G21 (mech losses) >> Paris!G21
 */

import { describe, it, expect } from 'vitest'
import { computeEconomization } from './weather'
import type { WeatherProfile } from '@ocp-tco/model-schema'

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeProfile(hourlyDryBulbCelsius: number[]): WeatherProfile {
  // Pad or trim to exactly 8760 hours for schema compliance
  const data = Array.from({ length: 8760 }, (_, i) => hourlyDryBulbCelsius[i] ?? 15)
  return {
    zoneId: '4A',
    referenceCity: 'Test City',
    latitude: 0,
    longitude: 0,
    temperature: 'Warm',
    humidity: 'Dry',
    hourlyDryBulbCelsius: data,
    dataSource: 'synthetic',
    version: '1.11.0',
  }
}

// ─── criticalTemp formula ─────────────────────────────────────────────────────

describe('criticalTemp = Tcws - Tapp', () => {
  it('Paris: Tcws=20, Tapp=5 → criticalTemp=15', () => {
    const profile = makeProfile(Array(8760).fill(10))
    const result = computeEconomization(profile, 20, 5)
    expect(result.criticalTempCelsius).toBe(15)
  })

  it('Different Tcws/Tapp values are reflected', () => {
    const profile = makeProfile(Array(8760).fill(10))
    const result = computeEconomization(profile, 30, 8)
    expect(result.criticalTempCelsius).toBe(22)
  })

  it('criticalTemp can be negative (extreme cold supply water)', () => {
    const profile = makeProfile(Array(8760).fill(-5))
    const result = computeEconomization(profile, 5, 10)
    expect(result.criticalTempCelsius).toBe(-5)
  })
})

// ─── Hour counting ────────────────────────────────────────────────────────────

describe('hour counting for economization modes', () => {
  it('counts hours correctly for a synthetic 50/50 profile', () => {
    // Alternating: even hours = 10°C (below 15), odd hours = 20°C (above 15)
    const profile = makeProfile(
      Array.from({ length: 8760 }, (_, i) => (i % 2 === 0 ? 10 : 20))
    )
    const result = computeEconomization(profile, 20, 5)  // criticalTemp = 15
    expect(result.criticalTempCelsius).toBe(15)
    expect(result.hoursFullEcon).toBe(4380)   // half below 15°C
    expect(result.hoursNoEcon).toBe(4380)     // half above 15°C
    expect(result.hoursPartialEcon).toBe(0)   // v1.11 binary split
  })

  it('all hours in free-cooling when profile always below criticalTemp', () => {
    const profile = makeProfile(Array(8760).fill(0))  // 0°C all year
    const result = computeEconomization(profile, 20, 5)  // criticalTemp = 15
    expect(result.hoursFullEcon).toBe(8760)
    expect(result.hoursNoEcon).toBe(0)
  })

  it('zero free-cooling hours when profile always above criticalTemp (Singapore-like)', () => {
    const profile = makeProfile(Array(8760).fill(30))  // 30°C all year
    const result = computeEconomization(profile, 20, 5)  // criticalTemp = 15
    expect(result.hoursFullEcon).toBe(0)
    expect(result.hoursNoEcon).toBe(8760)
  })

  it('boundary: hours exactly at criticalTemp count as full-econ', () => {
    // PRD §6.9: ambient <= criticalTemp → full econ (inclusive boundary)
    const profile = makeProfile(Array(8760).fill(15))  // exactly at threshold
    const result = computeEconomization(profile, 20, 5)  // criticalTemp = 15
    expect(result.hoursFullEcon).toBe(8760)
    expect(result.hoursNoEcon).toBe(0)
  })

  it('hoursFullEcon + hoursNoEcon + hoursPartialEcon = 8760', () => {
    const profile = makeProfile(
      Array.from({ length: 8760 }, (_, i) => 5 + (i % 30))  // varying 5-34°C
    )
    const result = computeEconomization(profile, 20, 5)  // criticalTemp = 15
    expect(result.hoursFullEcon + result.hoursNoEcon + result.hoursPartialEcon).toBe(8760)
  })
})

// ─── peakAmbient ─────────────────────────────────────────────────────────────

describe('peakAmbientCelsius', () => {
  it('returns the maximum hourly temperature', () => {
    const hourly = Array(8760).fill(15)
    hourly[100] = 38  // hottest hour
    const profile = makeProfile(hourly)
    const result = computeEconomization(profile, 20, 5)
    expect(result.peakAmbientCelsius).toBe(38)
  })

  it('returns correct peak for monotonically increasing profile', () => {
    const hourly = Array.from({ length: 8760 }, (_, i) => i * 0.01)  // 0 to 87.59°C
    const profile = makeProfile(hourly)
    const result = computeEconomization(profile, 20, 5)
    expect(result.peakAmbientCelsius).toBeCloseTo(87.59, 1)
  })

  it('peak is always >= annualAvgAmbientCelsius', () => {
    const hourly = Array.from({ length: 8760 }, (_, i) => 10 + 5 * Math.sin(i / 100))
    const profile = makeProfile(hourly)
    const result = computeEconomization(profile, 20, 5)
    expect(result.peakAmbientCelsius).toBeGreaterThanOrEqual(result.annualAvgAmbientCelsius)
  })
})

// ─── annualAvgAmbientCelsius ──────────────────────────────────────────────────

describe('annualAvgAmbientCelsius', () => {
  it('equals constant temperature for flat profile', () => {
    const profile = makeProfile(Array(8760).fill(12.5))
    const result = computeEconomization(profile, 20, 5)
    expect(result.annualAvgAmbientCelsius).toBeCloseTo(12.5, 5)
  })

  it('correctly averages a 50/50 split profile', () => {
    // half at 10°C, half at 20°C → avg = 15°C
    const hourly = Array.from({ length: 8760 }, (_, i) => (i % 2 === 0 ? 10 : 20))
    const profile = makeProfile(hourly)
    const result = computeEconomization(profile, 20, 5)
    expect(result.annualAvgAmbientCelsius).toBeCloseTo(15.0, 5)
  })

  it('is within [min, max] of profile', () => {
    const hourly = Array.from({ length: 8760 }, (_, i) => 5 + (i % 30))
    const profile = makeProfile(hourly)
    const result = computeEconomization(profile, 20, 5)
    const min = Math.min(...hourly)
    const max = Math.max(...hourly)
    expect(result.annualAvgAmbientCelsius).toBeGreaterThanOrEqual(min)
    expect(result.annualAvgAmbientCelsius).toBeLessThanOrEqual(max)
  })
})

// ─── Paris vs Singapore comparison ───────────────────────────────────────────

describe('Paris vs Singapore economization comparison', () => {
  it('Paris (zone 4A) has more free-cooling hours than Singapore (zone 0A)', () => {
    // Paris: moderate climate, many hours below 15°C
    const parisHourly = Array.from({ length: 8760 }, (_, i) => {
      const day = Math.floor(i / 24)
      return 12 - 12 * Math.cos(2 * Math.PI * day / 365) + 2 * Math.sin(i)
    })
    const parisProfile = makeProfile(parisHourly)
    const parisResult = computeEconomization(parisProfile, 20, 5)

    // Singapore: hot year-round, almost no hours below 15°C
    const singaporeHourly = Array(8760).fill(28)  // constant 28°C
    const singaporeProfile = {
      ...makeProfile(singaporeHourly),
      zoneId: '0A' as const,
      referenceCity: 'Singapore',
      temperature: 'Extremely hot' as const,
      humidity: 'Humid' as const,
    }
    const singaporeResult = computeEconomization(singaporeProfile, 20, 5)

    expect(parisResult.hoursFullEcon).toBeGreaterThan(singaporeResult.hoursFullEcon)
    expect(singaporeResult.hoursNoEcon).toBeGreaterThan(parisResult.hoursNoEcon)
  })

  it('Singapore has near-zero free-cooling (ambient always above 15°C)', () => {
    // Singapore avg ~28°C, never near 15°C threshold
    const singaporeHourly = Array.from({ length: 8760 }, (_, i) => 26 + 2 * Math.sin(i))
    const profile = makeProfile(singaporeHourly)
    const result = computeEconomization(profile, 20, 5)  // criticalTemp = 15
    // All 8760 hours should be compressor hours (no hour < 15°C when min is ~24°C)
    expect(result.hoursFullEcon).toBe(0)
    expect(result.hoursNoEcon).toBe(8760)
  })
})

// ─── v1.11 binary split constraint ───────────────────────────────────────────

describe('v1.11 binary split: no partial economization', () => {
  it('hoursPartialEcon is always 0 (v1.11 uses binary split)', () => {
    const profiles = [
      Array(8760).fill(5),
      Array(8760).fill(20),
      Array.from({ length: 8760 }, (_, i) => i % 30),
    ]
    for (const hourly of profiles) {
      const profile = makeProfile(hourly)
      const result = computeEconomization(profile, 20, 5)
      expect(result.hoursPartialEcon).toBe(0)
    }
  })
})
