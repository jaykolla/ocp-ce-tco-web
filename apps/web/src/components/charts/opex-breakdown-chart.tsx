'use client'

import ReactECharts from 'echarts-for-react'
import { fmtCurrency } from '@/lib/format'

export interface OpexBreakdownChartProps {
  scenarios: Array<{
    name: string
    opex: {
      electrical: number
      maintenance: number
      water: number
      heatRecovery: number
    }
  }>
  currency: string
  height?: number
}

const COLORS = {
  electrical: '#3B82F6',
  maintenance: '#F59E0B',
  water: '#06B6D4',
  heatRecovery: '#10B981',
}

export function OpexBreakdownChart({
  scenarios,
  currency,
  height = 300,
}: OpexBreakdownChartProps) {
  const categories = scenarios.map((s) => s.name)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ seriesName: string; value: number }>) =>
        params
          .map(
            (p) =>
              `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${
                Object.entries(COLORS).find(
                  ([k]) => k.toLowerCase() === p.seriesName.toLowerCase().replace(/\s+/g, ''),
                )?.[1] ?? '#999'
              };margin-right:6px;"></span>${p.seriesName}: ${fmtCurrency(p.value, currency)}/yr`,
          )
          .join('<br/>'),
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    grid: {
      top: 16,
      bottom: 64,
      left: 120,
      right: 24,
      containLabel: false,
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: (v: number) => fmtCurrency(v, currency),
        fontSize: 10,
      },
      name: `Annual OPEX (${currency})`,
      nameLocation: 'middle',
      nameGap: 44,
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        width: 110,
        overflow: 'truncate',
        fontSize: 11,
      },
    },
    series: [
      {
        name: 'Electrical',
        type: 'bar',
        stack: 'opex',
        itemStyle: { color: COLORS.electrical },
        data: scenarios.map((s) => s.opex.electrical),
      },
      {
        name: 'Maintenance',
        type: 'bar',
        stack: 'opex',
        itemStyle: { color: COLORS.maintenance },
        data: scenarios.map((s) => s.opex.maintenance),
      },
      {
        name: 'Water',
        type: 'bar',
        stack: 'opex',
        itemStyle: { color: COLORS.water },
        data: scenarios.map((s) => s.opex.water),
      },
      {
        name: 'Heat Recovery',
        type: 'bar',
        stack: 'opex',
        itemStyle: { color: COLORS.heatRecovery },
        // Heat recovery is typically a credit (negative value)
        data: scenarios.map((s) => s.opex.heatRecovery),
      },
    ],
  }

  return (
    <ReactECharts
      option={option}
      style={{ width: '100%', height }}
      notMerge
    />
  )
}
