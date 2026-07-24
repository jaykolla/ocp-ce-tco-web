'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbSegment {
  label: string
  href: string
}

/**
 * Maps URL path segments to human-readable labels.
 * Extend this map as new routes are added.
 */
const SEGMENT_LABELS: Record<string, string> = {
  scenario: 'Scenario',
  results: 'Results',
  charts: 'Charts',
  compare: 'Compare',
  inputs: 'Inputs',
  'it-design': 'IT Design',
  'cooling': 'Cooling',
  'power': 'Power',
  'financial': 'Financial',
  'summary': 'Summary',
  'reference': 'Model Reference',
}

function segmentLabel(segment: string): string {
  return SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function Breadcrumb() {
  const pathname = usePathname()

  // Split and filter empty segments
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  // Build cumulative paths for each segment
  const crumbs: BreadcrumbSegment[] = segments.map((seg, i) => ({
    label: segmentLabel(seg),
    href: '/' + segments.slice(0, i + 1).join('/'),
  }))

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400"
    >
      {/* Home icon */}
      <Link
        href="/"
        className="flex items-center gap-1 rounded px-1 py-0.5 hover:text-zinc-900 dark:hover:text-zinc-100"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-600" aria-hidden />
            {isLast ? (
              <span
                className="font-medium text-zinc-800 dark:text-zinc-200"
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="rounded px-1 py-0.5 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
