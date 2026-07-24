'use client'

/**
 * LocationPicker — search-as-you-type location selector with PVGIS weather fetch.
 *
 * Flow:
 * 1. User types a city name → debounced Nominatim search (400ms)
 * 2. User selects a result → lat/lon stored in wizard store
 * 3. PVGIS weather data fetched automatically on selection
 * 4. On success: PvgisProfile stored in wizard store, status shown
 *
 * Map preview uses a static OpenStreetMap tile iframe (no API key required).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Search, Loader2, CheckCircle, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { searchLocation, type GeoResult } from '@/lib/geocode'
import { fetchPvgisProfile, type PvgisProfile } from '@/lib/pvgis'
import { useWizardStore } from '@/store/wizard-store'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type FetchState =
  | { status: 'idle' }
  | { status: 'searching' }
  | { status: 'fetching-weather' }
  | { status: 'success'; profile: PvgisProfile }
  | { status: 'error'; message: string }

// ─── Map preview via OSM iframe ───────────────────────────────────────────────

function MapPreview({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  // Use OSM embed URL for a lightweight iframe preview
  const osmUrl =
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${lon - 1},${lat - 1},${lon + 1},${lat + 1}` +
    `&layer=mapnik` +
    `&marker=${lat},${lon}`

  return (
    <div className="rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)] mt-3">
      <div className="px-3 py-2 bg-[var(--color-bg-subtle)] border-b border-[var(--color-border)] flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
        <span className="text-xs text-[var(--color-text-muted)] truncate">{label}</span>
      </div>
      <iframe
        title={`Map of ${label}`}
        src={osmUrl}
        width="100%"
        height="180"
        className="block"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LocationPicker() {
  const { customLocation, setCustomLocation, clearCustomLocation } = useWizardStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'idle' })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Sync fetch state from existing profile in store
  useEffect(() => {
    if (customLocation?.pvgisProfile) {
      setFetchState({ status: 'success', profile: customLocation.pvgisProfile })
    }
  }, [customLocation])

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    setSearchError(null)
    setShowDropdown(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const found = await searchLocation(value)
        setResults(found)
        setShowDropdown(found.length > 0)
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Location search failed.')
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 400)
  }, [])

  const handleSelect = useCallback(async (result: GeoResult) => {
    setShowDropdown(false)
    setQuery(result.displayName)
    setResults([])
    setSearchError(null)
    setFetchState({ status: 'fetching-weather' })

    // Store partial location immediately (no profile yet)
    setCustomLocation({
      lat: result.lat,
      lon: result.lon,
      label: result.displayName,
      pvgisProfile: null,
    })

    try {
      const profile = await fetchPvgisProfile(result.lat, result.lon, result.displayName)
      setCustomLocation({
        lat: result.lat,
        lon: result.lon,
        label: result.displayName,
        pvgisProfile: profile,
      })
      setFetchState({ status: 'success', profile })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch weather data.'
      setFetchState({ status: 'error', message })
      // Keep location stored even if weather fetch failed
    }
  }, [setCustomLocation])

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setFetchState({ status: 'idle' })
    setSearchError(null)
    clearCustomLocation()
  }, [clearCustomLocation])

  const isFetchingWeather = fetchState.status === 'fetching-weather'
  const currentLocation = customLocation

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
          <Input
            type="text"
            placeholder="Search for a city or location..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            className="pl-9 pr-8"
            disabled={isFetchingWeather}
            aria-label="Location search"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
          />
          {/* Clear button */}
          {(query || currentLocation) && !isFetchingWeather && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              aria-label="Clear location"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {showDropdown && results.length > 0 && (
          <div
            role="listbox"
            className="absolute z-50 mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg overflow-hidden"
          >
            {results.map((result, i) => (
              <button
                key={`${result.lat}-${result.lon}-${i}`}
                role="option"
                type="button"
                onClick={() => handleSelect(result)}
                className={cn(
                  'w-full text-left px-3 py-2.5 flex flex-col gap-0.5 transition-colors',
                  'hover:bg-[var(--color-bg-subtle)] focus:bg-[var(--color-bg-subtle)] focus:outline-none',
                  i > 0 && 'border-t border-[var(--color-border)]'
                )}
              >
                <span className="text-sm font-medium text-[var(--color-text)] truncate">
                  {result.displayName.split(',')[0]}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] truncate">
                  {result.displayName.split(',').slice(1).join(',').trim()}
                </span>
                <span className="text-[10px] text-[var(--color-text-subtle)] mt-0.5 uppercase tracking-wide">
                  {result.type} · {result.lat.toFixed(2)}°, {result.lon.toFixed(2)}°
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search loading indicator */}
      {isSearching && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Loader2 className="h-3 w-3 animate-spin" />
          Searching...
        </div>
      )}

      {/* Search error */}
      {searchError && (
        <Alert variant="error">
          <AlertTitle>Search Error</AlertTitle>
          <AlertDescription>{searchError}</AlertDescription>
        </Alert>
      )}

      {/* PVGIS fetch status */}
      {fetchState.status === 'fetching-weather' && (
        <Alert variant="info">
          <AlertTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching weather data...
          </AlertTitle>
          <AlertDescription>
            Downloading 8,760 hourly temperature points from PVGIS (EU JRC). This may take a few seconds.
          </AlertDescription>
        </Alert>
      )}

      {fetchState.status === 'success' && (
        <Alert variant="success">
          <AlertTitle className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Weather data loaded
          </AlertTitle>
          <AlertDescription>
            8,760 hourly temperature points loaded from {fetchState.profile.source}.
            Location: {fetchState.profile.locationLabel}
          </AlertDescription>
        </Alert>
      )}

      {fetchState.status === 'error' && (
        <Alert variant="error">
          <AlertTitle>Weather Data Error</AlertTitle>
          <AlertDescription>
            {fetchState.message}
            {' '}The location selection has been saved, but calculations will use the built-in profiles until weather data is available.
          </AlertDescription>
        </Alert>
      )}

      {/* Map preview — shown after successful location selection */}
      {currentLocation && fetchState.status !== 'idle' && fetchState.status !== 'searching' && (
        <MapPreview
          lat={currentLocation.lat}
          lon={currentLocation.lon}
          label={currentLocation.label}
        />
      )}
    </div>
  )
}
