import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-bg)] px-6 text-center">
      {/* Logo */}
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/30">
        <BarChart3 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
      </div>

      {/* 404 */}
      <div>
        <h1 className="text-7xl font-black tabular-nums text-[var(--color-text)] opacity-20">404</h1>
        <h2 className="mt-2 text-xl font-semibold text-[var(--color-text)]">Page not found</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link href="/">
          <Button variant="ocp">Go to Home</Button>
        </Link>
        <Link href="/scenario">
          <Button variant="outline">New Scenario</Button>
        </Link>
      </div>
    </div>
  )
}
