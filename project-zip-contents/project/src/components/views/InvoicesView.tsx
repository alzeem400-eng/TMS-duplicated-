import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Printer, Eye, X, Loader2, FileText, ShoppingCart, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Invoice, InvoiceItem, InvoiceStatus, InvoiceType, Item, Supplier } from '../../types'
import { Modal, ErrorBox, FormActions, Field, TextArea, Select } from './CategoriesView'
import { ReportDocument } from '../ReportHeader'

const STATUS_LABELS: Record<InvoiceStatus, string> = { draft: 'مسودة', paid: 'مدفوعة', cancelled: 'ملغاة' }
const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-secondary-100 text-secondary-600',
  paid: 'bg-success-100 text-success-700',
  cancelled: 'bg-danger-100 text-danger-700',
}
const TYPE_LABELS: Record<InvoiceType, string> = { purchase: 'فاتورة شراء', sale: 'فاتورة بيع' }
const TYPE_COLORS: Record<InvoiceType, string> = {
  purchase: 'bg-accent-100 text-accent-700',
  sale: 'bg-primary-100 text-primary-700',
}

const today = () => new Date().toISOString().slice(0, 10)
const fmtMoney = (n: number) => n.toLocaleString('ar-SA', { maximumFractionDigits: 2 })

export function InvoicesView({ items, suppliers, canAdd = true, canEdit = true }: { items: Item[]; suppliers: Supplier[]; canAdd?: boolean; canEdit?: boolean }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | InvoiceType>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Invoice | null>(null)
  const [form, setForm] = useState({
    invoice_number: '', invoice_type: 'purchase' as InvoiceType,
    party_name: '', invoice_date: today(), due_date: '',
    tax_rate: 0, discount: 0, paid_amount: 0, notes: '',
  })
  const [lineItems, setLineItems] = useState<{ item_id: string; description: string; quantity: number; unit_price: number }[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('invoices').select('*, items:invoice_items(*)').order('created_at', { ascending: false })
    setInvoices((data || []) as Invoice[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = invoices
    .filter((inv) => filter === 'all' || inv.invoice_type === filter)
    .filter((inv) => inv.invoice_number.includes(query) || inv.party_name.includes(query))

  function openCreate(type: InvoiceType) {
    const next = `${type === 'purchase' ? 'PUR' : 'SAL'}-${Date.now().toString().slice(-6)}`
    setForm({ invoice_number: next, invoice_type: type, party_name: '', invoice_date: today(), due_date: '', tax_rate: 0, discount: 0, paid_amount: 0, notes: '' })
    setLineItems([{ item_id: '', description: '', quantity: 1, unit_price: 0 }])
    setCreating(true); setEditing(null); setError(null)
  }

  function openEdit(inv: Invoice) {
    setForm({
      invoice_number: inv.invoice_number, invoice_type: inv.invoice_type,
      party_name: inv.party_name, invoice_date: inv.invoice_date, due_date: inv.due_date || '',
      tax_rate: inv.tax_rate, discount: inv.discount, paid_amount: inv.paid_amount, notes: inv.notes || '',
    })
    setLineItems((inv.items || []).map((it) => ({ item_id: it.item_id || '', description: it.description, quantity: it.quantity, unit_price: it.unit_price })))
    setEditing(inv); setCreating(false); setError(null)
  }

  function close() { setCreating(false); setEditing(null); setError(null) }

  function addLine() { setLineItems([...lineItems, { item_id: '', description: '', quantity: 1, unit_price: 0 }]) }
  function removeLine(idx: number) { setLineItems(lineItems.filter((_, i) => i !== idx)) }
  function updateLine(idx: number, patch: Partial<{ item_id: string; description: string; quantity: number; unit_price: number }>) {
    setLineItems(lineItems.map((l, i) => {
      if (i !== idx) return l
      const updated = { ...l, ...patch }
      if (patch.item_id !== undefined) {
        const item = items.find((it) => it.id === patch.item_id)
        if (item) { updated.description = item.name; updated.unit_price = form.invoice_type === 'purchase' ? item.cost_price : item.sale_price }
      }
      return updated
    }))
  }

  const subtotal = lineItems.reduce((s, l) => s + Number(l.quantity) * Number(l.unit_price), 0)
  const taxAmount = subtotal * (Number(form.tax_rate) / 100)
  const total = subtotal + taxAmount - Number(form.discount)

  async function save() {
    if (!form.invoice_number.trim() || !form.party_name.trim()) { setError('رقم الفاتورة واسم الطرف مطلوبان'); return }
    if (lineItems.length === 0 || lineItems.some((l) => !l.description.trim())) { setError('أضف بنداً واحداً على الأقل بوصف'); return }
    setBusy(true); setError(null)

    const payload = {
      invoice_number: form.invoice_number.trim(),
      invoice_type: form.invoice_type,
      party_name: form.party_name.trim(),
      invoice_date: form.invoice_date,
      due_date: form.due_date || null,
      status: 'draft' as InvoiceStatus,
      subtotal, tax_rate: Number(form.tax_rate), tax_amount: taxAmount,
      discount: Number(form.discount), total, paid_amount: Number(form.paid_amount),
      notes: form.notes || null,
    }

    let invoiceId: string
    if (editing) {
      const { data, error: err } = await supabase.from('invoices').update({ ...payload, status: editing.status }).eq('id', editing.id).select('id')
      if (err) { setBusy(false); setError(err.message); return }
      invoiceId = editing.id
      await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
    } else {
      const { data, error: err } = await supabase.from('invoices').insert(payload).select('id')
      if (err) { setBusy(false); setError(err.message); return }
      invoiceId = data![0].id
    }

    const itemPayloads = lineItems.map((l) => ({
      invoice_id: invoiceId,
      item_id: l.item_id || null,
      description: l.description,
      quantity: Number(l.quantity),
      unit_price: Number(l.unit_price),
      line_total: Number(l.quantity) * Number(l.unit_price),
    }))
    const { error: itemErr } = await supabase.from('invoice_items').insert(itemPayloads)
    setBusy(false)
    if (itemErr) { setError(itemErr.message); return }
    close(); load()
  }

  async function updateStatus(inv: Invoice, status: InvoiceStatus) {
    await supabase.from('invoices').update({ status }).eq('id', inv.id)
    load()
  }

  async function remove(inv: Invoice) {
    if (!confirm(`حذف ${TYPE_LABELS[inv.invoice_type]} رقم ${inv.invoice_number}؟`)) return
    await supabase.from('invoices').delete().eq('id', inv.id)
    load()
  }

  if (loading) {
    return <div className="flex flex-col items-center justify-center py-24"><Loader2 size={32} className="animate-spin text-primary-600" /><p className="mt-3 text-secondary-500">جارٍ التحميل…</p></div>
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-secondary-800">الفواتير <span className="text-sm font-normal text-secondary-400">({invoices.length})</span></h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-secondary-200 bg-white p-0.5">
            {(['all', 'purchase', 'sale'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${filter === f ? 'bg-primary-600 text-white' : 'text-secondary-600 hover:bg-secondary-100'}`}>
                {f === 'all' ? 'الكل' : f === 'purchase' ? 'شراء' : 'بيع'}
              </button>
            ))}
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث…"
            className="w-32 rounded-lg border border-secondary-200 bg-white py-2 px-3 text-sm outline-none transition focus:border-primary-400 sm:w-48" />
          {canAdd && <button onClick={() => openCreate('purchase')} className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-700">
            <ShoppingCart size={16} /> <span className="hidden sm:inline">فاتورة شراء</span>
          </button>}
          {canAdd && <button onClick={() => openCreate('sale')} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">
            <Receipt size={16} /> <span className="hidden sm:inline">فاتورة بيع</span>
          </button>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-secondary-200 bg-white py-16 text-center">
          <FileText size={32} className="mx-auto text-secondary-300" />
          <p className="mt-3 text-secondary-400">{query || filter !== 'all' ? 'لا توجد نتائج' : 'لا توجد فواتير بعد'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-secondary-200 bg-white">
          <table className="w-full text-right text-sm">
            <thead className="bg-secondary-50 text-xs text-secondary-500">
              <tr>
                <th className="px-4 py-3 font-medium">رقم الفاتورة</th>
                <th className="px-4 py-3 font-medium">النوع</th>
                <th className="px-4 py-3 font-medium">الطرف</th>
                <th className="px-4 py-3 font-medium">التاريخ</th>
                <th className="px-4 py-3 font-medium">الإجمالي</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filtered.map((inv) => (
                <tr key={inv.id} className="transition hover:bg-secondary-50/60">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-secondary-800">{inv.invoice_number}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLORS[inv.invoice_type]}`}>{TYPE_LABELS[inv.invoice_type]}</span></td>
                  <td className="px-4 py-3 text-secondary-600">{inv.party_name}</td>
                  <td className="px-4 py-3 text-secondary-600" dir="ltr">{inv.invoice_date}</td>
                  <td className="px-4 py-3 font-semibold text-secondary-800">{fmtMoney(inv.total)}</td>
                  <td className="px-4 py-3">
                    <select value={inv.status} onChange={(e) => updateStatus(inv, e.target.value as InvoiceStatus)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border-0 outline-none ${STATUS_COLORS[inv.status]}`}>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setViewing(inv)} title="عرض" className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><Eye size={15} /></button>
                      {canEdit && <button onClick={() => openEdit(inv)} title="تعديل" className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><Pencil size={15} /></button>}
                      {canEdit && <button onClick={() => remove(inv)} title="حذف" className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-danger-50 hover:text-danger-600"><Trash2 size={15} /></button>}
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
        <Modal title={editing ? 'تعديل فاتورة' : `إنشاء ${TYPE_LABELS[form.invoice_type]}`} onClose={close}>
          <div className="space-y-4">
            {error && <ErrorBox text={error} />}
            <div className="grid grid-cols-2 gap-4">
              <Field label="رقم الفاتورة" value={form.invoice_number} onChange={(v) => setForm({ ...form, invoice_number: v })} />
              <Field label="الطرف (المورد/العميل)" value={form.party_name} onChange={(v) => setForm({ ...form, party_name: v })} placeholder={form.invoice_type === 'purchase' ? 'اسم المورد' : 'اسم العميل/الجهة'} />
            </div>
            {form.invoice_type === 'purchase' && (
              <Select label="المورد (اختياري)" value={form.party_name} onChange={(v) => setForm({ ...form, party_name: v })}
                options={[{ value: '', label: '— اكتب الاسم يدوياً —' }, ...suppliers.map((s) => ({ value: s.name, label: s.name }))]} />
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="تاريخ الفاتورة" type="date" value={form.invoice_date} onChange={(v) => setForm({ ...form, invoice_date: v })} />
              <Field label="تاريخ الاستحقاق" type="date" value={form.due_date} onChange={(v) => setForm({ ...form, due_date: v })} />
            </div>

            {/* Line items */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-secondary-700">البنود</label>
                <button type="button" onClick={addLine} className="inline-flex items-center gap-1 rounded-lg bg-secondary-100 px-2.5 py-1 text-xs font-medium text-secondary-700 transition hover:bg-secondary-200"><Plus size={14} /> إضافة بند</button>
              </div>
              <div className="space-y-2">
                {lineItems.map((l, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 rounded-lg border border-secondary-200 p-2">
                    <select value={l.item_id} onChange={(e) => updateLine(idx, { item_id: e.target.value })}
                      className="flex-1 rounded border border-secondary-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-primary-400 min-w-[120px]">
                      <option value="">— صنف يدوي —</option>
                      {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <input value={l.description} onChange={(e) => updateLine(idx, { description: e.target.value })} placeholder="الوصف"
                      className="flex-1 rounded border border-secondary-200 px-2 py-1.5 text-sm outline-none focus:border-primary-400 min-w-[100px]" />
                    <input type="number" value={l.quantity} onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })} placeholder="الكمية"
                      className="w-20 rounded border border-secondary-200 px-2 py-1.5 text-sm outline-none focus:border-primary-400" />
                    <input type="number" value={l.unit_price} onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) })} placeholder="السعر"
                      className="w-24 rounded border border-secondary-200 px-2 py-1.5 text-sm outline-none focus:border-primary-400" />
                    <span className="w-24 text-left text-sm font-medium text-secondary-700">{fmtMoney(l.quantity * l.unit_price)}</span>
                    <button type="button" onClick={() => removeLine(idx)} className="rounded p-1 text-secondary-400 hover:text-danger-600"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-lg bg-secondary-50 p-4 text-sm">
              <div className="flex justify-between py-1"><span className="text-secondary-500">المجموع الفرعي</span><span className="font-medium">{fmtMoney(subtotal)}</span></div>
              <div className="flex items-center justify-between py-1">
                <span className="text-secondary-500">ضريبة (%)</span>
                <input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })}
                  className="w-20 rounded border border-secondary-200 px-2 py-1 text-sm outline-none focus:border-primary-400 text-left" />
              </div>
              <div className="flex justify-between py-1"><span className="text-secondary-500">قيمة الضريبة</span><span className="font-medium">{fmtMoney(taxAmount)}</span></div>
              <div className="flex items-center justify-between py-1">
                <span className="text-secondary-500">خصم</span>
                <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
                  className="w-24 rounded border border-secondary-200 px-2 py-1 text-sm outline-none focus:border-primary-400 text-left" />
              </div>
              <div className="mt-2 flex justify-between border-t border-secondary-200 pt-2 text-base font-bold text-secondary-800"><span>الإجمالي</span><span>{fmtMoney(total)}</span></div>
            </div>

            <Field label="المبلغ المدفوع" type="number" value={String(form.paid_amount)} onChange={(v) => setForm({ ...form, paid_amount: Number(v) })} />
            <TextArea label="ملاحظات" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            <FormActions busy={busy} onCancel={close} submitLabel={editing ? 'حفظ التعديلات' : 'إنشاء'} onSubmit={save} />
          </div>
        </Modal>
      )}

      {/* View / print modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm print:static print:bg-white print:p-0 print:backdrop-blur-none" onClick={() => setViewing(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 print:max-w-none print:overflow-visible print:rounded-none print:p-0" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-end print:hidden">
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"><Printer size={16} /> طباعة / PDF</button>
              <button onClick={() => setViewing(null)} className="mr-2 rounded-lg p-2 text-secondary-400 hover:bg-secondary-100"><X size={18} /></button>
            </div>

            <ReportDocument title={TYPE_LABELS[viewing.invoice_type]} subtitle={`رقم: ${viewing.invoice_number}`} date={viewing.invoice_date}>
              <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-secondary-500">{viewing.invoice_type === 'purchase' ? 'المورد' : 'العميل/الجهة'}</p>
                  <p className="font-medium text-secondary-800">{viewing.party_name}</p>
                </div>
                <div className="text-left">
                  <p className="text-secondary-500">الحالة</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[viewing.status]}`}>{STATUS_LABELS[viewing.status]}</span>
                </div>
              </div>

              <table className="w-full text-right text-sm border border-secondary-200">
                <thead className="bg-secondary-50 text-xs text-secondary-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold border-l border-secondary-200">#</th>
                    <th className="px-3 py-2 font-semibold border-l border-secondary-200">الوصف</th>
                    <th className="px-3 py-2 font-semibold border-l border-secondary-200">الكمية</th>
                    <th className="px-3 py-2 font-semibold border-l border-secondary-200">سعر الوحدة</th>
                    <th className="px-3 py-2 font-semibold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {(viewing.items || []).map((it: InvoiceItem, idx) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 border-l border-secondary-200">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium border-l border-secondary-200">{it.description}</td>
                      <td className="px-3 py-2 border-l border-secondary-200">{it.quantity}</td>
                      <td className="px-3 py-2 border-l border-secondary-200">{fmtMoney(it.unit_price)}</td>
                      <td className="px-3 py-2 font-semibold">{fmtMoney(it.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 ml-auto w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-secondary-500">المجموع الفرعي</span><span>{fmtMoney(viewing.subtotal)}</span></div>
                {viewing.tax_amount > 0 && <div className="flex justify-between"><span className="text-secondary-500">ضريبة ({viewing.tax_rate}%)</span><span>{fmtMoney(viewing.tax_amount)}</span></div>}
                {viewing.discount > 0 && <div className="flex justify-between"><span className="text-secondary-500">خصم</span><span>-{fmtMoney(viewing.discount)}</span></div>}
                <div className="flex justify-between border-t border-secondary-300 pt-2 text-base font-bold text-secondary-800"><span>الإجمالي</span><span>{fmtMoney(viewing.total)}</span></div>
                {viewing.paid_amount > 0 && <div className="flex justify-between"><span className="text-secondary-500">المدفوع</span><span>{fmtMoney(viewing.paid_amount)}</span></div>}
                {viewing.paid_amount < viewing.total && <div className="flex justify-between font-semibold text-danger-600"><span>المتبقي</span><span>{fmtMoney(viewing.total - viewing.paid_amount)}</span></div>}
              </div>

              {viewing.notes && <p className="mt-4 text-sm text-secondary-600">ملاحظات: {viewing.notes}</p>}

              <div className="mt-12 grid grid-cols-2 gap-8 text-center text-sm text-secondary-500 print:mt-20">
                <div><div className="border-t border-secondary-300 pt-2">المستلم</div></div>
                <div><div className="border-t border-secondary-300 pt-2">المحاسب</div></div>
              </div>
            </ReportDocument>
          </div>
        </div>
      )}
    </div>
  )
}
