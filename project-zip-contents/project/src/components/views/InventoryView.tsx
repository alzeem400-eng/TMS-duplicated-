import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Printer, Eye, X, Loader2, ClipboardCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { InventoryCount, Item } from '../../types'
import { Toolbar, EmptyRow, Modal, ErrorBox, FormActions, Field, TextArea } from './CategoriesView'
import { ReportDocument } from '../ReportHeader'

const today = () => new Date().toISOString().slice(0, 10)

export function InventoryView({ items, reload, canAdd = true, canEdit = true }: { items: Item[]; reload: () => void; canAdd?: boolean; canEdit?: boolean }) {
  const [counts, setCounts] = useState<InventoryCount[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<InventoryCount | null>(null)
  const [form, setForm] = useState({ title: '', count_date: today(), notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actualQtys, setActualQtys] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('inventory_counts').select('*, items:inventory_count_items(*, item:items(name, sku, unit))').order('created_at', { ascending: false })
    setCounts((data || []) as InventoryCount[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = counts.filter((c) => c.title.includes(query))

  async function createCount() {
    if (!form.title.trim()) { setError('العنوان مطلوب'); return }
    setBusy(true); setError(null)
    const { data, error: err } = await supabase.from('inventory_counts').insert({
      title: form.title.trim(), count_date: form.count_date, notes: form.notes || null,
    }).select('id')
    if (err) { setBusy(false); setError(err.message); return }

    const countId = data![0].id
    // pre-fill all items with system quantities
    const itemRows = items.map((i) => ({ count_id: countId, item_id: i.id, system_qty: i.current_balance, actual_qty: i.current_balance }))
    if (itemRows.length > 0) {
      await supabase.from('inventory_count_items').insert(itemRows)
    }
    setBusy(false); setCreating(false); setForm({ title: '', count_date: today(), notes: '' }); load()
  }

  async function closeCount(c: InventoryCount) {
    if (!confirm(`إغلاق جلسة الجرد «${c.title}»؟ لن يمكن تعديل الكميات بعدها.`)) return
    await supabase.from('inventory_counts').update({ status: 'closed' }).eq('id', c.id)
    load()
  }

  async function removeCount(c: InventoryCount) {
    if (!confirm(`حذف جلسة الجرد «${c.title}»؟`)) return
    await supabase.from('inventory_counts').delete().eq('id', c.id)
    load(); reload()
  }

  async function openView(c: InventoryCount) {
    setViewing(c)
    const map: Record<string, number> = {}
    ;(c.items || []).forEach((it) => { map[it.item_id] = it.actual_qty })
    setActualQtys(map)
  }

  async function saveActualQty(itemId: string, qty: number) {
    if (!viewing || viewing.status === 'closed') return
    setActualQtys({ ...actualQtys, [itemId]: qty })
    const countItem = viewing.items?.find((it) => it.item_id === itemId)
    if (countItem) {
      await supabase.from('inventory_count_items').update({ actual_qty: qty }).eq('id', countItem.id)
    }
  }

  async function applyAdjustments(c: InventoryCount) {
    if (!confirm('تحديث أرصدة الأصناف بناءً على الجرد الفعلي؟')) return
    setBusy(true)
    for (const it of (c.items || [])) {
      if (it.actual_qty !== it.system_qty) {
        await supabase.from('items').update({ current_balance: it.actual_qty }).eq('id', it.item_id)
      }
    }
    setBusy(false)
    await load(); reload()
    setViewing(null)
  }

  if (loading) {
    return <div className="flex flex-col items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600" /><p className="mt-3 text-secondary-500">جارٍ التحميل…</p></div>
  }

  return (
    <div>
      <Toolbar title="الجرد" count={counts.length} query={query} setQuery={setQuery} onAdd={canAdd ? () => { setCreating(true); setError(null) } : undefined} addLabel="جرد جديد" />

      {filtered.length === 0 ? (
        <EmptyRow text={query ? 'لا نتائج' : 'لا توجد جلسات جرد بعد'} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-xl border border-secondary-200 bg-white p-4 transition hover:shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-primary-50 p-2.5 text-primary-600"><ClipboardCheck size={20} /></span>
                  <div>
                    <p className="font-semibold text-secondary-800">{c.title}</p>
                    <p className="text-xs text-secondary-500" dir="ltr">{c.count_date}</p>
                    <p className="mt-1 text-xs">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${c.status === 'open' ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-600'}`}>
                        {c.status === 'open' ? 'مفتوح' : 'مغلق'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button onClick={() => openView(c)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50">عرض / تعديل</button>
                {canEdit && c.status === 'open' && <button onClick={() => closeCount(c)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-warning-600 transition hover:bg-warning-50">إغلاق</button>}
                {canEdit && <button onClick={() => removeCount(c)} className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-danger-50 hover:text-danger-600"><Trash2 size={15} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <Modal title="جرد جديد" onClose={() => setCreating(false)}>
          <div className="space-y-4">
            {error && <ErrorBox text={error} />}
            <Field label="عنوان الجرد" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="مثال: جرد نهاية الفصل الأول" />
            <Field label="تاريخ الجرد" type="date" value={form.count_date} onChange={(v) => setForm({ ...form, count_date: v })} />
            <TextArea label="ملاحظات" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <p className="text-xs text-secondary-500">سيتم إنشاء بنود لجميع الأصناف الحالية مع أرصدتها المسجلة، ويمكنك تعديل الكميات الفعلية بعد الإنشاء.</p>
            <FormActions busy={busy} onCancel={() => setCreating(false)} submitLabel="إنشاء" onSubmit={createCount} />
          </div>
        </Modal>
      )}

      {/* View / edit modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm" onClick={() => setViewing(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 print:max-w-none print:p-0" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-end print:hidden">
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"><Printer size={16} /> طباعة / PDF</button>
              {viewing.status === 'open' && (
                <button onClick={() => applyAdjustments(viewing)} disabled={busy} className="mr-2 inline-flex items-center gap-1.5 rounded-lg bg-success-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-success-700 disabled:opacity-60">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : null} تطبيق التعديلات
                </button>
              )}
              <button onClick={() => setViewing(null)} className="mr-2 rounded-lg p-2 text-secondary-400 hover:bg-secondary-100"><X size={18} /></button>
            </div>

            <ReportDocument title={`جرد: ${viewing.title}`} date={viewing.count_date}>
              <table className="w-full text-right text-sm border border-secondary-200">
                <thead className="bg-secondary-50 text-xs text-secondary-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold border-l border-secondary-200">الصنف</th>
                    <th className="px-3 py-2 font-semibold border-l border-secondary-200">الرصيد المسجل</th>
                    <th className="px-3 py-2 font-semibold border-l border-secondary-200">الرصيد الفعلي</th>
                    <th className="px-3 py-2 font-semibold">الفرق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {(viewing.items || []).map((it) => {
                    const actual = actualQtys[it.item_id] ?? it.actual_qty
                    const diff = actual - it.system_qty
                    return (
                      <tr key={it.id}>
                        <td className="px-3 py-2 font-medium border-l border-secondary-200">{it.item?.name || '—'}</td>
                        <td className="px-3 py-2 border-l border-secondary-200">{it.system_qty}</td>
                        <td className="px-3 py-2 border-l border-secondary-200">
                          {viewing.status === 'open' ? (
                            <input type="number" value={actual} onChange={(e) => saveActualQty(it.item_id, Number(e.target.value))}
                              className="w-20 rounded border border-secondary-200 px-2 py-1 text-sm outline-none focus:border-primary-400" />
                          ) : actual}
                        </td>
                        <td className={`px-3 py-2 font-semibold ${diff === 0 ? 'text-secondary-600' : diff > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                          {diff > 0 ? '+' : ''}{diff}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {viewing.notes && <p className="mt-4 text-sm text-secondary-600">ملاحظات: {viewing.notes}</p>}
            </ReportDocument>
          </div>
        </div>
      )}
    </div>
  )
}
