'use client'

import ReactECharts from 'echarts-for-react'
import { fmtPower } from '@/lib/format'

export interface PowerBreakdownChartProps {
  scenarios: Array<{
    name: string
    power: {
      totalFacility: number
      l1: number
      l2: number
      l3: number
      l4: number
      totalLosses: number
    }
  }>
  height?: number
}

/** Palette: one distinct colour per level */
const LEVEL_COLORS = ['#6366F1', '#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444']
const LEVEL_NAMES = ['Total Facility', 'L1 (UPS out)', 'L2 (PDU out)', 'L3 (Server in)', 'L4 (IT load)', 'Losses']

export function PowerBreakdownChart({
  scenarios,
  height = 300,
}: PowerBreakdownChartProps) {
  const categories = scenarios.map((s) => s.name)

  const getLevelData = (key: keyof PowerBreakdownChartProps['scenarios'][number]['power']) =>
    scenarios.map((s) => s.power[key])

  const series = [
    { name: LEVEL_NAMES[0], data: getLevelData('totalFacility'), color: LEVEL_COLORS[0] },
    { name: LEVEL_NAMES[1], data: getLevelData('l1'), color: LEVEL_COLORS[1] },
    { name: LEVEL_NAMES[2], data: getLevelData('l2'), color: LEVEL_COLORS[2] },
    { name: LEVEL_NAMES[3], data: getLevelData('l3'), color: LEVEL_COLORS[3] },
    { name: LEVEL_NAMES[4], data: getLevelData('l4'), color: LEVEL_COLORS[4] },
    { name: LEVEL_NAMES[5], data: getLevelData('totalLosses'), color: LEVEL_COLORS[5] },
  ]

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ seriesName: string; value: number; color: string }>) =>
        params
          .map(
            (p) =>
              `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}: ${fmtPower(p.value)}`,
          )
          .join('<br/>'),
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 10 },
      itemWidth: 12,
      itemHeight: 12,
    },
    grid: {
      top: 16,
      bottom: 72,
      left: 80,
      right: 24,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        width: 100,
        overflow: 'truncate',
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Power (kW)',
      nameLocation: 'middle',
      nameGap: 52,
      axisLabel: {
        formatter: (v: number) => fmtPower(v),
        fontSize: 10,
      },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'bar',
      itemStyle: { color: s.color },
      data: s.data,
      barMaxWidth: 40,
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
