/**
 * Deterministic content hash for scenario inputs.
 * Used as cache key — same hash = same result guaranteed.
 */

import type { ScenarioInput } from '@ocp-tco/model-schema'

// Uses SubtleCrypto in browser Workers; falls back to a simple djb2 in environments
// without SubtleCrypto (e.g. test runners). The server always uses the full SHA-256.
export async function hashInput(input: ScenarioInput): Promise<string> {
  const json = JSON.stringify(input, Object.keys(input).sort())
  const encoder = new TextEncoder()
  const data = encoder.encode(json)

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Fallback djb2 for test environments without SubtleCrypto
  let hash = 5381
  for (const char of json) {
    hash = ((hash << 5) + hash) ^ char.charCodeAt(0)
    hash = hash >>> 0
  }
  return `djb2-${hash.toString(16)}`
}
