'use client'

/**
 * Import from Excel page
 *
 * Upload an OCP CE TCO v1.11 .xlsx file and extract Input tab values
 * into the scenario-input-store, then navigate to /scenario.
 */

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, XCircle, ArrowRight } from 'lucide-react'

import { importWorkbook, type ImportResult, type WizardImportState } from '@/lib/workbook-importer'
import { useScenarioInputStore } from '@/store/scenario-input-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const router = useRouter()
  const store = useScenarioInputStore()

  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      setResult({
        success: false,
        scenarioName: file.name,
        inputs: {},
        warnings: [],
        errors: ['Please upload a .xlsx file (Excel workbook).'],
      })
      return
    }
    setFileName(file.name)
    setIsProcessing(true)
    setResult(null)

    try {
      const res = await importWorkbook(file)
      setResult(res)
    } catch (err) {
      setResult({
        success: false,
        scenarioName: file.name,
        inputs: {},
        warnings: [],
        errors: [`Unexpected error: ${String(err)}`],
      })
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleImport = useCallback(() => {
    if (!result?.success || !result.inputs) return

    const inputs = result.inputs as Partial<WizardImportState>

    // Apply finance fields
    const numericFields: Array<keyof WizardImportState> = [
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
      'powerCapacityUtilization',
    ]

    for (const field of numericFields) {
      const val = inputs[field]
      if (val !== undefined && typeof val === 'number' && isFinite(val)) {
        store.setField(field as Parameters<typeof store.setField>[0], val as never)
      }
    }

    // Update scenario name
    if (result.scenarioName) {
      store.setField('name', result.scenarioName)
    }

    router.push('/scenario')
  }, [result, store, router])

  // ── Extracted fields summary ────────────────────────────────────────────────

  const extractedFields = result
    ? Object.entries(result.inputs).filter(([, v]) => v !== undefined)
    : []

  const financeFieldLabels: Record<string, string> = {
    electricityUnitCostPerKwh: 'Electricity unit cost',
    coreAndShellUnitCostPerM2: 'Core & shell unit cost',
    fitOutUnitCostPerM2: 'Fit-out unit cost',
    waterUnitCostPerM3: 'Water unit cost',
    heatRecoveryValuePerKwh: 'Heat recovery value',
    coreAndShellMaintenanceFraction: 'Core & shell maintenance',
    equipmentMaintenanceFraction: 'Equipment maintenance',
    electricityCo2GPerKwh: 'Electricity CO₂',
    electricityWaterLPerKwh: 'Electricity water',
    facilityPowerCoolingLifespanYr: 'Facility lifespan',
    itEquipmentLifespanYr: 'IT lifespan',
    discountRateFraction: 'Discount rate',
    capexFinancingRateFraction: 'Financing rate',
    capexFinancedFraction: 'Financed fraction',
    capexFinancingTermYr: 'Financing term',
    annualHours: 'Annual hours',
    powerCapacityUtilization: 'IT power utilization',
  }

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <span className="text-zinc-300 dark:text-zinc-600">/</span>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Import from Excel
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Upload an OCP CE TCO Tool v1.11 .xlsx file to pre-fill the wizard
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">

        {/* Drop zone */}
        <Card>
          <CardContent className="pt-6">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-8 py-16 cursor-pointer transition-colors ${
                isDragging
                  ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30'
                  : 'border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800/50 dark:hover:border-zinc-500'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="sr-only"
                onChange={handleFileChange}
              />
              {isProcessing ? (
                <>
                  <div className="h-12 w-12 rounded-xl border-2 border-emerald-400 bg-emerald-50 flex items-center justify-center dark:bg-emerald-950/30">
                    <Upload className="h-6 w-6 text-emerald-600 animate-bounce" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">Processing {fileName}…</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Scanning Input worksheet</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-xl border border-zinc-200 bg-white flex items-center justify-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">
                      Drop OCP CE TCO v1.11.xlsx here, or click to select
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Supported: OCP CE TCO Tool v1.11 (.xlsx)
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Import Preview — {result.scenarioName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Fatal errors */}
              {result.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-1 dark:border-red-800 dark:bg-red-950/30">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 dark:text-red-300">{e}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Extracted fields */}
              {extractedFields.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                    Extracted ({extractedFields.length} fields)
                  </p>
                  {extractedFields.map(([field, value]) => (
                    <div key={field} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        <span className="font-medium">{financeFieldLabels[field] ?? field}</span>
                        {': '}
                        <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {typeof value === 'number' ? value.toFixed(4) : String(value)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                    Warnings ({result.warnings.length})
                  </p>
                  {result.warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                {result.success && (
                  <button
                    type="button"
                    onClick={handleImport}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    Import to Wizard
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setResult(null)
                    setFileName(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage instructions */}
        {!result && !isProcessing && (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
              How it works
            </h2>
            <ol className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 list-decimal list-inside">
              <li>Upload your OCP CE TCO Tool v1.11 .xlsx file above</li>
              <li>The tool scans the Input worksheet for finance and IT parameters</li>
              <li>Detected values are shown in the preview with warnings for anything not found</li>
              <li>Click "Import to Wizard" to merge the values into the scenario wizard</li>
              <li>Review and adjust any missing values in the wizard steps</li>
            </ol>
            <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
              All parsing happens in your browser — no data is uploaded to any server.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
