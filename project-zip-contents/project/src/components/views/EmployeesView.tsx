import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Employee } from '../../types'
import { Toolbar, EmptyRow, Modal, Field, TextArea, ErrorBox, FormActions } from './CategoriesView'

const empty = { name: '', job_title: '', department: '', phone: '', notes: '' }

export function EmployeesView({ employees, reload, canAdd = true, canEdit = true }: { employees: Employee[]; reload: () => void; canAdd?: boolean; canEdit?: boolean }) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Employee | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = employees.filter((e) => e.name.includes(query) || (e.department || '').includes(query))

  function openCreate() { setForm(empty); setCreating(true); setEditing(null); setError(null) }
  function openEdit(e: Employee) { setForm({ name: e.name, job_title: e.job_title || '', department: e.department || '', phone: e.phone || '', notes: e.notes || '' }); setEditing(e); setCreating(false); setError(null) }
  function close() { setCreating(false); setEditing(null); setError(null) }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('الاسم مطلوب'); return }
    setBusy(true); setError(null)
    const payload = { name: form.name.trim(), job_title: form.job_title || null, department: form.department || null, phone: form.phone || null, notes: form.notes || null }
    let err
    if (editing) { const r = await supabase.from('employees').update(payload).eq('id', editing.id); err = r.error }
    else { const r = await supabase.from('employees').insert(payload); err = r.error }
    setBusy(false)
    if (err) { setError(err.message); return }
    close(); reload()
  }

  async function remove(e: Employee) {
    if (!confirm(`حذف الموظف «${e.name}»؟`)) return
    await supabase.from('employees').delete().eq('id', e.id)
    reload()
  }

  return (
    <div>
      <Toolbar title="الموظفون" count={employees.length} query={query} setQuery={setQuery} onAdd={canAdd ? openCreate : undefined} addLabel="إضافة موظف" />
      {filtered.length === 0 ? (
        <EmptyRow text={query ? 'لا نتائج مطابقة' : 'لا يوجد موظفون بعد'} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-xl border border-secondary-200 bg-white p-4 transition hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-secondary-800">{e.name}</p>
                  {e.job_title && <p className="mt-0.5 text-xs text-secondary-500">{e.job_title}</p>}
                  {e.department && <p className="text-xs text-secondary-400">القسم: {e.department}</p>}
                  {e.phone && <p className="mt-1 text-xs text-secondary-500" dir="ltr">{e.phone}</p>}
                </div>
                <div className="flex gap-1">
                  {canEdit && <button onClick={() => openEdit(e)} className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><Pencil size={15} /></button>}
                  {canEdit && <button onClick={() => remove(e)} className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-danger-50 hover:text-danger-600"><Trash2 size={15} /></button>}
                </div>
              </div>
              {e.notes && <p className="mt-2 border-t border-secondary-100 pt-2 text-xs text-secondary-400">{e.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <Modal title={editing ? 'تعديل موظف' : 'إضافة موظف'} onClose={close}>
          <form onSubmit={save} className="space-y-4">
            {error && <ErrorBox text={error} />}
            <Field label="الاسم" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="المسمى الوظيفي" value={form.job_title} onChange={(v) => setForm({ ...form, job_title: v })} />
              <Field label="القسم" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
            </div>
            <Field label="الهاتف" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <TextArea label="ملاحظات" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <FormActions busy={busy} onCancel={close} submitLabel={editing ? 'حفظ' : 'إضافة'} />
          </form>
        </Modal>
      )}
    </div>
  )
}
