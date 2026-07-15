'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileJson, FileText, Printer, ChevronDown } from 'lucide-react'
import { useScenarioStore } from '@/store/scenario-store'
import { exportScenarioJSON, exportComparisonCSV } from '@/lib/export'

type ExportOption = {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  action: () => void
}

export function ExportMenu() {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const scenarios = useScenarioStore((s) => s.scenarios)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const options: ExportOption[] = [
    {
      id: 'json',
      label: 'Export JSON',
      description: 'Full scenario data as structured JSON',
      icon: <FileJson className="h-4 w-4" />,
      action: () => {
        exportScenarioJSON(scenarios)
        setOpen(false)
      },
    },
    {
      id: 'csv',
      label: 'Export CSV',
      description: 'Side-by-side comparison table',
      icon: <FileText className="h-4 w-4" />,
      action: () => {
        exportComparisonCSV(scenarios)
        setOpen(false)
      },
    },
    {
      id: 'print',
      label: 'Print Report',
      description: 'Open print dialog for this page',
      icon: <Printer className="h-4 w-4" />,
      action: () => {
        setOpen(false)
        // Small delay so the dropdown closes before the print dialog opens
        setTimeout(() => window.print(), 100)
      },
    },
  ]

  return (
    <div ref={menuRef} className="relative inline-block">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
      >
        <Download className="h-4 w-4" />
        Export
        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          aria-label="Export options"
          className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-zinc-200 bg-white py-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              role="menuitem"
              type="button"
              onClick={opt.action}
              className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <span className="mt-0.5 flex-shrink-0 text-zinc-500 dark:text-zinc-400">
                {opt.icon}
              </span>
              <span>
                <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {opt.label}
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {opt.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
