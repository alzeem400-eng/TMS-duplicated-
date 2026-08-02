import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Employee, Item, StockOut } from '../../types'
import { Toolbar, EmptyRow, Modal, Field, Select, TextArea, ErrorBox, FormActions } from './CategoriesView'

const today = () => new Date().toISOString().slice(0, 10)
const empty = { item_id: '', issue_type: 'department', recipient_name: '', employee_id: '', department: '', grade: '', serial_number: '', quantity: 1, issue_date: today(), notes: '' }

const TYPE_LABELS: Record<string, string> = { student: 'طالب', teacher: 'معلم', department: 'قسم' }

export function StockOutView({ stockOut, items, employees, reload, canAdd = true, canEdit = true }: { stockOut: StockOut[]; items: Item[]; employees: Employee[]; reload: () => void; canAdd?: boolean; canEdit?: boolean }) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<StockOut | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = stockOut.filter((s) => (s.item?.name || '').includes(query) || (s.recipient_name || '').includes(query))

  function openCreate() { setForm({ ...empty, item_id: items[0]?.id || '' }); setCreating(true); setEditing(null); setError(null) }
  function openEdit(s: StockOut) {
    setForm({ item_id: s.item_id, issue_type: s.issue_type, recipient_name: s.recipient_name || '', employee_id: s.employee_id || '', department: s.department || '', grade: s.grade || '', serial_number: s.serial_number || '', quantity: s.quantity, issue_date: s.issue_date, notes: s.notes || '' })
    setEditing(s); setCreating(false); setError(null)
  }
  function close() { setCreating(false); setEditing(null); setError(null) }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.item_id) { setError('اختر الصنف'); return }
    setBusy(true); setError(null)
    const payload = {
      item_id: form.item_id, quantity: Number(form.quantity), issue_type: form.issue_type,
      recipient_name: form.recipient_name || null, employee_id: form.employee_id || null,
      department: form.department || null, grade: form.grade || null,
      serial_number: form.serial_number || null, issue_date: form.issue_date, notes: form.notes || null,
    }
    let err
    if (editing) { const r = await supabase.from('stock_out').update(payload).eq('id', editing.id); err = r.error }
    else { const r = await supabase.from('stock_out').insert(payload); err = r.error }
    setBusy(false)
    if (err) { setError(err.message); return }
    close(); reload()
  }

  async function remove(s: StockOut) {
    if (!confirm('حذف سجل المنصرف؟')) return
    await supabase.from('stock_out').delete().eq('id', s.id)
    reload()
  }

  return (
    <div>
      <Toolbar title="المخزون المنصرف" count={stockOut.length} query={query} setQuery={setQuery} onAdd={canAdd ? openCreate : undefined} addLabel="إضافة صرف" />
      {filtered.length === 0 ? (
        <EmptyRow text={query ? 'لا نتائج مطابقة' : 'لا توجد سجلات منصرفة بعد'} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-secondary-200 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary-50 text-xs text-secondary-500">
              <tr>
                <th className="px-4 py-3 font-medium">التاريخ</th>
                <th className="px-4 py-3 font-medium">الصنف</th>
                <th className="px-4 py-3 font-medium">النوع</th>
                <th className="px-4 py-3 font-medium">المستلم</th>
                <th className="px-4 py-3 font-medium">القسم/الصف</th>
                <th className="px-4 py-3 font-medium">الكمية</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filtered.map((s) => (
                <tr key={s.id} className="transition hover:bg-secondary-50/60">
                  <td className="px-4 py-3 text-secondary-600" dir="ltr">{s.issue_date}</td>
                  <td className="px-4 py-3 font-medium text-secondary-800">{s.item?.name || '—'} <span className="text-xs text-secondary-400">({s.item?.sku})</span></td>
                  <td className="px-4 py-3"><span className="rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700">{TYPE_LABELS[s.issue_type] || s.issue_type}</span></td>
                  <td className="px-4 py-3 text-secondary-600">{s.recipient_name || s.employee?.name || '—'}</td>
                  <td className="px-4 py-3 text-secondary-600">{s.department || s.grade || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-danger-700">{s.quantity}</td>
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
        <Modal title={editing ? 'تعديل سجل صرف' : 'إضافة سجل صرف'} onClose={close}>
          <form onSubmit={save} className="space-y-4">
            {error && <ErrorBox text={error} />}
            <Select label="الصنف" value={form.item_id} onChange={(v) => setForm({ ...form, item_id: v })}
              options={items.map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` }))} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="نوع الصرف" value={form.issue_type} onChange={(v) => setForm({ ...form, issue_type: v as 'student' | 'teacher' | 'department' })}
                options={[{ value: 'student', label: 'طالب' }, { value: 'teacher', label: 'معلم' }, { value: 'department', label: 'قسم' }]} />
              <Field label="الكمية" type="number" value={String(form.quantity)} onChange={(v) => setForm({ ...form, quantity: Number(v) })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="المستلم" value={form.recipient_name} onChange={(v) => setForm({ ...form, recipient_name: v })} />
              <Select label="الموظف" value={form.employee_id} onChange={(v) => setForm({ ...form, employee_id: v })}
                options={[{ value: '', label: '— بدون —' }, ...employees.map((e) => ({ value: e.id, label: e.name }))]} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="القسم" value={form.department} onChange={(v) => setForm({ ...form, department: v })} />
              <Field label="الصف" value={form.grade} onChange={(v) => setForm({ ...form, grade: v })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="الرقم التسلسلي" value={form.serial_number} onChange={(v) => setForm({ ...form, serial_number: v })} />
              <Field label="التاريخ" type="date" value={form.issue_date} onChange={(v) => setForm({ ...form, issue_date: v })} />
            </div>
            <TextArea label="ملاحظات" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <FormActions busy={busy} onCancel={close} submitLabel={editing ? 'حفظ' : 'إضافة'} />
          </form>
        </Modal>
      )}
    </div>
  )
}
