'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FolderOpen, Server, Zap, Thermometer, DollarSign, CheckCircle, BarChart2,
  Edit2, Check, X
} from 'lucide-react'
import { useWizardStore } from '@/store/wizard-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

const STEPS = [
  { icon: FolderOpen, label: 'Start', path: '/scenario' },
  { icon: Server, label: 'IT Design', path: '/scenario/it' },
  { icon: Zap, label: 'Power', path: '/scenario/power' },
  { icon: Thermometer, label: 'Cooling & Climate', path: '/scenario/cooling' },
  { icon: DollarSign, label: 'Finance', path: '/scenario/finance' },
  { icon: CheckCircle, label: 'Review', path: '/scenario/review' },
  { icon: BarChart2, label: 'Results', path: '/scenario/results' },
]

export default function ScenarioLayout({ children }: { children: React.ReactNode }) {
  const { currentStep, scenarioName, currency, modelVersion, setScenarioName } = useWizardStore()
  const router = useRouter()
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(scenarioName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditingName])

  const handleSaveName = () => {
    const trimmed = editName.trim()
    if (trimmed) setScenarioName(trimmed)
    else setEditName(scenarioName)
    setIsEditingName(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName()
    if (e.key === 'Escape') {
      setEditName(scenarioName)
      setIsEditingName(false)
    }
  }

  const currencySymbols: Record<string, string> = { EUR: '€', USD: '$', GBP: '£' }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Top bar */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] z-10">
        <div className="flex items-center gap-4 px-6 py-3">
          <Link href="/" className="text-sm font-semibold text-[var(--color-ocp)] shrink-0">
            OCP CE TCO
          </Link>
          <div className="h-4 w-px bg-[var(--color-border)]" />

          {/* Editable scenario name */}
          <div className="flex items-center gap-2 min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-sm font-medium bg-[var(--color-bg-muted)] border border-[var(--color-primary)] rounded px-2 py-0.5 outline-none text-[var(--color-text)] min-w-0 w-48"
                  aria-label="Scenario name"
                />
                <button onClick={handleSaveName} className="text-[var(--color-success)] hover:opacity-80" aria-label="Save name">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => { setEditName(scenarioName); setIsEditingName(false) }} className="text-[var(--color-danger)] hover:opacity-80" aria-label="Cancel">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditName(scenarioName); setIsEditingName(true) }}
                className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] group"
              >
                <span className="truncate max-w-48">{scenarioName}</span>
                <Edit2 className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
              </button>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">{currencySymbols[currency]} {currency}</Badge>
            <Badge variant="outline" className="text-xs font-mono hidden sm:inline-flex">{modelVersion}</Badge>
            <Button
              size="sm"
              variant={currentStep === 6 ? 'ocp' : 'outline'}
              disabled={currentStep < 5}
              onClick={() => router.push('/scenario/results')}
            >
              <BarChart2 className="h-4 w-4" />
              View Results
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar stepper */}
        <aside className="w-[280px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <nav aria-label="Wizard steps">
            <ol className="space-y-1">
              {STEPS.map((step, index) => {
                const Icon = step.icon
                const isCompleted = index < currentStep
                const isCurrent = index === currentStep
                const isReachable = index <= currentStep

                return (
                  <li key={step.label}>
                    <button
                      onClick={() => isReachable ? router.push(step.path) : undefined}
                      disabled={!isReachable}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors text-left',
                        isCurrent && 'bg-blue-50 text-[var(--color-primary)] dark:bg-blue-950/30',
                        isCompleted && !isCurrent && 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)]',
                        !isCompleted && !isCurrent && 'text-[var(--color-text-subtle)] cursor-not-allowed opacity-60',
                      )}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      <div className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-full shrink-0 text-xs font-bold transition-colors',
                        isCurrent && 'bg-[var(--color-primary)] text-white',
                        isCompleted && !isCurrent && 'bg-[var(--color-success)] text-white',
                        !isCompleted && !isCurrent && 'border-2 border-[var(--color-border-strong)] text-[var(--color-text-subtle)]',
                      )}>
                        {isCompleted && !isCurrent ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Icon className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <span className="truncate">{step.label}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </nav>

          <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
            <div className="text-xs text-[var(--color-text-subtle)]">
              Step {currentStep + 1} of {STEPS.length}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] transition-all duration-300"
                style={{ width: `${((currentStep) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
