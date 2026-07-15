import { z } from 'zod'

// All internal power values in kW, costs in project currency decimal strings
// to avoid IEEE 754 accumulation errors on financial totals.

export const DecimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Must be a decimal string')

export const NonNegativeDecimal = DecimalString.refine(
  (v) => parseFloat(v) >= 0,
  'Must be non-negative'
)

export const PositiveDecimal = DecimalString.refine(
  (v) => parseFloat(v) > 0,
  'Must be positive'
)

export const FractionDecimal = DecimalString.refine(
  (v) => { const n = parseFloat(v); return n >= 0 && n <= 1 },
  'Must be between 0 and 1'
)

export const PercentDecimal = DecimalString.refine(
  (v) => { const n = parseFloat(v); return n >= 0 && n <= 100 },
  'Must be between 0 and 100'
)

export type DecimalString = z.infer<typeof DecimalString>
export type NonNegativeDecimal = z.infer<typeof NonNegativeDecimal>

export const ISO4217Currency = z.enum([
  'EUR', 'USD', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'SGD'
])
export type ISO4217Currency = z.infer<typeof ISO4217Currency>

// Redundancy levels matching v1.11 workbook
export const RedundancyLevel = z.enum(['N', 'N+1', '2N'])
export type RedundancyLevel = z.infer<typeof RedundancyLevel>

// Equipment status lifecycle
export const LibraryItemStatus = z.enum(['draft', 'reviewed', 'published', 'deprecated'])
export type LibraryItemStatus = z.infer<typeof LibraryItemStatus>

export const Provenance = z.object({
  source: z.string(),               // e.g. "OCP CE TCO v1.11 Power Library"
  sourceCells: z.array(z.string()), // e.g. ["Power!B5:B12"]
  extractedAt: z.string().datetime().optional(),
  sha256: z.string().optional(),
})
export type Provenance = z.infer<typeof Provenance>
