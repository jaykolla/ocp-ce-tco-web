/**
 * Zustand store for TCO scenarios.
 * Holds the list of computed scenarios and the active scenario ID.
 */
import { create } from 'zustand'

/** CAPEX breakdown by category (all values in the scenario currency) */
export interface CapexBreakdown {
  powerEquipment: number
  coolingEquipment: number
  dataEquipment: number
  coreAndShell: number
  fitOut: number
}

/** OPEX breakdown by category (annual, in the scenario currency) */
export interface OpexBreakdown {
  electrical: number
  maintenance: number
  water: number
  heatRecovery: number
}

/** Power breakdown at each loss level */
export interface PowerBreakdown {
  /** Total facility input power (kW) */
  totalFacility: number
  /** L1: UPS output power (kW) */
  l1: number
  /** L2: PDU output power (kW) */
  l2: number
  /** L3: Server input power (kW) */
  l3: number
  /** L4: IT workload power (kW) */
  l4: number
  /** Total losses across levels (kW) */
  totalLosses: number
}

/** Floor area breakdown (m²) */
export interface FloorAreaBreakdown {
  /** Mechanical/electrical facilities area */
  facilities: number
  /** White space / data rooms area */
  dataRooms: number
  /** Total gross floor area */
  overall: number
}

/** Key performance indicators */
export interface ScenarioKPIs {
  /** Power Usage Effectiveness at L3 */
  pueL3: number
  /** Power Usage Effectiveness at L4 */
  pueL4: number
  /** Energy Reuse Factor */
  erf: number
  /** Water Usage Effectiveness */
  wue: number
  /** Carbon Usage Effectiveness (tCO2e/kWh) */
  cue: number
  /** IT workload density (kW per m² of data room) */
  workloadDensity: number
}

/** Financial summary */
export interface ScenarioFinancials {
  capexTotal: number
  opexAnnual: number
  /** Net Present Value over analysis period */
  npv: number
  /** Annual revenue required to break even */
  breakEvenAnnual: number
  /** Year in which cumulative cash flow crosses zero (if positive revenue assumed) */
  breakEvenYear: number | null
  /** Annual cost profile: index = year (0..analysisYears), value = total annual cost */
  annualCosts: number[]
  /** Cumulative cash flow profile (starts negative) */
  cumulativeCashFlow: number[]
}

/** Environmental outputs */
export interface ScenarioEnvironment {
  /** CO2e from utility electricity (tonne/year) */
  co2eUtility: number
  /** Annual water consumption (m³/year) */
  waterConsumption: number
}

/** A complete computed TCO scenario */
export interface Scenario {
  id: string
  name: string
  currency: string
  /** Year the analysis was created */
  createdAt: string
  capex: CapexBreakdown
  opex: OpexBreakdown
  power: PowerBreakdown
  floorArea: FloorAreaBreakdown
  kpis: ScenarioKPIs
  financials: ScenarioFinancials
  environment: ScenarioEnvironment
}

// ---------------------------------------------------------------------------
// Demo seed data (used until real calculator inputs feed the store)
// ---------------------------------------------------------------------------

const DEMO_SCENARIO_A: Scenario = {
  id: 'demo-a',
  name: 'Scenario A – Air Cooled',
  currency: 'EUR',
  createdAt: new Date().toISOString(),
  capex: {
    powerEquipment: 8_200_000,
    coolingEquipment: 7_100_000,
    dataEquipment: 9_500_000,
    coreAndShell: 5_800_000,
    fitOut: 3_380_000,
  },
  opex: {
    electrical: 36_500_000,
    maintenance: 4_200_000,
    water: 1_800_000,
    heatRecovery: -2_057_000,
  },
  power: {
    totalFacility: 4287,
    l1: 4100,
    l2: 3950,
    l3: 3800,
    l4: 2850,
    totalLosses: 1437,
  },
  floorArea: {
    facilities: 1217,
    dataRooms: 1018,
    overall: 3517,
  },
  kpis: {
    pueL3: 1.234,
    pueL4: 1.494,
    erf: 0.161,
    wue: 1.48,
    cue: 0.414,
    workloadDensity: 2.8,
  },
  financials: {
    capexTotal: 33_980_000,
    opexAnnual: 44_430_000,
    npv: -577_700_000,
    breakEvenAnnual: 45_500_000,
    breakEvenYear: null,
    annualCosts: Array.from({ length: 21 }, (_, i) =>
      i === 0 ? 33_980_000 : 44_430_000 * (1 + 0.02 * i),
    ),
    cumulativeCashFlow: Array.from({ length: 21 }, (_, i) =>
      -33_980_000 - 44_430_000 * i,
    ),
  },
  environment: {
    co2eUtility: 13_858,
    waterConsumption: 6_800,
  },
}

const DEMO_SCENARIO_B: Scenario = {
  id: 'demo-b',
  name: 'Scenario B – Water Cooled',
  currency: 'EUR',
  createdAt: new Date().toISOString(),
  capex: {
    powerEquipment: 9_400_000,
    coolingEquipment: 9_200_000,
    dataEquipment: 9_500_000,
    coreAndShell: 5_800_000,
    fitOut: 3_060_000,
  },
  opex: {
    electrical: 41_000_000,
    maintenance: 5_000_000,
    water: 3_450_000,
    heatRecovery: 0,
  },
  power: {
    totalFacility: 4971,
    l1: 4750,
    l2: 4580,
    l3: 4400,
    l4: 2850,
    totalLosses: 2121,
  },
  floorArea: {
    facilities: 1622,
    dataRooms: 1018,
    overall: 4122,
  },
  kpis: {
    pueL3: 1.456,
    pueL4: 1.733,
    erf: 0,
    wue: 1.69,
    cue: 0.473,
    workloadDensity: 2.1,
  },
  financials: {
    capexTotal: 36_960_000,
    opexAnnual: 49_450_000,
    npv: -641_500_000,
    breakEvenAnnual: 50_600_000,
    breakEvenYear: null,
    annualCosts: Array.from({ length: 21 }, (_, i) =>
      i === 0 ? 36_960_000 : 49_450_000 * (1 + 0.02 * i),
    ),
    cumulativeCashFlow: Array.from({ length: 21 }, (_, i) =>
      -36_960_000 - 49_450_000 * i,
    ),
  },
  environment: {
    co2eUtility: 16_068,
    waterConsumption: 12_400,
  },
}

// ---------------------------------------------------------------------------
// Store definition
// ---------------------------------------------------------------------------

interface ScenarioState {
  scenarios: Scenario[]
  activeScenarioId: string | null
  /** Add or replace a scenario */
  upsertScenario: (scenario: Scenario) => void
  /** Remove a scenario by id */
  removeScenario: (id: string) => void
  /** Set the active scenario */
  setActiveScenario: (id: string) => void
  /** Get the active scenario (or first scenario if none selected) */
  getActiveScenario: () => Scenario | null
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  scenarios: [DEMO_SCENARIO_A, DEMO_SCENARIO_B],
  activeScenarioId: DEMO_SCENARIO_A.id,

  upsertScenario: (scenario) =>
    set((state) => {
      const idx = state.scenarios.findIndex((s) => s.id === scenario.id)
      if (idx >= 0) {
        const next = [...state.scenarios]
        next[idx] = scenario
        return { scenarios: next }
      }
      return { scenarios: [...state.scenarios, scenario] }
    }),

  removeScenario: (id) =>
    set((state) => ({
      scenarios: state.scenarios.filter((s) => s.id !== id),
      activeScenarioId:
        state.activeScenarioId === id
          ? state.scenarios.find((s) => s.id !== id)?.id ?? null
          : state.activeScenarioId,
    })),

  setActiveScenario: (id) => set({ activeScenarioId: id }),

  getActiveScenario: () => {
    const { scenarios, activeScenarioId } = get()
    return (
      scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0] ?? null
    )
  },
}))
