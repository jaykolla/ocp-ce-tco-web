'use client'

/**
 * PDF Report Page — /scenario/results/report
 *
 * A print-ready, chart-free report layout. All data comes from the
 * Zustand stores (wizard-store for inputs, runs calculation inline for
 * results). Use browser Print / Save as PDF to export.
 */

import { useMemo } from 'react'
import { useWizardStore } from '@/store/wizard-store'
import { useScenarioInputStore, TEMP_HUM_TO_ZONE } from '@/store/scenario-input-store'
import { useCalculation } from '@/hooks/use-calculation'
import { fmt3sig, fmtCurrency, fmtPower, fmtArea, fmtWater } from '@/lib/format'
import type { ScenarioInput } from '@ocp-tco/model-schema'

// ─── helpers ──────────────────────────────────────────────────────────────────

function resolveClimateZoneId(temp: string, humidity: string): string {
  const key = `${temp}_${humidity}`
  return TEMP_HUM_TO_ZONE[key] ?? '3A'
}

function today(): string {
  return new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── Print-only table components ──────────────────────────────────────────────

function TableRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className="border-b border-gray-200 last:border-0">
      <td className="py-1.5 pr-4 text-sm text-gray-600 w-1/2">{label}</td>
      <td className={`py-1.5 text-sm tabular-nums text-right w-1/2 ${bold ? 'font-bold text-gray-900' : 'text-gray-800'}`}>
        {value}
      </td>
    </tr>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-8 mb-3 border-b-2 border-[#7EC924] pb-1">
      <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</h2>
    </div>
  )
}

function TwoColTable({ rows }: { rows: Array<{ label: string; value: string }> }) {
  const half = Math.ceil(rows.length / 2)
  const left = rows.slice(0, half)
  const right = rows.slice(half)
  return (
    <div className="grid grid-cols-2 gap-6">
      <table className="w-full border-collapse">
        <tbody>
          {left.map((r) => (
            <TableRow key={r.label} label={r.label} value={r.value} />
          ))}
        </tbody>
      </table>
      <table className="w-full border-collapse">
        <tbody>
          {right.map((r) => (
            <TableRow key={r.label} label={r.label} value={r.value} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main report page ─────────────────────────────────────────────────────────

export default function ReportPage() {
  const wiz = useWizardStore()
  const inp = useScenarioInputStore()
  const currency = wiz.currency

  // Build ScenarioInput for calculation
  const scenarioInput = useMemo<ScenarioInput | null>(() => {
    const hasDataroom = inp.dataroomSlots.some((s) => s !== null)
    if (!hasDataroom) return null

    const climateZoneId = resolveClimateZoneId(inp.temperatureCategory, inp.humidityCategory)
    const validZones = ['0A','0B','1A','1B','2A','2B','3A','3B','3C','4A','4B','4C','5A','5B','5C','6A','6B','7','8']
    const safeZoneId = validZones.includes(climateZoneId) ? climateZoneId : '3A'

    const validTemperatureCategories = ['Subarctic/arctic','Very cold','Cold','Cool','Mixed','Warm','Hot','Very hot','Extremely hot']
    const validHumidityCategories = ['Dry','Mixed','Humid','Maritime','Wet','-']
    const validCurrencies = ['EUR','USD','GBP','JPY','CHF','CAD','AUD','SGD']
    const validRedundancy = ['N','N+1','2N']

    const safeTemp = validTemperatureCategories.includes(inp.temperatureCategory) ? inp.temperatureCategory : 'Warm'
    const safeHumidity = validHumidityCategories.includes(inp.humidityCategory) ? inp.humidityCategory : 'Wet'
    const safeCurrency = validCurrencies.includes(wiz.currency) ? wiz.currency : 'EUR'
    const safePowerRedundancy = validRedundancy.includes(inp.powerRedundancy) ? inp.powerRedundancy : 'N+1'
    const safeCoolingRedundancy = validRedundancy.includes(inp.coolingRedundancy) ? inp.coolingRedundancy : 'N+1'

    return {
      id: inp.id,
      name: inp.name,
      modelVersion: 'ocp-ce-tco-1.11-web-1',
      seedDatasetVersions: { power: '1.11.0', cooling: '1.11.0', data: '1.11.0', weather: '1.11.0' },
      it: {
        powerCapacityUtilization: String(inp.powerCapacityUtilization) as `${number}`,
        dataroomSlots: inp.dataroomSlots as [
          { dataroomConfigId: string } | null,
          { dataroomConfigId: string } | null,
          { dataroomConfigId: string } | null,
          { dataroomConfigId: string } | null,
        ],
      },
      facilities: {
        criticalPowerConfigId: inp.criticalPowerConfigId,
        mechanicalPowerConfigId: inp.mechanicalPowerConfigId,
        powerRedundancy: safePowerRedundancy as 'N' | 'N+1' | '2N',
        airCoolingConfigId: inp.airCoolingConfigId,
        liquidCoolingConfigId: inp.liquidCoolingConfigId,
        coolingRedundancy: safeCoolingRedundancy as 'N' | 'N+1' | '2N',
        temperatureCategory: safeTemp as ScenarioInput['facilities']['temperatureCategory'],
        humidityCategory: safeHumidity as ScenarioInput['facilities']['humidityCategory'],
        climateZoneId: safeZoneId as ScenarioInput['facilities']['climateZoneId'],
      },
      finance: {
        currency: safeCurrency as ScenarioInput['finance']['currency'],
        electricityUnitCostPerKwh: String(inp.electricityUnitCostPerKwh) as `${number}`,
        coreAndShellUnitCostPerM2: String(inp.coreAndShellUnitCostPerM2) as `${number}`,
        fitOutUnitCostPerM2: String(inp.fitOutUnitCostPerM2) as `${number}`,
        waterUnitCostPerM3: String(inp.waterUnitCostPerM3) as `${number}`,
        heatRecoveryValuePerKwh: String(inp.heatRecoveryValuePerKwh) as `${number}`,
        coreAndShellMaintenanceFraction: String(inp.coreAndShellMaintenanceFraction) as `${number}`,
        equipmentMaintenanceFraction: String(inp.equipmentMaintenanceFraction) as `${number}`,
        electricityCo2GPerKwh: String(inp.electricityCo2GPerKwh) as `${number}`,
        electricityWaterLPerKwh: String(inp.electricityWaterLPerKwh) as `${number}`,
        facilityPowerCoolingLifespanYr: String(inp.facilityPowerCoolingLifespanYr) as `${number}`,
        itEquipmentLifespanYr: String(inp.itEquipmentLifespanYr) as `${number}`,
        discountRateFraction: String(inp.discountRateFraction) as `${number}`,
        capexFinancingRateFraction: String(inp.capexFinancingRateFraction) as `${number}`,
        capexFinancedFraction: String(inp.capexFinancedFraction) as `${number}`,
        capexFinancingTermYr: String(inp.capexFinancingTermYr) as `${number}`,
        annualHours: String(inp.annualHours) as `${number}`,
      },
    } as ScenarioInput
  }, [inp, wiz.currency])

  const { result, isCalculating } = useCalculation(scenarioInput)

  const m = result?.metrics
  const rb = result?.resourceBreakdown
  const fm = result?.financialMetrics
  const fb = result?.financialBreakdown
  const pw = rb?.power
  const scenarioName = wiz.scenarioName || inp.name

  // Input rows for the summary table
  const inputRows = [
    { label: 'Scenario Name', value: scenarioName },
    { label: 'Currency', value: currency },
    { label: 'Model Version', value: 'ocp-ce-tco-1.11-web-1' },
    { label: 'Utilization', value: `${Math.round(inp.powerCapacityUtilization * 100)}%` },
    { label: 'Active Datarooms', value: String(inp.dataroomSlots.filter(Boolean).length) },
    { label: 'Critical Power Config', value: inp.criticalPowerConfigId },
    { label: 'Mechanical Power Config', value: inp.mechanicalPowerConfigId },
    { label: 'Power Redundancy', value: inp.powerRedundancy },
    { label: 'Air Cooling Config', value: inp.airCoolingConfigId },
    { label: 'Liquid Cooling Config', value: inp.liquidCoolingConfigId },
    { label: 'Cooling Redundancy', value: inp.coolingRedundancy },
    { label: 'Temperature Category', value: inp.temperatureCategory },
    { label: 'Humidity Category', value: inp.humidityCategory },
    { label: 'Electricity Cost', value: `${inp.electricityUnitCostPerKwh} ${currency}/kWh` },
    { label: 'Core & Shell Cost', value: `${inp.coreAndShellUnitCostPerM2} ${currency}/m²` },
    { label: 'Fit-Out Cost', value: `${inp.fitOutUnitCostPerM2} ${currency}/m²` },
    { label: 'Water Cost', value: `${inp.waterUnitCostPerM3} ${currency}/m³` },
    { label: 'Heat Recovery Value', value: `${inp.heatRecoveryValuePerKwh} ${currency}/kWh` },
    { label: 'C&S Maintenance', value: `${(inp.coreAndShellMaintenanceFraction * 100).toFixed(1)}%/yr` },
    { label: 'Equipment Maintenance', value: `${(inp.equipmentMaintenanceFraction * 100).toFixed(1)}%/yr` },
    { label: 'CO₂ Intensity', value: `${inp.electricityCo2GPerKwh} g/kWh` },
    { label: 'Water Intensity', value: `${inp.electricityWaterLPerKwh} L/kWh` },
    { label: 'Facility Lifespan', value: `${inp.facilityPowerCoolingLifespanYr} years` },
    { label: 'IT Equipment Lifespan', value: `${inp.itEquipmentLifespanYr} years` },
    { label: 'Discount Rate', value: `${(inp.discountRateFraction * 100).toFixed(1)}%` },
    { label: 'Financing Rate', value: `${(inp.capexFinancingRateFraction * 100).toFixed(1)}%` },
    { label: 'Financed Portion', value: `${(inp.capexFinancedFraction * 100).toFixed(0)}%` },
    { label: 'Financing Term', value: `${inp.capexFinancingTermYr} years` },
    { label: 'Annual Hours', value: `${inp.annualHours} hr/yr` },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Print button (hidden in actual print) ── */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm no-print">
        <span className="text-sm text-gray-500">Print preview — this bar will not appear in the PDF</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-[#7EC924] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6ab31e]"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* ── Report body (A4-ish max-width) ── */}
      <div className="mx-auto max-w-4xl px-10 py-10 print:px-8 print:py-6">

        {/* ── Cover / header ── */}
        <div className="flex items-start justify-between border-b-2 border-[#7EC924] pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#7EC924]">OCP CE TCO Web Tool</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{scenarioName}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Model: ocp-ce-tco-1.11-web-1&nbsp;&nbsp;|&nbsp;&nbsp;Currency: {currency}
            </p>
          </div>
          <div className="text-right">
            {/* OCP logo placeholder — green rectangle */}
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#7EC924] text-white font-bold text-lg">
              O
            </div>
            <p className="mt-1 text-xs text-gray-400">Generated: {today()}</p>
          </div>
        </div>

        {/* ── Executive Summary ── */}
        <SectionHeader title="Executive Summary" />
        {isCalculating && !result && (
          <p className="text-sm text-gray-400 italic">Calculating…</p>
        )}
        {result && m && fm && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[
                { label: 'PUE L3', value: fmt3sig(m.pueL3) },
                { label: 'PUE L4', value: fmt3sig(m.pueL4) },
                { label: 'ERF', value: fmt3sig(m.erf) },
                { label: 'WUE', value: `${fmt3sig(m.wue)} L/kWh` },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded border border-gray-200 bg-gray-50 p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">{kpi.value}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'CAPEX Total', value: fmtCurrency(fm.capexTotal, currency) },
                { label: 'OPEX Annual', value: `${fmtCurrency(fm.opexAnnualPayments, currency)}/yr` },
                { label: 'Workload Density', value: `${fmt3sig(m.workloadDensityKwPerM2)} kW/m²` },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded border border-[#7EC924]/40 bg-[#7EC924]/5 p-3 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums">{kpi.value}</p>
                </div>
              ))}
            </div>
          </>
        )}
        {!scenarioInput && (
          <p className="text-sm text-red-500">No datarooms configured — results not available.</p>
        )}

        {/* ── Inputs Summary ── */}
        <SectionHeader title="Inputs Summary" />
        <TwoColTable rows={inputRows} />

        {/* ── Resource Breakdown ── */}
        {rb && pw && (
          <>
            <SectionHeader title="Resource Breakdown" />
            <div className="grid grid-cols-2 gap-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="pb-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" colSpan={2}>
                      Power Cascade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <TableRow label="Total Facility (annual avg)" value={fmtPower(pw.totalFacilityKw)} />
                  <TableRow label="L1 — UPS output" value={fmtPower(pw.itePowerL1Kw)} />
                  <TableRow label="L2 — PDU output" value={fmtPower(pw.itePowerL2Kw)} />
                  <TableRow label="L3 — rPDU output" value={fmtPower(pw.itePowerL3Kw)} />
                  <TableRow label="L4 — Node input (workload)" value={fmtPower(pw.itePowerL4Kw)} bold />
                  <TableRow label="Losses: Critical path" value={fmtPower(pw.lossesCriticalKw)} />
                  <TableRow label="Losses: Datarooms" value={fmtPower(pw.lossesDataroomsKw)} />
                  <TableRow label="Losses: Mechanical" value={fmtPower(pw.lossesMechanicalKw)} />
                </tbody>
              </table>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="pb-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" colSpan={2}>
                      Water, CO₂ & Area
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <TableRow label="Water: utility (annual)" value={fmtWater(rb.waterUtilityM3)} />
                  <TableRow label="Water: equipment (annual)" value={fmtWater(rb.waterEquipmentM3)} />
                  <TableRow label="Floor area: datarooms" value={fmtArea(rb.floorAreaDataroomsM2)} />
                  <TableRow label="Floor area: facilities" value={fmtArea(rb.floorAreaFacilitiesM2)} />
                  <TableRow label="Floor area: overall (70%)" value={fmtArea(rb.floorAreaOverallM2)} bold />
                  <TableRow label="Heat recovery rate" value={fmtPower(rb.heatRecoveryRateKw)} />
                  <TableRow label="CO₂e utility (annual)" value={`${fmt3sig(rb.co2eUtilityTonnes)} t/yr`} />
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Financial Breakdown ── */}
        {fm && fb && (
          <>
            <SectionHeader title="Financial Breakdown" />
            <div className="grid grid-cols-2 gap-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="pb-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" colSpan={2}>
                      CAPEX
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <TableRow label="Power equipment" value={fmtCurrency(fb.capex.powerEquipment, currency)} />
                  <TableRow label="Cooling equipment" value={fmtCurrency(fb.capex.coolingEquipment, currency)} />
                  <TableRow label="Data equipment" value={fmtCurrency(fb.capex.dataEquipment, currency)} />
                  <TableRow label="Core & Shell" value={fmtCurrency(fb.capex.coreAndShell, currency)} />
                  <TableRow label="Fit-Out" value={fmtCurrency(fb.capex.fitOut, currency)} />
                  <TableRow label="Total CAPEX" value={fmtCurrency(fm.capexTotal, currency)} bold />
                </tbody>
              </table>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="pb-1 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" colSpan={2}>
                      OPEX &amp; Financials
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <TableRow label="Electrical (annual)" value={fmtCurrency(fb.opex.electrical, currency)} />
                  <TableRow label="Maintenance (annual)" value={fmtCurrency(fb.opex.maintenance, currency)} />
                  <TableRow label="Water (annual)" value={fmtCurrency(fb.opex.water, currency)} />
                  <TableRow label="Heat recovery credit" value={fmtCurrency(fb.opex.heatRecovery, currency)} />
                  <TableRow label="OPEX Annual Total" value={`${fmtCurrency(fm.opexAnnualPayments, currency)}/yr`} bold />
                  <TableRow label="NPV (20-year)" value={fmtCurrency(fm.npv, currency)} />
                  <TableRow label="Break-even revenue" value={`${fmtCurrency(fm.annualRevenueToBreakEven, currency)}/yr`} />
                  <TableRow label="Monthly rev/kW (L4)" value={`${fmtCurrency(fm.monthlyRevenuePerKwCriticalPower, currency)}/kW`} />
                  <TableRow label="Annual loan payment" value={fmtCurrency(Math.abs(fm.capexAnnualLoanPayment), currency)} />
                  <TableRow label="Depreciation: infra/yr" value={fmtCurrency(fb.depreciation.annualInfrastructure, currency)} />
                  <TableRow label="Depreciation: IT/yr" value={fmtCurrency(fb.depreciation.annualItEquipment, currency)} />
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Assumptions & Model Notes ── */}
        <SectionHeader title="Assumptions &amp; Model Notes" />
        <ul className="space-y-1.5 text-sm text-gray-600">
          <li><span className="font-semibold text-gray-800">A-AREA-70PCT:</span> Dataroom floor area is assumed to occupy 70% of the overall facility gross floor area.</li>
          <li><span className="font-semibold text-gray-800">A-PUE-CASCADE:</span> PUE is computed at four measurement boundaries (L1–L4) per DCIE/EN50600 methodology.</li>
          <li><span className="font-semibold text-gray-800">A-WEATHER:</span> Cooling energy is calculated from ASHRAE climate zone weather data; reference city selected by zone centroid.</li>
          <li><span className="font-semibold text-gray-800">A-ERF:</span> Energy Reuse Factor = heat exported to district / total facility input power (annual average).</li>
          <li><span className="font-semibold text-gray-800">A-WUE:</span> Water Use Effectiveness = (utility + equipment water) / (ITE L2 kW × annual hours).</li>
          <li><span className="font-semibold text-gray-800">A-CUE:</span> Carbon Use Effectiveness = PUE L3 × CO₂ g/kWh / 1000 (kg CO₂e per kWh of IT load).</li>
          <li><span className="font-semibold text-gray-800">A-CAPEX:</span> CAPEX includes power, cooling, data equipment, core &amp; shell, and fit-out; no land or permitting costs.</li>
          <li><span className="font-semibold text-gray-800">A-OPEX:</span> OPEX includes electricity, maintenance, water, minus heat recovery credit; excludes staffing.</li>
          <li><span className="font-semibold text-gray-800">A-NPV:</span> 20-year NPV horizon; discount rate applied to all future OPEX cash flows.</li>
          <li><span className="font-semibold text-gray-800">A-FINANCING:</span> Loan payments computed on financed CAPEX fraction with constant annuity schedule.</li>
          <li><span className="font-semibold text-gray-800">A-REDUNDANCY:</span> N+1 and 2N redundancy factors applied to equipment sizing for power and cooling.</li>
          <li><span className="font-semibold text-gray-800">Source:</span> OCP CE TCO Workbook v1.11 — open-compute-project.org</li>
        </ul>

        {/* ── Page footer ── */}
        <div className="mt-10 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
          Generated by OCP CE TCO Web Tool (ocp-ce-tco-1.11-web-1) on {today()}.
          Based on OCP CE TCO Workbook v1.11 — open-compute-project.org.
          This report is for informational purposes only.
        </div>
      </div>
    </div>
  )
}
