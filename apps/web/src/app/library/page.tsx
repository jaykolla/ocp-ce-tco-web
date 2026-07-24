'use client'

import { useState, useEffect, useRef } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { Plus, Pencil, Trash2, Upload, Download, BookOpen } from 'lucide-react'

import { TopNav } from '@/components/nav/top-nav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  powerLibrary,
  coolingConfigurations,
  dataroomConfigs,
  powerConfigurations,
} from '@ocp-tco/seed-data'
import {
  getCustomEquipment,
  addCustomEquipment,
  updateCustomEquipment,
  deleteCustomEquipment,
  exportCustomLibrary,
  importCustomLibrary,
  type CustomEquipmentItem,
} from '@/lib/custom-library'
import { logEvent } from '@/lib/audit-log'

// ─── Source / status badge helpers ───────────────────────────────────────────

function StatusBadge({ status }: { status: 'published' | 'custom' }) {
  return status === 'published' ? (
    <Badge variant="success" className="shrink-0">published</Badge>
  ) : (
    <Badge variant="info" className="shrink-0">custom</Badge>
  )
}

function SourceLabel({ status, addedAt }: { status: 'published' | 'custom'; addedAt?: string }) {
  if (status === 'published') return <span className="text-xs text-[var(--color-text-muted)]">OCP CE TCO v1.11</span>
  const date = addedAt ? new Date(addedAt).toLocaleDateString() : '—'
  return <span className="text-xs text-[var(--color-text-muted)]">User-added {date}</span>
}

// ─── Tabs wrapper ─────────────────────────────────────────────────────────────

const Tabs = TabsPrimitive.Root
const TabsList = TabsPrimitive.List
const TabsTrigger = TabsPrimitive.Trigger
const TabsContent = TabsPrimitive.Content

// ─── Power Equipment Tab ──────────────────────────────────────────────────────

interface PowerFormData {
  name: string
  type: string
  proportionalAreaM2PerKw: string
  proportionalCostPerKw: string
  proportionalLoss: string
  cop: string
  heatToAirFraction: string
  heatToLiquidFraction: string
}

const POWER_TYPES = ['TX', 'Genset', 'SWB', 'UPS', 'Chiller']

function emptyPowerForm(): PowerFormData {
  return {
    name: '',
    type: 'TX',
    proportionalAreaM2PerKw: '',
    proportionalCostPerKw: '',
    proportionalLoss: '',
    cop: '',
    heatToAirFraction: '',
    heatToLiquidFraction: '',
  }
}

function PowerEquipmentTab() {
  const [custom, setCustom] = useState<CustomEquipmentItem[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<PowerFormData>(emptyPowerForm())

  useEffect(() => {
    setCustom(getCustomEquipment().filter((i) => i.category === 'power'))
  }, [dialogOpen])

  function openAdd() {
    setEditingId(null)
    setForm(emptyPowerForm())
    setDialogOpen(true)
  }

  function openEdit(item: CustomEquipmentItem) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      type: item.type,
      proportionalAreaM2PerKw: String(item.proportionalAreaM2PerKw ?? ''),
      proportionalCostPerKw: String(item.proportionalCostPerKw ?? ''),
      proportionalLoss: String(item.proportionalLoss ?? ''),
      cop: String(item.cop ?? ''),
      heatToAirFraction: String(item.heatToAirFraction ?? ''),
      heatToLiquidFraction: String(item.heatToLiquidFraction ?? ''),
    })
    setDialogOpen(true)
  }

  function handleSave() {
    const payload = {
      category: 'power' as const,
      name: form.name.trim(),
      type: form.type,
      proportionalAreaM2PerKw: parseFloat(form.proportionalAreaM2PerKw) || 0,
      proportionalCostPerKw: parseFloat(form.proportionalCostPerKw) || 0,
      proportionalLoss: parseFloat(form.proportionalLoss) || 0,
      cop: form.cop ? parseFloat(form.cop) : undefined,
      heatToAirFraction: form.heatToAirFraction ? parseFloat(form.heatToAirFraction) : undefined,
      heatToLiquidFraction: form.heatToLiquidFraction ? parseFloat(form.heatToLiquidFraction) : undefined,
    }

    if (editingId) {
      updateCustomEquipment(editingId, payload)
    } else {
      const item = addCustomEquipment(payload)
      logEvent({ type: 'library_item_added', itemId: item.id, itemType: `power/${form.type}` })
    }
    setDialogOpen(false)
    setCustom(getCustomEquipment().filter((i) => i.category === 'power'))
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this custom item?')) return
    deleteCustomEquipment(id)
    setCustom(getCustomEquipment().filter((i) => i.category === 'power'))
  }

  const seedItems = powerLibrary.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    status: 'published' as const,
    addedAt: undefined as string | undefined,
    proportionalAreaM2PerKw: e.proportionalAreaM2PerKw,
    proportionalCostPerKw: e.proportionalCostPerKw,
    proportionalLoss: e.proportionalLoss,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="ocp" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Power Equipment
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-subtle)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Name</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Type</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Area (m²/kW)</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Cost (€/kW)</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Loss (%)</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Status</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Source</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {seedItems.map((item) => (
              <tr key={item.id} className="bg-[var(--color-surface)] hover:bg-[var(--color-bg-subtle)]">
                <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{item.name}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{item.type}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{item.proportionalAreaM2PerKw ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{item.proportionalCostPerKw ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">
                  {item.proportionalLoss != null ? `${(item.proportionalLoss * 100).toFixed(1)}` : '—'}
                </td>
                <td className="px-4 py-2.5"><StatusBadge status="published" /></td>
                <td className="px-4 py-2.5"><SourceLabel status="published" /></td>
                <td className="px-4 py-2.5" />
              </tr>
            ))}
            {custom.map((item) => (
              <tr key={item.id} className="bg-blue-50/30 dark:bg-blue-950/10 hover:bg-[var(--color-bg-subtle)]">
                <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{item.name}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{item.type}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{item.proportionalAreaM2PerKw ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{item.proportionalCostPerKw ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">
                  {item.proportionalLoss != null ? `${(item.proportionalLoss * 100).toFixed(1)}` : '—'}
                </td>
                <td className="px-4 py-2.5"><StatusBadge status="custom" /></td>
                <td className="px-4 py-2.5"><SourceLabel status="custom" addedAt={item.addedAt} /></td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)]"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded p-1 text-[var(--color-text-muted)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Power Equipment' : 'Add Power Equipment'}</DialogTitle>
            <DialogDescription>
              Custom items are stored locally and merged with official seed data.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Name *">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Custom UPS" />
              </FormField>
              <FormField label="Type *">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {POWER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Proportional Area (m²/kW)">
                <Input type="number" value={form.proportionalAreaM2PerKw} onChange={(e) => setForm({ ...form, proportionalAreaM2PerKw: e.target.value })} placeholder="0.04" />
              </FormField>
              <FormField label="Proportional Cost (€/kW)">
                <Input type="number" value={form.proportionalCostPerKw} onChange={(e) => setForm({ ...form, proportionalCostPerKw: e.target.value })} placeholder="500" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Proportional Losses (fraction)">
                <Input type="number" value={form.proportionalLoss} onChange={(e) => setForm({ ...form, proportionalLoss: e.target.value })} placeholder="0.04" />
              </FormField>
              <FormField label="COP (optional)">
                <Input type="number" value={form.cop} onChange={(e) => setForm({ ...form, cop: e.target.value })} placeholder="3.0" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Heat to Air (fraction)">
                <Input type="number" value={form.heatToAirFraction} onChange={(e) => setForm({ ...form, heatToAirFraction: e.target.value })} placeholder="1.0" />
              </FormField>
              <FormField label="Heat to Liquid (fraction)">
                <Input type="number" value={form.heatToLiquidFraction} onChange={(e) => setForm({ ...form, heatToLiquidFraction: e.target.value })} placeholder="0.0" />
              </FormField>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="ocp" onClick={handleSave} disabled={!form.name.trim()}>
              {editingId ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Cooling Equipment Tab ────────────────────────────────────────────────────

function CoolingEquipmentTab() {
  const [custom, setCustom] = useState<CustomEquipmentItem[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', type: 'CRAH', cop: '', proportionalAreaM2PerKw: '', proportionalCostPerKw: '' })

  useEffect(() => {
    setCustom(getCustomEquipment().filter((i) => i.category === 'cooling'))
  }, [dialogOpen])

  function openAdd() {
    setEditingId(null)
    setForm({ name: '', type: 'CRAH', cop: '', proportionalAreaM2PerKw: '', proportionalCostPerKw: '' })
    setDialogOpen(true)
  }

  function openEdit(item: CustomEquipmentItem) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      type: item.type,
      cop: String(item.cop ?? ''),
      proportionalAreaM2PerKw: String(item.proportionalAreaM2PerKw ?? ''),
      proportionalCostPerKw: String(item.proportionalCostPerKw ?? ''),
    })
    setDialogOpen(true)
  }

  function handleSave() {
    const payload = {
      category: 'cooling' as const,
      name: form.name.trim(),
      type: form.type,
      cop: form.cop ? parseFloat(form.cop) : undefined,
      proportionalAreaM2PerKw: form.proportionalAreaM2PerKw ? parseFloat(form.proportionalAreaM2PerKw) : undefined,
      proportionalCostPerKw: form.proportionalCostPerKw ? parseFloat(form.proportionalCostPerKw) : undefined,
    }
    if (editingId) {
      updateCustomEquipment(editingId, payload)
    } else {
      const item = addCustomEquipment(payload)
      logEvent({ type: 'library_item_added', itemId: item.id, itemType: `cooling/${form.type}` })
    }
    setDialogOpen(false)
    setCustom(getCustomEquipment().filter((i) => i.category === 'cooling'))
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this custom item?')) return
    deleteCustomEquipment(id)
    setCustom(getCustomEquipment().filter((i) => i.category === 'cooling'))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="ocp" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Cooling Equipment
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-subtle)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Name</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Type</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">TCWS (°C)</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">TAPP (°C)</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Status</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Source</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {coolingConfigurations.map((cfg) => (
              <tr key={cfg.id} className="bg-[var(--color-surface)] hover:bg-[var(--color-bg-subtle)]">
                <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{cfg.name}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">Config</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{cfg.tcwsCelsius}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{cfg.tappCelsius}</td>
                <td className="px-4 py-2.5"><StatusBadge status="published" /></td>
                <td className="px-4 py-2.5"><SourceLabel status="published" /></td>
                <td className="px-4 py-2.5" />
              </tr>
            ))}
            {custom.map((item) => (
              <tr key={item.id} className="bg-blue-50/30 dark:bg-blue-950/10 hover:bg-[var(--color-bg-subtle)]">
                <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{item.name}</td>
                <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{item.type}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">—</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">—</td>
                <td className="px-4 py-2.5"><StatusBadge status="custom" /></td>
                <td className="px-4 py-2.5"><SourceLabel status="custom" addedAt={item.addedAt} /></td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5 justify-end">
                    <button type="button" onClick={() => openEdit(item)} className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)]" aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(item.id)} className="rounded p-1 text-[var(--color-text-muted)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Cooling Equipment' : 'Add Cooling Equipment'}</DialogTitle>
            <DialogDescription>Custom cooling item stored locally.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <FormField label="Name *">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Custom CRAH" />
            </FormField>
            <FormField label="Type">
              <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="CRAH" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="COP">
                <Input type="number" value={form.cop} onChange={(e) => setForm({ ...form, cop: e.target.value })} placeholder="3.0" />
              </FormField>
              <FormField label="Cost (€/kW)">
                <Input type="number" value={form.proportionalCostPerKw} onChange={(e) => setForm({ ...form, proportionalCostPerKw: e.target.value })} placeholder="500" />
              </FormField>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="ocp" onClick={handleSave} disabled={!form.name.trim()}>
              {editingId ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Data Equipment Tab ───────────────────────────────────────────────────────

function DataEquipmentTab() {
  const [custom, setCustom] = useState<CustomEquipmentItem[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', type: 'Chassis', loadKw: '', lossesPercent: '', heightRu: '', iteL4EfficiencyPct: '' })

  useEffect(() => {
    setCustom(getCustomEquipment().filter((i) => i.category === 'data'))
  }, [dialogOpen])

  function openAdd() {
    setEditingId(null)
    setForm({ name: '', type: 'Chassis', loadKw: '', lossesPercent: '', heightRu: '', iteL4EfficiencyPct: '' })
    setDialogOpen(true)
  }

  function openEdit(item: CustomEquipmentItem) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      type: item.type,
      loadKw: String(item.loadKw ?? ''),
      lossesPercent: String(item.lossesPercent ?? ''),
      heightRu: String(item.heightRu ?? ''),
      iteL4EfficiencyPct: String(item.iteL4EfficiencyPct ?? ''),
    })
    setDialogOpen(true)
  }

  function handleSave() {
    const payload = {
      category: 'data' as const,
      name: form.name.trim(),
      type: form.type,
      loadKw: form.loadKw ? parseFloat(form.loadKw) : undefined,
      lossesPercent: form.lossesPercent ? parseFloat(form.lossesPercent) : undefined,
      heightRu: form.heightRu ? parseFloat(form.heightRu) : undefined,
      iteL4EfficiencyPct: form.iteL4EfficiencyPct ? parseFloat(form.iteL4EfficiencyPct) : undefined,
    }
    if (editingId) {
      updateCustomEquipment(editingId, payload)
    } else {
      const item = addCustomEquipment(payload)
      logEvent({ type: 'library_item_added', itemId: item.id, itemType: `data/${form.type}` })
    }
    setDialogOpen(false)
    setCustom(getCustomEquipment().filter((i) => i.category === 'data'))
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this custom item?')) return
    deleteCustomEquipment(id)
    setCustom(getCustomEquipment().filter((i) => i.category === 'data'))
  }

  const dataroomRows = dataroomConfigs.map((d) => ({
    id: d.id,
    name: d.name,
    load: d.load,
    proportionalLosses: d.proportional_losses,
    status: 'published' as const,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="ocp" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Data Equipment
        </Button>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-subtle)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Name</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Load (kW)</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Losses (%)</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Status</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Source</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {dataroomRows.map((item) => (
              <tr key={item.id} className="bg-[var(--color-surface)] hover:bg-[var(--color-bg-subtle)]">
                <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{item.name}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{item.load}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{(item.proportionalLosses * 100).toFixed(1)}</td>
                <td className="px-4 py-2.5"><StatusBadge status="published" /></td>
                <td className="px-4 py-2.5"><SourceLabel status="published" /></td>
                <td className="px-4 py-2.5" />
              </tr>
            ))}
            {custom.map((item) => (
              <tr key={item.id} className="bg-blue-50/30 dark:bg-blue-950/10 hover:bg-[var(--color-bg-subtle)]">
                <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{item.name}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{item.loadKw ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{item.lossesPercent ?? '—'}</td>
                <td className="px-4 py-2.5"><StatusBadge status="custom" /></td>
                <td className="px-4 py-2.5"><SourceLabel status="custom" addedAt={item.addedAt} /></td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5 justify-end">
                    <button type="button" onClick={() => openEdit(item)} className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)]" aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => handleDelete(item.id)} className="rounded p-1 text-[var(--color-text-muted)] hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Data Equipment' : 'Add Data Equipment'}</DialogTitle>
            <DialogDescription>Custom chassis, CRAH, or CDU stored locally.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Name *">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Custom Chassis" />
              </FormField>
              <FormField label="Type">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  {['Chassis', 'CRAH', 'CDU'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Load (kW)">
                <Input type="number" value={form.loadKw} onChange={(e) => setForm({ ...form, loadKw: e.target.value })} placeholder="10" />
              </FormField>
              <FormField label="Losses (%)">
                <Input type="number" value={form.lossesPercent} onChange={(e) => setForm({ ...form, lossesPercent: e.target.value })} placeholder="5" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Height (RU)">
                <Input type="number" value={form.heightRu} onChange={(e) => setForm({ ...form, heightRu: e.target.value })} placeholder="2" />
              </FormField>
              <FormField label="ITE L4 Efficiency (%)">
                <Input type="number" value={form.iteL4EfficiencyPct} onChange={(e) => setForm({ ...form, iteL4EfficiencyPct: e.target.value })} placeholder="95" />
              </FormField>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button variant="ocp" onClick={handleSave} disabled={!form.name.trim()}>
              {editingId ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Configurations Tab ───────────────────────────────────────────────────────

function ConfigurationsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Power Configurations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-subtle)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">TX</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Genset</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">SWB</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">UPS</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Chiller</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {powerConfigurations.map((cfg) => (
                  <tr key={cfg.id} className="bg-[var(--color-surface)] hover:bg-[var(--color-bg-subtle)]">
                    <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{cfg.name}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{cfg.tx ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{cfg.genset ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{cfg.swb ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{cfg.ups ?? '—'}</td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{cfg.chiller ?? '—'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status="published" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Cooling Configurations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-subtle)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Name</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">TCWS (°C)</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">TAPP (°C)</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {coolingConfigurations.map((cfg) => (
                  <tr key={cfg.id} className="bg-[var(--color-surface)] hover:bg-[var(--color-bg-subtle)]">
                    <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{cfg.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{cfg.tcwsCelsius}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{cfg.tappCelsius}</td>
                    <td className="px-4 py-2.5"><StatusBadge status="published" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Dataroom Configurations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-bg-subtle)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Name</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Load (kW)</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Fixed Area (m²)</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--color-text-muted)]">Fixed Cost (€)</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {dataroomConfigs.map((cfg) => (
                  <tr key={cfg.id} className="bg-[var(--color-surface)] hover:bg-[var(--color-bg-subtle)]">
                    <td className="px-4 py-2.5 font-medium text-[var(--color-text)]">{cfg.name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{cfg.load.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{cfg.fixed_area.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-text-muted)]">{cfg.fixed_cost.toLocaleString()}</td>
                    <td className="px-4 py-2.5"><StatusBadge status="published" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Helper form field ────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-[var(--color-text-muted)]">{label}</Label>
      {children}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importCustomLibrary(file)
      setImportSuccess(true)
      setImportError(null)
      setTimeout(() => setImportSuccess(false), 3000)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <TopNav />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-emerald-100 dark:bg-emerald-950/30">
              <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">Equipment Library</h1>
              <p className="text-sm text-[var(--color-text-muted)]">
                Browse official OCP CE TCO v1.11 seed data and manage custom items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {importSuccess && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400">Import successful!</span>
            )}
            {importError && (
              <span className="text-sm text-red-600 dark:text-red-400">{importError}</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={exportCustomLibrary}>
              <Download className="h-4 w-4" />
              Export Custom
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="power">
          <TabsList className="mb-6 flex gap-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-1">
            {[
              { value: 'power', label: 'Power Equipment' },
              { value: 'cooling', label: 'Cooling Equipment' },
              { value: 'data', label: 'Data Equipment' },
              { value: 'configs', label: 'Configurations' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors data-[state=active]:bg-[var(--color-surface)] data-[state=active]:text-[var(--color-text)] data-[state=active]:shadow-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="power"><PowerEquipmentTab /></TabsContent>
          <TabsContent value="cooling"><CoolingEquipmentTab /></TabsContent>
          <TabsContent value="data"><DataEquipmentTab /></TabsContent>
          <TabsContent value="configs"><ConfigurationsTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
