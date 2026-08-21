import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Supplier } from '../../types'
import { Toolbar, EmptyRow, Modal, Field, TextArea, ErrorBox, FormActions } from './CategoriesView'

const empty = { name: '', phone: '', email: '', address: '', notes: '' }

export function SuppliersView({ suppliers, reload, canAdd = true, canEdit = true }: { suppliers: Supplier[]; reload: () => void; canAdd?: boolean; canEdit?: boolean }) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = suppliers.filter((s) => s.name.includes(query) || (s.phone || '').includes(query))

  function openCreate() { setForm(empty); setCreating(true); setEditing(null); setError(null) }
  function openEdit(s: Supplier) { setForm({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', notes: s.notes || '' }); setEditing(s); setCreating(false); setError(null) }
  function close() { setCreating(false); setEditing(null); setError(null) }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('الاسم مطلوب'); return }
    setBusy(true); setError(null)
    const payload = { name: form.name.trim(), phone: form.phone || null, email: form.email || null, address: form.address || null, notes: form.notes || null }
    let err
    if (editing) { const r = await supabase.from('suppliers').update(payload).eq('id', editing.id); err = r.error }
    else { const r = await supabase.from('suppliers').insert(payload); err = r.error }
    setBusy(false)
    if (err) { setError(err.message); return }
    close(); reload()
  }

  async function remove(s: Supplier) {
    if (!confirm(`حذف المورد «${s.name}»؟`)) return
    await supabase.from('suppliers').delete().eq('id', s.id)
    reload()
  }

  return (
    <div>
      <Toolbar title="الموردون" count={suppliers.length} query={query} setQuery={setQuery} onAdd={canAdd ? openCreate : undefined} addLabel="إضافة مورد" />
      {filtered.length === 0 ? (
        <EmptyRow text={query ? 'لا نتائج مطابقة' : 'لا يوجد موردون بعد'} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-xl border border-secondary-200 bg-white p-4 transition hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-secondary-800">{s.name}</p>
                  {s.phone && <p className="mt-1 text-xs text-secondary-500" dir="ltr">{s.phone}</p>}
                  {s.email && <p className="text-xs text-secondary-500" dir="ltr">{s.email}</p>}
                  {s.address && <p className="mt-1 text-xs text-secondary-400">{s.address}</p>}
                </div>
                <div className="flex gap-1">
                  {canEdit && <button onClick={() => openEdit(s)} className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><Pencil size={15} /></button>}
                  {canEdit && <button onClick={() => remove(s)} className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-danger-50 hover:text-danger-600"><Trash2 size={15} /></button>}
                </div>
              </div>
              {s.notes && <p className="mt-2 border-t border-secondary-100 pt-2 text-xs text-secondary-400">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <Modal title={editing ? 'تعديل مورد' : 'إضافة مورد'} onClose={close}>
          <form onSubmit={save} className="space-y-4">
            {error && <ErrorBox text={error} />}
            <Field label="الاسم" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="الهاتف" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="البريد الإلكتروني" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            </div>
            <Field label="العنوان" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            <TextArea label="ملاحظات" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <FormActions busy={busy} onCancel={close} submitLabel={editing ? 'حفظ' : 'إضافة'} />
          </form>
        </Modal>
      )}
    </div>
  )
}
