'use client'

import { useScenarioStore, type Scenario } from '@/store/scenario-store'
import { fmtCurrency, fmtPower, fmtArea, fmtDelta, fmtPct } from '@/lib/format'
import { CapexBreakdownChart } from '@/components/charts/capex-breakdown-chart'
import { OpexBreakdownChart } from '@/components/charts/opex-breakdown-chart'
import { AnnualCostsChart } from '@/components/charts/annual-costs-chart'
import { NpvBreakevenChart } from '@/components/charts/npv-breakeven-chart'

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
    lowerIsBetter: false, // Higher ERF = more heat reuse = better
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
    lowerIsBetter: false, // Higher density = more compute per m² = better
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
    lowerIsBetter: false, // Less negative NPV = better
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
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ label }: { label: string }) {
  return (
    <tr className="bg-zinc-100 dark:bg-zinc-800">
      <td
        colSpan={4}
        className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
      >
        {label}
      </td>
    </tr>
  )
}

interface RowProps {
  metric: MetricRow
  baseline: Scenario
  comparison: Scenario
}

function CompareRow({ metric, baseline, comparison }: RowProps) {
  const delta = fmtDelta(metric.value(baseline), metric.value(comparison), metric.lowerIsBetter ?? true)

  return (
    <tr className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-700/50 dark:hover:bg-zinc-800/40">
      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        {metric.label}
      </td>
      <td className="px-4 py-2.5 text-right text-sm text-zinc-800 dark:text-zinc-200">
        {metric.format(baseline)}
      </td>
      <td className="px-4 py-2.5 text-right text-sm text-zinc-800 dark:text-zinc-200">
        {metric.format(comparison)}
      </td>
      <td className={`px-4 py-2.5 text-right text-sm font-medium tabular-nums ${delta.colorClass}`}>
        {delta.text}
      </td>
    </tr>
  )
}

interface ComparisonTableProps {
  baseline: Scenario
  comparison: Scenario
}

function ComparisonTable({ baseline, comparison }: ComparisonTableProps) {
  const categories: MetricCategory[] = ['efficiency', 'financial', 'infrastructure']

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
            <th className="sticky left-0 z-10 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Metric
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {baseline.name}
              </span>
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                {comparison.name}
              </span>
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Delta (vs baseline)
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-zinc-900">
          {categories.map((cat) => (
            <>
              <SectionHeader key={`header-${cat}`} label={CATEGORY_LABELS[cat]} />
              {METRICS.filter((m) => m.category === cat).map((metric) => (
                <CompareRow
                  key={metric.label}
                  metric={metric}
                  baseline={baseline}
                  comparison={comparison}
                />
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ComparePage() {
  const scenarios = useScenarioStore((s) => s.scenarios)

  const baseline = scenarios[0]
  const comparison = scenarios[1]

  const currency = baseline?.currency ?? 'EUR'
  const chartScenarios = scenarios.slice(0, 4)

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Page header */}
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

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-10">
        {/* Guard: need at least 2 scenarios */}
        {!baseline || !comparison ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-600 dark:bg-zinc-900">
            <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
              Add a second scenario to compare
            </p>
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
              You need at least two computed scenarios to use the comparison view.
            </p>
            <a
              href="/scenario"
              className="mt-6 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              New Scenario
            </a>
          </div>
        ) : (
          <>
            {/* Main comparison table */}
            <section>
              <ComparisonTable baseline={baseline} comparison={comparison} />
            </section>

            {/* Charts row */}
            <section>
              <h2 className="mb-4 text-base font-semibold text-zinc-800 dark:text-zinc-200">
                Visual Comparison
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {/* CAPEX */}
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <h3 className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                    CAPEX
                  </h3>
                  <CapexBreakdownChart
                    scenarios={chartScenarios.map((s) => ({ name: s.name, capex: s.capex }))}
                    currency={currency}
                    height={220}
                  />
                </div>

                {/* OPEX */}
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <h3 className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                    OPEX
                  </h3>
                  <OpexBreakdownChart
                    scenarios={chartScenarios.map((s) => ({ name: s.name, opex: s.opex }))}
                    currency={currency}
                    height={220}
                  />
                </div>

                {/* Annual costs */}
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <h3 className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                    Annual Costs
                  </h3>
                  <AnnualCostsChart
                    scenarios={chartScenarios.map((s) => ({ name: s.name, financials: s.financials }))}
                    currency={currency}
                    height={220}
                  />
                </div>

                {/* NPV */}
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <h3 className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                    Cash Flow
                  </h3>
                  <NpvBreakevenChart
                    scenarios={chartScenarios.map((s) => ({ name: s.name, financials: s.financials }))}
                    currency={currency}
                    height={220}
                  />
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
