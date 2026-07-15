'use client'

/**
 * Scenario Results Dashboard
 *
 * Wires the calculation engine to the Zustand input store and renders
 * the full KPI + financial results grid. Matches the OCP CE TCO v1.11
 * workbook "Paris!" sheet layout.
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, BarChart2, Loader2 } from 'lucide-react'
import type { ScenarioInput } from '@ocp-tco/model-schema'

import { useCalculation } from '@/hooks/use-calculation'
import { useScenarioInputStore, TEMP_HUM_TO_ZONE } from '@/store/scenario-input-store'
import { MetricCard } from '@/components/ui/metric-card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fmt3sig, fmtCurrency, fmtPower, fmtArea, fmtWater } from '@/lib/format'
import { exportCalculationJSON } from '@/lib/export'

// ─── Climate zone lookup ──────────────────────────────────────────────────────

function resolveClimateZoneId(tempCategory: string, humidityCategory: string): string {
  const key = `${tempCategory}_${humidityCategory}`
  return TEMP_HUM_TO_ZONE[key] ?? '3A' // default to 3A if not found
}

// ─── Skeleton tile ────────────────────────────────────────────────────────────

function SkeletonTile({ label }: { label: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-sm">
      <p className="text-sm font-medium text-[var(--color-text-muted)]">{label}</p>
      <div className="mt-2 h-8 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  )
}

// ─── Row component for breakdown tables ──────────────────────────────────────

function MetricRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-[var(--color-text)] tabular-nums">{value}</span>
        {sub && <span className="block text-xs text-[var(--color-text-muted)]">{sub}</span>}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const store = useScenarioInputStore()

  // Build ScenarioInput from store state
  const scenarioInput = useMemo<ScenarioInput | null>(() => {
    // Check if at least one dataroom slot is filled
    const hasDataroom = store.dataroomSlots.some((s) => s !== null)
    if (!hasDataroom) return null

    const climateZoneId = resolveClimateZoneId(store.temperatureCategory, store.humidityCategory)

    // Validate climateZoneId against the schema enum values
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
    const safePowerRedundancy = validRedundancy.includes(store.powerRedundancy) ? store.powerRedundancy : 'N+1'
    const safeCoolingRedundancy = validRedundancy.includes(store.coolingRedundancy) ? store.coolingRedundancy : 'N+1'

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
  }, [store])

  const { result, isCalculating, error } = useCalculation(scenarioInput)
  const currency = store.currency

  // ─── Empty state: no datarooms selected ────────────────────────────────────

  if (!scenarioInput) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)]">
        <ResultsHeader currency={currency} scenarioInput={null} result={null} />
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <div className="mx-auto max-w-md rounded-xl border border-dashed border-zinc-300 bg-[var(--color-surface)] p-12 dark:border-zinc-600">
            <p className="text-lg font-semibold text-[var(--color-text)]">No datarooms configured</p>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Select at least one dataroom in IT Design to calculate TCO results.
            </p>
            <Link
              href="/scenario/it"
              className="mt-6 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Go to IT Design
            </Link>
          </div>
        </div>
      </main>
    )
  }

  // ─── Calculating skeleton ───────────────────────────────────────────────────

  const kpiLabels = ['PUE L3', 'PUE L4', 'ERF', 'CAPEX Total', 'WUE', 'CUE', 'Workload Density', 'OPEX Annual']

  if (isCalculating && !result) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)]">
        <ResultsHeader currency={currency} scenarioInput={scenarioInput} result={null} />
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculating...
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {kpiLabels.map((l) => <SkeletonTile key={l} label={l} />)}
          </div>
        </div>
      </main>
    )
  }

  // ─── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--color-bg)]">
        <ResultsHeader currency={currency} scenarioInput={scenarioInput} result={null} />
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Alert variant="error">
            <AlertTitle>Calculation Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </main>
    )
  }

  // ─── Results dashboard ──────────────────────────────────────────────────────

  const m = result?.metrics
  const rb = result?.resourceBreakdown
  const fm = result?.financialMetrics
  const fb = result?.financialBreakdown
  const pw = rb?.power

  const blockingWarnings = result?.warnings.filter((w) => w.severity === 'blocking') ?? []
  const otherWarnings = result?.warnings.filter((w) => w.severity !== 'blocking') ?? []

  return (
    <main className="min-h-screen bg-[var(--color-bg)]">
      <ResultsHeader currency={currency} scenarioInput={scenarioInput} result={result ?? null} />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">

        {/* Calculating spinner overlay when re-computing */}
        {isCalculating && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Recalculating...
          </div>
        )}

        {/* Reference city badge */}
        {m?.referenceCity && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Weather data: <span className="font-medium text-[var(--color-text)]">{m.referenceCity}</span>
            {' '}(ASHRAE zone {scenarioInput.facilities.climateZoneId})
          </p>
        )}

        {/* Blocking warnings */}
        {blockingWarnings.map((w) => (
          <Alert key={w.code} variant="error">
            <AlertTitle>{w.code}</AlertTitle>
            <AlertDescription>
              {w.message}
              {w.remediation && <p className="mt-1 text-xs">{w.remediation}</p>}
            </AlertDescription>
          </Alert>
        ))}

        {/* Non-blocking warnings */}
        {otherWarnings.map((w) => (
          <Alert key={w.code} variant={w.severity === 'warning' ? 'warning' : 'info'}>
            <AlertTitle>{w.code}</AlertTitle>
            <AlertDescription>{w.message}</AlertDescription>
          </Alert>
        ))}

        {/* ── Row 1: KPI tiles ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label="PUE L3"
            value={m ? fmt3sig(m.pueL3) : '—'}
            tooltipText="Total facility power / ITE rPDU power (annual avg). Lower is better."
          />
          <MetricCard
            label="PUE L4"
            value={m ? fmt3sig(m.pueL4) : '—'}
            tooltipText="Total facility power / ITE node input power (annual avg). Lower is better."
          />
          <MetricCard
            label="ERF"
            value={m ? fmt3sig(m.erf) : '—'}
            tooltipText="Energy Reuse Factor: heat recovery / total facility power. Higher is better."
          />
          <MetricCard
            label="CAPEX Total"
            value={fm ? fmtCurrency(fm.capexTotal, currency) : '—'}
            accent
            tooltipText="Total capital expenditure including power, cooling, data equipment, shell, and fit-out."
          />
        </div>

        {/* ── Row 2: Secondary KPI tiles ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label="WUE"
            value={m ? fmt3sig(m.wue) : '—'}
            unit="L/kWh"
            tooltipText="Water Use Effectiveness: equipment water / (ITE L2 kW × annual hours)."
          />
          <MetricCard
            label="CUE"
            value={m ? fmt3sig(m.cue) : '—'}
            unit="kgCO₂e/kWh"
            tooltipText="Carbon Use Effectiveness: PUE L3 × CO₂ g/kWh / 1000."
          />
          <MetricCard
            label="Workload Density"
            value={m ? fmt3sig(m.workloadDensityKwPerM2) : '—'}
            unit="kW/m²"
            tooltipText="ITE L4 workload power / dataroom floor area."
          />
          <MetricCard
            label="OPEX Annual"
            value={fm ? fmtCurrency(fm.opexAnnualPayments, currency) : '—'}
            accent
            tooltipText="Total annual operating expenditure (electricity + maintenance + water − heat recovery)."
          />
        </div>

        {/* ── Row 3: Breakdown cards ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Power Breakdown */}
          <SectionCard title="Power Breakdown">
            {pw ? (
              <div>
                <MetricRow label="Total Facility (annual avg)" value={fmtPower(pw.totalFacilityKw)} />
                <MetricRow label="L1 — UPS output" value={fmtPower(pw.itePowerL1Kw)} sub="ITE power at UPS output" />
                <MetricRow label="L2 — PDU output" value={fmtPower(pw.itePowerL2Kw)} />
                <MetricRow label="L3 — rPDU output" value={fmtPower(pw.itePowerL3Kw)} />
                <MetricRow label="L4 — Node input" value={fmtPower(pw.itePowerL4Kw)} sub="Net IT workload" />
                <MetricRow label="Losses: Critical path" value={fmtPower(pw.lossesCriticalKw)} />
                <MetricRow label="Losses: Datarooms" value={fmtPower(pw.lossesDataroomsKw)} />
                <MetricRow label="Losses: Mechanical" value={fmtPower(pw.lossesMechanicalKw)} />
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-[var(--color-text-muted)]">No data</div>
            )}
          </SectionCard>

          {/* Financial Metrics */}
          <SectionCard title="Financial Metrics">
            {fm && fb ? (
              <div>
                <MetricRow label="NPV (20-year horizon)" value={fmtCurrency(fm.npv, currency)} />
                <MetricRow label="Break-even revenue" value={`${fmtCurrency(fm.annualRevenueToBreakEven, currency)}/yr`} />
                <MetricRow label="Monthly rev. per kW (L4)" value={`${fmtCurrency(fm.monthlyRevenuePerKwCriticalPower, currency)}/kW`} />
                <MetricRow label="Initial CAPEX investment" value={fmtCurrency(Math.abs(fm.initialCapexInvestment), currency)} />
                <MetricRow label="Annual loan payment" value={fmtCurrency(Math.abs(fm.capexAnnualLoanPayment), currency)} />
                <MetricRow label="Depreciation: infrastructure" value={`${fmtCurrency(fb.depreciation.annualInfrastructure, currency)}/yr`} />
                <MetricRow label="Depreciation: IT equipment" value={`${fmtCurrency(fb.depreciation.annualItEquipment, currency)}/yr`} />
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-[var(--color-text-muted)]">No data</div>
            )}
          </SectionCard>

          {/* Resource Breakdown */}
          <SectionCard title="Resource Breakdown">
            {rb ? (
              <div>
                <MetricRow label="Water: utility" value={fmtWater(rb.waterUtilityM3)} sub="annual" />
                <MetricRow label="Water: equipment" value={fmtWater(rb.waterEquipmentM3)} sub="annual" />
                <MetricRow label="Floor area: datarooms" value={fmtArea(rb.floorAreaDataroomsM2)} />
                <MetricRow label="Floor area: facilities" value={fmtArea(rb.floorAreaFacilitiesM2)} />
                <MetricRow label="Floor area: overall (70%)" value={fmtArea(rb.floorAreaOverallM2)} />
                <MetricRow label="Heat recovery rate" value={fmtPower(rb.heatRecoveryRateKw)} />
                <MetricRow label="CO₂e utility" value={`${fmt3sig(rb.co2eUtilityTonnes)} t/yr`} />
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-[var(--color-text-muted)]">No data</div>
            )}
          </SectionCard>

          {/* CAPEX Breakdown */}
          <SectionCard title="CAPEX Breakdown">
            {fb ? (
              <div>
                <MetricRow label="Power equipment" value={fmtCurrency(fb.capex.powerEquipment, currency)} />
                <MetricRow label="Cooling equipment" value={fmtCurrency(fb.capex.coolingEquipment, currency)} />
                <MetricRow label="Data equipment" value={fmtCurrency(fb.capex.dataEquipment, currency)} />
                <MetricRow label="Core & Shell" value={fmtCurrency(fb.capex.coreAndShell, currency)} />
                <MetricRow label="Fit-Out" value={fmtCurrency(fb.capex.fitOut, currency)} />
                <div className="pt-2 mt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--color-text)]">Total CAPEX</span>
                  <span className="text-sm font-bold text-[var(--color-text)] tabular-nums">
                    {fmtCurrency(fm?.capexTotal ?? 0, currency)}
                  </span>
                </div>
                <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-2">OPEX Breakdown</p>
                  <MetricRow label="Electrical" value={fmtCurrency(fb.opex.electrical, currency)} />
                  <MetricRow label="Maintenance" value={fmtCurrency(fb.opex.maintenance, currency)} />
                  <MetricRow label="Water" value={fmtCurrency(fb.opex.water, currency)} />
                  <MetricRow label="Heat recovery credit" value={fmtCurrency(fb.opex.heatRecovery, currency)} />
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-[var(--color-text-muted)]">No data</div>
            )}
          </SectionCard>
        </div>

        {/* Capacity margins (if any) */}
        {result && result.capacityMargins.length > 0 && (
          <SectionCard title="Capacity Margins">
            <div className="divide-y divide-[var(--color-border)]">
              {result.capacityMargins.map((cm) => (
                <div key={cm.equipment} className="flex items-center justify-between py-2">
                  <span className="text-sm text-[var(--color-text-muted)]">{cm.equipment}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-[var(--color-text)]">
                      {fmtPower(cm.loadKw)} / {fmtPower(cm.capacityKw)}
                    </span>
                    <span className={`text-xs font-medium ${cm.redundancyMet ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {cm.redundancyMet ? 'OK' : 'At risk'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Model metadata */}
        {result && (
          <p className="text-xs text-[var(--color-text-muted)] text-center pb-4">
            Model: {result.modelVersion} | Computed: {new Date(result.computedAt).toLocaleString()} | {result.durationMs}ms
          </p>
        )}
      </div>
    </main>
  )
}

// ─── Header sub-component ─────────────────────────────────────────────────────

import type { CalculationResult } from '@ocp-tco/model-schema'

function ResultsHeader({
  currency,
  scenarioInput,
  result,
}: {
  currency: string
  scenarioInput: ScenarioInput | null
  result: CalculationResult | null
}) {
  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/scenario/review"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Review
            </Link>
            <span className="text-[var(--color-border)]">/</span>
            <h1 className="text-base font-semibold text-[var(--color-text)]">Results</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!result || !scenarioInput}
              onClick={() => {
                if (result && scenarioInput) exportCalculationJSON(scenarioInput, result)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] shadow-sm transition-colors hover:bg-[var(--color-bg-subtle)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <Link
              href="/compare"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] shadow-sm transition-colors hover:bg-[var(--color-bg-subtle)]"
            >
              <BarChart2 className="h-4 w-4" />
              Compare
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
