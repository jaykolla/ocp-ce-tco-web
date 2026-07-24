/**
 * Geocoding via OpenStreetMap Nominatim API
 *
 * Free public API — no key required, CORS-enabled.
 * Rate limit: 1 request/second. Callers should debounce accordingly.
 *
 * API: https://nominatim.openstreetmap.org/search
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeoResult {
  displayName: string
  lat: number
  lon: number
  type: string      // city, town, suburb, etc.
  importance: number
}

// ─── Internal response shape ──────────────────────────────────────────────────

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  type: string
  importance: number
  class: string
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────

// Nominatim requires at least 1 second between requests from the same client.
// We enforce this with a simple timestamp gate.
let lastRequestAt = 0
const MIN_REQUEST_INTERVAL_MS = 1050  // 1.05s to be safe

async function enforceRateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestAt
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise<void>((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed)
    )
  }
  lastRequestAt = Date.now()
}

// ─── Main search function ─────────────────────────────────────────────────────

export async function searchLocation(query: string): Promise<GeoResult[]> {
  if (!query || query.trim().length < 2) return []

  await enforceRateLimit()

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query.trim())}&format=json&limit=5&addressdetails=0`

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        // Nominatim requires a descriptive User-Agent
        'Accept': 'application/json',
      },
    })
  } catch (err) {
    throw new Error(
      `Unable to reach the location search service. ` +
      `Check your network connection. (${err instanceof Error ? err.message : String(err)})`
    )
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Location search rate limit reached. Please wait a moment and try again.')
    }
    throw new Error(`Location search returned HTTP ${response.status}. Please try again.`)
  }

  let data: NominatimResult[]
  try {
    data = await response.json() as NominatimResult[]
  } catch {
    throw new Error('Location search returned an unexpected response format.')
  }

  if (!Array.isArray(data)) return []

  return data.map((item) => ({
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    type: item.type ?? item.class ?? 'place',
    importance: item.importance ?? 0,
  })).filter((r) => isFinite(r.lat) && isFinite(r.lon))
}
