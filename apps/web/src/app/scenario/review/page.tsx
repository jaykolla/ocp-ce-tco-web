'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle, Server, Zap, Thermometer, DollarSign } from 'lucide-react'
import { useWizardStore } from '@/store/wizard-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm font-medium text-[var(--color-text)] text-right">{value}</span>
    </div>
  )
}

export default function ReviewPage() {
  const router = useRouter()
  const store = useWizardStore()
  const { nextStep, prevStep } = store

  const activeDatarooms = store.dataroomSlots.filter((s) => s !== null && s !== 'none')

  const handleRunCalculation = () => {
    nextStep()
    router.push('/scenario/results')
  }

  const handleBack = () => {
    prevStep()
    router.push('/scenario/finance')
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-green-100 dark:bg-green-950/30">
            <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Review & Validate</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Confirm your inputs before running the calculation</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Project summary */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Project</CardTitle>
              <Badge variant="outline" className="text-xs">{store.currency}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ReviewRow label="Scenario Name" value={store.scenarioName} />
            <ReviewRow label="Currency" value={store.currency} />
            <ReviewRow label="Model Version" value={store.modelVersion} />
          </CardContent>
        </Card>

        {/* IT summary */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-[var(--color-primary)]" />
              <CardTitle className="text-base">IT Design</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ReviewRow label="Utilization" value={`${store.powerCapacityUtilization}%`} />
            <ReviewRow
              label="Datarooms"
              value={activeDatarooms.length > 0 ? activeDatarooms.join(', ') : 'None configured'}
            />
          </CardContent>
        </Card>

        {/* Power summary */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">Power Systems</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ReviewRow label="Critical Power" value={store.criticalPowerConfigId} />
            <ReviewRow label="Mechanical Power" value={store.mechanicalPowerConfigId} />
            <ReviewRow label="Redundancy" value={store.powerRedundancy} />
          </CardContent>
        </Card>

        {/* Cooling summary */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-cyan-600" />
              <CardTitle className="text-base">Cooling & Climate</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ReviewRow label="Air Cooling" value={store.airCoolingConfigId} />
            <ReviewRow label="Liquid Cooling" value={store.liquidCoolingConfigId} />
            <ReviewRow label="Redundancy" value={store.coolingRedundancy} />
            <ReviewRow label="Temperature" value={store.temperatureCategory} />
            <ReviewRow label="Humidity" value={store.humidityCategory} />
          </CardContent>
        </Card>

        {/* Finance summary */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[var(--color-success)]" />
              <CardTitle className="text-base">Finance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ReviewRow label="Electricity Cost" value={`${store.electricityUnitCost} ${store.currency}/kWh`} />
            <ReviewRow label="Core & Shell" value={`${store.coreAndShellUnitCost} ${store.currency}/m²`} />
            <ReviewRow label="Fit-Out" value={`${store.fitOutUnitCost} ${store.currency}/m²`} />
            <ReviewRow label="Discount Rate" value={`${store.discountRatePct}%`} />
            <ReviewRow label="Facility Lifespan" value={`${store.facilityLifespanYr} years`} />
            <ReviewRow label="IT Lifespan" value={`${store.itLifespanYr} years`} />
            <ReviewRow label="Annual Hours" value={`${store.annualHours} hr/yr`} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <Button variant="outline" onClick={handleBack}>Back</Button>
        <Button variant="ocp" size="lg" onClick={handleRunCalculation}>
          Run Calculation
        </Button>
      </div>
    </div>
  )
}
