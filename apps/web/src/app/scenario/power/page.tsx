'use client'

import { useRouter } from 'next/navigation'
import { Zap, ExternalLink } from 'lucide-react'
import { useWizardStore } from '@/store/wizard-store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const CRITICAL_POWER_CONFIGS = [
  {
    value: 'default',
    label: 'Generic Baseline',
    description: 'Standard equipment assumptions — use when no specific vendor config is needed',
  },
  {
    value: 'se-rd-crit',
    label: 'Schneider Electric — Critical Path (SE RD65)',
    description: 'SE reference design for UPS, switchgear & busbar; no transformer modeled on this path',
  },
]

const MECHANICAL_POWER_CONFIGS = [
  {
    value: 'default',
    label: 'Generic Baseline',
    description: 'Standard equipment assumptions — use when no specific vendor config is needed',
  },
  {
    value: 'se-rd-mech',
    label: 'Schneider Electric — Mechanical Path (SE RD65)',
    description: 'SE reference design for transformer & generator; UPS not modeled on this path',
  },
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Power Equipment Configuration</CardTitle>
                <CardDescription className="mt-1">
                  Choose vendor reference designs for each part of the power chain. Select "Generic Baseline" if you don't have a specific vendor preference.
                </CardDescription>
              </div>
              <a
                href="/reference?tab=power"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline mt-0.5"
              >
                Model assumptions <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="critical-power">Critical Power Equipment</Label>
              <p className="text-xs text-[var(--color-text-subtle)]">UPS, switchgear, and busbar configuration</p>
              <Select
                value={criticalPowerConfigId}
                onValueChange={(val) => updatePower({ criticalPowerConfigId: val })}
              >
                <SelectTrigger id="critical-power">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-[420px]">
                  {CRITICAL_POWER_CONFIGS.map((c) => (
                    <SelectItem key={c.value} value={c.value} textValue={c.label}>
                      <div className="flex flex-col py-0.5">
                        <span className="font-medium">{c.label}</span>
                        <span className="text-xs text-[var(--color-text-subtle)] font-normal">{c.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mechanical-power">Mechanical Power Equipment</Label>
              <p className="text-xs text-[var(--color-text-subtle)]">Transformer, generator, and distribution configuration</p>
              <Select
                value={mechanicalPowerConfigId}
                onValueChange={(val) => updatePower({ mechanicalPowerConfigId: val })}
              >
                <SelectTrigger id="mechanical-power">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-[420px]">
                  {MECHANICAL_POWER_CONFIGS.map((c) => (
                    <SelectItem key={c.value} value={c.value} textValue={c.label}>
                      <div className="flex flex-col py-0.5">
                        <span className="font-medium">{c.label}</span>
                        <span className="text-xs text-[var(--color-text-subtle)] font-normal">{c.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Power Redundancy</CardTitle>
            <CardDescription>How many backup power paths protect against a single equipment failure.</CardDescription>
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
                  <span className="text-xs text-center leading-tight">
                    {opt === 'N' ? 'No backup — lowest cost' : opt === 'N+1' ? '1 spare unit — most common' : 'Full duplicate system'}
                  </span>
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
