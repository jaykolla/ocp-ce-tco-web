import { z } from 'zod'
import {
  ISO4217Currency, RedundancyLevel,
  NonNegativeDecimal, PositiveDecimal, FractionDecimal
} from './units.js'
import { TemperatureCategory, HumidityCategory, ClimateZoneId } from './weather.js'

// ─── IT Operations inputs ─────────────────────────────────────────────────────
const DataroomSelection = z.object({
  dataroomConfigId: z.string(),
  // "none" = this slot empty
}).nullable()

export const ItOperationsInput = z.object({
  // CAPEX sized at 100%, OPEX scaled by this fraction
  powerCapacityUtilization: FractionDecimal,
  // Exactly 4 slots; null means the slot is unused ("None")
  dataroomSlots: z.tuple([
    DataroomSelection,
    DataroomSelection,
    DataroomSelection,
    DataroomSelection,
  ]),
})
export type ItOperationsInput = z.infer<typeof ItOperationsInput>

// ─── Facilities Operations inputs ─────────────────────────────────────────────
export const FacilitiesOperationsInput = z.object({
  // Power path configurations
  criticalPowerConfigId: z.string(),
  mechanicalPowerConfigId: z.string(),
  powerRedundancy: RedundancyLevel,

  // Cooling path configurations
  airCoolingConfigId: z.string(),
  liquidCoolingConfigId: z.string(),
  coolingRedundancy: RedundancyLevel,

  // Environment zone (v1.11 uses temperature+humidity categories)
  temperatureCategory: TemperatureCategory,
  humidityCategory: HumidityCategory,
  // Resolved to the best-matching v1.11 zone for weather lookups
  climateZoneId: ClimateZoneId,
})
export type FacilitiesOperationsInput = z.infer<typeof FacilitiesOperationsInput>

// ─── Finance Operations inputs ────────────────────────────────────────────────
export const FinanceOperationsInput = z.object({
  currency: ISO4217Currency,

  // Unit cost inputs (in project currency)
  electricityUnitCostPerKwh: PositiveDecimal,
  coreAndShellUnitCostPerM2: NonNegativeDecimal,
  fitOutUnitCostPerM2: NonNegativeDecimal,
  waterUnitCostPerM3: NonNegativeDecimal,
  // Heat recovery: revenue per kWh of recovered heat (0 = no recovery)
  heatRecoveryValuePerKwh: NonNegativeDecimal,

  // Maintenance (% of CAPEX per year)
  coreAndShellMaintenanceFraction: FractionDecimal,
  equipmentMaintenanceFraction: FractionDecimal,

  // Environmental factors
  electricityCo2GPerKwh: NonNegativeDecimal,
  electricityWaterLPerKwh: NonNegativeDecimal,

  // Depreciation lifespans (years)
  facilityPowerCoolingLifespanYr: PositiveDecimal,
  itEquipmentLifespanYr: PositiveDecimal,

  // NPV and financing
  discountRateFraction: FractionDecimal,
  capexFinancingRateFraction: FractionDecimal,
  capexFinancedFraction: FractionDecimal,   // proportion of CAPEX to be financed
  capexFinancingTermYr: PositiveDecimal,

  // Operational hours per year (typically 8760)
  annualHours: PositiveDecimal,
})
export type FinanceOperationsInput = z.infer<typeof FinanceOperationsInput>

// ─── Full scenario input ──────────────────────────────────────────────────────
export const ScenarioInput = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  modelVersion: z.string(),           // e.g. "ocp-ce-tco-1.11-web-1"
  seedDatasetVersions: z.object({
    power: z.string(),
    cooling: z.string(),
    data: z.string(),
    weather: z.string(),
  }),
  it: ItOperationsInput,
  facilities: FacilitiesOperationsInput,
  finance: FinanceOperationsInput,
})
export type ScenarioInput = z.infer<typeof ScenarioInput>
