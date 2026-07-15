'use client'

import ReactECharts from 'echarts-for-react'
import { fmtCurrency } from '@/lib/format'

export interface NpvBreakevenChartProps {
  scenarios: Array<{
    name: string
    financials: {
      /** Cumulative cash flow by year: starts negative (investment) and rises over time */
      cumulativeCashFlow: number[]
      /** Year index where cumulative cash flow crosses zero, or null if never */
      breakEvenYear: number | null
    }
  }>
  currency: string
  height?: number
}

const LINE_COLORS = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#06B6D4',
]

export function NpvBreakevenChart({
  scenarios,
  currency,
  height = 300,
}: NpvBreakevenChartProps) {
  const maxYears = Math.max(...scenarios.map((s) => s.financials.cumulativeCashFlow.length))
  const xLabels = Array.from({ length: maxYears }, (_, i) => `Year ${i}`)

  // Build mark-point data for break-even years
  const seriesWithMarkpoints = scenarios.map((s, i) => {
    const markData =
      s.financials.breakEvenYear != null
        ? [
            {
              coord: [s.financials.breakEvenYear, 0],
              name: 'Break-even',
              label: {
                show: true,
                formatter: `Break-even\nYr ${s.financials.breakEvenYear}`,
                fontSize: 10,
              },
              symbol: 'pin',
              symbolSize: 30,
              itemStyle: { color: LINE_COLORS[i % LINE_COLORS.length] },
            },
          ]
        : []

    return {
      name: s.name,
      type: 'line',
      smooth: false,
      symbol: 'circle',
      symbolSize: 3,
      itemStyle: { color: LINE_COLORS[i % LINE_COLORS.length] },
      lineStyle: { width: 2 },
      data: s.financials.cumulativeCashFlow,
      markPoint: { data: markData },
      markLine:
        i === 0
          ? {
              silent: true,
              data: [{ yAxis: 0 }],
              lineStyle: { color: '#9CA3AF', type: 'dashed', width: 1 },
              label: { show: false },
            }
          : undefined,
    }
  })

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (
        params: Array<{ seriesName: string; value: number; color: string; axisValue: string }>,
      ) => {
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
      left: 88,
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
      name: `Cumulative Cash Flow (${currency})`,
      nameLocation: 'middle',
      nameGap: 80,
      axisLabel: {
        formatter: (v: number) => fmtCurrency(v, currency),
        fontSize: 10,
      },
    },
    series: seriesWithMarkpoints,
  }

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      notMerge
    />
  )
}
