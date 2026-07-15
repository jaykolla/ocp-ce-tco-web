'use client'

import { useRouter } from 'next/navigation'
import { Thermometer } from 'lucide-react'
import { useWizardStore } from '@/store/wizard-store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const AIR_COOLING_CONFIGS = [
  { value: 'default-air', label: 'Default Air' },
  { value: 'se-rd-air', label: 'SE RD Air' },
]

const LIQUID_COOLING_CONFIGS = [
  { value: 'default-liquid', label: 'Default Liquid' },
  { value: 'se-rd-liquid', label: 'SE RD Liquid' },
]

const COOLING_REDUNDANCY_OPTIONS = ['N', 'N+1'] as const

const TEMPERATURE_CATEGORIES = [
  { value: 'extremely-hot', label: 'Extremely Hot', example: 'Dubai, Phoenix' },
  { value: 'very-hot', label: 'Very Hot', example: 'New Delhi, Houston' },
  { value: 'hot', label: 'Hot', example: 'Los Angeles, Rome' },
  { value: 'warm', label: 'Warm', example: 'London, Paris' },
  { value: 'mixed', label: 'Mixed', example: 'New York, Tokyo' },
  { value: 'cool', label: 'Cool', example: 'Seattle, Vancouver' },
  { value: 'cold', label: 'Cold', example: 'Montreal, Oslo' },
  { value: 'very-cold', label: 'Very Cold', example: 'Helsinki, Edmonton' },
  { value: 'subarctic', label: 'Subarctic / Arctic', example: 'Fairbanks, Reykjavik' },
]

const HUMIDITY_CATEGORIES = [
  { value: 'wet', label: 'Wet' },
  { value: 'dry', label: 'Dry' },
  { value: 'maritime', label: 'Maritime' },
  { value: 'humid', label: 'Humid' },
  { value: 'mixed', label: 'Mixed' },
]

function getCityPreview(temp: string, humidity: string): string {
  const tempMap: Record<string, string> = {
    'extremely-hot': 'Dubai / Phoenix',
    'very-hot': 'New Delhi / Houston',
    'hot': 'Los Angeles / Rome',
    'warm': 'London / Paris',
    'mixed': 'New York / Tokyo',
    'cool': 'Seattle / Vancouver',
    'cold': 'Montreal / Oslo',
    'very-cold': 'Helsinki / Edmonton',
    'subarctic': 'Fairbanks / Reykjavik',
  }
  return `${tempMap[temp] ?? temp} — ${humidity} humidity`
}

export default function CoolingPage() {
  const router = useRouter()
  const {
    airCoolingConfigId,
    liquidCoolingConfigId,
    coolingRedundancy,
    temperatureCategory,
    humidityCategory,
    nextStep,
    prevStep,
    updateCooling,
  } = useWizardStore()

  const handleContinue = () => {
    nextStep()
    router.push('/scenario/finance')
  }

  const handleBack = () => {
    prevStep()
    router.push('/scenario/power')
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-cyan-100 dark:bg-cyan-950/30">
            <Thermometer className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Cooling & Climate</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Configure cooling systems and climate zone</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cooling Configuration</CardTitle>
            <CardDescription>Select air and liquid cooling equipment configurations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="air-cooling">Air Cooling Config</Label>
              <Select
                value={airCoolingConfigId}
                onValueChange={(val) => updateCooling({ airCoolingConfigId: val })}
              >
                <SelectTrigger id="air-cooling">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AIR_COOLING_CONFIGS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="liquid-cooling">Liquid Cooling Config</Label>
              <Select
                value={liquidCoolingConfigId}
                onValueChange={(val) => updateCooling({ liquidCoolingConfigId: val })}
              >
                <SelectTrigger id="liquid-cooling">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIQUID_COOLING_CONFIGS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cooling Redundancy</CardTitle>
            <CardDescription>Select redundancy level for cooling infrastructure.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Cooling redundancy">
              {COOLING_REDUNDANCY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  role="radio"
                  aria-checked={coolingRedundancy === opt}
                  onClick={() => updateCooling({ coolingRedundancy: opt })}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-[var(--radius-lg)] border-2 p-4 text-sm font-medium transition-all cursor-pointer',
                    coolingRedundancy === opt
                      ? 'border-[var(--color-primary)] bg-blue-50 text-[var(--color-primary)] dark:bg-blue-950/30'
                      : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] text-[var(--color-text-muted)]'
                  )}
                >
                  <span className="text-lg font-bold">{opt}</span>
                  <span className="text-xs">{opt === 'N' ? 'No redundancy' : 'One extra'}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Climate Zone</CardTitle>
            <CardDescription>Set the climate conditions for the data center location.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="temperature-category">Temperature Category (ASHRAE)</Label>
              <Select
                value={temperatureCategory}
                onValueChange={(val) => updateCooling({ temperatureCategory: val })}
              >
                <SelectTrigger id="temperature-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPERATURE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="humidity-category">Humidity Category</Label>
              <Select
                value={humidityCategory}
                onValueChange={(val) => updateCooling({ humidityCategory: val })}
              >
                <SelectTrigger id="humidity-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HUMIDITY_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference city preview */}
            <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-4 py-3">
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Reference location</p>
              <p className="text-sm text-[var(--color-text)]">{getCityPreview(temperatureCategory, humidityCategory)}</p>
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
