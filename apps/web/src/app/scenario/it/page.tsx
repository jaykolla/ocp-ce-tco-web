'use client'

import { useRouter } from 'next/navigation'
import { Server, ExternalLink } from 'lucide-react'
import { useWizardStore } from '@/store/wizard-store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const DATAROOM_OPTIONS = [
  { value: 'none',      label: 'None',                          description: 'Slot unused' },
  { value: 'default',   label: 'Default',                       description: 'Standard configuration' },
  { value: '1-air',     label: '1 Row — Air Cooled',            description: 'Single row, traditional air cooling' },
  { value: '1-dtc-l2a', label: '1 Row — Direct-to-Chip (L2A)', description: 'Single row, liquid DTC with air-assist secondary loop' },
  { value: '1-dtc-l2l', label: '1 Row — Direct-to-Chip (L2L)', description: 'Single row, liquid DTC with liquid secondary loop' },
  { value: '2-dtc-l2l', label: '2 Rows — Direct-to-Chip (L2L)',description: 'Dual row, liquid DTC with liquid secondary loop' },
]

export default function ITDesignPage() {
  const router = useRouter()
  const { powerCapacityUtilization, dataroomSlots, nextStep, prevStep, updateIT } = useWizardStore()

  const activeDatarooms = dataroomSlots.filter((s) => s !== null && s !== 'none').length

  const handleSlotChange = (index: number, value: string) => {
    const newSlots = [...dataroomSlots]
    newSlots[index] = value === 'none' ? null : value
    updateIT({ dataroomSlots: newSlots })
  }

  const handleContinue = () => {
    nextStep()
    router.push('/scenario/power')
  }

  const handleBack = () => {
    prevStep()
    router.push('/scenario')
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-blue-100 dark:bg-blue-950/30">
            <Server className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">IT Design</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Configure IT load and dataroom slots</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Power Capacity Utilization</CardTitle>
            <CardDescription>
              Target IT power utilization as a percentage of total available capacity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="utilization-slider">Utilization</Label>
                <span className="text-2xl font-bold text-[var(--color-primary)]">
                  {powerCapacityUtilization}%
                </span>
              </div>
              <input
                id="utilization-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={powerCapacityUtilization}
                onChange={(e) => updateIT({ powerCapacityUtilization: Number(e.target.value) })}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-[var(--color-bg-muted)] accent-[var(--color-primary)]"
                aria-label="Power capacity utilization percentage"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={powerCapacityUtilization}
              />
              <div className="flex justify-between text-xs text-[var(--color-text-subtle)]">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Dataroom Slots</CardTitle>
                <CardDescription className="mt-1">
                  Configure up to 4 dataroom slots. Select configuration type for each slot.
                </CardDescription>
              </div>
              <a
                href="/reference?tab=dataroom"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline mt-0.5"
              >
                Model assumptions <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dataroomSlots.map((slot, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`slot-${index}`}>Slot {index + 1}</Label>
                <Select
                  value={slot ?? 'none'}
                  onValueChange={(val) => handleSlotChange(index, val)}
                >
                  <SelectTrigger id={`slot-${index}`} aria-label={`Dataroom slot ${index + 1}`}>
                    <SelectValue placeholder="Select configuration" />
                  </SelectTrigger>
                  <SelectContent className="w-[340px]">
                    {DATAROOM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} textValue={opt.label}>
                        <div className="flex flex-col py-0.5">
                          <span className="font-medium">{opt.label}</span>
                          {opt.description && (
                            <span className="text-xs text-[var(--color-text-subtle)] font-normal">{opt.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {/* Live preview */}
            <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-4 py-3">
              <p className="text-sm text-[var(--color-text-muted)]">
                <span className="font-semibold text-[var(--color-text)]">{activeDatarooms}</span>
                {' '}dataroom{activeDatarooms !== 1 ? 's' : ''} configured
              </p>
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
