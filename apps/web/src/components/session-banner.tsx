'use client'

/**
 * SessionBanner — top-nav chip showing guest session info.
 *
 * Shows: avatar icon + display name (editable inline) + scenario count badge.
 * On click: opens a dropdown with saved scenarios list + "Clear all" action.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { User, ChevronDown, X, Trash2, FolderOpen } from 'lucide-react'
import {
  getOrCreateSession,
  updateDisplayName,
  clearSession,
  loadScenariosFromSession,
  deleteScenarioFromSession,
  type UserSession,
  type SavedScenario,
} from '@/lib/auth'
import { sanitizeText } from '@/lib/validation'

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
  } catch {
    return iso
  }
}

export function SessionBanner() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])
  const [open, setOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Load session on mount (client-only)
  const refresh = useCallback(() => {
    const s = getOrCreateSession()
    setSession(s)
    setNameInput(s.displayName)
    setScenarios(loadScenariosFromSession())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setEditingName(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Focus name input when editing
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  const handleSaveName = () => {
    const clean = sanitizeText(nameInput, 60) || 'Guest'
    updateDisplayName(clean)
    setEditingName(false)
    refresh()
  }

  const handleDelete = (id: string) => {
    deleteScenarioFromSession(id)
    refresh()
  }

  const handleClearAll = () => {
    if (confirm('Clear all saved scenarios? This cannot be undone.')) {
      clearSession()
      refresh()
    }
  }

  if (!session) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger chip */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setEditingName(false) }}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-zinc-700"
        aria-label="Session menu"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7EC924]/20">
          <User className="h-3 w-3 text-[#7EC924]" />
        </div>
        <span className="max-w-[80px] truncate">{session.displayName}</span>
        {session.scenarioCount > 0 && (
          <span className="ml-0.5 rounded-full bg-[#7EC924] px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
            {session.scenarioCount}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-zinc-800">
            <div className="flex-1">
              {editingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') { setEditingName(false); setNameInput(session.displayName) }
                  }}
                  maxLength={60}
                  className="w-full rounded border border-[#7EC924] bg-white px-2 py-0.5 text-sm font-semibold text-gray-900 outline-none dark:bg-zinc-800 dark:text-white"
                  aria-label="Edit display name"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="group flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white"
                  title="Click to edit name"
                >
                  {session.displayName}
                  <span className="text-[10px] text-gray-400 group-hover:text-[#7EC924]">(edit)</span>
                </button>
              )}
              <p className="mt-0.5 text-xs text-gray-400">
                {session.scenarioCount === 0
                  ? 'No scenarios saved yet'
                  : `${session.scenarioCount} scenario${session.scenarioCount === 1 ? '' : 's'} saved`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Scenarios list */}
          <div className="max-h-52 overflow-y-auto">
            {scenarios.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                <p>No saved scenarios.</p>
                <p className="mt-1">Use the &ldquo;Save Scenario&rdquo; button on the Review page.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-zinc-800">
                {scenarios.map((sc) => (
                  <li key={sc.id} className="flex items-start justify-between gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-800 dark:text-zinc-200">{sc.name}</p>
                      <p className="text-[10px] text-gray-400">{fmtDate(sc.savedAt)}</p>
                      {sc.results && (
                        <p className="text-[10px] text-gray-500">
                          PUE {sc.results.pueL3.toFixed(3)} · CAPEX {(sc.results.capexTotal / 1_000_000).toFixed(1)}M
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(sc.id)}
                      className="mt-0.5 shrink-0 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      aria-label={`Delete ${sc.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 dark:border-zinc-800">
            <Link
              href="/my-scenarios"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-xs font-medium text-[#7EC924] hover:underline"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              My Scenarios
            </Link>
            {scenarios.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
