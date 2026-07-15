/**
 * Calculation Web Worker for OCP CE TCO.
 *
 * Receives a CALCULATE message with a ScenarioInput, runs the engine,
 * and posts back a RESULT or ERROR message.
 *
 * Runs in a dedicated worker thread so heavy calculation never blocks the UI.
 */

import type { ScenarioInput, CalculationResult } from '@ocp-tco/model-schema'
import { runScenario } from '@ocp-tco/model-engine'
import { buildLibraryContext } from '@ocp-tco/seed-data'

// ─── Message types ────────────────────────────────────────────────────────────

export type WorkerInput = {
  type: 'CALCULATE'
  input: ScenarioInput
  requestId: string
}

export type WorkerOutput =
  | { type: 'RESULT'; result: CalculationResult; requestId: string; durationMs: number }
  | { type: 'ERROR'; error: string; requestId: string }

// ─── Message handler ──────────────────────────────────────────────────────────

self.addEventListener('message', async (event: MessageEvent<WorkerInput>) => {
  const { type, input, requestId } = event.data

  if (type !== 'CALCULATE') return

  try {
    const lib = buildLibraryContext()
    const result = await runScenario(input, lib)
    const output: WorkerOutput = {
      type: 'RESULT',
      result,
      requestId,
      durationMs: result.durationMs,
    }
    self.postMessage(output)
  } catch (err) {
    const output: WorkerOutput = {
      type: 'ERROR',
      error: String(err),
      requestId,
    }
    self.postMessage(output)
  }
})
