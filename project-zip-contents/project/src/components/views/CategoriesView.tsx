import { useState, type FormEvent } from 'react'
import { Plus, Search, Pencil, Trash2, X, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Category } from '../../types'

const ICONS = ['book', 'shirt', 'laptop', 'pen', 'armchair', 'spray-can', 'box', 'package']
const ICON_LABELS: Record<string, string> = {
  book: 'كتاب', shirt: 'زي', laptop: 'جهاز', pen: 'قرطاسية',
  armchair: 'أثاث', 'spray-can': 'نظافة', box: 'صندوق', package: 'صنف',
}

const empty = { name_ar: '', name: '', icon: 'book' }

export function CategoriesView({ categories, reload, canAdd = true, canEdit = true }: { categories: Category[]; reload: () => void; canAdd?: boolean; canEdit?: boolean }) {
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = categories.filter((c) => c.name_ar.includes(query) || c.name.includes(query))

  function openCreate() { setForm(empty); setCreating(true); setEditing(null); setError(null) }
  function openEdit(c: Category) { setForm({ name_ar: c.name_ar, name: c.name, icon: c.icon }); setEditing(c); setCreating(false); setError(null) }
  function close() { setCreating(false); setEditing(null); setError(null) }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!form.name_ar.trim()) { setError('الاسم بالعربية مطلوب'); return }
    setBusy(true); setError(null)
    const payload = { name_ar: form.name_ar.trim(), name: form.name.trim() || form.name_ar.trim(), icon: form.icon }
    let err
    if (editing) {
      const r = await supabase.from('categories').update(payload).eq('id', editing.id)
      err = r.error
    } else {
      const r = await supabase.from('categories').insert(payload)
      err = r.error
    }
    setBusy(false)
    if (err) { setError(err.message); return }
    close(); reload()
  }

  async function remove(c: Category) {
    if (!confirm(`حذف التصنيف «${c.name_ar}»؟`)) return
    await supabase.from('categories').delete().eq('id', c.id)
    reload()
  }

  return (
    <div>
      <Toolbar title="التصنيفات" count={categories.length} query={query} setQuery={setQuery} onAdd={canAdd ? openCreate : undefined} addLabel="إضافة تصنيف" />

      {filtered.length === 0 ? (
        <EmptyRow text={query ? 'لا نتائج مطابقة' : 'لا توجد تصنيفات بعد'} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-secondary-200 bg-white p-4 transition hover:shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600 text-lg font-bold">
                  {ICON_LABELS[c.icon] || c.icon}
                </span>
                <div>
                  <p className="font-semibold text-secondary-800">{c.name_ar}</p>
                  <p className="text-xs text-secondary-500">{c.name || '—'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                {canEdit && <button onClick={() => openEdit(c)} className="rounded-lg p-2 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><Pencil size={16} /></button>}
                {canEdit && <button onClick={() => remove(c)} className="rounded-lg p-2 text-secondary-400 transition hover:bg-danger-50 hover:text-danger-600"><Trash2 size={16} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <Modal title={editing ? 'تعديل تصنيف' : 'إضافة تصنيف'} onClose={close}>
          <form onSubmit={save} className="space-y-4">
            {error && <ErrorBox text={error} />}
            <Field label="الاسم بالعربية" value={form.name_ar} onChange={(v) => setForm({ ...form, name_ar: v })} />
            <Field label="الاسم بالإنجليزية (اختياري)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary-700">الأيقونة</label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((ic) => (
                  <button key={ic} type="button" onClick={() => setForm({ ...form, icon: ic })}
                    className={`rounded-lg px-3 py-1.5 text-sm transition ${form.icon === ic ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'}`}>
                    {ICON_LABELS[ic]}
                  </button>
                ))}
              </div>
            </div>
            <FormActions busy={busy} onCancel={close} submitLabel={editing ? 'حفظ' : 'إضافة'} />
          </form>
        </Modal>
      )}
    </div>
  )
}

/* ---- shared building blocks (re-exported for other views) ---- */

export function Toolbar({ title, count, query, setQuery, onAdd, addLabel }: {
  title: string; count: number; query: string; setQuery: (v: string) => void; onAdd?: () => void; addLabel: string
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-secondary-800">{title} <span className="text-sm font-normal text-secondary-400">({count})</span></h2>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث…"
            className="w-40 rounded-lg border border-secondary-200 bg-white py-2 pr-9 pl-3 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:w-52" />
        </div>
        {onAdd && (
          <button onClick={onAdd} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">
            <Plus size={16} /> <span className="hidden sm:inline">{addLabel}</span>
          </button>
        )}
      </div>
    </div>
  )
}

export function EmptyRow({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-secondary-200 bg-white py-12 text-center text-sm text-secondary-400">{text}</div>
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-secondary-100 px-5 py-3.5">
          <h3 className="font-bold text-secondary-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100"><X size={18} /></button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-secondary-700">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-secondary-200 bg-secondary-50/50 px-3 py-2.5 text-secondary-800 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100" />
    </div>
  )
}

export function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-secondary-700">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2}
        className="w-full rounded-lg border border-secondary-200 bg-secondary-50/50 px-3 py-2.5 text-secondary-800 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100" />
    </div>
  )
}

export function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-secondary-700">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-secondary-200 bg-secondary-50/50 px-3 py-2.5 text-secondary-800 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function ErrorBox({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
      <AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{text}</span>
    </div>
  )
}

export function FormActions({ busy, onCancel, submitLabel, onSubmit }: { busy: boolean; onCancel: () => void; submitLabel: string; onSubmit?: () => void }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <button type="button" onClick={onCancel} className="rounded-lg border border-secondary-200 px-4 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50">إلغاء</button>
      <button type="submit" disabled={busy} onClick={onSubmit}
        className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">
        {busy && <Loader2 size={16} className="animate-spin" />}{submitLabel}
      </button>
    </div>
  )
}
