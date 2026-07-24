'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import { BookOpen, Zap, Thermometer, Server } from 'lucide-react'
import { TopNav } from '@/components/nav/top-nav'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const Tabs = TabsPrimitive.Root
const TabsList = TabsPrimitive.List
const TabsTrigger = TabsPrimitive.Trigger
const TabsContent = TabsPrimitive.Content

// ─── Shared table primitives ──────────────────────────────────────────────────

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-[var(--color-bg-subtle)]">
      <tr>{children}</tr>
    </thead>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

function Td({ children, muted, right, mono }: { children: React.ReactNode; muted?: boolean; right?: boolean; mono?: boolean }) {
  return (
    <td className={`px-4 py-3 ${muted ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text)]'} ${right ? 'text-right tabular-nums' : ''} ${mono ? 'font-mono text-xs' : ''}`}>
      {children}
    </td>
  )
}

function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-[var(--color-border)]">{children}</tbody>
}

function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="bg-[var(--color-surface)] hover:bg-[var(--color-bg-subtle)] transition-colors">{children}</tr>
}

// ─── Callout / note box ───────────────────────────────────────────────────────

function Callout({ color, title, children }: { color: 'blue' | 'amber' | 'emerald'; title: string; children: React.ReactNode }) {
  const styles = {
    blue: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800',
    amber: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800',
    emerald: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800',
  }
  const titleStyles = {
    blue: 'text-blue-800 dark:text-blue-300',
    amber: 'text-amber-800 dark:text-amber-300',
    emerald: 'text-emerald-800 dark:text-emerald-300',
  }
  return (
    <div className={`rounded-[var(--radius-md)] border px-4 py-3 ${styles[color]}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${titleStyles[color]}`}>{title}</p>
      <p className="text-sm text-[var(--color-text)]">{children}</p>
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--color-text)]">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        {number}
      </span>
      {children}
    </h3>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReferencePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />

      <main className="mx-auto max-w-5xl px-6 py-10">

        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-blue-100 dark:bg-blue-950/30">
              <BookOpen className="h-6 w-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text)]">Model Reference Guide</h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                Detailed assumptions behind every configuration option in the TCO model
              </p>
            </div>
          </div>
          <p className="text-sm text-[var(--color-text)] max-w-3xl leading-relaxed">
            Every option you select in the wizard plugs specific cost, efficiency, and area coefficients into the calculation engine.
            This page documents exactly what those numbers are, where they come from (OCP CE TCO v1.11 workbook), and when to choose each configuration.
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="power">
          <TabsList className="mb-6 flex gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-1">
            {[
              { value: 'power', label: 'Power Equipment', icon: Zap },
              { value: 'cooling', label: 'Cooling Systems', icon: Thermometer },
              { value: 'dataroom', label: 'Dataroom Slots', icon: Server },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors
                  data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-text)] data-[state=active]:shadow-sm"
              >
                <Icon className="h-4 w-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── POWER TAB ────────────────────────────────────────────────────── */}
          <TabsContent value="power" className="space-y-8">

            <p className="text-sm text-[var(--color-text)] leading-relaxed max-w-3xl">
              Power equipment is split into two independent paths. The <strong>Critical Power path</strong> covers
              UPS, switchgear, and chillers — equipment that protects the IT load directly. The <strong>Mechanical
              Power path</strong> covers transformers and generators — the upstream utility interface. You configure
              each path separately; they can use different vendor designs.
            </p>

            {/* Critical Power */}
            <div className="space-y-4">
              <SectionHeading number={1}>Critical Power Path (UPS, Switchgear, Chiller)</SectionHeading>
              <div className="grid gap-4 sm:grid-cols-2">
                <Callout color="blue" title="When to use: Generic Baseline">
                  No specific vendor requirement or early-stage analysis. Uses round-number industry-average
                  coefficients ($500/kW across all components). Best for directional estimates.
                </Callout>
                <Callout color="amber" title="When to use: Schneider Electric — Critical (SE RD65)">
                  You are designing against the SE RD65 reference architecture for UPS and switchgear.
                  Key advantage: UPS cost drops to $434/kW and chiller to $324/kW vs. the $500/kW baseline,
                  and transformer losses improve from 4% to 1%.
                </Callout>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <Thead>
                      <Th>Component</Th>
                      <Th right>Cost / kW</Th>
                      <Th right>Power Loss</Th>
                      <Th right>Floor Area / kW</Th>
                      <Th right>COP</Th>
                    </Thead>
                    <Tbody>
                      {/* Transformer */}
                      <Tr>
                        <Td><span className="font-medium">Transformer (TX)</span><br /><span className="text-xs text-[var(--color-text-muted)]">Generic Baseline</span></Td>
                        <Td right mono>$500</Td>
                        <Td right><Badge variant="outline">4%</Badge></Td>
                        <Td right mono>0.04 m²</Td>
                        <Td right muted>—</Td>
                      </Tr>
                      <Tr>
                        <Td><span className="font-medium">Transformer (TX)</span><br /><span className="text-xs text-[var(--color-text-muted)]">SE RD65 — Critical</span></Td>
                        <Td right mono>$500</Td>
                        <Td right><Badge variant="success">1%</Badge></Td>
                        <Td right mono>0.04 m²</Td>
                        <Td right muted>—</Td>
                      </Tr>
                      {/* Switchgear */}
                      <Tr>
                        <Td><span className="font-medium">Switchgear (SWB)</span><br /><span className="text-xs text-[var(--color-text-muted)]">Generic Baseline</span></Td>
                        <Td right mono>$500</Td>
                        <Td right><Badge variant="outline">1%</Badge></Td>
                        <Td right mono>0.03 m²</Td>
                        <Td right muted>—</Td>
                      </Tr>
                      <Tr>
                        <Td><span className="font-medium">Switchgear (SWB)</span><br /><span className="text-xs text-[var(--color-text-muted)]">SE RD65 — Critical</span></Td>
                        <Td right mono>$500</Td>
                        <Td right><Badge variant="outline">1%</Badge></Td>
                        <Td right mono>0.04 m²</Td>
                        <Td right muted>—</Td>
                      </Tr>
                      {/* UPS */}
                      <Tr>
                        <Td><span className="font-medium">UPS</span><br /><span className="text-xs text-[var(--color-text-muted)]">Generic Baseline</span></Td>
                        <Td right mono>$500</Td>
                        <Td right><Badge variant="outline">2%</Badge></Td>
                        <Td right mono>0.03 m²</Td>
                        <Td right muted>—</Td>
                      </Tr>
                      <Tr>
                        <Td><span className="font-medium">UPS</span><br /><span className="text-xs text-[var(--color-text-muted)]">SE RD65 — Critical</span></Td>
                        <Td right mono><span className="text-emerald-600 font-semibold">$434</span></Td>
                        <Td right><Badge variant="success">1%</Badge></Td>
                        <Td right mono>0.031 m²</Td>
                        <Td right muted>—</Td>
                      </Tr>
                      {/* Chiller */}
                      <Tr>
                        <Td><span className="font-medium">Chiller</span><br /><span className="text-xs text-[var(--color-text-muted)]">Generic Baseline</span></Td>
                        <Td right mono>$500</Td>
                        <Td right muted>—</Td>
                        <Td right mono>0.03 m²</Td>
                        <Td right mono>20</Td>
                      </Tr>
                      <Tr>
                        <Td><span className="font-medium">Chiller</span><br /><span className="text-xs text-[var(--color-text-muted)]">SE RD65 — Critical</span></Td>
                        <Td right mono><span className="text-emerald-600 font-semibold">$324</span></Td>
                        <Td right muted>—</Td>
                        <Td right mono><span className="text-emerald-600 font-semibold">0.02 m²</span></Td>
                        <Td right mono><span className="text-emerald-600 font-semibold">22</span></Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </CardContent>
              </Card>
              <p className="text-xs text-[var(--color-text-muted)]">
                Source: OCP CE TCO v1.11 workbook, Power! sheet rows 12–64. All costs are proportional (per kW of IT load at the L1 power boundary). COP = coefficient of performance; higher is more efficient.
              </p>
            </div>

            {/* Mechanical Power */}
            <div className="space-y-4">
              <SectionHeading number={2}>Mechanical Power Path (Transformer, Generator)</SectionHeading>
              <div className="grid gap-4 sm:grid-cols-2">
                <Callout color="blue" title="When to use: Generic Baseline">
                  Standard analysis or when the upstream utility design is not yet specified.
                </Callout>
                <Callout color="amber" title="When to use: Schneider Electric — Mechanical (SE RD65)">
                  SE RD65 reference design governs the transformer and generator side. Note: UPS and chiller
                  are modeled as "None" in this path (those are handled by the Critical path config).
                </Callout>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <Thead>
                      <Th>Component</Th>
                      <Th right>Cost / kW</Th>
                      <Th right>Power Loss</Th>
                      <Th right>Floor Area / kW</Th>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td><span className="font-medium">Transformer (TX)</span><br /><span className="text-xs text-[var(--color-text-muted)]">Generic Baseline</span></Td>
                        <Td right mono>$500</Td>
                        <Td right><Badge variant="outline">4%</Badge></Td>
                        <Td right mono>0.04 m²</Td>
                      </Tr>
                      <Tr>
                        <Td><span className="font-medium">Transformer (TX)</span><br /><span className="text-xs text-[var(--color-text-muted)]">SE RD65 — Mechanical</span></Td>
                        <Td right mono>$500</Td>
                        <Td right><Badge variant="success">1%</Badge></Td>
                        <Td right mono>0.04 m²</Td>
                      </Tr>
                      <Tr>
                        <Td><span className="font-medium">Generator (Genset)</span><br /><span className="text-xs text-[var(--color-text-muted)]">Generic Baseline</span></Td>
                        <Td right mono>$500</Td>
                        <Td right muted>—</Td>
                        <Td right mono>0.02 m²</Td>
                      </Tr>
                      <Tr>
                        <Td><span className="font-medium">Generator (Genset)</span><br /><span className="text-xs text-[var(--color-text-muted)]">SE RD65 — Mechanical</span></Td>
                        <Td right mono>$500</Td>
                        <Td right muted>—</Td>
                        <Td right mono>0.026 m²</Td>
                      </Tr>
                      <Tr>
                        <Td><span className="font-medium">UPS</span><br /><span className="text-xs text-[var(--color-text-muted)]">SE RD65 — Mechanical</span></Td>
                        <Td right muted>Not modeled</Td>
                        <Td right muted>—</Td>
                        <Td right muted>—</Td>
                      </Tr>
                      <Tr>
                        <Td><span className="font-medium">Chiller</span><br /><span className="text-xs text-[var(--color-text-muted)]">SE RD65 — Mechanical</span></Td>
                        <Td right muted>Not modeled</Td>
                        <Td right muted>—</Td>
                        <Td right muted>—</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </CardContent>
              </Card>
            </div>

          </TabsContent>

          {/* ── COOLING TAB ───────────────────────────────────────────────────── */}
          <TabsContent value="cooling" className="space-y-8">

            <p className="text-sm text-[var(--color-text)] leading-relaxed max-w-3xl">
              Cooling is modeled as four sub-components: <strong>Fans</strong> (air movement), <strong>Compressor</strong>
              (mechanical cooling), <strong>Free Cooler</strong> (economizer coils), and <strong>Pump</strong> (liquid
              distribution). The model also uses two temperature setpoints to calculate how many hours per year
              free cooling is available instead of running the compressor.
            </p>

            {/* Temperature setpoints */}
            <div className="space-y-4">
              <SectionHeading number={1}>Cooling Configuration Setpoints</SectionHeading>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <Thead>
                      <Th>Configuration</Th>
                      <Th right>Cooling Medium</Th>
                      <Th right>Supply Water Temp (tcws)</Th>
                      <Th right>Approach Temp (tapp)</Th>
                    </Thead>
                    <Tbody>
                      {[
                        { name: 'Generic Baseline — Air', medium: 'Air', tcws: '20°C', tapp: '5°C' },
                        { name: 'Generic Baseline — Liquid', medium: 'Liquid', tcws: '30°C', tapp: '5°C' },
                        { name: 'SE RD65 — Air', medium: 'Air', tcws: '27°C', tapp: '5°C' },
                        { name: 'SE RD65 — Liquid', medium: 'Liquid', tcws: '40°C', tapp: '5°C' },
                      ].map((row) => (
                        <Tr key={row.name}>
                          <Td><span className="font-medium">{row.name}</span></Td>
                          <Td right muted>{row.medium}</Td>
                          <Td right mono>{row.tcws}</Td>
                          <Td right mono>{row.tapp}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </CardContent>
              </Card>
              <p className="text-xs text-[var(--color-text-muted)]">
                <strong>tcws</strong> = chilled water supply temperature. Higher tcws means free cooling is available
                at higher outdoor temperatures, increasing the free-cooling fraction (lower OPEX).
                <strong> tapp</strong> = approach temperature delta between outdoor air and supply water. Free cooling
                activates when outdoor temp ≤ tcws − tapp.
              </p>
            </div>

            {/* Component efficiency */}
            <div className="space-y-4">
              <SectionHeading number={2}>Component Efficiency (COP)</SectionHeading>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <Thead>
                      <Th>Component</Th>
                      <Th right>Generic Baseline COP</Th>
                      <Th right>SE RD65 COP</Th>
                      <Th right>Improvement</Th>
                    </Thead>
                    <Tbody>
                      {[
                        { component: 'Fans', desc: 'Air distribution', base: 50, se: 50, note: 'Same efficiency, SE uses 12% less floor area' },
                        { component: 'Compressor', desc: 'Mechanical refrigeration', base: 3, se: 4, note: '+33% — significant OPEX saving' },
                        { component: 'Free Cooler', desc: 'Economizer coils', base: 400, se: 500, note: '+25%' },
                        { component: 'Pump', desc: 'Liquid distribution', base: 400, se: 405, note: '+1.25% — marginal' },
                      ].map((row) => (
                        <Tr key={row.component}>
                          <Td>
                            <span className="font-medium">{row.component}</span>
                            <br />
                            <span className="text-xs text-[var(--color-text-muted)]">{row.desc}</span>
                          </Td>
                          <Td right mono>{row.base}</Td>
                          <Td right mono><span className={row.se > row.base ? 'text-emerald-600 font-semibold' : ''}>{row.se}</span></Td>
                          <Td right muted>{row.note}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </CardContent>
              </Card>
              <p className="text-xs text-[var(--color-text-muted)]">
                COP = Coefficient of Performance. For cooling: how many kW of heat removed per kW of electricity consumed.
                Higher COP = lower electricity cost per unit of heat rejected. The compressor COP difference (3 vs 4) is the
                largest driver of cooling OPEX between Generic and SE RD65 configurations.
              </p>
            </div>

            {/* Fan water usage */}
            <div className="space-y-4">
              <SectionHeading number={3}>Fans — Cost & Water Consumption</SectionHeading>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <Thead>
                      <Th>Config</Th>
                      <Th right>Cost / kW</Th>
                      <Th right>Floor Area / kW</Th>
                      <Th right>Water Use</Th>
                    </Thead>
                    <Tbody>
                      <Tr>
                        <Td><span className="font-medium">Generic Baseline</span></Td>
                        <Td right mono>$500</Td>
                        <Td right mono>0.040 m²</Td>
                        <Td right mono>1.4 L/kWh</Td>
                      </Tr>
                      <Tr>
                        <Td><span className="font-medium">SE RD65</span></Td>
                        <Td right mono>$500</Td>
                        <Td right mono><span className="text-emerald-600 font-semibold">0.035 m²</span></Td>
                        <Td right mono>1.4 L/kWh</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <Callout color="emerald" title="Air vs. Liquid — which to choose?">
              Use <strong>Air</strong> configs for traditional hot-aisle/cold-aisle deployments. Use <strong>Liquid</strong>
              configs when your dataroom slots include direct-to-chip (DTC) cooling — the higher tcws setpoints (30°C / 40°C)
              reflect the warmer return water from liquid-cooled servers, enabling more free-cooling hours.
            </Callout>

          </TabsContent>

          {/* ── DATAROOM SLOTS TAB ────────────────────────────────────────────── */}
          <TabsContent value="dataroom" className="space-y-8">

            <p className="text-sm text-[var(--color-text)] leading-relaxed max-w-3xl">
              A <strong>dataroom slot</strong> represents one physical zone of servers within the facility — think of
              it as one room or one row group. You can configure up to 4 slots. Each slot has a fixed IT load, floor
              area, capital cost, and a power efficiency cascade (L2 → L3 → L4) that determines how much of the UPS
              output actually reaches the server processors.
            </p>

            {/* Main comparison table */}
            <div className="space-y-4">
              <SectionHeading number={1}>Configuration Comparison</SectionHeading>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <Thead>
                      <Th>Configuration</Th>
                      <Th right>IT Load</Th>
                      <Th right>Floor Area</Th>
                      <Th right>Fixed Cost</Th>
                      <Th right>Power Losses</Th>
                      <Th right>L4 Efficiency</Th>
                    </Thead>
                    <Tbody>
                      {[
                        { name: 'None', desc: 'Slot unused', load: '—', area: '—', cost: '$0', loss: '0%', l4: '—', highlight: false },
                        { name: 'Default', desc: 'Baseline single dataroom', load: '979 kW', area: '282 m²', cost: '$820k', loss: '4.5%', l4: '71.5%', highlight: false },
                        { name: '1 Row — Air Cooled', desc: 'Single row, traditional air cooling', load: '2,051 kW', area: '695 m²', cost: '$1.80M', loss: '4.5%', l4: '71.5%', highlight: false },
                        { name: '1 Row — DTC (L2A)', desc: 'Direct-to-chip, air-assist secondary loop', load: '1,909 kW', area: '671 m²', cost: '$2.14M', loss: '4.5%', l4: '73.4%', highlight: true },
                        { name: '1 Row — DTC (L2L)', desc: 'Direct-to-chip, liquid secondary loop', load: '1,904 kW', area: '661 m²', cost: '$1.95M', loss: '3.7%', l4: '73.6%', highlight: true },
                        { name: '2 Rows — DTC (L2L)', desc: 'Dual row, liquid secondary loop', load: '1,849 kW', area: '335 m²', cost: '$1.75M', loss: '2.8%', l4: '75.8%', highlight: true },
                      ].map((row) => (
                        <Tr key={row.name}>
                          <Td>
                            <span className="font-medium">{row.name}</span>
                            <br />
                            <span className="text-xs text-[var(--color-text-muted)]">{row.desc}</span>
                          </Td>
                          <Td right mono>{row.load}</Td>
                          <Td right mono>{row.area}</Td>
                          <Td right mono>{row.cost}</Td>
                          <Td right>
                            {row.loss === '—' ? <span className="text-[var(--color-text-muted)]">—</span> :
                              <Badge variant={row.highlight ? 'success' : 'outline'}>{row.loss}</Badge>}
                          </Td>
                          <Td right mono>
                            {row.l4 === '—' ? <span className="text-[var(--color-text-muted)]">—</span> :
                              <span className={row.highlight ? 'text-emerald-600 font-semibold' : ''}>{row.l4}</span>}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* L4 explanation */}
            <div className="space-y-4">
              <SectionHeading number={2}>What is L4 Efficiency?</SectionHeading>
              <Card>
                <CardContent className="pt-5 space-y-3 text-sm text-[var(--color-text)] leading-relaxed">
                  <p>
                    The model uses a 4-level power chain to track losses from the UPS to the server CPU:
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: 'L1', sub: 'UPS Output', desc: '100% — starting point' },
                      { label: 'L2', sub: 'PDU Output', desc: 'Dataroom boundary, PDU losses' },
                      { label: 'L3', sub: 'rPDU Output', desc: 'Rack boundary, rPDU losses' },
                      { label: 'L4', sub: 'Node Input', desc: 'What the server actually receives' },
                    ].map((lvl) => (
                      <div key={lvl.label} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-2.5">
                        <p className="text-xs font-bold text-[var(--color-primary)]">{lvl.label} — {lvl.sub}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{lvl.desc}</p>
                      </div>
                    ))}
                  </div>
                  <p>
                    <strong>L4 efficiency</strong> = the fraction of L1 power that reaches the server. For air-cooled
                    configs, ~28.5% is lost through the PDU and rPDU chain (L4 ≈ 71.5%). Direct-to-chip (DTC) designs
                    run servers at higher power density with lower distribution losses — the liquid cooling loop removes
                    heat directly at the chip, reducing airside overhead and improving L4 efficiency to 73–76%.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Cooling notes */}
            <div className="space-y-4">
              <SectionHeading number={3}>DTC Cooling — L2A vs. L2L</SectionHeading>
              <div className="grid gap-4 sm:grid-cols-2">
                <Callout color="blue" title="L2A — Liquid-to-Air secondary loop">
                  Coolant flows to the chip (liquid primary), then transfers heat to air via a rear-door heat
                  exchanger (air secondary). Works with existing air-cooled facility infrastructure. Lower
                  tcws water temperature requirement.
                </Callout>
                <Callout color="emerald" title="L2L — Liquid-to-Liquid secondary loop">
                  Both the primary (chip) and secondary (facility) loops are liquid. Enables higher supply
                  water temperatures (better free-cooling fraction), lower power losses (2.8% vs 4.5%),
                  and significantly better floor area density (335 m² for 2-row vs 695 m² for 1-row air).
                </Callout>
              </div>
            </div>

          </TabsContent>
        </Tabs>

        {/* Footer note */}
        <div className="mt-10 border-t border-[var(--color-border)] pt-6">
          <p className="text-xs text-[var(--color-text-muted)]">
            All data sourced from the OCP CE TCO v1.11 workbook (Power!, Cooling!, Data! sheets), extracted 2026-07-15.
            Costs are nominal equipment cost coefficients used for CAPEX sizing — they are not vendor list prices.
            See the <a href="/about" className="text-[var(--color-primary)] hover:underline">About page</a> for full methodology documentation.
          </p>
        </div>

      </main>
    </div>
  )
}
