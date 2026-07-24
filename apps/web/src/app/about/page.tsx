import Link from 'next/link'
import { ExternalLink, GitBranch, Mail, BookOpen, Database, FlaskConical, Scale } from 'lucide-react'
import { TopNav } from '@/components/nav/top-nav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { manifest } from '@ocp-tco/seed-data'
import { ModelInfo } from '@/components/model-info'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-emerald-100 dark:bg-emerald-950/30">
              <BookOpen className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text)]">About OCP CE TCO</h1>
              <p className="text-sm text-[var(--color-text-muted)]">Open, transparent data center cost modeling</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">

          {/* What is this tool */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">1</span>
              What is this tool?
            </h2>
            <Card>
              <CardContent className="pt-5 text-sm leading-relaxed text-[var(--color-text)]">
                <p>
                  The <strong>OCP CE TCO Web Tool</strong> is an open-source, browser-based implementation of the
                  Open Compute Project Community Edition Total Cost of Ownership model. It enables data center
                  engineers, architects, and procurement professionals to model full facility lifecycle costs —
                  from initial capital expenditure to 20-year net present value — using transparent, auditable
                  methodology aligned with OCP best practices.
                </p>
                <p className="mt-3">
                  All computation runs locally in your browser using a TypeScript engine compiled from the
                  official OCP CE TCO v1.11 workbook. No data is sent to any server. Your scenarios and
                  custom library items are stored only in your browser&rsquo;s localStorage.
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Methodology */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">2</span>
              Methodology
            </h2>
            <Card>
              <CardContent className="pt-5 space-y-3 text-sm leading-relaxed text-[var(--color-text)]">
                <p>
                  The model uses a <strong>4-level power hierarchy</strong> (L1 → L4) to track ITE power
                  from UPS output through PDU, rPDU, and finally to the node input, applying efficiency
                  ratios at each stage extracted from the OCP CE workbook.
                </p>
                <p>
                  <strong>Economization</strong> is modelled by computing a climate-specific free-cooling
                  fraction from hourly dry-bulb temperature data (PVGIS 5.3 TMY). Hours where the outdoor
                  temperature falls below the cooling plant approach temperature (TAPP) are counted as
                  free-cooling hours; the remainder require mechanical compression.
                </p>
                <p>
                  <strong>CAPEX</strong> is sized at peak facility power (N or N+1 or 2N redundancy factor)
                  and scaled by proportional equipment area/cost coefficients. <strong>OPEX</strong> is
                  computed on annual-average facility power. NPV is a standard 20-year discounted cash flow
                  with configurable financing structure.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: 'L1 — UPS Output', sub: 'Critical power boundary' },
                    { label: 'L2 — PDU Output', sub: 'Dataroom boundary' },
                    { label: 'L3 — rPDU Output', sub: 'Rack boundary' },
                    { label: 'L4 — Node Input', sub: 'ITE workload power' },
                  ].map((lvl) => (
                    <div key={lvl.label} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-2.5">
                      <p className="text-xs font-semibold text-[var(--color-text)]">{lvl.label}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{lvl.sub}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Data sources */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">3</span>
              Data Sources
            </h2>
            <Card>
              <CardContent className="pt-0 p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-bg-subtle)]">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Dataset</th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Authors / Provider</th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Usage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    <tr className="bg-[var(--color-surface)]">
                      <td className="px-4 py-3 font-medium text-[var(--color-text)]">OCP CE TCO Tool v1.11</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">Andy Young, Eduard Roytman (OCP)</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">Equipment library, power configs, cooling configs, financial model</td>
                    </tr>
                    <tr className="bg-[var(--color-surface)]">
                      <td className="px-4 py-3 font-medium text-[var(--color-text)]">PVGIS 5.3 TMY</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">European Commission Joint Research Centre</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">Hourly dry-bulb temperature data for economization calculations</td>
                    </tr>
                    <tr className="bg-[var(--color-surface)]">
                      <td className="px-4 py-3 font-medium text-[var(--color-text)]">ANSI/ASHRAE 169-2006</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">ASHRAE</td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">Climate zone classification (zones 0A–8) for reference location lookup</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </section>

          {/* Model version */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">4</span>
              Model Version
            </h2>
            <Card>
              <CardContent className="pt-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Model Version" value={<Badge variant="outline" className="font-mono text-xs">{manifest.modelVersion}</Badge>} />
                  <InfoRow label="Source Workbook" value={manifest.sourceWorkbookFilename} />
                  <InfoRow label="Source SHA-256" value={
                    <code className="break-all text-xs text-[var(--color-text-muted)]">
                      {manifest.sourceWorkbookSha256}
                    </code>
                  } />
                  <InfoRow label="Extracted At" value={new Date(manifest.extractedAt).toLocaleString()} />
                  <InfoRow label="Seed Dataset Versions" value={
                    <span className="text-xs text-[var(--color-text-muted)]">
                      power: {manifest.seedDatasetVersions.power} |{' '}
                      cooling: {manifest.seedDatasetVersions.cooling} |{' '}
                      data: {manifest.seedDatasetVersions.data} |{' '}
                      weather: {manifest.seedDatasetVersions.weather}
                    </span>
                  } />
                </div>

                {/* Expandable model details */}
                <div className="mt-4">
                  <ModelInfo />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Open source */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">5</span>
              Open Source
            </h2>
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-[var(--color-text-muted)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">GitHub Repository</p>
                    <Link
                      href="https://github.com/jaykolla/ocp-ce-tco-web"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-600 hover:underline dark:text-emerald-400 inline-flex items-center gap-1"
                    >
                      github.com/jaykolla/ocp-ce-tco-web
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-[var(--color-text-muted)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">License</p>
                    <p className="text-sm text-[var(--color-text-muted)]">MIT License — free for commercial and non-commercial use</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FlaskConical className="h-5 w-5 text-[var(--color-text-muted)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">Verification</p>
                    <p className="text-sm text-[var(--color-text-muted)]">Engine parity tests validate results against v1.11 Paris baseline scenario</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Contact */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--color-text)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">6</span>
              Contact &amp; Contribute
            </h2>
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-[var(--color-text-muted)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">OCP TCO Working Group</p>
                    <Link
                      href="mailto:tco@ocpproject.net"
                      className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
                    >
                      tco@ocpproject.net
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-[var(--color-text-muted)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">Bug Reports &amp; Feature Requests</p>
                    <Link
                      href="https://github.com/jaykolla/ocp-ce-tco-web/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-600 hover:underline dark:text-emerald-400 inline-flex items-center gap-1"
                    >
                      GitHub Issues
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Database className="h-5 w-5 text-[var(--color-text-muted)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">OCP Project</p>
                    <Link
                      href="https://www.opencompute.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-600 hover:underline dark:text-emerald-400 inline-flex items-center gap-1"
                    >
                      opencompute.org
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

        </div>
      </main>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-text)]">{value}</span>
    </div>
  )
}
