import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Item, StockIn, Supplier } from '../../types'
import { Toolbar, EmptyRow, Modal, Field, Select, TextArea, ErrorBox, FormActions } from './CategoriesView'

const today = () => new Date().toISOString().slice(0, 10)
const empty = { item_id: '', supplier_id: '', invoice_number: '', quantity: 1, unit_cost: 0, received_date: today(), notes: '' }

export function StockInView({ stockIn, items, suppliers, reload, canAdd = true, canEdit = true }: { stockIn: StockIn[]; items: Item[]; suppliers: Supplier[]; reload: () => void; canAdd?: boolean; canEdit?: boolean }) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<StockIn | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = stockIn.filter((s) => (s.item?.name || '').includes(query) || (s.item?.sku || '').includes(query))

  function openCreate() { setForm({ ...empty, item_id: items[0]?.id || '' }); setCreating(true); setEditing(null); setError(null) }
  function openEdit(s: StockIn) {
    setForm({ item_id: s.item_id, supplier_id: s.supplier_id || '', invoice_number: s.invoice_number || '', quantity: s.quantity, unit_cost: s.unit_cost, received_date: s.received_date, notes: s.notes || '' })
    setEditing(s); setCreating(false); setError(null)
  }
  function close() { setCreating(false); setEditing(null); setError(null) }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.item_id) { setError('اختر الصنف'); return }
    setBusy(true); setError(null)
    const payload = {
      item_id: form.item_id, supplier_id: form.supplier_id || null,
      invoice_number: form.invoice_number || null, quantity: Number(form.quantity),
      unit_cost: Number(form.unit_cost), received_date: form.received_date, notes: form.notes || null,
    }
    let err
    if (editing) { const r = await supabase.from('stock_in').update(payload).eq('id', editing.id); err = r.error }
    else { const r = await supabase.from('stock_in').insert(payload); err = r.error }
    setBusy(false)
    if (err) { setError(err.message); return }
    close(); reload()
  }

  async function remove(s: StockIn) {
    if (!confirm('حذف سجل الوارد؟')) return
    await supabase.from('stock_in').delete().eq('id', s.id)
    reload()
  }

  return (
    <div>
      <Toolbar title="المخزون الوارد" count={stockIn.length} query={query} setQuery={setQuery} onAdd={canAdd ? openCreate : undefined} addLabel="إضافة وارد" />
      {filtered.length === 0 ? (
        <EmptyRow text={query ? 'لا نتائج مطابقة' : 'لا توجد سجلات وارد بعد'} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-secondary-200 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary-50 text-xs text-secondary-500">
              <tr>
                <th className="px-4 py-3 font-medium">التاريخ</th>
                <th className="px-4 py-3 font-medium">الصنف</th>
                <th className="px-4 py-3 font-medium">المورد</th>
                <th className="px-4 py-3 font-medium">رقم الفاتورة</th>
                <th className="px-4 py-3 font-medium">الكمية</th>
                <th className="px-4 py-3 font-medium">سعر الوحدة</th>
                <th className="px-4 py-3 font-medium">الإجمالي</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filtered.map((s) => (
                <tr key={s.id} className="transition hover:bg-secondary-50/60">
                  <td className="px-4 py-3 text-secondary-600" dir="ltr">{s.received_date}</td>
                  <td className="px-4 py-3 font-medium text-secondary-800">{s.item?.name || '—'} <span className="text-xs text-secondary-400">({s.item?.sku})</span></td>
                  <td className="px-4 py-3 text-secondary-600">{s.supplier?.name || '—'}</td>
                  <td className="px-4 py-3 text-secondary-600">{s.invoice_number || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-success-700">{s.quantity}</td>
                  <td className="px-4 py-3 text-secondary-600">{s.unit_cost.toLocaleString('ar-SA')}</td>
                  <td className="px-4 py-3 font-medium text-secondary-700">{(s.unit_cost * s.quantity).toLocaleString('ar-SA')}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canEdit && <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><Pencil size={15} /></button>}
                      {canEdit && <button onClick={() => remove(s)} className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-danger-50 hover:text-danger-600"><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <Modal title={editing ? 'تعديل سجل وارد' : 'إضافة سجل وارد'} onClose={close}>
          <form onSubmit={save} className="space-y-4">
            {error && <ErrorBox text={error} />}
            <Select label="الصنف" value={form.item_id} onChange={(v) => setForm({ ...form, item_id: v })}
              options={items.map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` }))} />
            <Select label="المورد" value={form.supplier_id} onChange={(v) => setForm({ ...form, supplier_id: v })}
              options={[{ value: '', label: '— بدون —' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="رقم الفاتورة" value={form.invoice_number} onChange={(v) => setForm({ ...form, invoice_number: v })} />
              <Field label="التاريخ" type="date" value={form.received_date} onChange={(v) => setForm({ ...form, received_date: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="الكمية" type="number" value={String(form.quantity)} onChange={(v) => setForm({ ...form, quantity: Number(v) })} />
              <Field label="سعر الوحدة" type="number" value={String(form.unit_cost)} onChange={(v) => setForm({ ...form, unit_cost: Number(v) })} />
            </div>
            <TextArea label="ملاحظات" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <FormActions busy={busy} onCancel={close} submitLabel={editing ? 'حفظ' : 'إضافة'} />
          </form>
        </Modal>
      )}
    </div>
  )
}
