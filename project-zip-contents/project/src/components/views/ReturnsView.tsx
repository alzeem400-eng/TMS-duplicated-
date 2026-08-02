import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Item, ReturnsScrap } from '../../types'
import { Toolbar, EmptyRow, Modal, Field, Select, TextArea, ErrorBox, FormActions } from './CategoriesView'

const today = () => new Date().toISOString().slice(0, 10)
const empty = { item_id: '', type: 'return', quantity: 1, reason: '', source_name: '', transaction_date: today(), notes: '' }

export function ReturnsView({ returns, items, reload, canAdd = true, canEdit = true }: { returns: ReturnsScrap[]; items: Item[]; reload: () => void; canAdd?: boolean; canEdit?: boolean }) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<ReturnsScrap | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = returns.filter((r) => (r.item?.name || '').includes(query) || (r.reason || '').includes(query))

  function openCreate() { setForm({ ...empty, item_id: items[0]?.id || '' }); setCreating(true); setEditing(null); setError(null) }
  function openEdit(r: ReturnsScrap) {
    setForm({ item_id: r.item_id, type: r.type, quantity: r.quantity, reason: r.reason || '', source_name: r.source_name || '', transaction_date: r.transaction_date, notes: r.notes || '' })
    setEditing(r); setCreating(false); setError(null)
  }
  function close() { setCreating(false); setEditing(null); setError(null) }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.item_id) { setError('اختر الصنف'); return }
    setBusy(true); setError(null)
    const payload = {
      item_id: form.item_id, quantity: Number(form.quantity), type: form.type,
      reason: form.reason || null, source_name: form.source_name || null,
      transaction_date: form.transaction_date, notes: form.notes || null,
    }
    let err
    if (editing) { const r = await supabase.from('returns_scrap').update(payload).eq('id', editing.id); err = r.error }
    else { const r = await supabase.from('returns_scrap').insert(payload); err = r.error }
    setBusy(false)
    if (err) { setError(err.message); return }
    close(); reload()
  }

  async function remove(r: ReturnsScrap) {
    if (!confirm('حذف السجل؟')) return
    await supabase.from('returns_scrap').delete().eq('id', r.id)
    reload()
  }

  return (
    <div>
      <Toolbar title="المرتجعات والتالف" count={returns.length} query={query} setQuery={setQuery} onAdd={canAdd ? openCreate : undefined} addLabel="إضافة سجل" />
      {filtered.length === 0 ? (
        <EmptyRow text={query ? 'لا نتائج مطابقة' : 'لا توجد سجلات بعد'} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-secondary-200 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary-50 text-xs text-secondary-500">
              <tr>
                <th className="px-4 py-3 font-medium">التاريخ</th>
                <th className="px-4 py-3 font-medium">الصنف</th>
                <th className="px-4 py-3 font-medium">النوع</th>
                <th className="px-4 py-3 font-medium">الكمية</th>
                <th className="px-4 py-3 font-medium">السبب</th>
                <th className="px-4 py-3 font-medium">المصدر</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filtered.map((r) => (
                <tr key={r.id} className="transition hover:bg-secondary-50/60">
                  <td className="px-4 py-3 text-secondary-600" dir="ltr">{r.transaction_date}</td>
                  <td className="px-4 py-3 font-medium text-secondary-800">{r.item?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.type === 'return' ? 'bg-warning-100 text-warning-700' : 'bg-danger-100 text-danger-700'}`}>
                      {r.type === 'return' ? 'مرتجع' : 'تالف'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-secondary-700">{r.quantity}</td>
                  <td className="px-4 py-3 text-secondary-600">{r.reason || '—'}</td>
                  <td className="px-4 py-3 text-secondary-600">{r.source_name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canEdit && <button onClick={() => openEdit(r)} className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><Pencil size={15} /></button>}
                      {canEdit && <button onClick={() => remove(r)} className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-danger-50 hover:text-danger-600"><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <Modal title={editing ? 'تعديل سجل' : 'إضافة سجل'} onClose={close}>
          <form onSubmit={save} className="space-y-4">
            {error && <ErrorBox text={error} />}
            <Select label="الصنف" value={form.item_id} onChange={(v) => setForm({ ...form, item_id: v })}
              options={items.map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` }))} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="النوع" value={form.type} onChange={(v) => setForm({ ...form, type: v as 'return' | 'scrap' })}
                options={[{ value: 'return', label: 'مرتجع' }, { value: 'scrap', label: 'تالف' }]} />
              <Field label="الكمية" type="number" value={String(form.quantity)} onChange={(v) => setForm({ ...form, quantity: Number(v) })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="السبب" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} />
              <Field label="المصدر" value={form.source_name} onChange={(v) => setForm({ ...form, source_name: v })} />
            </div>
            <Field label="التاريخ" type="date" value={form.transaction_date} onChange={(v) => setForm({ ...form, transaction_date: v })} />
            <TextArea label="ملاحظات" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <FormActions busy={busy} onCancel={close} submitLabel={editing ? 'حفظ' : 'إضافة'} />
          </form>
        </Modal>
      )}
    </div>
  )
}
