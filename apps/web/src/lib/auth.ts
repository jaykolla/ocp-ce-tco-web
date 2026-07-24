/**
 * auth.ts — Guest session management for GitHub Pages (no backend).
 *
 * Scenarios are saved to localStorage keyed by a generated sessionId.
 * Users can optionally set a display name that persists across visits.
 * No signup, no authentication — purely client-side localStorage.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserSession {
  /** UUID stored in localStorage — identifies this browser/device */
  sessionId: string
  /** Editable display name; default "Guest" */
  displayName: string
  /** ISO date string when session was first created */
  createdAt: string
  /** Total scenarios saved in this session */
  scenarioCount: number
}

export interface SavedScenario {
  id: string
  name: string
  savedAt: string
  /** Full wizard store snapshot */
  inputs: Record<string, unknown>
  /** Optional snapshot of key result KPIs */
  results?: {
    pueL3: number
    pueL4: number
    capexTotal: number
    opexAnnual: number
  }
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const SESSION_KEY = 'ocp-tco-session'
const SCENARIOS_KEY = 'ocp-tco-saved-scenarios'

// ─── UUID helper (crypto.randomUUID with fallback) ────────────────────────────

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ─── Safe localStorage helpers ────────────────────────────────────────────────

function safeGet(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, value)
  } catch {
    // Storage quota exceeded or private browsing — silently ignore
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

// ─── Session API ──────────────────────────────────────────────────────────────

/**
 * Returns the existing session or creates a new one.
 */
export function getOrCreateSession(): UserSession {
  const raw = safeGet(SESSION_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as UserSession
      // Sync scenario count with actual saved scenarios
      const scenarios = loadScenariosFromSession()
      parsed.scenarioCount = scenarios.length
      safeSet(SESSION_KEY, JSON.stringify(parsed))
      return parsed
    } catch {
      // Corrupt data — fall through to create new session
    }
  }

  const session: UserSession = {
    sessionId: generateId(),
    displayName: 'Guest',
    createdAt: new Date().toISOString(),
    scenarioCount: 0,
  }
  safeSet(SESSION_KEY, JSON.stringify(session))
  return session
}

/**
 * Update the user's display name and persist it.
 */
export function updateDisplayName(name: string): void {
  const session = getOrCreateSession()
  session.displayName = name.trim().slice(0, 60) || 'Guest'
  safeSet(SESSION_KEY, JSON.stringify(session))
}

/**
 * Remove all session and scenario data from localStorage.
 */
export function clearSession(): void {
  safeRemove(SESSION_KEY)
  safeRemove(SCENARIOS_KEY)
}

// ─── Scenario persistence API ─────────────────────────────────────────────────

/**
 * Save or overwrite a scenario. Uses scenario.id as the key.
 */
export function saveScenarioToSession(scenario: SavedScenario): void {
  const scenarios = loadScenariosFromSession()
  const existingIdx = scenarios.findIndex((s) => s.id === scenario.id)
  if (existingIdx >= 0) {
    scenarios[existingIdx] = scenario
  } else {
    scenarios.push(scenario)
  }
  safeSet(SCENARIOS_KEY, JSON.stringify(scenarios))

  // Update scenario count in session
  const session = getOrCreateSession()
  session.scenarioCount = scenarios.length
  safeSet(SESSION_KEY, JSON.stringify(session))
}

/**
 * Load all saved scenarios for this session, sorted newest first.
 */
export function loadScenariosFromSession(): SavedScenario[] {
  const raw = safeGet(SCENARIOS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as SavedScenario[]
    return Array.isArray(parsed)
      ? [...parsed].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
      : []
  } catch {
    return []
  }
}

/**
 * Delete a single scenario by id.
 */
export function deleteScenarioFromSession(id: string): void {
  const scenarios = loadScenariosFromSession().filter((s) => s.id !== id)
  safeSet(SCENARIOS_KEY, JSON.stringify(scenarios))

  // Update count
  const session = getOrCreateSession()
  session.scenarioCount = scenarios.length
  safeSet(SESSION_KEY, JSON.stringify(session))
}
