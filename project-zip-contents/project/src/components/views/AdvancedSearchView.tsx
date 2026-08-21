import { useState, useMemo } from 'react'
import { Search, Package, TrendingUp, TrendingDown, RotateCcw, Truck, Users, FileText } from 'lucide-react'
import type { Category, Employee, Item, ReturnsScrap, StockIn, StockOut, Supplier } from '../../types'

interface Props {
  items: Item[]
  categories: Category[]
  suppliers: Supplier[]
  employees: Employee[]
  stockIn: StockIn[]
  stockOut: StockOut[]
  returns: ReturnsScrap[]
}

type SearchScope = 'all' | 'items' | 'stock-in' | 'stock-out' | 'returns' | 'suppliers' | 'employees'

const SCOPES: { key: SearchScope; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'الكل', icon: <Search size={16} /> },
  { key: 'items', label: 'الأصناف', icon: <Package size={16} /> },
  { key: 'stock-in', label: 'الوارد', icon: <TrendingUp size={16} /> },
  { key: 'stock-out', label: 'المنصرف', icon: <TrendingDown size={16} /> },
  { key: 'returns', label: 'المرتجعات', icon: <RotateCcw size={16} /> },
  { key: 'suppliers', label: 'الموردون', icon: <Truck size={16} /> },
  { key: 'employees', label: 'الموظفون', icon: <Users size={16} /> },
]

interface SearchResult {
  type: string
  title: string
  subtitle: string
  date?: string
  badge?: string
}

export function AdvancedSearchView({ items, categories, suppliers, employees, stockIn, stockOut, returns }: Props) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<SearchScope>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name_ar || ''

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim() && !fromDate && !toDate) return []
    const q = query.trim()
    const inRange = (date: string) => (!fromDate || date >= fromDate) && (!toDate || date <= toDate)

    const matchText = (text: string) => q === '' || text.includes(q)

    const r: SearchResult[] = []

    if (scope === 'all' || scope === 'items') {
      items.forEach((i) => {
        if (matchText(i.name) || matchText(i.sku) || matchText(catName(i.category_id))) {
          r.push({ type: 'صنف', title: i.name, subtitle: `${i.sku} — ${catName(i.category_id)} — الرصيد: ${i.current_balance} ${i.unit}`, badge: 'الأصناف' })
        }
      })
    }

    if (scope === 'all' || scope === 'stock-in') {
      stockIn.forEach((s) => {
        if (inRange(s.received_date) && (matchText(s.item?.name || '') || matchText(s.item?.sku || '') || matchText(s.supplier?.name || '') || matchText(s.invoice_number || ''))) {
          r.push({ type: 'وارد', title: s.item?.name || '—', subtitle: `الكمية: ${s.quantity} — المورد: ${s.supplier?.name || '—'} — الفاتورة: ${s.invoice_number || '—'}`, date: s.received_date, badge: 'وارد' })
        }
      })
    }

    if (scope === 'all' || scope === 'stock-out') {
      stockOut.forEach((s) => {
        if (inRange(s.issue_date) && (matchText(s.item?.name || '') || matchText(s.item?.sku || '') || matchText(s.recipient_name || '') || matchText(s.department || ''))) {
          r.push({ type: 'منصرف', title: s.item?.name || '—', subtitle: `الكمية: ${s.quantity} — المستلم: ${s.recipient_name || '—'} — ${s.department || s.grade || ''}`, date: s.issue_date, badge: 'منصرف' })
        }
      })
    }

    if (scope === 'all' || scope === 'returns') {
      returns.forEach((r2) => {
        if (inRange(r2.transaction_date) && (matchText(r2.item?.name || '') || matchText(r2.item?.sku || '') || matchText(r2.reason || ''))) {
          r.push({ type: r2.type === 'return' ? 'مرتجع' : 'تالف', title: r2.item?.name || '—', subtitle: `الكمية: ${r2.quantity} — السبب: ${r2.reason || '—'}`, date: r2.transaction_date, badge: r2.type === 'return' ? 'مرتجع' : 'تالف' })
        }
      })
    }

    if (scope === 'all' || scope === 'suppliers') {
      suppliers.forEach((s) => {
        if (matchText(s.name) || matchText(s.phone || '') || matchText(s.email || '')) {
          r.push({ type: 'مورد', title: s.name, subtitle: `${s.phone || ''} ${s.email || ''} ${s.address || ''}`, badge: 'موردون' })
        }
      })
    }

    if (scope === 'all' || scope === 'employees') {
      employees.forEach((e) => {
        if (matchText(e.name) || matchText(e.job_title || '') || matchText(e.department || '')) {
          r.push({ type: 'موظف', title: e.name, subtitle: `${e.job_title || ''} — ${e.department || ''} — ${e.phone || ''}`, badge: 'موظفون' })
        }
      })
    }

    return r
  }, [query, scope, fromDate, toDate, items, stockIn, stockOut, returns, suppliers, employees, categories])

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-secondary-800">البحث المتقدم</h2>

      {/* Search bar */}
      <div className="mb-4 rounded-xl border border-secondary-200 bg-white p-4">
        <div className="relative mb-3">
          <Search size={20} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث في كل البيانات…"
            className="w-full rounded-lg border border-secondary-200 bg-secondary-50/50 py-3 pr-10 pl-3 text-secondary-800 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100" />
        </div>

        {/* Scope chips */}
        <div className="mb-3 flex flex-wrap gap-2">
          {SCOPES.map((s) => (
            <button key={s.key} onClick={() => setScope(s.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${scope === s.key ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'}`}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Date filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-secondary-500">الفترة:</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-secondary-200 px-3 py-1.5 text-sm outline-none focus:border-primary-400" />
          <span className="text-secondary-400">إلى</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-secondary-200 px-3 py-1.5 text-sm outline-none focus:border-primary-400" />
          {(fromDate || toDate) && <button onClick={() => { setFromDate(''); setToDate('') }} className="text-xs text-secondary-500 hover:text-secondary-700">مسح الفترة</button>}
        </div>
      </div>

      {/* Results */}
      <p className="mb-3 text-sm text-secondary-500">{results.length} نتيجة</p>
      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-secondary-200 bg-white py-16 text-center">
          <Search size={32} className="mx-auto text-secondary-300" />
          <p className="mt-3 text-secondary-400">{query || fromDate || toDate ? 'لا توجد نتائج مطابقة' : 'اكتب كلمة بحث أو اختر فترة للبحث'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((r, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-lg border border-secondary-200 bg-white px-4 py-3 transition hover:shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600"><FileText size={16} /></span>
                <div>
                  <p className="font-medium text-secondary-800">{r.title}</p>
                  <p className="text-xs text-secondary-500">{r.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.date && <span className="text-xs text-secondary-400" dir="ltr">{r.date}</span>}
                {r.badge && <span className="rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs font-medium text-secondary-600">{r.badge}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
