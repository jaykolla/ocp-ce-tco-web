/**
 * PVGIS API client — EU PVGIS 5.2 Typical Meteorological Year (TMY) data
 *
 * Fetches 8,760 hourly dry-bulb temperature values for any lat/lon.
 * Results are cached in localStorage keyed by rounded coordinates (2dp).
 *
 * API: https://re.jrc.ec.europa.eu/api/v5_2/tmy
 * CORS: fully open, no API key required.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PvgisProfile {
  latitude: number
  longitude: number
  locationLabel: string
  hourlyDryBulbCelsius: number[]  // 8760 values
  fetchedAt: string
  source: 'PVGIS-5.2 TMY 2005-2020'
}

// ─── Internal response shapes ─────────────────────────────────────────────────

interface PvgisHourlyEntry {
  'time(UTC)': string
  T2m: number
}

interface PvgisApiResponse {
  outputs: {
    tmy_hourly: PvgisHourlyEntry[]
  }
  meta: {
    location: {
      latitude: number
      longitude: number
    }
  }
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

const CACHE_PREFIX = 'pvgis_profile_'
const CACHE_VERSION = 'v1'

function cacheKey(lat: number, lon: number): string {
  const latR = Math.round(lat * 100) / 100
  const lonR = Math.round(lon * 100) / 100
  return `${CACHE_PREFIX}${CACHE_VERSION}_${latR}_${lonR}`
}

export function getCachedProfile(lat: number, lon: number): PvgisProfile | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(cacheKey(lat, lon))
    if (!raw) return null
    const parsed = JSON.parse(raw) as PvgisProfile
    // Validate the cached profile has the right number of hourly entries
    if (!Array.isArray(parsed.hourlyDryBulbCelsius) || parsed.hourlyDryBulbCelsius.length !== 8760) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function setCachedProfile(profile: PvgisProfile): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(cacheKey(profile.latitude, profile.longitude), JSON.stringify(profile))
  } catch {
    // localStorage may be full or unavailable — fail silently
  }
}

// ─── Fetch with timeout ───────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timer)
  }
}

// ─── Main fetch function ──────────────────────────────────────────────────────

export async function fetchPvgisProfile(lat: number, lon: number, locationLabel = ''): Promise<PvgisProfile> {
  // Check cache first
  const cached = getCachedProfile(lat, lon)
  if (cached) return cached

  // Validate coordinate ranges
  if (lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90.`)
  }
  if (lon < -180 || lon > 180) {
    throw new Error(`Invalid longitude: ${lon}. Must be between -180 and 180.`)
  }

  const url =
    `https://re.jrc.ec.europa.eu/api/v5_2/tmy` +
    `?lat=${lat}&lon=${lon}&outputformat=json&startyear=2005&endyear=2020`

  let response: Response
  try {
    response = await fetchWithTimeout(url, 10_000)
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        'PVGIS API request timed out after 10 seconds. ' +
        'Check your network connection and try again.'
      )
    }
    throw new Error(
      `Unable to reach the PVGIS API. ` +
      `Check your network connection. (${err instanceof Error ? err.message : String(err)})`
    )
  }

  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.text()
      detail = body.slice(0, 200)
    } catch {
      // ignore parse errors
    }
    if (response.status === 400) {
      throw new Error(
        `PVGIS API rejected the coordinates (lat=${lat}, lon=${lon}). ` +
        `The location may be in the ocean or outside the supported region. ` +
        (detail ? `Details: ${detail}` : '')
      )
    }
    if (response.status === 429) {
      throw new Error('PVGIS API rate limit reached. Please wait a moment and try again.')
    }
    throw new Error(
      `PVGIS API returned HTTP ${response.status}. ` +
      (detail ? `Details: ${detail}` : 'Please try again later.')
    )
  }

  let data: PvgisApiResponse
  try {
    data = await response.json() as PvgisApiResponse
  } catch {
    throw new Error('PVGIS API returned an unexpected response format.')
  }

  const hourlyEntries = data?.outputs?.tmy_hourly
  if (!Array.isArray(hourlyEntries) || hourlyEntries.length === 0) {
    throw new Error(
      'PVGIS API response did not contain hourly temperature data. ' +
      'The location may not be supported.'
    )
  }

  if (hourlyEntries.length !== 8760) {
    throw new Error(
      `PVGIS API returned ${hourlyEntries.length} hourly entries — expected 8,760. ` +
      'The data may be incomplete.'
    )
  }

  const hourlyDryBulbCelsius = hourlyEntries.map((entry) => {
    const t = entry.T2m
    if (typeof t !== 'number' || !isFinite(t)) {
      throw new Error('PVGIS API returned a non-numeric temperature value.')
    }
    return t
  })

  // Use API-confirmed lat/lon if available, else our requested values
  const confirmedLat = data?.meta?.location?.latitude ?? lat
  const confirmedLon = data?.meta?.location?.longitude ?? lon

  const profile: PvgisProfile = {
    latitude: confirmedLat,
    longitude: confirmedLon,
    locationLabel: locationLabel || `${confirmedLat.toFixed(2)}, ${confirmedLon.toFixed(2)}`,
    hourlyDryBulbCelsius,
    fetchedAt: new Date().toISOString(),
    source: 'PVGIS-5.2 TMY 2005-2020',
  }

  setCachedProfile(profile)
  return profile
}
