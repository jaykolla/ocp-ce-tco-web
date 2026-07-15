/**
 * Economization mode computation from TMY dry-bulb data.
 *
 * PRD §6.9:
 *   criticalTemp = Tcws - Tapp
 *   Peak performance: highest relevant ambient condition
 *   Annual-average: weighted by mode hours
 */

import type { WeatherProfile, EconomizationSummary } from '@ocp-tco/model-schema'

export function computeEconomization(
  profile: WeatherProfile,
  tcwsCelsius: number,
  tappCelsius: number
): EconomizationSummary {
  const criticalTempCelsius = tcwsCelsius - tappCelsius

  let hoursFullEcon = 0
  let hoursNoEcon = 0
  let sumAmbient = 0
  let peakAmbient = -Infinity

  for (const ambientC of profile.hourlyDryBulbCelsius) {
    sumAmbient += ambientC
    if (ambientC > peakAmbient) peakAmbient = ambientC

    if (ambientC <= criticalTempCelsius) {
      hoursFullEcon++
    } else {
      hoursNoEcon++
    }
  }

  const totalHours = profile.hourlyDryBulbCelsius.length

  return {
    criticalTempCelsius,
    hoursFullEcon,
    hoursPartialEcon: 0, // v1.11 uses a binary split: full econ vs compressor
    hoursNoEcon,
    annualAvgAmbientCelsius: totalHours > 0 ? sumAmbient / totalHours : 0,
    peakAmbientCelsius: peakAmbient === -Infinity ? 0 : peakAmbient,
  }
}
