'use client'

/**
 * SweepCurveChart — ECharts line chart for one-variable sensitivity sweep.
 *
 * X-axis: parameter value
 * Y-axis: target metric value
 * Base case highlighted with a vertical dashed line.
 */

import ReactECharts from 'echarts-for-react'
import type { SweepResult } from '@/lib/sensitivity'

interface SweepCurveChartProps {
  results: SweepResult[]
  paramLabel: string
  metricLabel: string
  currency?: string
  height?: number
}

function fmtShort(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`
  return `${sign}${abs.toFixed(3)}`
}

export function SweepCurveChart({
  results,
  paramLabel,
  metricLabel,
  currency = '',
  height = 320,
}: SweepCurveChartProps) {
  if (results.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400"
      >
        No data to display
      </div>
    )
  }

  const baseResult = results.find((r) => r.isBase)
  const baseX = baseResult?.paramValue ?? null
  const baseY = baseResult?.metricValue ?? null

  const data = results.map((r) => [r.paramValue, r.metricValue])

  const markLines = baseX !== null && baseY !== null
    ? [
        {
          name: 'Base case',
          xAxis: baseX,
          lineStyle: { type: 'dashed', color: '#10b981', width: 2 },
          label: {
            show: true,
            formatter: 'Base',
            color: '#10b981',
            fontSize: 11,
          },
        },
      ]
    : []

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: Array<{ data: [number, number] }>) => {
        const [x, y] = params[0]?.data ?? [0, 0]
        return [
          `<strong>${paramLabel}</strong>: ${fmtShort(x)}`,
          `${metricLabel}: ${currency}${fmtShort(y)}`,
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
      name: paramLabel,
      nameLocation: 'middle',
      nameGap: 28,
      axisLabel: { formatter: (v: number) => fmtShort(v), fontSize: 11 },
      splitLine: { lineStyle: { type: 'dashed', color: '#e4e4e7' } },
    },
    yAxis: {
      type: 'value',
      name: metricLabel,
      nameLocation: 'middle',
      nameGap: 60,
      axisLabel: {
        formatter: (v: number) => `${currency}${fmtShort(v)}`,
        fontSize: 11,
      },
      splitLine: { lineStyle: { type: 'dashed', color: '#e4e4e7' } },
    },
    series: [
      {
        name: metricLabel,
        type: 'line',
        data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' },
        markLine:
          markLines.length > 0
            ? {
                silent: false,
                data: markLines,
              }
            : undefined,
        markPoint:
          baseResult
            ? {
                data: [
                  {
                    name: 'Base',
                    coord: [baseResult.paramValue, baseResult.metricValue],
                    itemStyle: { color: '#10b981' },
                    symbolSize: 12,
                  },
                ],
              }
            : undefined,
      },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  )
}
