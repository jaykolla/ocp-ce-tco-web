'use client'
/**
 * Calculation Web Worker for OCP CE TCO.
 *
 * Uses dynamic imports so Turbopack bundles workspace packages through the
 * main module graph rather than as a separate isolated worker entry point.
 * This is required for static export (GitHub Pages) compatibility.
 */

import type { ScenarioInput, CalculationResult } from '@ocp-tco/model-schema'

export type WorkerInput = {
  type: 'CALCULATE'
  input: ScenarioInput
  requestId: string
}

export type WorkerOutput =
  | { type: 'RESULT'; result: CalculationResult; requestId: string; durationMs: number }
  | { type: 'ERROR'; error: string; requestId: string }

self.addEventListener('message', async (event: MessageEvent<WorkerInput>) => {
  const { type, input, requestId } = event.data
  if (type !== 'CALCULATE') return

  try {
    const [{ runScenario }, { buildLibraryContext }] = await Promise.all([
      import('@ocp-tco/model-engine'),
      import('@ocp-tco/seed-data'),
    ])
    const lib = buildLibraryContext()
    const result = await runScenario(input, lib)
    self.postMessage({ type: 'RESULT', result, requestId, durationMs: result.durationMs } as WorkerOutput)
  } catch (err) {
    self.postMessage({ type: 'ERROR', error: String(err), requestId } as WorkerOutput)
  }
})
