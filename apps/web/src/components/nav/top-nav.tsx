'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, BarChart3, ChevronDown, LineChart, FileSpreadsheet } from 'lucide-react'
import { SessionBanner } from '@/components/session-banner'

interface NavLink {
  label: string
  href: string
}

const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'New Scenario', href: '/scenario' },
  { label: 'Compare', href: '/compare' },
  { label: 'Library', href: '/library' },
  { label: 'Model Reference', href: '/reference' },
  { label: 'About', href: '/about' },
  { label: 'Audit Log', href: '/audit' },
]

const TOOLS_LINKS: NavLink[] = [
  { label: 'Sensitivity Analysis', href: '/sensitivity' },
  { label: 'Import from Excel', href: '/import' },
]

export function TopNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setToolsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo / Title */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm group-hover:bg-emerald-700 transition-colors">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            OCP CE{' '}
            <span className="text-emerald-600 dark:text-emerald-400">TCO</span>
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {link.label}
            </Link>
          ))}

          {/* Tools dropdown */}
          <div ref={toolsRef} className="relative">
            <button
              type="button"
              onClick={() => setToolsOpen((o) => !o)}
              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-expanded={toolsOpen}
            >
              Tools
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-150 ${toolsOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {toolsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                <div className="p-1">
                  <Link
                    href="/sensitivity"
                    onClick={() => setToolsOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <LineChart className="h-4 w-4 text-zinc-400 shrink-0" />
                    Sensitivity Analysis
                  </Link>
                  <Link
                    href="/import"
                    onClick={() => setToolsOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-zinc-400 shrink-0" />
                    Import from Excel
                  </Link>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Right-side: version badge + session banner + hamburger */}
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 sm:inline-flex dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
            v1.11
          </span>
          <div className="hidden sm:block">
            <SessionBanner />
          </div>
          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 sm:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-zinc-200 bg-white px-4 pb-4 pt-2 dark:border-zinc-700 dark:bg-zinc-900 sm:hidden">
          <nav className="flex flex-col gap-0.5" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-1 border-t border-zinc-100 pt-1 dark:border-zinc-700">
              <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Tools
              </p>
              {TOOLS_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.href === '/sensitivity' ? (
                    <LineChart className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 text-zinc-400" />
                  )}
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-700">
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                Model v1.11
              </span>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
