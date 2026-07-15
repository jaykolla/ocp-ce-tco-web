'use client'

import ReactECharts from 'echarts-for-react'
import { fmtArea } from '@/lib/format'

export interface FloorAreaChartProps {
  scenarios: Array<{
    name: string
    floorArea: {
      facilities: number
      dataRooms: number
      overall: number
    }
  }>
  height?: number
}

const COLORS = {
  facilities: '#6366F1',
  dataRooms: '#3B82F6',
  overall: '#10B981',
}

export function FloorAreaChart({ scenarios, height = 300 }: FloorAreaChartProps) {
  const categories = scenarios.map((s) => s.name)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ seriesName: string; value: number; color: string }>) =>
        params
          .map(
            (p) =>
              `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px;"></span>${p.seriesName}: ${fmtArea(p.value)}`,
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
      left: 80,
      right: 24,
      containLabel: false,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        width: 110,
        overflow: 'truncate',
        fontSize: 11,
      },
    },
    yAxis: {
      type: 'value',
      name: 'Area (m²)',
      nameLocation: 'middle',
      nameGap: 56,
      axisLabel: {
        formatter: (v: number) => `${v.toLocaleString('en-US')} m²`,
        fontSize: 10,
      },
    },
    series: [
      {
        name: 'Facilities',
        type: 'bar',
        stack: 'area',
        itemStyle: { color: COLORS.facilities },
        data: scenarios.map((s) => s.floorArea.facilities),
      },
      {
        name: 'Data Rooms',
        type: 'bar',
        stack: 'area',
        itemStyle: { color: COLORS.dataRooms },
        data: scenarios.map((s) => s.floorArea.dataRooms),
      },
      {
        name: 'Overall (gross)',
        type: 'bar',
        itemStyle: { color: COLORS.overall, opacity: 0.3 },
        // Rendered as a separate (un-stacked) bar to show the total GFA overlay
        data: scenarios.map((s) => s.floorArea.overall),
        barGap: '-100%',
        z: 0,
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
