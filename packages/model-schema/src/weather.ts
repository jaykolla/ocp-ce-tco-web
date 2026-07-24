import { z } from 'zod'

// ANSI/ASHRAE 169-2006 climate zone IDs supported in v1.11
// 'custom' is a special value used when a PVGIS custom location is selected (R2)
export const ClimateZoneId = z.enum([
  '0A', '0B', '1A', '1B', '2A', '2B',
  '3A', '3B', '3C', '4A', '4B', '4C',
  '5A', '5B', '5C', '6A', '6B', '7', '8',
  'custom'
])
export type ClimateZoneId = z.infer<typeof ClimateZoneId>

// v1.11 temperature category selections (replaces raw ASHRAE zone in UI)
export const TemperatureCategory = z.enum([
  'Subarctic/arctic',
  'Very cold',
  'Cold',
  'Cool',
  'Mixed',
  'Warm',
  'Hot',
  'Very hot',
  'Extremely hot',
])
export type TemperatureCategory = z.infer<typeof TemperatureCategory>

export const HumidityCategory = z.enum(['Dry', 'Mixed', 'Humid', 'Maritime', 'Wet'])
export type HumidityCategory = z.infer<typeof HumidityCategory>

// Reference location record mapping climate zone to a city and TMY data
export const WeatherProfile = z.object({
  zoneId: ClimateZoneId,
  referenceCity: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  temperature: TemperatureCategory,
  humidity: HumidityCategory,
  // 8,760 hourly dry-bulb temperatures (°C), index 0 = Jan 1 00:00
  hourlyDryBulbCelsius: z.array(z.number()).length(8760),
  dataSource: z.string(),   // e.g. "PVGIS 5.3 TMY 2005-2013"
  version: z.string(),
})
export type WeatherProfile = z.infer<typeof WeatherProfile>

// Economization summary computed from a weather profile + cooling config
export const EconomizationSummary = z.object({
  criticalTempCelsius: z.number(), // Tcws - Tapp
  // Hours per year in each mode
  hoursFullEcon: z.number(),       // ambient <= criticalTemp
  hoursPartialEcon: z.number(),    // ambient > criticalTemp but free-cooler assists
  hoursNoEcon: z.number(),         // full compressor operation
  // Annual-average ambient temperature weighted by hours
  annualAvgAmbientCelsius: z.number(),
  // Peak ambient (worst-case sizing)
  peakAmbientCelsius: z.number(),
})
export type EconomizationSummary = z.infer<typeof EconomizationSummary>
