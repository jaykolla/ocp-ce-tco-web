'use client'

/**
 * useCalculation — React hook that runs the TCO engine in a Web Worker.
 *
 * Features:
 * - Singleton worker (recreated if it crashes)
 * - 150 ms debounce on input changes
 * - Stale-request cancellation via requestId
 * - "Calculating" state only shown after 150 ms elapsed (avoids flicker)
 * - SSR-safe: falls back to direct (main-thread) calculation when Worker API
 *   is unavailable (e.g. during Next.js server rendering)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ScenarioInput, CalculationResult } from '@ocp-tco/model-schema'
import type { WorkerInput, WorkerOutput } from '@/workers/calculation.worker'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseCalculationResult {
  result: CalculationResult | null
  isCalculating: boolean
  error: string | null
  lastCalculatedAt: Date | null
}

// ─── Singleton worker management ──────────────────────────────────────────────

let sharedWorker: Worker | null = null
let workerPendingCallbacks: Map<string, (output: WorkerOutput) => void> = new Map()

function getOrCreateWorker(): Worker | null {
  if (typeof window === 'undefined') return null
  if (typeof Worker === 'undefined') return null

  if (!sharedWorker) {
    try {
      sharedWorker = new Worker(
        new URL('@/workers/calculation.worker', import.meta.url),
        { type: 'module' },
      )

      sharedWorker.addEventListener('message', (event: MessageEvent<WorkerOutput>) => {
        const output = event.data
        const cb = workerPendingCallbacks.get(output.requestId)
        if (cb) {
          workerPendingCallbacks.delete(output.requestId)
          cb(output)
        }
      })

      sharedWorker.addEventListener('error', (err) => {
        console.error('[calculation.worker] Worker error:', err)
        // Notify all pending callbacks of the error
        for (const [id, cb] of workerPendingCallbacks) {
          cb({ type: 'ERROR', error: 'Worker crashed', requestId: id })
        }
        workerPendingCallbacks = new Map()
        sharedWorker = null
      })
    } catch (e) {
      console.warn('[useCalculation] Could not create Worker:', e)
      return null
    }
  }

  return sharedWorker
}

function postToWorker(input: ScenarioInput, requestId: string): Promise<WorkerOutput> {
  return new Promise((resolve) => {
    const worker = getOrCreateWorker()
    if (!worker) {
      // Fallback: direct calculation on main thread
      fallbackCalculate(input, requestId).then(resolve)
      return
    }
    workerPendingCallbacks.set(requestId, resolve)
    const message: WorkerInput = { type: 'CALCULATE', input, requestId }
    worker.postMessage(message)
  })
}

// ─── SSR / Worker-unavailable fallback ───────────────────────────────────────

async function fallbackCalculate(input: ScenarioInput, requestId: string): Promise<WorkerOutput> {
  try {
    const { runScenario } = await import('@ocp-tco/model-engine')
    const { buildLibraryContext } = await import('@ocp-tco/seed-data')
    const lib = buildLibraryContext()
    const result = await runScenario(input, lib)
    return { type: 'RESULT', result, requestId, durationMs: result.durationMs }
  } catch (err) {
    return { type: 'ERROR', error: String(err), requestId }
  }
}

// ─── Counter for unique request IDs ──────────────────────────────────────────

let requestCounter = 0

function nextRequestId(): string {
  return `req-${++requestCounter}-${Date.now()}`
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 150
const CALCULATING_DELAY_MS = 150

export function useCalculation(input: ScenarioInput | null): UseCalculationResult {
  const [result, setResult] = useState<CalculationResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCalculatedAt, setLastCalculatedAt] = useState<Date | null>(null)

  // Track the latest request ID so stale responses are ignored
  const latestRequestId = useRef<string | null>(null)

  // Debounce timer
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Calculating-indicator delay timer
  const calculatingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runCalculation = useCallback(async (scenarioInput: ScenarioInput) => {
    const requestId = nextRequestId()
    latestRequestId.current = requestId

    // Show "calculating" indicator only after CALCULATING_DELAY_MS to avoid flicker
    if (calculatingTimer.current) clearTimeout(calculatingTimer.current)
    calculatingTimer.current = setTimeout(() => {
      if (latestRequestId.current === requestId) {
        setIsCalculating(true)
      }
    }, CALCULATING_DELAY_MS)

    const output = await postToWorker(scenarioInput, requestId)

    // Clear the calculating-indicator timer if result arrived fast
    if (calculatingTimer.current) {
      clearTimeout(calculatingTimer.current)
      calculatingTimer.current = null
    }

    // Ignore if a newer request has superseded this one
    if (latestRequestId.current !== requestId) return

    setIsCalculating(false)

    if (output.type === 'RESULT') {
      setResult(output.result)
      setError(null)
      setLastCalculatedAt(new Date())
    } else {
      setError(output.error)
    }
  }, [])

  useEffect(() => {
    if (!input) {
      setResult(null)
      setError(null)
      setIsCalculating(false)
      return
    }

    // Debounce
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      runCalculation(input)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [input, runCalculation])

  return { result, isCalculating, error, lastCalculatedAt }
}
