'use client'

/**
 * Sensitivity Analysis page
 *
 * One-variable parameter sweep with tornado chart and sweep curve.
 * Uses the scenario-input-store as the base scenario (same as results page).
 */

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Play, Loader2, AlertCircle } from 'lucide-react'
import type { ScenarioInput } from '@ocp-tco/model-schema'

import {
  SWEEP_PARAMETERS,
  TARGET_METRICS,
  runSweep,
  runTornado,
  type SweepResult,
  type TornadoBar,
} from '@/lib/sensitivity'
import { useScenarioInputStore, TEMP_HUM_TO_ZONE, type ScenarioInputState } from '@/store/scenario-input-store'
import { TornadoChart } from '@/components/charts/tornado-chart'
import { SweepCurveChart } from '@/components/charts/sweep-curve-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtCurrency } from '@/lib/format'

// ─── Build ScenarioInput from store (same logic as results page) ──────────────

function buildScenarioInput(store: ScenarioInputState): ScenarioInput | null {
  const hasDataroom = store.dataroomSlots.some((s) => s !== null)
  if (!hasDataroom) return null

  const TEMP_HUM_ZONE = TEMP_HUM_TO_ZONE
  const key = `${store.temperatureCategory}_${store.humidityCategory}`
  const climateZoneId = TEMP_HUM_ZONE[key] ?? '3A'

  const validZones = ['0A','0B','1A','1B','2A','2B','3A','3B','3C','4A','4B','4C','5A','5B','5C','6A','6B','7','8']
  const safeZoneId = validZones.includes(climateZoneId) ? climateZoneId : '3A'

  const validTemperatureCategories = [
    'Subarctic/arctic','Very cold','Cold','Cool','Mixed','Warm','Hot','Very hot','Extremely hot'
  ]
  const validHumidityCategories = ['Dry','Mixed','Humid','Maritime','Wet','-']
  const validCurrencies = ['EUR','USD','GBP','JPY','CHF','CAD','AUD','SGD']
  const validRedundancy = ['N','N+1','2N']

  const safeTemp = validTemperatureCategories.includes(store.temperatureCategory)
    ? store.temperatureCategory
    : 'Warm'
  const safeHumidity = validHumidityCategories.includes(store.humidityCategory)
    ? store.humidityCategory
    : 'Wet'
  const safeCurrency = validCurrencies.includes(store.currency) ? store.currency : 'EUR'
  const safePowerRedundancy = validRedundancy.includes(store.powerRedundancy)
    ? store.powerRedundancy
    : 'N+1'
  const safeCoolingRedundancy = validRedundancy.includes(store.coolingRedundancy)
    ? store.coolingRedundancy
    : 'N+1'

  return {
    id: store.id,
    name: store.name,
    modelVersion: 'ocp-ce-tco-1.11-web-1',
    seedDatasetVersions: {
      power: '1.11.0',
      cooling: '1.11.0',
      data: '1.11.0',
      weather: '1.11.0',
    },
    it: {
      powerCapacityUtilization: String(store.powerCapacityUtilization) as `${number}`,
      dataroomSlots: store.dataroomSlots as [
        { dataroomConfigId: string } | null,
        { dataroomConfigId: string } | null,
        { dataroomConfigId: string } | null,
        { dataroomConfigId: string } | null,
      ],
    },
    facilities: {
      criticalPowerConfigId: store.criticalPowerConfigId,
      mechanicalPowerConfigId: store.mechanicalPowerConfigId,
      powerRedundancy: safePowerRedundancy as 'N' | 'N+1' | '2N',
      airCoolingConfigId: store.airCoolingConfigId,
      liquidCoolingConfigId: store.liquidCoolingConfigId,
      coolingRedundancy: safeCoolingRedundancy as 'N' | 'N+1' | '2N',
      temperatureCategory: safeTemp as ScenarioInput['facilities']['temperatureCategory'],
      humidityCategory: safeHumidity as ScenarioInput['facilities']['humidityCategory'],
      climateZoneId: safeZoneId as ScenarioInput['facilities']['climateZoneId'],
    },
    finance: {
      currency: safeCurrency as ScenarioInput['finance']['currency'],
      electricityUnitCostPerKwh: String(store.electricityUnitCostPerKwh) as `${number}`,
      coreAndShellUnitCostPerM2: String(store.coreAndShellUnitCostPerM2) as `${number}`,
      fitOutUnitCostPerM2: String(store.fitOutUnitCostPerM2) as `${number}`,
      waterUnitCostPerM3: String(store.waterUnitCostPerM3) as `${number}`,
      heatRecoveryValuePerKwh: String(store.heatRecoveryValuePerKwh) as `${number}`,
      coreAndShellMaintenanceFraction: String(store.coreAndShellMaintenanceFraction) as `${number}`,
      equipmentMaintenanceFraction: String(store.equipmentMaintenanceFraction) as `${number}`,
      electricityCo2GPerKwh: String(store.electricityCo2GPerKwh) as `${number}`,
      electricityWaterLPerKwh: String(store.electricityWaterLPerKwh) as `${number}`,
      facilityPowerCoolingLifespanYr: String(store.facilityPowerCoolingLifespanYr) as `${number}`,
      itEquipmentLifespanYr: String(store.itEquipmentLifespanYr) as `${number}`,
      discountRateFraction: String(store.discountRateFraction) as `${number}`,
      capexFinancingRateFraction: String(store.capexFinancingRateFraction) as `${number}`,
      capexFinancedFraction: String(store.capexFinancedFraction) as `${number}`,
      capexFinancingTermYr: String(store.capexFinancingTermYr) as `${number}`,
      annualHours: String(store.annualHours) as `${number}`,
    },
  } as ScenarioInput
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SensitivityPage() {
  const store = useScenarioInputStore()

  // Controls
  const [selectedParamId, setSelectedParamId] = useState(SWEEP_PARAMETERS[0].id)
  const [rangePercent, setRangePercent] = useState(30)
  const [steps, setSteps] = useState(10)
  const [selectedMetricId, setSelectedMetricId] = useState(TARGET_METRICS[0].id)

  // Results
  const [sweepResults, setSweepResults] = useState<SweepResult[]>([])
  const [tornadoBars, setTornadoBars] = useState<TornadoBar[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const baseInput = useMemo(() => buildScenarioInput(store), [store])

  const selectedParam = SWEEP_PARAMETERS.find((p) => p.id === selectedParamId) ?? SWEEP_PARAMETERS[0]
  const selectedMetric = TARGET_METRICS.find((m) => m.id === selectedMetricId) ?? TARGET_METRICS[0]
  const currency = store.currency

  const handleRunSweep = useCallback(async () => {
    if (!baseInput) {
      setError('No datarooms configured. Please configure at least one dataroom in IT Design.')
      return
    }
    setIsRunning(true)
    setError(null)
    setProgress(0)
    setSweepResults([])
    setTornadoBars([])

    try {
      // Run sweep
      let sweepDone = false
      const [sweep, tornado] = await Promise.all([
        runSweep(
          baseInput,
          selectedParamId,
          rangePercent / 100,
          steps,
          selectedMetricId,
          (p) => {
            if (!sweepDone) setProgress(p * 0.5)
          },
        ).then((r) => { sweepDone = true; return r }),
        runTornado(
          baseInput,
          selectedMetricId,
          rangePercent / 100,
          (p) => {
            setProgress(0.5 + p * 0.5)
          },
        ),
      ])

      setSweepResults(sweep)
      setTornadoBars(tornado)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsRunning(false)
      setProgress(1)
    }
  }, [baseInput, selectedParamId, rangePercent, steps, selectedMetricId])

  const isCurrencyMetric = ['capexTotal', 'opexAnnual', 'npv', 'annualRevenueToBreakEven'].includes(selectedMetricId)
  const currencySymbol = isCurrencyMetric ? (currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency + ' ') : ''

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/scenario/results"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Results
            </Link>
            <span className="text-zinc-300 dark:text-zinc-600">/</span>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Sensitivity Analysis
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            One-variable parameter sweep with tornado chart — base scenario: <strong>{store.name}</strong>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">

        {/* No dataroom warning */}
        {!baseInput && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">No datarooms configured</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Configure at least one dataroom in{' '}
                <Link href="/scenario/it" className="underline">IT Design</Link>{' '}
                to run sensitivity analysis.
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Sweep Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Parameter to sweep */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Parameter to sweep
                </label>
                <select
                  value={selectedParamId}
                  onChange={(e) => setSelectedParamId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {SWEEP_PARAMETERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Range % */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Range ±%
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={rangePercent}
                  onChange={(e) => setRangePercent(Math.max(1, Math.min(100, Number(e.target.value))))}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                />
              </div>

              {/* Steps */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Steps
                </label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  step={1}
                  value={steps}
                  onChange={(e) => setSteps(Math.max(2, Math.min(50, Number(e.target.value))))}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                />
              </div>

              {/* Metric */}
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Metric to plot
                </label>
                <select
                  value={selectedMetricId}
                  onChange={(e) => setSelectedMetricId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {TARGET_METRICS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                disabled={isRunning || !baseInput}
                onClick={handleRunSweep}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isRunning ? 'Running…' : 'Run Sweep'}
              </button>

              {isRunning && (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <div className="w-32 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
              )}
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {(tornadoBars.length > 0 || sweepResults.length > 0) && (
          <>
            {/* Tornado chart */}
            {tornadoBars.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Tornado Chart — Impact on {selectedMetric.label} (all parameters ±{rangePercent}%)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TornadoChart
                    bars={tornadoBars}
                    metricLabel={selectedMetric.label}
                    currency={currencySymbol}
                    height={Math.max(280, tornadoBars.length * 44 + 80)}
                  />
                  <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    Bars show delta in {selectedMetric.label} when each parameter is varied ±{rangePercent}%.
                    Sorted by magnitude of impact. Blue = high end, Orange = low end.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Sweep curve */}
            {sweepResults.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Sweep Curve — {selectedParam.label} vs {selectedMetric.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SweepCurveChart
                    results={sweepResults}
                    paramLabel={selectedParam.label}
                    metricLabel={selectedMetric.label}
                    currency={currencySymbol}
                    height={320}
                  />
                  <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    Green marker and dashed line indicate the base case value.
                  </p>

                  {/* Data table */}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-700">
                          <th className="py-1.5 pr-4 text-left text-zinc-500 font-medium">{selectedParam.label}</th>
                          <th className="py-1.5 text-right text-zinc-500 font-medium">{selectedMetric.label}</th>
                          <th className="py-1.5 pl-4 text-right text-zinc-500 font-medium">Base?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sweepResults.map((r, i) => (
                          <tr
                            key={i}
                            className={`border-b border-zinc-100 dark:border-zinc-800 ${r.isBase ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''}`}
                          >
                            <td className="py-1 pr-4 tabular-nums text-zinc-700 dark:text-zinc-300">
                              {r.paramValue.toFixed(4)}
                            </td>
                            <td className="py-1 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                              {isCurrencyMetric ? fmtCurrency(r.metricValue, currency) : r.metricValue.toFixed(4)}
                            </td>
                            <td className="py-1 pl-4 text-right">
                              {r.isBase && <span className="text-emerald-600 dark:text-emerald-400 font-medium">Base</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Empty state */}
        {!isRunning && sweepResults.length === 0 && tornadoBars.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-600 dark:bg-zinc-900">
            <p className="text-base font-medium text-zinc-600 dark:text-zinc-400">
              Configure parameters above and click Run Sweep
            </p>
            <p className="mt-2 text-sm text-zinc-400 dark:text-zinc-500">
              Results include a tornado chart (all parameters) and a sweep curve (selected parameter).
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
