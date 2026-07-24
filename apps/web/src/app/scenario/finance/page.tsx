'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign } from 'lucide-react'
import { useWizardStore } from '@/store/wizard-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateNumericInput, FINANCE_FIELD_VALIDATORS } from '@/lib/validation'

interface FieldConfig {
  key: string
  label: string
  unit: string
  hint?: string
}

const LEFT_FIELDS: FieldConfig[] = [
  { key: 'electricityUnitCost', label: 'Electricity Unit Cost', unit: 'EUR/kWh', hint: 'Cost per kWh of grid electricity' },
  { key: 'coreAndShellUnitCost', label: 'Core & Shell Cost', unit: 'EUR/m²', hint: 'Construction cost for core & shell' },
  { key: 'fitOutUnitCost', label: 'Fit-Out Cost', unit: 'EUR/m²', hint: 'Interior fit-out and MEP cost' },
  { key: 'waterUnitCost', label: 'Water Cost', unit: 'EUR/m³', hint: 'Municipal water supply cost' },
  { key: 'heatRecoveryValue', label: 'Heat Recovery Value', unit: 'EUR/kWh', hint: 'Value of recovered heat for resale' },
  { key: 'coreAndShellMaintenancePct', label: 'Core & Shell Maintenance', unit: '% /yr', hint: 'Annual maintenance as % of CAPEX' },
  { key: 'equipmentMaintenancePct', label: 'Equipment Maintenance', unit: '% /yr', hint: 'Annual equipment maintenance as % of CAPEX' },
]

const RIGHT_FIELDS: FieldConfig[] = [
  { key: 'electricityCo2GPerKwh', label: 'CO₂ Intensity', unit: 'g CO₂/kWh', hint: 'Grid electricity carbon intensity' },
  { key: 'electricityWaterLPerKwh', label: 'Water Intensity', unit: 'L/kWh', hint: 'Water consumption per kWh of electricity generated' },
  { key: 'facilityLifespanYr', label: 'Facility Lifespan', unit: 'years', hint: 'Expected building useful life' },
  { key: 'itLifespanYr', label: 'IT Equipment Lifespan', unit: 'years', hint: 'Average IT refresh cycle' },
  { key: 'discountRatePct', label: 'NPV Discount Rate', unit: '% /yr', hint: 'Discount rate for NPV calculation' },
  { key: 'financingRatePct', label: 'Financing Rate', unit: '% /yr', hint: 'Loan interest rate' },
  { key: 'financedPct', label: 'Financed Portion', unit: '%', hint: 'Percentage of CAPEX financed by debt' },
  { key: 'financingTermYr', label: 'Financing Term', unit: 'years', hint: 'Loan repayment period' },
  { key: 'annualHours', label: 'Annual Hours', unit: 'hr/yr', hint: 'Hours of operation per year (8760 = continuous)' },
]

function FinanceField({
  fieldKey,
  label,
  unit,
  hint,
  value,
  onChange,
  error,
}: {
  fieldKey: string
  label: string
  unit: string
  hint?: string
  value: string
  onChange: (val: string) => void
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`field-${fieldKey}`}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={`field-${fieldKey}`}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
          aria-describedby={error ? `error-${fieldKey}` : hint ? `hint-${fieldKey}` : undefined}
          aria-invalid={!!error}
          step="any"
        />
        <span className="shrink-0 text-sm text-[var(--color-text-muted)] min-w-[64px]">{unit}</span>
      </div>
      {error && (
        <p id={`error-${fieldKey}`} role="alert" className="text-xs text-red-500 font-medium">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`hint-${fieldKey}`} className="text-xs text-[var(--color-text-subtle)]">{hint}</p>
      )}
    </div>
  )
}

type FieldErrors = Record<string, string | undefined>

export default function FinancePage() {
  const router = useRouter()
  const store = useWizardStore()
  const { nextStep, prevStep, updateFinance } = store
  const [errors, setErrors] = useState<FieldErrors>({})

  const handleChange = (key: string, val: string) => {
    updateFinance({ [key]: val })

    // Validate on change and clear error if now valid
    const validatorOpts = FINANCE_FIELD_VALIDATORS[key]
    if (validatorOpts) {
      const result = validateNumericInput(val, validatorOpts)
      setErrors((prev) => ({
        ...prev,
        [key]: result.valid ? undefined : result.error,
      }))
    }
  }

  const getValue = (key: string): string => {
    return String((store as unknown as Record<string, string>)[key] ?? '')
  }

  const validateAll = (): boolean => {
    const allFields = [...LEFT_FIELDS, ...RIGHT_FIELDS]
    const newErrors: FieldErrors = {}
    let hasError = false

    for (const field of allFields) {
      const validatorOpts = FINANCE_FIELD_VALIDATORS[field.key]
      if (validatorOpts) {
        const result = validateNumericInput(getValue(field.key), validatorOpts)
        if (!result.valid) {
          newErrors[field.key] = result.error
          hasError = true
        }
      }
    }

    setErrors(newErrors)
    return !hasError
  }

  const handleContinue = () => {
    if (!validateAll()) {
      // Scroll to first error
      const firstErrorKey = Object.entries(errors).find(([, v]) => v)?.[0]
      if (firstErrorKey) {
        document.getElementById(`field-${firstErrorKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    nextStep()
    router.push('/scenario/review')
  }

  const handleBack = () => {
    prevStep()
    router.push('/scenario/cooling')
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-green-100 dark:bg-green-950/30">
            <DollarSign className="h-5 w-5 text-[var(--color-success)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Finance Parameters</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Configure costs, rates, and financial assumptions</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Costs &amp; Maintenance</CardTitle>
            <CardDescription>Unit costs and annual maintenance percentages.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {LEFT_FIELDS.map((field) => (
              <FinanceField
                key={field.key}
                fieldKey={field.key}
                label={field.label}
                unit={field.unit}
                hint={field.hint}
                value={getValue(field.key)}
                error={errors[field.key]}
                onChange={(val) => handleChange(field.key, val)}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sustainability &amp; Financing</CardTitle>
            <CardDescription>Environmental metrics, lifespans, and financial terms.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {RIGHT_FIELDS.map((field) => (
              <FinanceField
                key={field.key}
                fieldKey={field.key}
                label={field.label}
                unit={field.unit}
                hint={field.hint}
                value={getValue(field.key)}
                error={errors[field.key]}
                onChange={(val) => handleChange(field.key, val)}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" onClick={handleBack}>Back</Button>
        <Button variant="ocp" onClick={handleContinue}>Continue</Button>
      </div>
    </div>
  )
}
