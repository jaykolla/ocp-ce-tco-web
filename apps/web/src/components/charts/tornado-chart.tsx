'use client'

/**
 * TornadoChart — ECharts horizontal bar chart for sensitivity analysis.
 *
 * Bars extend left (lo value < base) and right (hi value > base) from a
 * centre baseline. Blue for the high-end bar, orange for the low-end bar.
 * Sorted by impact magnitude (largest impact at top).
 */

import ReactECharts from 'echarts-for-react'
import type { TornadoBar } from '@/lib/sensitivity'

interface TornadoChartProps {
  bars: TornadoBar[]
  /** Target metric label for axis title */
  metricLabel: string
  /** Optional currency symbol prepended to axis labels */
  currency?: string
  height?: number
}

function fmtShort(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}k`
  return `${sign}${abs.toFixed(2)}`
}

export function TornadoChart({ bars, metricLabel, currency = '', height = 360 }: TornadoChartProps) {
  if (bars.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400"
      >
        No data to display
      </div>
    )
  }

  const baseValue = bars[0]?.baseValue ?? 0

  // Build series data: each bar is [loValue - base, hiValue - base] relative to baseline
  const labels = bars.map((b) => b.label)

  // Low bars: from baseline to loValue (can be negative or positive delta)
  const loDeltas = bars.map((b) => b.loValue - baseValue)
  // High bars: from baseline to hiValue
  const hiDeltas = bars.map((b) => b.hiValue - baseValue)

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ seriesName: string; value: number; name: string }>) => {
        const bar = bars.find((b) => b.label === params[0]?.name)
        if (!bar) return ''
        const sym = currency
        return [
          `<strong>${bar.label}</strong>`,
          `Base: ${sym}${fmtShort(bar.baseValue)}`,
          `Low (−range): ${sym}${fmtShort(bar.loValue)}`,
          `High (+range): ${sym}${fmtShort(bar.hiValue)}`,
          `Impact: ${sym}${fmtShort(bar.impact)}`,
        ].join('<br/>')
      },
    },
    grid: {
      left: '2%',
      right: '4%',
      top: 16,
      bottom: 40,
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: `Delta in ${metricLabel}`,
      nameLocation: 'middle',
      nameGap: 28,
      axisLabel: {
        formatter: (v: number) => `${currency}${fmtShort(v)}`,
        fontSize: 11,
      },
      splitLine: { lineStyle: { type: 'dashed', color: '#e4e4e7' } },
    },
    yAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        fontSize: 11,
        width: 180,
        overflow: 'truncate',
      },
      inverse: false,
    },
    series: [
      {
        name: 'Low (−range)',
        type: 'bar',
        stack: 'tornado',
        data: loDeltas,
        itemStyle: { color: '#f97316', borderRadius: [2, 0, 0, 2] },
        label: {
          show: false,
        },
      },
      {
        name: 'High (+range)',
        type: 'bar',
        stack: 'tornado',
        data: hiDeltas,
        itemStyle: { color: '#3b82f6', borderRadius: [0, 2, 2, 0] },
        label: {
          show: false,
        },
      },
    ],
    legend: {
      bottom: 0,
      data: ['Low (−range)', 'High (+range)'],
      textStyle: { fontSize: 11 },
    },
  }

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  )
}
