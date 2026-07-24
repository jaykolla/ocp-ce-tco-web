'use client'

/**
 * My Scenarios page — /my-scenarios
 *
 * Lists all scenarios saved to localStorage with key metrics.
 * Supports: Open (restore to wizard store), Delete (with confirm), Export all as JSON.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FolderOpen, Trash2, Download, RotateCcw, Calendar, Activity } from 'lucide-react'
import {
  loadScenariosFromSession,
  deleteScenarioFromSession,
  type SavedScenario,
} from '@/lib/auth'
import { useScenarioInputStore } from '@/store/scenario-input-store'
import { useWizardStore } from '@/store/wizard-store'
import { TopNav } from '@/components/nav/top-nav'

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function fmtCurrencyShort(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}k`
  return val.toFixed(0)
}

export default function MyScenariosPage() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const setInputField = useScenarioInputStore((s) => s.setField)
  const wizardReset = useWizardStore((s) => s.reset)
  const wizardUpdate = useWizardStore()

  const refresh = useCallback(() => {
    setScenarios(loadScenariosFromSession())
  }, [])

  useEffect(() => {
    setMounted(true)
    refresh()
  }, [refresh])

  const handleDelete = (id: string) => {
    setDeletingId(id)
  }

  const confirmDelete = (id: string) => {
    deleteScenarioFromSession(id)
    setDeletingId(null)
    refresh()
  }

  const handleOpen = (sc: SavedScenario) => {
    // Restore wizard store from saved inputs snapshot
    const inputs = sc.inputs as Record<string, unknown>

    // Reset to defaults first, then apply saved values
    wizardReset()

    // Apply saved fields to wizard store
    if (inputs.scenarioName && typeof inputs.scenarioName === 'string') {
      wizardUpdate.setScenarioName(inputs.scenarioName)
    }
    if (inputs.currency && typeof inputs.currency === 'string') {
      wizardUpdate.updateIT({ currency: inputs.currency as 'EUR' | 'USD' | 'GBP' })
    }

    // Apply typed inputs to scenario-input-store
    const numFields = [
      'powerCapacityUtilization',
      'electricityUnitCostPerKwh',
      'coreAndShellUnitCostPerM2',
      'fitOutUnitCostPerM2',
      'waterUnitCostPerM3',
      'heatRecoveryValuePerKwh',
      'coreAndShellMaintenanceFraction',
      'equipmentMaintenanceFraction',
      'electricityCo2GPerKwh',
      'electricityWaterLPerKwh',
      'facilityPowerCoolingLifespanYr',
      'itEquipmentLifespanYr',
      'discountRateFraction',
      'capexFinancingRateFraction',
      'capexFinancedFraction',
      'capexFinancingTermYr',
      'annualHours',
    ] as const

    for (const f of numFields) {
      if (f in inputs && typeof inputs[f] === 'number') {
        setInputField(f, inputs[f] as never)
      }
    }

    const strFields = [
      'id', 'name',
      'criticalPowerConfigId', 'mechanicalPowerConfigId',
      'airCoolingConfigId', 'liquidCoolingConfigId',
      'temperatureCategory', 'humidityCategory',
    ] as const

    for (const f of strFields) {
      if (f in inputs && typeof inputs[f] === 'string') {
        setInputField(f, inputs[f] as never)
      }
    }

    const enumFields = ['powerRedundancy', 'coolingRedundancy', 'currency'] as const
    for (const f of enumFields) {
      if (f in inputs) {
        setInputField(f, inputs[f] as never)
      }
    }

    router.push('/scenario/results')
  }

  const handleExportAll = () => {
    if (scenarios.length === 0) return
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 'ocp-ce-tco-1.11-web-1',
      scenarios,
    }
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ocp-tco-scenarios-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!mounted) {
    return (
      <>
        <TopNav />
        <main className="min-h-screen bg-[var(--color-bg)]">
          <div className="mx-auto max-w-4xl px-6 py-12">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-zinc-800" />
              ))}
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-[var(--color-bg)]">
        <div className="mx-auto max-w-4xl px-6 py-10">

          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7EC924]/15">
                <FolderOpen className="h-5 w-5 text-[#7EC924]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text)]">My Scenarios</h1>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {scenarios.length === 0
                    ? 'No saved scenarios yet'
                    : `${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'} saved locally`}
                </p>
              </div>
            </div>

            {scenarios.length > 0 && (
              <button
                type="button"
                onClick={handleExportAll}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] shadow-sm transition-colors hover:bg-[var(--color-bg-subtle)]"
              >
                <Download className="h-4 w-4" />
                Export all as JSON
              </button>
            )}
          </div>

          {/* Empty state */}
          {scenarios.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-[var(--color-surface)] p-14 text-center dark:border-zinc-600">
              <FolderOpen className="mx-auto h-10 w-10 text-gray-300 dark:text-zinc-600" />
              <p className="mt-4 text-base font-semibold text-[var(--color-text)]">No saved scenarios</p>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Run a calculation and click &ldquo;Save Scenario&rdquo; on the Review page to save your work.
              </p>
              <a
                href="/scenario"
                className="mt-6 inline-block rounded-lg bg-[#7EC924] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#6ab31e]"
              >
                Start a new scenario
              </a>
            </div>
          )}

          {/* Scenario list */}
          {scenarios.length > 0 && (
            <div className="space-y-3">
              {scenarios.map((sc) => (
                <div
                  key={sc.id}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  {deletingId === sc.id ? (
                    /* Confirm delete inline */
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-red-600">
                        Delete &ldquo;{sc.name}&rdquo;? This cannot be undone.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmDelete(sc.id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold text-[var(--color-text)]">{sc.name}</h2>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {fmtDate(sc.savedAt)}
                          </span>
                          {sc.results && (
                            <>
                              <span className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                PUE L3: {sc.results.pueL3.toFixed(3)}
                              </span>
                              <span>CAPEX: {fmtCurrencyShort(sc.results.capexTotal)}</span>
                              {sc.results.opexAnnual > 0 && (
                                <span>OPEX: {fmtCurrencyShort(sc.results.opexAnnual)}/yr</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpen(sc)}
                          className="flex items-center gap-1.5 rounded-lg bg-[#7EC924] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6ab31e]"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sc.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Privacy note */}
          <p className="mt-8 text-center text-xs text-[var(--color-text-subtle)]">
            Scenarios are saved only in this browser&apos;s local storage. Clearing browser data will remove them.
          </p>
        </div>
      </main>
    </>
  )
}
