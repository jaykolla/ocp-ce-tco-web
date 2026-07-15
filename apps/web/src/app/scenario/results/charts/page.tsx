'use client'

import { useScenarioStore } from '@/store/scenario-store'
import { CapexBreakdownChart } from '@/components/charts/capex-breakdown-chart'
import { OpexBreakdownChart } from '@/components/charts/opex-breakdown-chart'
import { PowerBreakdownChart } from '@/components/charts/power-breakdown-chart'
import { FloorAreaChart } from '@/components/charts/floor-area-chart'
import { AnnualCostsChart } from '@/components/charts/annual-costs-chart'
import { NpvBreakevenChart } from '@/components/charts/npv-breakeven-chart'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}

export default function ChartsPage() {
  const scenarios = useScenarioStore((s) => s.scenarios)

  if (scenarios.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 dark:text-zinc-400">No scenarios found.</p>
          <a
            href="/scenario"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Create a Scenario
          </a>
        </div>
      </div>
    )
  }

  // Use first scenario currency as the display currency (consistent across comparison)
  const currency = scenarios[0]?.currency ?? 'EUR'

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Page header */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Results — Charts
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Visual breakdown of all computed scenarios
          </p>
        </div>
      </div>

      {/* Charts grid */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 1 – CAPEX breakdown */}
          <ChartCard
            title="CAPEX Breakdown"
            subtitle="Capital expenditure by category"
          >
            <CapexBreakdownChart
              scenarios={scenarios.map((s) => ({ name: s.name, capex: s.capex }))}
              currency={currency}
              height={320}
            />
          </ChartCard>

          {/* 2 – OPEX breakdown */}
          <ChartCard
            title="OPEX Breakdown"
            subtitle="Annual operating cost by category"
          >
            <OpexBreakdownChart
              scenarios={scenarios.map((s) => ({ name: s.name, opex: s.opex }))}
              currency={currency}
              height={320}
            />
          </ChartCard>

          {/* 3 – Power cascade */}
          <ChartCard
            title="Power Breakdown"
            subtitle="Total facility power → L1 → L2 → L3 → L4 (IT load) and losses"
          >
            <PowerBreakdownChart
              scenarios={scenarios.map((s) => ({ name: s.name, power: s.power }))}
              height={320}
            />
          </ChartCard>

          {/* 4 – Floor area */}
          <ChartCard
            title="Floor Area"
            subtitle="Facilities area, data rooms area, and overall gross floor area"
          >
            <FloorAreaChart
              scenarios={scenarios.map((s) => ({ name: s.name, floorArea: s.floorArea }))}
              height={320}
            />
          </ChartCard>

          {/* 5 – Annual costs timeline */}
          <ChartCard
            title="Annual Costs (20-Year Profile)"
            subtitle="Year 0 = CAPEX, Years 1–20 = annual OPEX (with inflation)"
          >
            <AnnualCostsChart
              scenarios={scenarios.map((s) => ({ name: s.name, financials: s.financials }))}
              currency={currency}
              height={320}
            />
          </ChartCard>

          {/* 6 – NPV / break-even */}
          <ChartCard
            title="Cumulative Cash Flow"
            subtitle="NPV trajectory — dashed line marks break-even (zero crossing)"
          >
            <NpvBreakevenChart
              scenarios={scenarios.map((s) => ({ name: s.name, financials: s.financials }))}
              currency={currency}
              height={320}
            />
          </ChartCard>
        </div>
      </div>
    </main>
  )
}
