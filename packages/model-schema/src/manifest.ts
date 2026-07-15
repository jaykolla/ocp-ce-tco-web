import { z } from 'zod'

// Model manifest: immutable record linking a model version to its source data,
// metric definitions, and assumptions. Committed alongside seed data.

export const MetricDefinition = z.object({
  formulaId: z.string(),       // e.g. "M-PUE-L3-001"
  unit: z.string(),
  description: z.string(),
  sourceCells: z.array(z.string()),  // e.g. ["Paris!G5"]
})

export const ModelManifest = z.object({
  modelVersion: z.string(),          // e.g. "ocp-ce-tco-1.11-web-1"
  sourceWorkbookSha256: z.string(),
  sourceWorkbookFilename: z.string(),
  extractedAt: z.string().datetime(),
  metricDefinitions: z.record(z.string(), MetricDefinition),
  assumptions: z.array(z.string()), // e.g. ["A-AREA-70PCT", "A-CAPEX-PEAK"]
  seedDatasetVersions: z.object({
    power: z.string(),
    cooling: z.string(),
    data: z.string(),
    weather: z.string(),
  }),
  openDecisions: z.array(z.object({
    id: z.string(),     // e.g. "A-01"
    issue: z.string(),
    resolution: z.string(),
  })).optional(),
})
export type ModelManifest = z.infer<typeof ModelManifest>
