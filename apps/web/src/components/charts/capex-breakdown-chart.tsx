'use client'

import ReactECharts from 'echarts-for-react'
import { fmtCurrency } from '@/lib/format'

export interface CapexBreakdownChartProps {
  scenarios: Array<{
    name: string
    capex: {
      powerEquipment: number
      coolingEquipment: number
      dataEquipment: number
      coreAndShell: number
      fitOut: number
    }
  }>
  currency: string
  height?: number
}

const COLORS = {
  power: '#3B82F6',
  cooling: '#EF4444',
  data: '#F59E0B',
  shell: '#10B981',
  fitout: '#8B5CF6',
}

export function CapexBreakdownChart({
  scenarios,
  currency,
  height = 300,
}: CapexBreakdownChartProps) {
  const categories = scenarios.map((s) => s.name)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ seriesName: string; value: number }>) => {
        return params
          .map(
            (p) =>
              `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${
                COLORS[p.seriesName.toLowerCase().replace(' ', '') as keyof typeof COLORS] ?? '#999'
              };margin-right:6px;"></span>${p.seriesName}: ${fmtCurrency(p.value, currency)}`,
          )
          .join('<br/>')
      },
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
      name: `CAPEX (${currency})`,
      nameLocation: 'middle',
      nameGap: 40,
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
        name: 'Power',
        type: 'bar',
        stack: 'capex',
        itemStyle: { color: COLORS.power },
        data: scenarios.map((s) => s.capex.powerEquipment),
        label: { show: false },
      },
      {
        name: 'Cooling',
        type: 'bar',
        stack: 'capex',
        itemStyle: { color: COLORS.cooling },
        data: scenarios.map((s) => s.capex.coolingEquipment),
      },
      {
        name: 'Data',
        type: 'bar',
        stack: 'capex',
        itemStyle: { color: COLORS.data },
        data: scenarios.map((s) => s.capex.dataEquipment),
      },
      {
        name: 'Core & Shell',
        type: 'bar',
        stack: 'capex',
        itemStyle: { color: COLORS.shell },
        data: scenarios.map((s) => s.capex.coreAndShell),
      },
      {
        name: 'Fit-Out',
        type: 'bar',
        stack: 'capex',
        itemStyle: { color: COLORS.fitout },
        data: scenarios.map((s) => s.capex.fitOut),
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
