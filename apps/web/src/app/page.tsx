import Link from 'next/link'
import { BarChart2, ArrowRight, Zap, Server, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-ocp)]">
            <BarChart2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-[var(--color-text)]">OCP CE TCO</span>
          <Badge variant="outline" className="ml-auto text-xs">v1.11</Badge>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-1.5 text-sm text-[var(--color-text-muted)] mb-6">
            <span className="h-2 w-2 rounded-full bg-[var(--color-ocp)]" />
            Open Compute Project
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text)] sm:text-5xl mb-4">
            OCP CE TCO Web Tool
          </h1>
          <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
            Open, transparent data center Total Cost of Ownership modeling.
            Model your full facility lifecycle costs with the OCP Community Edition framework.
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {[
            { icon: Server, label: 'IT Design' },
            { icon: Zap, label: 'Power Systems' },
            { icon: BarChart2, label: 'Cooling & Climate' },
            { icon: DollarSign, label: 'Finance & NPV' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-2 text-sm text-[var(--color-text-muted)]">
              <Icon className="h-4 w-4 text-[var(--color-ocp)]" />
              {label}
            </div>
          ))}
        </div>

        {/* CTA cards */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <Card className="hover:shadow-[var(--shadow-md)] transition-shadow">
            <CardHeader>
              <CardTitle>New Scenario</CardTitle>
              <CardDescription>
                Start a new TCO analysis. Configure IT, power, cooling, and finance parameters through our guided wizard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/scenario">
                <Button className="w-full" variant="ocp">
                  Start Scenario
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-[var(--shadow-md)] transition-shadow">
            <CardHeader>
              <CardTitle>About This Tool</CardTitle>
              <CardDescription>
                Based on OCP CE TCO Tool v1.11. An open-source model for transparent data center cost analysis aligned with OCP best practices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--color-ocp)] shrink-0" />
                  7-stage guided wizard
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--color-ocp)] shrink-0" />
                  NPV, CAPEX, OPEX breakdown
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--color-ocp)] shrink-0" />
                  CO&#8322; and water footprint
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--color-ocp)] shrink-0" />
                  Multi-currency support
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] mt-16">
        <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between text-sm text-[var(--color-text-subtle)]">
          <span>Based on OCP CE TCO Tool v1.11 | Open Compute Project</span>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[var(--color-ocp)]" />
            <span>Open Source</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
