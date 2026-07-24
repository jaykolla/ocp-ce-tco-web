/**
 * validation.ts — Client-side input validation and sanitization utilities.
 *
 * All functions are pure (no side effects) and safe to call server-side too.
 */

// ─── Numeric input validation ─────────────────────────────────────────────────

export interface NumericValidationOpts {
  /** Minimum allowed value (inclusive) */
  min?: number
  /** Maximum allowed value (inclusive) */
  max?: number
  /** Human-readable field label for error messages */
  label: string
  /** Whether zero is allowed (default: true) */
  allowZero?: boolean
  /** Whether negative values are allowed (default: false) */
  allowNegative?: boolean
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validate a string value as a numeric input.
 *
 * Returns { valid: true } if the value passes all checks.
 * Returns { valid: false, error: '<message>' } otherwise.
 */
export function validateNumericInput(
  value: string,
  opts: NumericValidationOpts,
): ValidationResult {
  const { label, min, max, allowZero = true, allowNegative = false } = opts

  // Empty string
  const trimmed = value.trim()
  if (trimmed === '' || trimmed === '-') {
    return { valid: false, error: `${label} is required` }
  }

  const num = Number(trimmed)

  // Not a number
  if (Number.isNaN(num)) {
    return { valid: false, error: `${label} must be a number` }
  }

  // Infinite value
  if (!Number.isFinite(num)) {
    return { valid: false, error: `${label} must be a finite number` }
  }

  // Negative check
  if (!allowNegative && num < 0) {
    return { valid: false, error: `${label} cannot be negative` }
  }

  // Zero check
  if (!allowZero && num === 0) {
    return { valid: false, error: `${label} cannot be zero` }
  }

  // Range checks
  if (min !== undefined && num < min) {
    return { valid: false, error: `${label} must be at least ${min}` }
  }
  if (max !== undefined && num > max) {
    return { valid: false, error: `${label} must be at most ${max}` }
  }

  return { valid: true }
}

// ─── String sanitization ──────────────────────────────────────────────────────

/**
 * Sanitize a text string for display:
 * - Strips HTML tags
 * - Collapses repeated whitespace
 * - Trims leading/trailing whitespace
 * - Limits to maxLength characters (default: 200)
 *
 * Safe to use for scenario names, display names, etc.
 */
export function sanitizeText(input: string, maxLength = 200): string {
  if (!input) return ''

  // Strip HTML tags (very conservative approach)
  const stripped = input
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()

  // Limit length
  return stripped.slice(0, maxLength)
}

// ─── Finance field validation configs ────────────────────────────────────────

/**
 * Pre-defined validation configs for all Finance page fields.
 * Keyed by the wizard-store field name.
 */
export const FINANCE_FIELD_VALIDATORS: Record<string, NumericValidationOpts> = {
  electricityUnitCost: {
    label: 'Electricity Unit Cost',
    min: 0,
    max: 10,
    allowZero: false,
  },
  coreAndShellUnitCost: {
    label: 'Core & Shell Cost',
    min: 0,
    max: 100_000,
    allowZero: false,
  },
  fitOutUnitCost: {
    label: 'Fit-Out Cost',
    min: 0,
    max: 100_000,
    allowZero: false,
  },
  waterUnitCost: {
    label: 'Water Cost',
    min: 0,
    max: 100,
    allowZero: true,
  },
  heatRecoveryValue: {
    label: 'Heat Recovery Value',
    min: 0,
    max: 10,
    allowZero: true,
  },
  coreAndShellMaintenancePct: {
    label: 'Core & Shell Maintenance',
    min: 0,
    max: 20,
    allowZero: true,
  },
  equipmentMaintenancePct: {
    label: 'Equipment Maintenance',
    min: 0,
    max: 20,
    allowZero: true,
  },
  electricityCo2GPerKwh: {
    label: 'CO₂ Intensity',
    min: 0,
    max: 2000,
    allowZero: true,
  },
  electricityWaterLPerKwh: {
    label: 'Water Intensity',
    min: 0,
    max: 100,
    allowZero: true,
  },
  facilityLifespanYr: {
    label: 'Facility Lifespan',
    min: 1,
    max: 50,
    allowZero: false,
  },
  itLifespanYr: {
    label: 'IT Equipment Lifespan',
    min: 1,
    max: 20,
    allowZero: false,
  },
  discountRatePct: {
    label: 'NPV Discount Rate',
    min: 0,
    max: 50,
    allowZero: true,
  },
  financingRatePct: {
    label: 'Financing Rate',
    min: 0,
    max: 50,
    allowZero: true,
  },
  financedPct: {
    label: 'Financed Portion',
    min: 0,
    max: 100,
    allowZero: true,
  },
  financingTermYr: {
    label: 'Financing Term',
    min: 1,
    max: 40,
    allowZero: false,
  },
  annualHours: {
    label: 'Annual Hours',
    min: 1,
    max: 8760,
    allowZero: false,
  },
}
