import {
  Package, Boxes, AlertTriangle, Truck, TrendingUp, TrendingDown, RotateCcw,
  Upload, Users, LayoutGrid, ShoppingCart, ClipboardCheck, Search, FileBarChart,
  HardDriveDownload, FileText, Settings,
} from 'lucide-react'
import type { Category, Employee, Item, ReturnsScrap, StockIn, StockOut, Supplier } from '../../types'
import { exportAllData } from '../../lib/excel'
import { useState } from 'react'
import { ImportModal } from '../ImportModal'
import { SchoolLogo } from '../SchoolLogo'

interface Props {
  items: Item[]
  categories: Category[]
  suppliers: Supplier[]
  employees: Employee[]
  stockIn: StockIn[]
  stockOut: StockOut[]
  returns: ReturnsScrap[]
  onGoTo: (view: string) => void
  reload: () => void
  canAccess: (key: string) => boolean
}

export function OverviewView({ items, categories, suppliers, employees, stockIn, stockOut, returns, onGoTo, reload, canAccess }: Props) {
  const [exporting, setExporting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const totalStockValue = items.reduce((s, i) => s + i.current_balance * i.cost_price, 0)
  const lowStock = items.filter((i) => i.current_balance <= i.reorder_level)
  const totalIn = stockIn.reduce((s, r) => s + r.quantity, 0)
  const totalOut = stockOut.reduce((s, r) => s + r.quantity, 0)

  async function handleExport() {
    setExporting(true)
    try { await exportAllData() } finally { setExporting(false) }
  }

  const sections: { key: string; label: string; desc: string; icon: React.ReactNode; color: string; count?: string }[] = [
    { key: 'items', label: 'الأصناف', desc: 'إدارة الأصناف وأرصدتها', icon: <Package size={26} />, color: 'primary', count: `${items.length} صنف` },
    { key: 'categories', label: 'التصنيفات', desc: 'تصنيف الأصناف', icon: <LayoutGrid size={26} />, color: 'accent', count: `${categories.length} تصنيف` },
    { key: 'stock-in', label: 'المخزون الوارد', desc: 'تسجيل الوارد', icon: <TrendingUp size={26} />, color: 'success', count: `${totalIn} وحدة` },
    { key: 'stock-out', label: 'المخزون المنصرف', desc: 'تسجيل المنصرف', icon: <TrendingDown size={26} />, color: 'warning', count: `${totalOut} وحدة` },
    { key: 'returns', label: 'المرتجعات والتالف', desc: 'المرتجعات والمخزون التالف', icon: <RotateCcw size={26} />, color: 'warning', count: `${returns.length} سجل` },
    { key: 'suppliers', label: 'الموردون', desc: 'إدارة الموردين', icon: <Truck size={26} />, color: 'accent', count: `${suppliers.length} مورد` },
    { key: 'employees', label: 'الموظفون', desc: 'إدارة الموظفين', icon: <Users size={26} />, color: 'primary', count: `${employees.length} موظف` },
    { key: 'purchase-orders', label: 'طلبات الشراء', desc: 'إنشاء ومتابعة الطلبات', icon: <ShoppingCart size={26} />, color: 'accent' },
    { key: 'invoices', label: 'الفواتير', desc: 'فواتير الشراء والبيع', icon: <FileText size={26} />, color: 'primary' },
    { key: 'inventory', label: 'الجرد', desc: 'جرد المخزون', icon: <ClipboardCheck size={26} />, color: 'success' },
    { key: 'search', label: 'البحث المتقدم', desc: 'بحث شامل في البيانات', icon: <Search size={26} />, color: 'secondary' },
    { key: 'reports', label: 'التقارير', desc: 'تقارير وإحصائيات', icon: <FileBarChart size={26} />, color: 'primary' },
    { key: 'backup', label: 'النسخ الاحتياطي', desc: 'نسخ احتياطية للبيانات', icon: <HardDriveDownload size={26} />, color: 'secondary' },
    { key: 'settings', label: 'إعدادات النظام', desc: 'إدارة هوية التطبيق والبيانات', icon: <Settings size={26} />, color: 'primary' },
  ]

  const visibleSections = sections.filter((s) => canAccess(s.key))

  const colorMap: Record<string, string> = {
    primary: 'border-primary-200 bg-primary-50 text-primary-600 group-hover:bg-primary-100',
    success: 'border-success-200 bg-success-50 text-success-600 group-hover:bg-success-100',
    warning: 'border-warning-200 bg-warning-50 text-warning-600 group-hover:bg-warning-100',
    accent: 'border-accent-200 bg-accent-50 text-accent-600 group-hover:bg-accent-100',
    secondary: 'border-secondary-200 bg-secondary-50 text-secondary-600 group-hover:bg-secondary-100',
  }

  return (
    <div className="space-y-6">
      {/* Hero header with logo */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary-600 to-primary-800 p-6 text-white shadow-lg sm:p-8">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -right-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <SchoolLogo size={96} className="rounded-xl bg-white shadow-md" />
          <div className="text-center sm:text-right">
            <h1 className="text-xl font-bold sm:text-2xl">مخازن مدارس طلائع المبدعين الأهلية</h1>
            <p className="mt-1 text-sm text-primary-100">نظام إدارة المخازن — اختر القسم للبدء</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">
          <Upload size={16} /> استيراد Excel
        </button>
        <button onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-2 rounded-lg border border-secondary-200 bg-white px-4 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50 disabled:opacity-50">
          <TrendingDown size={16} /> تصدير Excel
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={<Package size={20} />} label="عدد الأصناف" value={items.length.toString()} color="primary" onClick={() => canAccess('items') && onGoTo('items')} />
        <StatCard icon={<Boxes size={20} />} label="قيمة المخزون" value={`${totalStockValue.toLocaleString('ar-SA')} ر.س`} color="success" />
        <StatCard icon={<AlertTriangle size={20} />} label="أصناف منخفضة" value={lowStock.length.toString()} color="warning" onClick={() => canAccess('items') && onGoTo('items')} />
        <StatCard icon={<Truck size={20} />} label="الموردون" value={suppliers.length.toString()} color="accent" onClick={() => canAccess('suppliers') && onGoTo('suppliers')} />
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-warning-600" />
            <h2 className="font-semibold text-warning-800">تنبيه: {lowStock.length} صنف وصل للحد الأدنى أو أقل</h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {lowStock.slice(0, 16).map((i) => (
              <button key={i.id} onClick={() => onGoTo('items')}
                className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-warning-700 ring-1 ring-warning-200 transition hover:bg-warning-100">
                {i.name} — {i.current_balance} {i.unit}
              </button>
            ))}
            {lowStock.length > 16 && <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs text-secondary-500 ring-1 ring-secondary-200">+{lowStock.length - 16} أخرى</span>}
          </div>
        </div>
      )}

      {/* Sections grid */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-secondary-800">الأقسام</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleSections.map((s) => (
            <button
              key={s.key}
              onClick={() => onGoTo(s.key)}
              className="group flex items-start gap-4 rounded-xl border border-secondary-200 bg-white p-4 text-right shadow-sm transition hover:shadow-md"
            >
              <div className={`rounded-xl border p-3 transition ${colorMap[s.color]}`}>
                {s.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-secondary-800 transition group-hover:text-primary-700">{s.label}</h3>
                <p className="mt-0.5 text-xs text-secondary-500">{s.desc}</p>
                {s.count && <p className="mt-1.5 text-xs font-medium text-secondary-400">{s.count}</p>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ActivityCard title="آخر الوارد" icon={<TrendingUp size={18} />} color="text-success-600" empty="لا يوجد وارد بعد" onMore={() => onGoTo('stock-in')}>
          {stockIn.slice(-5).reverse().map((s) => (
            <ActivityRow key={s.id} date={s.received_date} text={`${s.item?.name || '—'} — ${s.quantity} وحدة`} sub={s.supplier?.name} />
          ))}
        </ActivityCard>
        <ActivityCard title="آخر المنصرف" icon={<TrendingDown size={18} />} color="text-danger-600" empty="لا يوجد منصرف بعد" onMore={() => onGoTo('stock-out')}>
          {stockOut.slice(-5).reverse().map((s) => (
            <ActivityRow key={s.id} date={s.issue_date} text={`${s.item?.name || '—'} — ${s.quantity} وحدة`} sub={s.recipient_name || s.employee?.name} />
          ))}
        </ActivityCard>
        <ActivityCard title="آخر المرتجعات" icon={<RotateCcw size={18} />} color="text-warning-600" empty="لا توجد مرتجعات بعد" onMore={() => onGoTo('returns')}>
          {returns.slice(-5).reverse().map((r) => (
            <ActivityRow key={r.id} date={r.transaction_date} text={`${r.item?.name || '—'} — ${r.quantity} وحدة`} sub={r.type === 'return' ? 'مرتجع' : 'تالف'} />
          ))}
        </ActivityCard>
      </div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={reload} />
    </div>
  )
}

function StatCard({ icon, label, value, color, onClick }: {
  icon: React.ReactNode; label: string; value: string; color: 'primary' | 'success' | 'warning' | 'accent'; onClick?: () => void
}) {
  const map = { primary: 'bg-primary-50 text-primary-600', success: 'bg-success-50 text-success-600', warning: 'bg-warning-50 text-warning-600', accent: 'bg-accent-50 text-accent-600' }
  return (
    <div onClick={onClick} className={`rounded-xl border border-secondary-200 bg-white p-4 shadow-sm transition hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between">
        <div><p className="text-xs text-secondary-500">{label}</p><p className="mt-1 text-xl font-bold text-secondary-800 sm:text-2xl">{value}</p></div>
        <div className={`rounded-lg p-2.5 ${map[color]}`}>{icon}</div>
      </div>
    </div>
  )
}

function ActivityCard({ title, icon, color, empty, onMore, children }: {
  title: string; icon: React.ReactNode; color: string; empty: string; onMore: () => void; children: React.ReactNode
}) {
  const arr = Array.isArray(children) ? children : [children]
  return (
    <div className="rounded-xl border border-secondary-200 bg-white">
      <div className="flex items-center justify-between border-b border-secondary-100 px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold text-secondary-800"><span className={color}>{icon}</span>{title}</h3>
        <button onClick={onMore} className="text-xs text-primary-600 transition hover:text-primary-700">عرض الكل</button>
      </div>
      {arr.length === 0 ? <p className="px-4 py-8 text-center text-sm text-secondary-400">{empty}</p> : <div className="divide-y divide-secondary-50">{children}</div>}
    </div>
  )
}

function ActivityRow({ date, text, sub }: { date: string; text: string; sub?: string | null }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div><p className="text-sm font-medium text-secondary-700">{text}</p>{sub && <p className="text-xs text-secondary-400">{sub}</p>}</div>
      <span className="text-xs text-secondary-400" dir="ltr">{date}</span>
    </div>
  )
}
