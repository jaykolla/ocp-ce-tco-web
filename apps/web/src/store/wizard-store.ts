import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PvgisProfile } from '@/lib/pvgis'

export type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6

// ─── Custom location type (R2 feature) ───────────────────────────────────────

export interface CustomLocation {
  lat: number
  lon: number
  label: string
  pvgisProfile: PvgisProfile | null
}

export const STEP_LABELS = [
  'Start',
  'IT Design',
  'Power',
  'Cooling & Climate',
  'Finance',
  'Review',
  'Results',
] as const

export interface WizardStore {
  currentStep: WizardStep
  scenarioName: string
  currency: 'EUR' | 'USD' | 'GBP'
  modelVersion: string

  // IT inputs
  powerCapacityUtilization: number
  dataroomSlots: (string | null)[]

  // Power inputs
  criticalPowerConfigId: string
  mechanicalPowerConfigId: string
  powerRedundancy: 'N' | 'N+1' | '2N'

  // Cooling inputs
  airCoolingConfigId: string
  liquidCoolingConfigId: string
  coolingRedundancy: 'N' | 'N+1' | '2N'
  temperatureCategory: string
  humidityCategory: string

  // Finance inputs (stored as strings to avoid float issues)
  electricityUnitCost: string
  coreAndShellUnitCost: string
  fitOutUnitCost: string
  waterUnitCost: string
  heatRecoveryValue: string
  coreAndShellMaintenancePct: string
  equipmentMaintenancePct: string
  electricityCo2GPerKwh: string
  electricityWaterLPerKwh: string
  facilityLifespanYr: string
  itLifespanYr: string
  discountRatePct: string
  financingRatePct: string
  financedPct: string
  financingTermYr: string
  annualHours: string

  // Custom location override (R2 — replaces built-in 28-zone profiles when set)
  customLocation: CustomLocation | null

  // Actions
  setStep: (step: WizardStep) => void
  nextStep: () => void
  prevStep: () => void
  updateIT: (data: Partial<WizardStore>) => void
  updatePower: (data: Partial<WizardStore>) => void
  updateCooling: (data: Partial<WizardStore>) => void
  updateFinance: (data: Partial<WizardStore>) => void
  setScenarioName: (name: string) => void
  setCustomLocation: (loc: CustomLocation) => void
  clearCustomLocation: () => void
  reset: () => void
}

const DEFAULT_STATE = {
  currentStep: 0 as WizardStep,
  scenarioName: 'My Scenario',
  currency: 'EUR' as const,
  modelVersion: 'ocp-ce-tco-1.11-web-1',

  // IT defaults
  powerCapacityUtilization: 80,
  dataroomSlots: [null, null, null, null] as (string | null)[],

  // Power defaults
  criticalPowerConfigId: 'default',
  mechanicalPowerConfigId: 'default',
  powerRedundancy: 'N+1' as const,

  // Cooling defaults
  airCoolingConfigId: 'default-air',
  liquidCoolingConfigId: 'default-liquid',
  coolingRedundancy: 'N+1' as const,
  temperatureCategory: 'warm',
  humidityCategory: 'mixed',

  // Custom location (R2)
  customLocation: null,

  // Finance defaults (v1.11)
  electricityUnitCost: '0.20',
  coreAndShellUnitCost: '1800',
  fitOutUnitCost: '600',
  waterUnitCost: '1.50',
  heatRecoveryValue: '0.05',
  coreAndShellMaintenancePct: '1.0',
  equipmentMaintenancePct: '2.0',
  electricityCo2GPerKwh: '400',
  electricityWaterLPerKwh: '2.0',
  facilityLifespanYr: '20',
  itLifespanYr: '5',
  discountRatePct: '5.0',
  financingRatePct: '3.5',
  financedPct: '70',
  financingTermYr: '10',
  annualHours: '8760',
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      setStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const current = get().currentStep
        if (current < 6) set({ currentStep: (current + 1) as WizardStep })
      },

      prevStep: () => {
        const current = get().currentStep
        if (current > 0) set({ currentStep: (current - 1) as WizardStep })
      },

      updateIT: (data) => set(data),
      updatePower: (data) => set(data),
      updateCooling: (data) => set(data),
      updateFinance: (data) => set(data),

      setScenarioName: (name) => set({ scenarioName: name }),

      setCustomLocation: (loc) => set({ customLocation: loc }),

      clearCustomLocation: () => set({ customLocation: null }),

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'ocp-tco-wizard',
    }
  )
)
