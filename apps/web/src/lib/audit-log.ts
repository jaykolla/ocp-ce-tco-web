/**
 * Client-side audit log — tracks user actions in localStorage.
 * Key: ocp-tco-audit-log
 * Max entries: 500 (oldest trimmed when exceeded)
 */

export type AuditEvent =
  | { type: 'scenario_created'; scenarioId: string; name: string }
  | { type: 'scenario_saved'; scenarioId: string }
  | { type: 'scenario_deleted'; scenarioId: string }
  | { type: 'calculation_run'; scenarioId: string; durationMs: number; warnings: number }
  | { type: 'export_json'; scenarioId: string }
  | { type: 'export_csv'; scenarioCount: number }
  | { type: 'library_item_added'; itemId: string; itemType: string }
  | { type: 'import_workbook'; success: boolean; warningCount: number }

export type AuditEntry = AuditEvent & {
  timestamp: string   // ISO 8601
  sessionId: string
}

const STORAGE_KEY = 'ocp-tco-audit-log'
const MAX_ENTRIES = 500

// Session ID is stable for the lifetime of this browser tab/window
const SESSION_ID =
  typeof sessionStorage !== 'undefined'
    ? (sessionStorage.getItem('ocp-tco-session') ??
       (() => {
         const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
         sessionStorage.setItem('ocp-tco-session', id)
         return id
       })())
    : 'ssr'

function loadRaw(): AuditEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveRaw(entries: AuditEntry[]): void {
  if (typeof window === 'undefined') return
  // Trim to MAX_ENTRIES — keep the most recent
  const trimmed = entries.length > MAX_ENTRIES
    ? entries.slice(entries.length - MAX_ENTRIES)
    : entries
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
}

export function logEvent(event: AuditEvent): void {
  const entries = loadRaw()
  const entry: AuditEntry = {
    ...event,
    timestamp: new Date().toISOString(),
    sessionId: SESSION_ID,
  }
  entries.push(entry)
  saveRaw(entries)
}

export function getAuditLog(): AuditEntry[] {
  // Return most recent first
  return loadRaw().slice().reverse()
}

export function clearAuditLog(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function exportAuditLog(): void {
  const entries = getAuditLog()
  const payload = {
    exportedAt: new Date().toISOString(),
    entryCount: entries.length,
    entries,
  }
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ocp-tco-audit-log-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Convenience helpers for common event labels ─────────────────────────────

export function auditEventLabel(entry: AuditEntry): string {
  switch (entry.type) {
    case 'scenario_created':
      return `Scenario created: "${entry.name}"`
    case 'scenario_saved':
      return `Scenario saved (${entry.scenarioId})`
    case 'scenario_deleted':
      return `Scenario deleted (${entry.scenarioId})`
    case 'calculation_run':
      return `Calculation run — ${entry.durationMs}ms, ${entry.warnings} warning(s)`
    case 'export_json':
      return `JSON export (${entry.scenarioId})`
    case 'export_csv':
      return `CSV export (${entry.scenarioCount} scenario(s))`
    case 'library_item_added':
      return `Library item added: ${entry.itemType} (${entry.itemId})`
    case 'import_workbook':
      return entry.success
        ? `Workbook imported (${entry.warningCount} warning(s))`
        : 'Workbook import failed'
    default:
      return (entry as AuditEntry).type
  }
}

export function auditEventDetails(entry: AuditEntry): string {
  const { type, timestamp, sessionId, ...rest } = entry
  void type; void timestamp; void sessionId
  return Object.entries(rest)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' | ')
}
