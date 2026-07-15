'use client'

import ReactECharts from 'echarts-for-react'
import { fmtCurrency } from '@/lib/format'

export interface AnnualCostsChartProps {
  scenarios: Array<{
    name: string
    financials: {
      /** Annual cost for each year: index 0 = Year 0 (CAPEX), 1..N = OPEX year N */
      annualCosts: number[]
    }
  }>
  currency: string
  height?: number
}

/** Distinct line colours — one per scenario */
const LINE_COLORS = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#06B6D4',
]

export function AnnualCostsChart({
  scenarios,
  currency,
  height = 300,
}: AnnualCostsChartProps) {
  // Determine the maximum number of years across all scenarios
  const maxYears = Math.max(...scenarios.map((s) => s.financials.annualCosts.length))
  const xLabels = Array.from({ length: maxYears }, (_, i) => `Year ${i}`)

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ seriesName: string; value: number; color: string; axisValue: string }>) => {
        const header = `<strong>${params[0]?.axisValue ?? ''}</strong><br/>`
        return (
          header +
          params
            .map(
              (p) =>
                `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}: ${fmtCurrency(p.value, currency)}`,
            )
            .join('<br/>')
        )
      },
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: {
      top: 24,
      bottom: 64,
      left: 80,
      right: 24,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: { fontSize: 10, interval: 4 },
      name: 'Year',
      nameLocation: 'middle',
      nameGap: 32,
    },
    yAxis: {
      type: 'value',
      name: `Annual Cost (${currency})`,
      nameLocation: 'middle',
      nameGap: 72,
      axisLabel: {
        formatter: (v: number) => fmtCurrency(v, currency),
        fontSize: 10,
      },
    },
    series: scenarios.map((s, i) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      itemStyle: { color: LINE_COLORS[i % LINE_COLORS.length] },
      lineStyle: { width: 2 },
      data: s.financials.annualCosts,
    })),
  }

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      notMerge
    />
  )
}
