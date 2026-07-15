/**
 * Number formatting utilities for the OCP CE TCO calculator.
 * All values should display to 3 significant figures minimum,
 * matching the v1.11 workbook display conventions.
 */

/** Format a number to 3 significant figures */
export function fmt3sig(value: number): string {
  if (!isFinite(value)) return '—'
  if (value === 0) return '0'

  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (abs >= 1000) {
    return sign + parseFloat(abs.toPrecision(3)).toLocaleString('en-US')
  }
  return sign + parseFloat(abs.toPrecision(3)).toString()
}

/** Currency symbol map */
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  JPY: '¥',
  CHF: 'CHF ',
  AUD: 'A$',
  CAD: 'C$',
}

function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency + ' '
}

/**
 * Format a number as currency with M/k suffix for readability.
 * Examples: €1.23M, €234k, €1,234
 */
export function fmtCurrency(value: number, currency: string): string {
  if (!isFinite(value)) return '—'
  const sym = getCurrencySymbol(currency)
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (abs >= 1_000_000) {
    const m = abs / 1_000_000
    return `${sign}${sym}${parseFloat(m.toPrecision(4))}M`
  }
  if (abs >= 1_000) {
    const k = abs / 1_000
    return `${sign}${sym}${parseFloat(k.toPrecision(3))}k`
  }
  return `${sign}${sym}${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

/**
 * Format power in kW or MW, choosing the appropriate unit.
 * Examples: 4,287 kW, 10.5 MW
 */
export function fmtPower(kw: number): string {
  if (!isFinite(kw)) return '—'
  const abs = Math.abs(kw)
  const sign = kw < 0 ? '-' : ''

  if (abs >= 10_000) {
    const mw = abs / 1_000
    return `${sign}${parseFloat(mw.toPrecision(3))} MW`
  }
  return `${sign}${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })} kW`
}

/**
 * Format an area in m².
 * Examples: 3,517 m², 12.3 km²
 */
export function fmtArea(m2: number): string {
  if (!isFinite(m2)) return '—'
  const abs = Math.abs(m2)
  const sign = m2 < 0 ? '-' : ''
  return `${sign}${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })} m²`
}

/**
 * Format water volume in m³ or litres depending on magnitude.
 * Examples: 1,234 m³, 500 L
 */
export function fmtWater(m3: number): string {
  if (!isFinite(m3)) return '—'
  const abs = Math.abs(m3)
  const sign = m3 < 0 ? '-' : ''

  if (abs >= 1) {
    return `${sign}${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })} m³`
  }
  const litres = abs * 1000
  return `${sign}${litres.toLocaleString('en-US', { maximumFractionDigits: 1 })} L`
}

/**
 * Format a percentage delta between two values.
 * Returns the formatted text and a Tailwind color class.
 *
 * @param a - baseline value
 * @param b - comparison value
 * @param lowerIsBetter - true for metrics where lower = better (PUE, WUE, CUE, costs)
 */
export function fmtDelta(
  a: number,
  b: number,
  lowerIsBetter = true,
): { text: string; colorClass: string } {
  if (!isFinite(a) || !isFinite(b) || a === 0) {
    return { text: '—', colorClass: 'text-zinc-400' }
  }

  const delta = (b - a) / Math.abs(a)
  const pct = delta * 100
  const sign = pct >= 0 ? '+' : ''
  const text = `${sign}${pct.toFixed(1)}%`

  // For lower-is-better metrics: b < a means improvement (green)
  // For higher-is-better metrics: b > a means improvement (green)
  const improved = lowerIsBetter ? b < a : b > a
  const unchanged = Math.abs(pct) < 0.05

  if (unchanged) return { text: '0.0%', colorClass: 'text-zinc-400' }
  return {
    text,
    colorClass: improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
  }
}

/**
 * Format a plain percentage (0-1 range input).
 * Example: 0.161 -> "16.1%"
 */
export function fmtPct(value: number, decimals = 1): string {
  if (!isFinite(value)) return '—'
  return `${(value * 100).toFixed(decimals)}%`
}
