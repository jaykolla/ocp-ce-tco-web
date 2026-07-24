'use client'

import { useState, useEffect } from 'react'
import { Download, Trash2, ClipboardList } from 'lucide-react'
import { TopNav } from '@/components/nav/top-nav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getAuditLog,
  clearAuditLog,
  exportAuditLog,
  auditEventLabel,
  auditEventDetails,
  type AuditEntry,
} from '@/lib/audit-log'

function eventTypeBadgeVariant(type: AuditEntry['type']): 'success' | 'info' | 'warning' | 'danger' | 'outline' {
  switch (type) {
    case 'calculation_run': return 'success'
    case 'scenario_created': return 'info'
    case 'scenario_saved': return 'info'
    case 'scenario_deleted': return 'danger'
    case 'export_json':
    case 'export_csv': return 'outline'
    case 'library_item_added': return 'warning'
    case 'import_workbook': return 'warning'
    default: return 'outline'
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])

  function refresh() {
    setEntries(getAuditLog().slice(0, 100))
  }

  useEffect(() => {
    refresh()
  }, [])

  function handleClear() {
    if (!confirm('Clear all audit log entries? This cannot be undone.')) return
    clearAuditLog()
    refresh()
  }

  function handleExport() {
    exportAuditLog()
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-amber-100 dark:bg-amber-950/30">
              <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">Audit Log</h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                Last {entries.length} user actions — stored locally in this browser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={entries.length === 0}>
              <Download className="h-4 w-4" />
              Export Log
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClear} disabled={entries.length === 0}>
              <Trash2 className="h-4 w-4" />
              Clear Log
            </Button>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-16 text-center">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-[var(--color-text-muted)] opacity-40" />
            <p className="text-[var(--color-text-muted)]">No audit events recorded yet.</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Events are logged when you save scenarios, run calculations, or export data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-subtle)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Timestamp</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Event Type</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Details</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {entries.map((entry, idx) => (
                  <tr key={idx} className="bg-[var(--color-surface)] hover:bg-[var(--color-bg-subtle)]">
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[var(--color-text-muted)]">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={eventTypeBadgeVariant(entry.type)} className="text-xs">
                        {entry.type.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text)]">
                      {auditEventLabel(entry)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--color-text-muted)]">
                      {auditEventDetails(entry)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[var(--color-text-muted)]">
                      {entry.sessionId.slice(0, 12)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          Audit log is stored in localStorage under <code className="rounded bg-[var(--color-bg-subtle)] px-1 font-mono">ocp-tco-audit-log</code>.
          Maximum 500 entries; oldest trimmed automatically.
        </p>
      </main>
    </div>
  )
}
