import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Category, Item } from '../../types'
import { Toolbar, EmptyRow, Modal, Field, Select, TextArea, ErrorBox, FormActions } from './CategoriesView'

const empty = { sku: '', name: '', category_id: '', unit: 'حبة', current_balance: 0, reorder_level: 5, cost_price: 0, sale_price: 0, notes: '' }

export function ItemsView({ items, categories, reload, canAdd = true, canEdit = true }: { items: Item[]; categories: Category[]; reload: () => void; canAdd?: boolean; canEdit?: boolean }) {
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [editing, setEditing] = useState<Item | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = items.filter((i) => {
    const q = !query || i.name.includes(query) || i.sku.includes(query)
    const c = catFilter === 'all' || i.category_id === catFilter
    return q && c
  })

  function openCreate() { setForm(empty); setCreating(true); setEditing(null); setError(null) }
  function openEdit(i: Item) {
    setForm({ sku: i.sku, name: i.name, category_id: i.category_id || '', unit: i.unit, current_balance: i.current_balance, reorder_level: i.reorder_level, cost_price: i.cost_price, sale_price: i.sale_price, notes: i.notes || '' })
    setEditing(i); setCreating(false); setError(null)
  }
  function close() { setCreating(false); setEditing(null); setError(null) }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.sku.trim() || !form.name.trim()) { setError('الرمز والاسم مطلوبان'); return }
    setBusy(true); setError(null)
    const payload = {
      sku: form.sku.trim(), name: form.name.trim(),
      category_id: form.category_id || null, unit: form.unit,
      current_balance: Number(form.current_balance), reorder_level: Number(form.reorder_level),
      cost_price: Number(form.cost_price), sale_price: Number(form.sale_price),
      notes: form.notes || null,
    }
    let err
    if (editing) { const r = await supabase.from('items').update(payload).eq('id', editing.id); err = r.error }
    else { const r = await supabase.from('items').insert(payload); err = r.error }
    setBusy(false)
    if (err) { setError(err.message.includes('duplicate') ? 'هذا الرمز مستخدم بالفعل' : err.message); return }
    close(); reload()
  }

  async function remove(i: Item) {
    if (!confirm(`حذف الصنف «${i.name}»؟`)) return
    await supabase.from('items').delete().eq('id', i.id)
    reload()
  }

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name_ar || '—'

  return (
    <div>
      <Toolbar title="الأصناف" count={items.length} query={query} setQuery={setQuery} onAdd={canAdd ? openCreate : undefined} addLabel="إضافة صنف" />
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        <FilterChip active={catFilter === 'all'} onClick={() => setCatFilter('all')}>الكل</FilterChip>
        {categories.map((c) => (
          <FilterChip key={c.id} active={catFilter === c.id} onClick={() => setCatFilter(c.id)}>{c.name_ar}</FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyRow text={query || catFilter !== 'all' ? 'لا نتائج مطابقة' : 'لا توجد أصناف بعد'} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-secondary-200 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary-50 text-xs text-secondary-500">
              <tr>
                <th className="px-4 py-3 font-medium">الرمز</th>
                <th className="px-4 py-3 font-medium">الصنف</th>
                <th className="px-4 py-3 font-medium">التصنيف</th>
                <th className="px-4 py-3 font-medium">الرصيد</th>
                <th className="px-4 py-3 font-medium">الحد الأدنى</th>
                <th className="px-4 py-3 font-medium">سعر التكلفة</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filtered.map((i) => (
                <tr key={i.id} className="transition hover:bg-secondary-50/60">
                  <td className="px-4 py-3 font-mono text-xs text-secondary-600">{i.sku}</td>
                  <td className="px-4 py-3 font-medium text-secondary-800">{i.name}</td>
                  <td className="px-4 py-3 text-secondary-600">{catName(i.category_id)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${i.current_balance === 0 ? 'bg-danger-100 text-danger-700' : i.current_balance <= i.reorder_level ? 'bg-warning-100 text-warning-700' : 'bg-success-100 text-success-700'}`}>
                      {i.current_balance} {i.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-secondary-600">{i.reorder_level}</td>
                  <td className="px-4 py-3 text-secondary-600">{i.cost_price.toLocaleString('ar-SA')}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {canEdit && <button onClick={() => openEdit(i)} className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><Pencil size={15} /></button>}
                      {canEdit && <button onClick={() => remove(i)} className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-danger-50 hover:text-danger-600"><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <Modal title={editing ? 'تعديل صنف' : 'إضافة صنف'} onClose={close}>
          <form onSubmit={save} className="space-y-4">
            {error && <ErrorBox text={error} />}
            <div className="grid grid-cols-2 gap-4">
              <Field label="الرمز (SKU)" value={form.sku} onChange={(v) => setForm({ ...form, sku: v })} />
              <Field label="الاسم" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="التصنيف" value={form.category_id} onChange={(v) => setForm({ ...form, category_id: v })}
                options={[{ value: '', label: '— بدون —' }, ...categories.map((c) => ({ value: c.id, label: c.name_ar }))]} />
              <Field label="الوحدة" value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="الرصيد الحالي" type="number" value={String(form.current_balance)} onChange={(v) => setForm({ ...form, current_balance: Number(v) })} />
              <Field label="الحد الأدنى" type="number" value={String(form.reorder_level)} onChange={(v) => setForm({ ...form, reorder_level: Number(v) })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="سعر التكلفة" type="number" value={String(form.cost_price)} onChange={(v) => setForm({ ...form, cost_price: Number(v) })} />
              <Field label="سعر البيع" type="number" value={String(form.sale_price)} onChange={(v) => setForm({ ...form, sale_price: Number(v) })} />
            </div>
            <TextArea label="ملاحظات" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <FormActions busy={busy} onCancel={close} submitLabel={editing ? 'حفظ' : 'إضافة'} />
          </form>
        </Modal>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${active ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'}`}>
      {children}
    </button>
  )
}
