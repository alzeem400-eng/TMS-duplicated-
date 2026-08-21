import { useState } from 'react'
import { Printer, FileText, BarChart3, Package, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react'
import type { Category, Employee, Item, ReturnsScrap, StockIn, StockOut, Supplier } from '../../types'
import { ReportDocument } from '../ReportHeader'

interface Props {
  items: Item[]
  categories: Category[]
  suppliers: Supplier[]
  employees: Employee[]
  stockIn: StockIn[]
  stockOut: StockOut[]
  returns: ReturnsScrap[]
}

type ReportType = 'stock-balance' | 'stock-movement' | 'stock-value' | 'low-stock' | 'suppliers' | 'employees'

const REPORTS: { key: ReportType; label: string; icon: React.ReactNode }[] = [
  { key: 'stock-balance', label: 'تقرير أرصدة المخزون', icon: <Package size={20} /> },
  { key: 'stock-movement', label: 'تقرير حركة المخزون', icon: <BarChart3 size={20} /> },
  { key: 'stock-value', label: 'تقرير قيمة المخزون', icon: <FileText size={20} /> },
  { key: 'low-stock', label: 'تقرير الأصناف المنخفضة', icon: <TrendingUp size={20} /> },
  { key: 'suppliers', label: 'تقرير الموردين', icon: <TrendingDown size={20} /> },
  { key: 'employees', label: 'تقرير الموظفين', icon: <RotateCcw size={20} /> },
]

export function ReportsView({ items, categories, suppliers, employees, stockIn, stockOut, returns }: Props) {
  const [active, setActive] = useState<ReportType | null>(null)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name_ar || '—'

  function inDateRange(date: string): boolean {
    if (fromDate && date < fromDate) return false
    if (toDate && date > toDate) return false
    return true
  }

  const filteredIn = stockIn.filter((s) => inDateRange(s.received_date))
  const filteredOut = stockOut.filter((s) => inDateRange(s.issue_date))
  const filteredRet = returns.filter((r) => inDateRange(r.transaction_date))

  function printReport() { window.print() }

  const dateActions = (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-secondary-200 px-3 py-1.5 text-sm" />
      <span className="text-secondary-400">إلى</span>
      <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-secondary-200 px-3 py-1.5 text-sm" />
      <button onClick={printReport} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700">
        <Printer size={16} /> طباعة / PDF
      </button>
    </div>
  )

  if (!active) {
    return (
      <div>
        <h2 className="mb-4 text-lg font-bold text-secondary-800">التقارير</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((r) => (
            <button key={r.key} onClick={() => setActive(r.key)}
              className="flex items-center gap-3 rounded-xl border border-secondary-200 bg-white p-4 text-right transition hover:border-primary-300 hover:shadow-md">
              <span className="rounded-lg bg-primary-50 p-2.5 text-primary-600">{r.icon}</span>
              <span className="font-semibold text-secondary-700">{r.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const report = REPORTS.find((r) => r.key === active)!
  const needsDateFilter = active === 'stock-movement'

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <button onClick={() => setActive(null)} className="text-sm font-medium text-primary-600 transition hover:text-primary-700">→ رجوع إلى التقارير</button>
      </div>

      <ReportDocument
        title={report.label}
        subtitle={needsDateFilter && (fromDate || toDate) ? `الفترة: ${fromDate || 'البداية'} — ${toDate || 'اليوم'}` : undefined}
        date={today}
        actions={needsDateFilter ? dateActions : (
          <button onClick={printReport} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700">
            <Printer size={16} /> طباعة / PDF
          </button>
        )}
      >
        {active === 'stock-balance' && <StockBalanceReport items={items} catName={catName} />}
        {active === 'stock-movement' && <StockMovementReport stockIn={filteredIn} stockOut={filteredOut} returns={filteredRet} />}
        {active === 'stock-value' && <StockValueReport items={items} catName={catName} />}
        {active === 'low-stock' && <LowStockReport items={items} catName={catName} />}
        {active === 'suppliers' && <SuppliersReport suppliers={suppliers} stockIn={filteredIn} />}
        {active === 'employees' && <EmployeesReport employees={employees} stockOut={filteredOut} />}
      </ReportDocument>
    </div>
  )
}

function ReportTable({ columns, children }: { columns: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right text-sm border border-secondary-200">
        <thead className="bg-secondary-50 text-xs text-secondary-600 border-b border-secondary-200">
          <tr>{columns.map((c) => <th key={c} className="px-3 py-2 font-semibold border-l border-secondary-200 last:border-l-0">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-secondary-100">{children}</tbody>
      </table>
    </div>
  )
}

function StockBalanceReport({ items, catName }: { items: Item[]; catName: (id: string | null) => string }) {
  return (
    <ReportTable columns={['الرمز', 'الصنف', 'التصنيف', 'الوحدة', 'الرصيد', 'الحد الأدنى', 'الحالة']}>
      {items.length === 0 ? <EmptyRow /> : items.map((i) => (
        <tr key={i.id} className="border-l border-secondary-200">
          <td className="px-3 py-2 font-mono text-xs border-l border-secondary-200">{i.sku}</td>
          <td className="px-3 py-2 font-medium border-l border-secondary-200">{i.name}</td>
          <td className="px-3 py-2 border-l border-secondary-200">{catName(i.category_id)}</td>
          <td className="px-3 py-2 border-l border-secondary-200">{i.unit}</td>
          <td className="px-3 py-2 font-semibold border-l border-secondary-200">{i.current_balance}</td>
          <td className="px-3 py-2 border-l border-secondary-200">{i.reorder_level}</td>
          <td className="px-3 py-2">
            {i.current_balance === 0 ? <span className="text-danger-600 font-semibold">نفد</span>
              : i.current_balance <= i.reorder_level ? <span className="text-warning-600 font-semibold">منخفض</span>
              : <span className="text-success-600 font-semibold">متوفر</span>}
          </td>
        </tr>
      ))}
    </ReportTable>
  )
}

function StockMovementReport({ stockIn, stockOut, returns }: { stockIn: StockIn[]; stockOut: StockOut[]; returns: ReturnsScrap[] }) {
  const all = [
    ...stockIn.map((s) => ({ date: s.received_date, type: 'وارد', item: s.item?.name || '—', qty: s.quantity, party: s.supplier?.name || '—' })),
    ...stockOut.map((s) => ({ date: s.issue_date, type: 'منصرف', item: s.item?.name || '—', qty: s.quantity, party: s.recipient_name || s.employee?.name || '—' })),
    ...returns.map((r) => ({ date: r.transaction_date, type: r.type === 'return' ? 'مرتجع' : 'تالف', item: r.item?.name || '—', qty: r.quantity, party: r.source_name || '—' })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <ReportTable columns={['التاريخ', 'النوع', 'الصنف', 'الكمية', 'الطرف']}>
      {all.length === 0 ? <EmptyRow /> : all.map((r, idx) => (
        <tr key={idx}>
          <td className="px-3 py-2 border-l border-secondary-200" dir="ltr">{r.date}</td>
          <td className="px-3 py-2 font-medium border-l border-secondary-200">{r.type}</td>
          <td className="px-3 py-2 border-l border-secondary-200">{r.item}</td>
          <td className="px-3 py-2 font-semibold border-l border-secondary-200">{r.qty}</td>
          <td className="px-3 py-2">{r.party}</td>
        </tr>
      ))}
    </ReportTable>
  )
}

function StockValueReport({ items, catName }: { items: Item[]; catName: (id: string | null) => string }) {
  const totalValue = items.reduce((s, i) => s + i.current_balance * i.cost_price, 0)
  const totalSale = items.reduce((s, i) => s + i.current_balance * i.sale_price, 0)
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-secondary-50 p-4 text-center">
          <p className="text-sm text-secondary-500">إجمالي قيمة التكلفة</p>
          <p className="text-xl font-bold text-secondary-800">{totalValue.toLocaleString('ar-SA')} ر.س</p>
        </div>
        <div className="rounded-lg bg-secondary-50 p-4 text-center">
          <p className="text-sm text-secondary-500">إجمالي قيمة البيع</p>
          <p className="text-xl font-bold text-secondary-800">{totalSale.toLocaleString('ar-SA')} ر.س</p>
        </div>
      </div>
      <ReportTable columns={['الصنف', 'التصنيف', 'الرصيد', 'سعر التكلفة', 'قيمة التكلفة', 'سعر البيع', 'قيمة البيع']}>
        {items.length === 0 ? <EmptyRow /> : items.map((i) => (
          <tr key={i.id}>
            <td className="px-3 py-2 font-medium border-l border-secondary-200">{i.name}</td>
            <td className="px-3 py-2 border-l border-secondary-200">{catName(i.category_id)}</td>
            <td className="px-3 py-2 border-l border-secondary-200">{i.current_balance}</td>
            <td className="px-3 py-2 border-l border-secondary-200">{i.cost_price.toLocaleString('ar-SA')}</td>
            <td className="px-3 py-2 font-semibold border-l border-secondary-200">{(i.current_balance * i.cost_price).toLocaleString('ar-SA')}</td>
            <td className="px-3 py-2 border-l border-secondary-200">{i.sale_price.toLocaleString('ar-SA')}</td>
            <td className="px-3 py-2 font-semibold">{(i.current_balance * i.sale_price).toLocaleString('ar-SA')}</td>
          </tr>
        ))}
      </ReportTable>
    </div>
  )
}

function LowStockReport({ items, catName }: { items: Item[]; catName: (id: string | null) => string }) {
  const low = items.filter((i) => i.current_balance <= i.reorder_level)
  return (
    <ReportTable columns={['الرمز', 'الصنف', 'التصنيف', 'الرصيد', 'الحد الأدنى', 'النقص']}>
      {low.length === 0 ? <EmptyRow text="لا توجد أصناف منخفضة" /> : low.map((i) => (
        <tr key={i.id}>
          <td className="px-3 py-2 font-mono text-xs border-l border-secondary-200">{i.sku}</td>
          <td className="px-3 py-2 font-medium border-l border-secondary-200">{i.name}</td>
          <td className="px-3 py-2 border-l border-secondary-200">{catName(i.category_id)}</td>
          <td className="px-3 py-2 font-semibold text-warning-600 border-l border-secondary-200">{i.current_balance}</td>
          <td className="px-3 py-2 border-l border-secondary-200">{i.reorder_level}</td>
          <td className="px-3 py-2 font-semibold text-danger-600">{i.reorder_level - i.current_balance}</td>
        </tr>
      ))}
    </ReportTable>
  )
}

function SuppliersReport({ suppliers, stockIn }: { suppliers: Supplier[]; stockIn: StockIn[] }) {
  return (
    <ReportTable columns={['المورد', 'الهاتف', 'إجمالي الوارد', 'عدد الفواتير']}>
      {suppliers.length === 0 ? <EmptyRow /> : suppliers.map((s) => {
        const supIn = stockIn.filter((si) => si.supplier_id === s.id)
        const totalQty = supIn.reduce((sum, si) => sum + si.quantity, 0)
        const invoices = new Set(supIn.map((si) => si.invoice_number).filter(Boolean)).size
        return (
          <tr key={s.id}>
            <td className="px-3 py-2 font-medium border-l border-secondary-200">{s.name}</td>
            <td className="px-3 py-2 border-l border-secondary-200" dir="ltr">{s.phone || '—'}</td>
            <td className="px-3 py-2 font-semibold border-l border-secondary-200">{totalQty}</td>
            <td className="px-3 py-2">{invoices}</td>
          </tr>
        )
      })}
    </ReportTable>
  )
}

function EmployeesReport({ employees, stockOut }: { employees: Employee[]; stockOut: StockOut[] }) {
  return (
    <ReportTable columns={['الموظف', 'المسمى', 'القسم', 'إجمالي المنصرف له']}>
      {employees.length === 0 ? <EmptyRow /> : employees.map((e) => {
        const empOut = stockOut.filter((so) => so.employee_id === e.id)
        const totalQty = empOut.reduce((sum, so) => sum + so.quantity, 0)
        return (
          <tr key={e.id}>
            <td className="px-3 py-2 font-medium border-l border-secondary-200">{e.name}</td>
            <td className="px-3 py-2 border-l border-secondary-200">{e.job_title || '—'}</td>
            <td className="px-3 py-2 border-l border-secondary-200">{e.department || '—'}</td>
            <td className="px-3 py-2 font-semibold">{totalQty}</td>
          </tr>
        )
      })}
    </ReportTable>
  )
}

function EmptyRow({ text = 'لا توجد بيانات' }: { text?: string }) {
  return <tr><td colSpan={99} className="px-3 py-8 text-center text-secondary-400">{text}</td></tr>
}
