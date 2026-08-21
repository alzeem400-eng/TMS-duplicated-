import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, Printer, Eye, X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Item, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Supplier } from '../../types'
import { Toolbar, EmptyRow, Modal, ErrorBox, FormActions, Select, Field, TextArea } from './CategoriesView'
import { ReportDocument } from '../ReportHeader'

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: 'مسودة', sent: 'مرسلة', approved: 'معتمدة', received: 'مستلمة', cancelled: 'ملغاة',
}
const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft: 'bg-secondary-100 text-secondary-600',
  sent: 'bg-accent-100 text-accent-700',
  approved: 'bg-primary-100 text-primary-700',
  received: 'bg-success-100 text-success-700',
  cancelled: 'bg-danger-100 text-danger-700',
}

const today = () => new Date().toISOString().slice(0, 10)

export function PurchaseOrdersView({ items, suppliers, reload, canAdd = true, canEdit = true }: { items: Item[]; suppliers: Supplier[]; reload: () => void; canAdd?: boolean; canEdit?: boolean }) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<PurchaseOrder | null>(null)
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null)
  const [form, setForm] = useState({ po_number: '', supplier_id: '', order_date: today(), expected_date: '', notes: '' })
  const [lineItems, setLineItems] = useState<{ item_id: string; quantity_ordered: number; unit_cost: number; notes: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('purchase_orders').select('*, supplier:suppliers(name), items:purchase_order_items(*, item:items(name, sku))').order('created_at', { ascending: false })
    setOrders((data || []) as PurchaseOrder[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = orders.filter((o) => o.po_number.includes(query) || (o.supplier?.name || '').includes(query))

  function openCreate() {
    const next = `PO-${Date.now().toString().slice(-6)}`
    setForm({ po_number: next, supplier_id: '', order_date: today(), expected_date: '', notes: '' })
    setLineItems([{ item_id: items[0]?.id || '', quantity_ordered: 1, unit_cost: 0, notes: '' }])
    setCreating(true); setEditing(null); setError(null)
  }

  function openEdit(o: PurchaseOrder) {
    setForm({ po_number: o.po_number, supplier_id: o.supplier_id || '', order_date: o.order_date, expected_date: o.expected_date || '', notes: o.notes || '' })
    setLineItems((o.items || []).map((it) => ({ item_id: it.item_id, quantity_ordered: it.quantity_ordered, unit_cost: it.unit_cost, notes: it.notes || '' })))
    setEditing(o); setCreating(false); setError(null)
  }

  function close() { setCreating(false); setEditing(null); setError(null) }

  function addLine() { setLineItems([...lineItems, { item_id: items[0]?.id || '', quantity_ordered: 1, unit_cost: 0, notes: '' }]) }
  function removeLine(idx: number) { setLineItems(lineItems.filter((_, i) => i !== idx)) }
  function updateLine(idx: number, patch: Partial<{ item_id: string; quantity_ordered: number; unit_cost: number; notes: string }>) {
    setLineItems(lineItems.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.po_number.trim()) { setError('رقم الطلب مطلوب'); return }
    if (lineItems.length === 0) { setError('أضف بنداً واحداً على الأقل'); return }
    setBusy(true); setError(null)

    const payload = {
      po_number: form.po_number.trim(),
      supplier_id: form.supplier_id || null,
      order_date: form.order_date,
      expected_date: form.expected_date || null,
      notes: form.notes || null,
    }

    let orderId: string
    if (editing) {
      const { data, error: err } = await supabase.from('purchase_orders').update(payload).eq('id', editing.id).select('id')
      if (err) { setBusy(false); setError(err.message); return }
      orderId = editing.id
      await supabase.from('purchase_order_items').delete().eq('order_id', orderId)
    } else {
      const { data, error: err } = await supabase.from('purchase_orders').insert(payload).select('id')
      if (err) { setBusy(false); setError(err.message); return }
      orderId = data![0].id
    }

    const itemPayloads = lineItems.map((l) => ({
      order_id: orderId, item_id: l.item_id, quantity_ordered: Number(l.quantity_ordered), unit_cost: Number(l.unit_cost), notes: l.notes || null,
    }))
    const { error: itemErr } = await supabase.from('purchase_order_items').insert(itemPayloads)
    setBusy(false)
    if (itemErr) { setError(itemErr.message); return }
    close(); load(); reload()
  }

  async function updateStatus(o: PurchaseOrder, status: PurchaseOrderStatus) {
    await supabase.from('purchase_orders').update({ status }).eq('id', o.id)
    load()
  }

  async function remove(o: PurchaseOrder) {
    if (!confirm(`حذف طلب الشراء ${o.po_number}؟`)) return
    await supabase.from('purchase_orders').delete().eq('id', o.id)
    load(); reload()
  }

  const total = lineItems.reduce((s, l) => s + Number(l.quantity_ordered) * Number(l.unit_cost), 0)

  if (loading) {
    return <div className="flex flex-col items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600" /><p className="mt-3 text-secondary-500">جارٍ التحميل…</p></div>
  }

  return (
    <div>
      <Toolbar title="طلبات الشراء" count={orders.length} query={query} setQuery={setQuery} onAdd={canAdd ? openCreate : undefined} addLabel="طلب شراء جديد" />

      {filtered.length === 0 ? (
        <EmptyRow text={query ? 'لا نتائج' : 'لا توجد طلبات شراء بعد'} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-secondary-200 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary-50 text-xs text-secondary-500">
              <tr>
                <th className="px-4 py-3 font-medium">رقم الطلب</th>
                <th className="px-4 py-3 font-medium">المورد</th>
                <th className="px-4 py-3 font-medium">التاريخ</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">البنود</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filtered.map((o) => (
                <tr key={o.id} className="transition hover:bg-secondary-50/60">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-secondary-800">{o.po_number}</td>
                  <td className="px-4 py-3 text-secondary-600">{o.supplier?.name || '—'}</td>
                  <td className="px-4 py-3 text-secondary-600" dir="ltr">{o.order_date}</td>
                  <td className="px-4 py-3">
                    <select value={o.status} onChange={(e) => updateStatus(o, e.target.value as PurchaseOrderStatus)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border-0 outline-none ${STATUS_COLORS[o.status]}`}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-secondary-600">{o.items?.length || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setViewing(o)} title="عرض" className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><Eye size={15} /></button>
                      {canEdit && <button onClick={() => openEdit(o)} title="تعديل" className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><Pencil size={15} /></button>}
                      {canEdit && <button onClick={() => remove(o)} title="حذف" className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-danger-50 hover:text-danger-600"><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit modal */}
      {(creating || editing) && (
        <Modal title={editing ? 'تعديل طلب شراء' : 'طلب شراء جديد'} onClose={close}>
          <form onSubmit={save} className="space-y-4">
            {error && <ErrorBox text={error} />}
            <div className="grid grid-cols-2 gap-4">
              <Field label="رقم الطلب" value={form.po_number} onChange={(v) => setForm({ ...form, po_number: v })} />
              <Select label="المورد" value={form.supplier_id} onChange={(v) => setForm({ ...form, supplier_id: v })}
                options={[{ value: '', label: '— بدون —' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ الطلب" type="date" value={form.order_date} onChange={(v) => setForm({ ...form, order_date: v })} />
              <Field label="التاريخ المتوقع" type="date" value={form.expected_date} onChange={(v) => setForm({ ...form, expected_date: v })} />
            </div>

            {/* Line items */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-secondary-700">البنود</label>
                <button type="button" onClick={addLine} className="inline-flex items-center gap-1 rounded-lg bg-secondary-100 px-2.5 py-1 text-xs font-medium text-secondary-700 transition hover:bg-secondary-200"><Plus size={14} /> إضافة بند</button>
              </div>
              <div className="space-y-2">
                {lineItems.map((l, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-secondary-200 p-2">
                    <select value={l.item_id} onChange={(e) => updateLine(idx, { item_id: e.target.value })}
                      className="flex-1 rounded border border-secondary-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary-400">
                      {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                    </select>
                    <input type="number" value={l.quantity_ordered} onChange={(e) => updateLine(idx, { quantity_ordered: Number(e.target.value) })} placeholder="الكمية"
                      className="w-20 rounded border border-secondary-200 px-2 py-1.5 text-sm outline-none focus:border-primary-400" />
                    <input type="number" value={l.unit_cost} onChange={(e) => updateLine(idx, { unit_cost: Number(e.target.value) })} placeholder="السعر"
                      className="w-24 rounded border border-secondary-200 px-2 py-1.5 text-sm outline-none focus:border-primary-400" />
                    <button type="button" onClick={() => removeLine(idx)} className="rounded p-1 text-secondary-400 hover:text-danger-600"><X size={16} /></button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-left text-sm font-semibold text-secondary-700">الإجمالي: {total.toLocaleString('ar-SA')} ر.س</p>
            </div>

            <TextArea label="ملاحظات" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <FormActions busy={busy} onCancel={close} submitLabel={editing ? 'حفظ' : 'إنشاء'} />
          </form>
        </Modal>
      )}

      {/* View / print modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm" onClick={() => setViewing(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 print:max-w-none print:p-0" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-end print:hidden">
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"><Printer size={16} /> طباعة / PDF</button>
              <button onClick={() => setViewing(null)} className="mr-2 rounded-lg p-2 text-secondary-400 hover:bg-secondary-100"><X size={18} /></button>
            </div>
            <ReportDocument title="طلب شراء" subtitle={`رقم: ${viewing.po_number}`} date={viewing.order_date}>
              <div className="mb-4 flex justify-between text-sm">
                <div><span className="text-secondary-500">المورد: </span><span className="font-medium">{viewing.supplier?.name || '—'}</span></div>
                <div><span className="text-secondary-500">الحالة: </span><span className="font-medium">{STATUS_LABELS[viewing.status]}</span></div>
              </div>
              <table className="w-full text-right text-sm border border-secondary-200">
                <thead className="bg-secondary-50 text-xs text-secondary-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold border-l border-secondary-200">#</th>
                    <th className="px-3 py-2 font-semibold border-l border-secondary-200">الصنف</th>
                    <th className="px-3 py-2 font-semibold border-l border-secondary-200">الكمية</th>
                    <th className="px-3 py-2 font-semibold border-l border-secondary-200">سعر الوحدة</th>
                    <th className="px-3 py-2 font-semibold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {(viewing.items || []).map((it, idx) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 border-l border-secondary-200">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium border-l border-secondary-200">{it.item?.name || '—'}</td>
                      <td className="px-3 py-2 border-l border-secondary-200">{it.quantity_ordered}</td>
                      <td className="px-3 py-2 border-l border-secondary-200">{it.unit_cost.toLocaleString('ar-SA')}</td>
                      <td className="px-3 py-2 font-semibold">{(it.quantity_ordered * it.unit_cost).toLocaleString('ar-SA')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-left text-lg font-bold text-secondary-800">
                الإجمالي: {(viewing.items || []).reduce((s, it) => s + it.quantity_ordered * it.unit_cost, 0).toLocaleString('ar-SA')} ر.س
              </div>
              {viewing.notes && <p className="mt-4 text-sm text-secondary-600">ملاحظات: {viewing.notes}</p>}
            </ReportDocument>
          </div>
        </div>
      )}
    </div>
  )
}
