'use client'

import { useRouter } from 'next/navigation'
import { FolderOpen } from 'lucide-react'
import { useWizardStore } from '@/store/wizard-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CURRENCIES = [
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
]

export default function ScenarioStartPage() {
  const router = useRouter()
  const { scenarioName, currency, modelVersion, setScenarioName, nextStep } = useWizardStore()

  const handleStart = () => {
    nextStep()
    router.push('/scenario/it')
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-blue-100 dark:bg-blue-950/30">
            <FolderOpen className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Project Setup</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Configure your scenario settings</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scenario Details</CardTitle>
          <CardDescription>Give your scenario a name and choose your preferred currency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="scenario-name">Scenario Name</Label>
            <Input
              id="scenario-name"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="My Scenario"
              aria-describedby="scenario-name-hint"
            />
            <p id="scenario-name-hint" className="text-xs text-[var(--color-text-muted)]">
              A descriptive name for this TCO analysis.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency-select">Currency</Label>
            <Select
              value={currency}
              onValueChange={(val) =>
                useWizardStore.setState({ currency: val as 'EUR' | 'USD' | 'GBP' })
              }
            >
              <SelectTrigger id="currency-select" aria-label="Select currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Model Version</Label>
            <div className="flex h-10 w-full items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 text-sm text-[var(--color-text-muted)] font-mono">
              {modelVersion}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">Read-only. Computation engine version.</p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleStart} variant="ocp" size="lg">
          Start Scenario
        </Button>
      </div>
    </div>
  )
}
