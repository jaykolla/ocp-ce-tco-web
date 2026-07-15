'use client'

/**
 * Zustand store for the live ScenarioInput form state.
 *
 * This is the source of truth for user-entered wizard fields that feed
 * the calculation engine. The results page reads from this store, builds
 * a ScenarioInput, and passes it to useCalculation().
 */

import { create } from 'zustand'

// ─── ASHRAE climate zone mapping ─────────────────────────────────────────────

export const TEMP_HUM_TO_ZONE: Record<string, string> = {
  'Extremely hot_Wet': '0A',
  'Extremely hot_Dry': '0B',
  'Very hot_Wet': '1A',
  'Very hot_Dry': '1B',
  'Hot_Wet': '2A',
  'Hot_Dry': '2B',
  'Warm_Wet': '3A',
  'Warm_Dry': '3B',
  'Warm_Maritime': '3C',
  'Mixed_Humid': '4A',
  'Mixed_Dry': '4B',
  'Mixed_Maritime': '4C',
  'Cool_Wet': '5A',
  'Cool_Dry': '5B',
  'Cool_Maritime': '5C',
  'Cold_Wet': '6A',
  'Cold_Dry': '6B',
  'Very cold_-': '7',
  'Subarctic/arctic_-': '8',
}

// ─── Store shape ──────────────────────────────────────────────────────────────

export interface DataroomSlot {
  dataroomConfigId: string
}

export interface ScenarioInputState {
  // Scenario metadata
  id: string
  name: string

  // IT Operations
  powerCapacityUtilization: number  // 0–1
  dataroomSlots: [DataroomSlot | null, DataroomSlot | null, DataroomSlot | null, DataroomSlot | null]

  // Facilities Operations
  criticalPowerConfigId: string
  mechanicalPowerConfigId: string
  powerRedundancy: 'N' | 'N+1' | '2N'
  airCoolingConfigId: string
  liquidCoolingConfigId: string
  coolingRedundancy: 'N' | 'N+1' | '2N'
  temperatureCategory: string
  humidityCategory: string

  // Finance Operations
  currency: 'EUR' | 'USD' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD' | 'SGD'
  electricityUnitCostPerKwh: number
  coreAndShellUnitCostPerM2: number
  fitOutUnitCostPerM2: number
  waterUnitCostPerM3: number
  heatRecoveryValuePerKwh: number
  coreAndShellMaintenanceFraction: number
  equipmentMaintenanceFraction: number
  electricityCo2GPerKwh: number
  electricityWaterLPerKwh: number
  facilityPowerCoolingLifespanYr: number
  itEquipmentLifespanYr: number
  discountRateFraction: number
  capexFinancingRateFraction: number
  capexFinancedFraction: number
  capexFinancingTermYr: number
  annualHours: number

  // Actions
  setField: <K extends keyof Omit<ScenarioInputState, 'setField' | 'setDataroomSlot' | 'resetToDefaults'>>(
    key: K,
    value: ScenarioInputState[K]
  ) => void
  setDataroomSlot: (index: 0 | 1 | 2 | 3, slot: DataroomSlot | null) => void
  resetToDefaults: () => void
}

// ─── Default values (matching OCP CE TCO v1.11 workbook defaults) ─────────────

const DEFAULTS = {
  id: 'scenario-default',
  name: 'Default Scenario',

  // IT
  powerCapacityUtilization: 0.8,
  dataroomSlots: [
    { dataroomConfigId: 'dataroom-default' },
    null,
    null,
    null,
  ] as [DataroomSlot | null, DataroomSlot | null, DataroomSlot | null, DataroomSlot | null],

  // Facilities
  criticalPowerConfigId: 'power-config-default',
  mechanicalPowerConfigId: 'power-config-default',
  powerRedundancy: 'N+1' as const,
  airCoolingConfigId: 'cooling-config-default-air',
  liquidCoolingConfigId: 'cooling-config-default-liquid',
  coolingRedundancy: 'N+1' as const,
  temperatureCategory: 'Warm',
  humidityCategory: 'Wet',

  // Finance (EUR defaults from v1.11 workbook Paris scenario)
  currency: 'EUR' as const,
  electricityUnitCostPerKwh: 0.12,
  coreAndShellUnitCostPerM2: 2000,
  fitOutUnitCostPerM2: 1500,
  waterUnitCostPerM3: 3.5,
  heatRecoveryValuePerKwh: 0.05,
  coreAndShellMaintenanceFraction: 0.02,
  equipmentMaintenanceFraction: 0.03,
  electricityCo2GPerKwh: 335,
  electricityWaterLPerKwh: 1.4,
  facilityPowerCoolingLifespanYr: 18,
  itEquipmentLifespanYr: 6,
  discountRateFraction: 0.08,
  capexFinancingRateFraction: 0.05,
  capexFinancedFraction: 0.7,
  capexFinancingTermYr: 15,
  annualHours: 8760,
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useScenarioInputStore = create<ScenarioInputState>((set) => ({
  ...DEFAULTS,

  setField: (key, value) => set((state) => ({ ...state, [key]: value })),

  setDataroomSlot: (index, slot) =>
    set((state) => {
      const slots = [...state.dataroomSlots] as typeof state.dataroomSlots
      slots[index] = slot
      return { dataroomSlots: slots }
    }),

  resetToDefaults: () => set({ ...DEFAULTS }),
}))
