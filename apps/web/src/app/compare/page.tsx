'use client'

import { useState } from 'react'
import { useScenarioStore, type Scenario } from '@/store/scenario-store'
import { fmtCurrency, fmtPower, fmtArea, fmtDelta } from '@/lib/format'
import { CapexBreakdownChart } from '@/components/charts/capex-breakdown-chart'
import { OpexBreakdownChart } from '@/components/charts/opex-breakdown-chart'
import { AnnualCostsChart } from '@/components/charts/annual-costs-chart'
import { NpvBreakevenChart } from '@/components/charts/npv-breakeven-chart'
import { Trash2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Comparison row types
// ---------------------------------------------------------------------------

type MetricCategory = 'efficiency' | 'financial' | 'infrastructure'

interface MetricRow {
  label: string
  category: MetricCategory
  format: (s: Scenario) => string
  /** raw value for delta calculation */
  value: (s: Scenario) => number
  /** true when a lower value is better (default = true) */
  lowerIsBetter?: boolean
  unit?: string
}

const METRICS: MetricRow[] = [
  // Efficiency KPIs
  {
    label: 'PUE L3',
    category: 'efficiency',
    format: (s) => s.kpis.pueL3.toFixed(3),
    value: (s) => s.kpis.pueL3,
    lowerIsBetter: true,
  },
  {
    label: 'PUE L4',
    category: 'efficiency',
    format: (s) => s.kpis.pueL4.toFixed(3),
    value: (s) => s.kpis.pueL4,
    lowerIsBetter: true,
  },
  {
    label: 'ERF',
    category: 'efficiency',
    format: (s) => s.kpis.erf.toFixed(3),
    value: (s) => s.kpis.erf,
    lowerIsBetter: false,
  },
  {
    label: 'WUE',
    category: 'efficiency',
    format: (s) => s.kpis.wue.toFixed(3),
    value: (s) => s.kpis.wue,
    lowerIsBetter: true,
  },
  {
    label: 'CUE',
    category: 'efficiency',
    format: (s) => s.kpis.cue.toFixed(3),
    value: (s) => s.kpis.cue,
    lowerIsBetter: true,
  },
  {
    label: 'Workload Density',
    category: 'efficiency',
    format: (s) => `${s.kpis.workloadDensity.toFixed(1)} kW/m²`,
    value: (s) => s.kpis.workloadDensity,
    lowerIsBetter: false,
  },
  // Financial metrics
  {
    label: 'CAPEX Total',
    category: 'financial',
    format: (s) => `${fmtCurrency(s.financials.capexTotal, s.currency)}`,
    value: (s) => s.financials.capexTotal,
    lowerIsBetter: true,
  },
  {
    label: 'OPEX Annual',
    category: 'financial',
    format: (s) => `${fmtCurrency(s.financials.opexAnnual, s.currency)}/yr`,
    value: (s) => s.financials.opexAnnual,
    lowerIsBetter: true,
  },
  {
    label: 'NPV (20 yr)',
    category: 'financial',
    format: (s) => fmtCurrency(s.financials.npv, s.currency),
    value: (s) => s.financials.npv,
    lowerIsBetter: false,
  },
  {
    label: 'Break-even (annual rev.)',
    category: 'financial',
    format: (s) => `${fmtCurrency(s.financials.breakEvenAnnual, s.currency)}/yr`,
    value: (s) => s.financials.breakEvenAnnual,
    lowerIsBetter: true,
  },
  // Infrastructure metrics
  {
    label: 'Total Facility Power',
    category: 'infrastructure',
    format: (s) => fmtPower(s.power.totalFacility),
    value: (s) => s.power.totalFacility,
    lowerIsBetter: true,
  },
  {
    label: 'Floor Area (overall)',
    category: 'infrastructure',
    format: (s) => fmtArea(s.floorArea.overall),
    value: (s) => s.floorArea.overall,
    lowerIsBetter: true,
  },
  {
    label: 'CO₂e Utility',
    category: 'infrastructure',
    format: (s) =>
      `${s.environment.co2eUtility.toLocaleString('en-US', { maximumFractionDigits: 0 })} t/yr`,
    value: (s) => s.environment.co2eUtility,
    lowerIsBetter: true,
  },
]

const CATEGORY_LABELS: Record<MetricCategory, string> = {
  efficiency: 'Efficiency KPIs',
  financial: 'Financial Summary',
  infrastructure: 'Infrastructure',
}

// ---------------------------------------------------------------------------
// Colour palette for up to 4 scenarios
// ---------------------------------------------------------------------------

const SCENARIO_COLORS = [
  {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    header: 'border-b-2 border-blue-400',
  },
  {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    header: 'border-b-2 border-rose-400',
  },
  {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    header: 'border-b-2 border-amber-400',
  },
  {
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    header: 'border-b-2 border-purple-400',
  },
]

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ label, colCount }: { label: string; colCount: number }) {
  return (
    <tr className="bg-zinc-100 dark:bg-zinc-800">
      <td
        colSpan={1 + colCount + 1}
        className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
      >
        {label}
      </td>
    </tr>
  )
}

interface MultiRowProps {
  metric: MetricRow
  selected: Scenario[]
}

function MultiCompareRow({ metric, selected }: MultiRowProps) {
  const baseline = selected[0]
  return (
    <tr className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-700/50 dark:hover:bg-zinc-800/40">
      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        {metric.label}
      </td>
      {selected.map((s, i) => {
        const delta =
          i > 0 && baseline
            ? fmtDelta(metric.value(baseline), metric.value(s), metric.lowerIsBetter ?? true)
            : null
        return (
          <td key={s.id} className="px-4 py-2.5 text-right text-sm text-zinc-800 dark:text-zinc-200">
            <div>{metric.format(s)}</div>
            {delta && (
              <div className={`text-xs ${delta.colorClass}`}>{delta.text}</div>
            )}
          </td>
        )
      })}
      {/* Spacer if fewer than max */}
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ComparePage() {
  const { scenarios, removeScenario } = useScenarioStore()

  // Initialize with first two scenarios selected
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    return scenarios.slice(0, 2).map((s) => s.id)
  })

  const toggleScenario = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= 4) return prev // max 4
      return [...prev, id]
    })
  }

  const selected = selectedIds
    .map((id) => scenarios.find((s) => s.id === id))
    .filter((s): s is Scenario => s !== undefined)

  const currency = selected[0]?.currency ?? 'EUR'
  const categories: MetricCategory[] = ['efficiency', 'financial', 'infrastructure']

  // Guard: need at least 2 saved scenarios
  if (scenarios.length < 2) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <PageHeader />
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-600 dark:bg-zinc-900">
            <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
              Save at least 2 scenarios to compare
            </p>
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
              Run the wizard to compute a scenario, then save it from the results page.
            </p>
            <a
              href="/scenario"
              className="mt-6 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              New Scenario
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <PageHeader />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-10">

        {/* Scenario selector */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Select Scenarios to Compare (up to 4)
          </h2>
          <div className="flex flex-wrap gap-3">
            {scenarios.map((s, i) => {
              const isSelected = selectedIds.includes(s.id)
              const colorIdx = selectedIds.indexOf(s.id)
              const color = colorIdx >= 0 ? SCENARIO_COLORS[colorIdx] : null
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-300 bg-emerald-50 shadow-sm dark:border-emerald-700 dark:bg-emerald-950/30'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900'
                  }`}
                  onClick={() => toggleScenario(s.id)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleScenario(s.id)}
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {color && (
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                      i === 0 ? 'bg-blue-400' : i === 1 ? 'bg-rose-400' : i === 2 ? 'bg-amber-400' : 'bg-purple-400'
                    }`} />
                  )}
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 max-w-[160px] truncate">
                    {s.name}
                  </span>
                  {!s.id.startsWith('demo-') && (
                    <button
                      type="button"
                      title="Remove scenario"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeScenario(s.id)
                        setSelectedIds((prev) => prev.filter((x) => x !== s.id))
                      }}
                      className="ml-1 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {selectedIds.length < 2 && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              Select at least 2 scenarios to compare.
            </p>
          )}
        </section>

        {selected.length >= 2 && (
          <>
            {/* Main comparison table */}
            <section>
              <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                      <th className="sticky left-0 z-10 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        Metric
                      </th>
                      {selected.map((s, i) => (
                        <th
                          key={s.id}
                          className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                        >
                          <span className={`rounded px-2 py-0.5 ${SCENARIO_COLORS[i]?.badge ?? ''}`}>
                            {i === 0 ? `${s.name} (baseline)` : s.name}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-zinc-900">
                    {categories.map((cat) => (
                      <>
                        <SectionHeader key={`header-${cat}`} label={CATEGORY_LABELS[cat]} colCount={selected.length} />
                        {METRICS.filter((m) => m.category === cat).map((metric) => (
                          <MultiCompareRow
                            key={metric.label}
                            metric={metric}
                            selected={selected}
                          />
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                Delta values shown in smaller text beneath each cell, relative to the baseline (first selected scenario).
              </p>
            </section>

            {/* Charts — one per row, full width */}
            <section className="space-y-6">
              <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                Visual Comparison
              </h2>

              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                  CAPEX Breakdown
                </h3>
                <CapexBreakdownChart
                  scenarios={selected.map((s) => ({ name: s.name, capex: s.capex }))}
                  currency={currency}
                  height={340}
                />
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                  OPEX Breakdown
                </h3>
                <OpexBreakdownChart
                  scenarios={selected.map((s) => ({ name: s.name, opex: s.opex }))}
                  currency={currency}
                  height={340}
                />
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                  Annual Costs Over Time
                </h3>
                <AnnualCostsChart
                  scenarios={selected.map((s) => ({ name: s.name, financials: s.financials }))}
                  currency={currency}
                  height={380}
                />
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                  Cumulative Cash Flow
                </h3>
                <NpvBreakevenChart
                  scenarios={selected.map((s) => ({ name: s.name, financials: s.financials }))}
                  currency={currency}
                  height={380}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------

function PageHeader() {
  return (
    <div className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Scenario Comparison
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Side-by-side analysis of key metrics and cost drivers
        </p>
      </div>
    </div>
  )
}
