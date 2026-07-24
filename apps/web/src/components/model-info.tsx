'use client'

/**
 * ModelInfo — collapsible accordion showing manifest metadata.
 * Used in About page and Results page.
 */

import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { manifest } from '@ocp-tco/seed-data'

const Accordion = AccordionPrimitive.Root
const AccordionItem = AccordionPrimitive.Item
const AccordionTrigger = AccordionPrimitive.Trigger
const AccordionContent = AccordionPrimitive.Content

// ─── Assumption definitions ───────────────────────────────────────────────────

const ASSUMPTION_DEFS: Record<string, string> = {
  'A-AREA-70PCT':
    'Overall facility floor area is derived from a 70% compaction factor applied to the sum of dataroom and facilities area. This follows the OCP CE TCO v1.11 workbook formula.',
  'A-CAPEX-PEAK':
    'Capital expenditure is sized at peak facility power (accounting for redundancy multiplier). This is conservative: actual installed capacity may exceed peak load.',
  'A-OPEX-AVG':
    'Operating expenditure (electricity, water) is computed on annual-average facility power, not peak. This reflects real energy consumption patterns.',
  'A-LAND-EXCLUDED':
    'Land acquisition cost is excluded from CAPEX. Users should add site-specific land costs separately.',
  'A-ITE-EXCLUDED':
    'IT equipment (servers, network, storage) purchase cost is excluded from CAPEX. This models the facility shell and infrastructure only.',
}

// ─── Metric formula definitions ───────────────────────────────────────────────

const METRIC_DEFS: Record<string, string> = {
  'M-PUE-L3-001': 'PUE L3 = Total Facility Power (annual avg) / ITE rPDU Power (L3). Lower is better.',
  'M-PUE-L4-001': 'PUE L4 = Total Facility Power (annual avg) / ITE Node Input Power (L4). Lower is better.',
  'M-ERF-001': 'ERF = Heat Recovery Rate / Total Facility Power. Pending HT HRU model implementation (currently 0).',
  'M-WUE-001': 'WUE = (Equipment Water + Utility Water) / (ITE L2 kW × Annual Hours). Pending HT HRU model (currently 0).',
  'M-CUE-001': 'CUE = PUE L3 × CO₂ Intensity (g/kWh) / 1000. Units: kgCO₂e/kWh of IT load.',
}

// ─── Open decisions ───────────────────────────────────────────────────────────

const OPEN_DECISIONS = [
  {
    id: 'OD-ERF-HRU',
    title: 'ERF / Heat Recovery (HT HRU model)',
    resolution: 'ERF and WUE are hardcoded to 0 in v1.11-web-1. The HT HRU (high-temperature heat recovery unit) power and water model is planned for v1.12.',
  },
  {
    id: 'OD-COOLING-COP',
    title: 'Cooling equipment COP values',
    resolution: 'Compressor COP is hardcoded to 3.0; pump inverse-COP to 0.02; free-cooler inverse-COP to 0.01. These are calibrated against the Paris baseline but may not match all configurations. Full equipment-library lookup is planned.',
  },
  {
    id: 'OD-CAPACITY-MARGINS',
    title: 'Per-equipment capacity margins',
    resolution: 'Capacity margin checks (load vs rated capacity per equipment slot) are placeholder — always return an empty array. Full implementation requires per-equipment capacity data in the library.',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function ModelInfo({ className }: { className?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawManifest = manifest as any
  const metricEntries = Object.entries((rawManifest.metricDefinitions ?? {}) as Record<string, unknown>)

  return (
    <Accordion type="single" collapsible className={cn('space-y-1', className)}>
      {/* Metric Formulas */}
      <AccordionItem value="metrics" className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <AccordionTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors [&[data-state=open]>svg]:rotate-180">
          Metric Formula IDs
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200" />
        </AccordionTrigger>
        <AccordionContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {metricEntries.map(([key, def]) => {
              const typedDef = def as { formulaId: string; unit: string; sourceCells?: string[] }
              const description = METRIC_DEFS[typedDef.formulaId] ?? `${key}: ${typedDef.unit}`
              return (
                <div key={key} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="rounded bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-xs font-mono text-[var(--color-text)]">
                      {typedDef.formulaId}
                    </code>
                    <span className="text-xs text-[var(--color-text-muted)]">{typedDef.unit}</span>
                    {typedDef.sourceCells && typedDef.sourceCells.length > 0 && (
                      <span className="text-xs text-[var(--color-text-muted)]">
                        ({typedDef.sourceCells.join(', ')})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{description}</p>
                </div>
              )
            })}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Assumptions */}
      <AccordionItem value="assumptions" className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <AccordionTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors [&[data-state=open]>svg]:rotate-180">
          Model Assumptions ({rawManifest.assumptions?.length ?? 0})
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200" />
        </AccordionTrigger>
        <AccordionContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {((rawManifest.assumptions ?? []) as string[]).map((id: string) => (
              <div key={id} className="px-4 py-3">
                <code className="mb-1 block rounded bg-[var(--color-bg-subtle)] px-1.5 py-0.5 text-xs font-mono text-[var(--color-text)] w-fit">
                  {id}
                </code>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {ASSUMPTION_DEFS[id] ?? id}
                </p>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Open Decisions */}
      <AccordionItem value="decisions" className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <AccordionTrigger className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] transition-colors [&[data-state=open]>svg]:rotate-180">
          Open Decisions &amp; Resolutions ({OPEN_DECISIONS.length})
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200" />
        </AccordionTrigger>
        <AccordionContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <div className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {OPEN_DECISIONS.map((od) => (
              <div key={od.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <code className="rounded bg-amber-50 px-1.5 py-0.5 text-xs font-mono text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                    {od.id}
                  </code>
                  <span className="text-xs font-medium text-[var(--color-text)]">{od.title}</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{od.resolution}</p>
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
