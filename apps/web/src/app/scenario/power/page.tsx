'use client'

import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'
import { useWizardStore } from '@/store/wizard-store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const CRITICAL_POWER_CONFIGS = [
  { value: 'default', label: 'Default' },
  { value: 'se-rd-crit', label: 'SE RD Crit' },
]

const MECHANICAL_POWER_CONFIGS = [
  { value: 'default', label: 'Default' },
  { value: 'se-rd-mech', label: 'SE RD Mech' },
]

const REDUNDANCY_OPTIONS = ['N', 'N+1', '2N'] as const

export default function PowerPage() {
  const router = useRouter()
  const {
    criticalPowerConfigId,
    mechanicalPowerConfigId,
    powerRedundancy,
    nextStep,
    prevStep,
    updatePower,
  } = useWizardStore()

  const handleContinue = () => {
    nextStep()
    router.push('/scenario/cooling')
  }

  const handleBack = () => {
    prevStep()
    router.push('/scenario/it')
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-yellow-100 dark:bg-yellow-950/30">
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Power Systems</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Configure critical and mechanical power infrastructure</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Power Configuration</CardTitle>
            <CardDescription>Select critical and mechanical power equipment configurations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="critical-power">Critical Power Config</Label>
              <Select
                value={criticalPowerConfigId}
                onValueChange={(val) => updatePower({ criticalPowerConfigId: val })}
              >
                <SelectTrigger id="critical-power">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRITICAL_POWER_CONFIGS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mechanical-power">Mechanical Power Config</Label>
              <Select
                value={mechanicalPowerConfigId}
                onValueChange={(val) => updatePower({ mechanicalPowerConfigId: val })}
              >
                <SelectTrigger id="mechanical-power">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MECHANICAL_POWER_CONFIGS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Power Redundancy</CardTitle>
            <CardDescription>Select the redundancy level for the power infrastructure.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Power redundancy level">
              {REDUNDANCY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  role="radio"
                  aria-checked={powerRedundancy === opt}
                  onClick={() => updatePower({ powerRedundancy: opt })}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-[var(--radius-lg)] border-2 p-4 text-sm font-medium transition-all cursor-pointer',
                    powerRedundancy === opt
                      ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)] dark:bg-blue-950/30'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-[var(--color-text-muted)]'
                  )}
                >
                  <span className="text-lg font-bold">{opt}</span>
                  <span className="text-xs">{opt === 'N' ? 'No redundancy' : opt === 'N+1' ? 'One extra' : 'Full duplicate'}</span>
                </button>
              ))}
            </div>
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
