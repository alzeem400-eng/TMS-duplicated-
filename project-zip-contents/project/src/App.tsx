import { useState } from 'react'
import {
  LayoutDashboard, Package, LayoutGrid, Truck, Users,
  TrendingUp, TrendingDown, RotateCcw, LogOut, Menu, X, Loader2, Upload, Download,
  ShieldCheck, FileBarChart, ShoppingCart, ClipboardCheck, Search, FileText, HardDriveDownload,
  Settings,
} from 'lucide-react'
import { useAuth } from './components/AuthContext'
import { useUserRole } from './hooks/useUserRole'
import { LoginScreen } from './components/LoginScreen'
import { useWarehouseData } from './hooks/useWarehouseData'
import { OverviewView } from './components/views/OverviewView'
import { CategoriesView } from './components/views/CategoriesView'
import { ItemsView } from './components/views/ItemsView'
import { SuppliersView } from './components/views/SuppliersView'
import { EmployeesView } from './components/views/EmployeesView'
import { StockInView } from './components/views/StockInView'
import { StockOutView } from './components/views/StockOutView'
import { ReturnsView } from './components/views/ReturnsView'
import { UsersView } from './components/views/UsersView'
import { ReportsView } from './components/views/ReportsView'
import { PurchaseOrdersView } from './components/views/PurchaseOrdersView'
import { InventoryView } from './components/views/InventoryView'
import { InvoicesView } from './components/views/InvoicesView'
import { AdvancedSearchView } from './components/views/AdvancedSearchView'
import { ImportModal } from './components/ImportModal'
import { SchoolLogo } from './components/SchoolLogo'
import { BackupView } from './components/views/BackupView'
import { SettingsView } from './components/views/SettingsView'
import { exportAllData } from './lib/excel'
import { useUserPermissions, type SectionKey } from './hooks/useUserPermissions'

type ViewKey =
  | 'overview' | 'items' | 'categories' | 'suppliers' | 'employees'
  | 'stock-in' | 'stock-out' | 'returns'
  | 'users' | 'reports' | 'purchase-orders' | 'inventory' | 'invoices' | 'search' | 'backup' | 'settings'

const NAV_SECTIONS: { label: string; items: { key: ViewKey; label: string; icon: React.ReactNode; adminOnly?: boolean }[] }[] = [
  {
    label: 'الرئيسية',
    items: [
      { key: 'overview', label: 'لوحة التحكم', icon: <LayoutDashboard size={20} /> },
      { key: 'search', label: 'البحث المتقدم', icon: <Search size={20} /> },
    ],
  },
  {
    label: 'المخزون',
    items: [
      { key: 'items', label: 'الأصناف', icon: <Package size={20} /> },
      { key: 'categories', label: 'التصنيفات', icon: <LayoutGrid size={20} /> },
      { key: 'stock-in', label: 'المخزون الوارد', icon: <TrendingUp size={20} /> },
      { key: 'stock-out', label: 'المخزون المنصرف', icon: <TrendingDown size={20} /> },
      { key: 'returns', label: 'المرتجعات والتالف', icon: <RotateCcw size={20} /> },
    ],
  },
  {
    label: 'الإدارة',
    items: [
      { key: 'suppliers', label: 'الموردون', icon: <Truck size={20} /> },
      { key: 'employees', label: 'الموظفون', icon: <Users size={20} /> },
      { key: 'purchase-orders', label: 'طلبات الشراء', icon: <ShoppingCart size={20} /> },
      { key: 'invoices', label: 'الفواتير', icon: <FileText size={20} /> },
      { key: 'inventory', label: 'الجرد', icon: <ClipboardCheck size={20} /> },
    ],
  },
  {
    label: 'التقارير',
    items: [
      { key: 'reports', label: 'التقارير', icon: <FileBarChart size={20} /> },
    ],
  },
  {
    label: 'النظام',
    items: [
      { key: 'users', label: 'المستخدمون', icon: <ShieldCheck size={20} />, adminOnly: true },
      { key: 'settings', label: 'إعدادات النظام', icon: <Settings size={20} />, adminOnly: true },
      { key: 'backup', label: 'النسخ الاحتياطي', icon: <HardDriveDownload size={20} /> },
    ],
  },
]

const ALL_NAV = NAV_SECTIONS.flatMap((s) => s.items)

export default function App() {
  const { user, loading, signOut } = useAuth()
  const { isAdmin } = useUserRole()
  const perms = useUserPermissions(isAdmin)
  const data = useWarehouseData()
  const [view, setView] = useState<ViewKey>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary-50" dir="rtl">
        <Loader2 size={32} className="animate-spin text-primary-600" />
      </div>
    )
  }

  if (!user) return <LoginScreen />

  function goto(v: string) { setView(v as ViewKey); setSidebarOpen(false) }

  const canAccess = (key: string) => key === 'users' ? isAdmin : perms.canAccess(key as SectionKey)
  const canAdd = (key: string) => perms.canAdd(key as SectionKey)
  const canEdit = (key: string) => perms.canEdit(key as SectionKey)

  async function handleExport() {
    setExporting(true)
    try { await exportAllData() } finally { setExporting(false) }
  }

  const currentLabel = ALL_NAV.find((n) => n.key === view)?.label || 'لوحة التحكم'

  return (
    <div className="min-h-screen bg-secondary-50" dir="rtl">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 border-l border-secondary-200 bg-white lg:block">
        <SidebarContent view={view} onNav={goto} onSignOut={signOut} email={user.email || ''} isAdmin={isAdmin} canAccess={canAccess} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-64 border-l border-secondary-200 bg-white">
            <button onClick={() => setSidebarOpen(false)} className="absolute left-3 top-3 rounded-lg p-1.5 text-secondary-400 hover:bg-secondary-100"><X size={20} /></button>
            <SidebarContent view={view} onNav={goto} onSignOut={signOut} email={user.email || ''} isAdmin={isAdmin} canAccess={canAccess} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pr-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-secondary-200 bg-white/90 backdrop-blur print:hidden">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-secondary-600 transition hover:bg-secondary-100 lg:hidden">
                <Menu size={20} />
              </button>
              <h1 className="text-base font-bold text-secondary-800 sm:text-lg">{currentLabel}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setImportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">
                <Upload size={16} /><span className="hidden sm:inline">استيراد</span>
              </button>
              <button onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-1.5 rounded-lg border border-secondary-200 bg-white px-3 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50 disabled:opacity-50">
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span className="hidden sm:inline">تصدير</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 print:p-0">
          {data.loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-primary-600" />
              <p className="mt-3 text-secondary-500">جارٍ تحميل البيانات…</p>
            </div>
          ) : view === 'overview' ? (
            <OverviewView
              items={data.items} categories={data.categories} suppliers={data.suppliers}
              employees={data.employees} stockIn={data.stockIn} stockOut={data.stockOut}
              returns={data.returns} onGoTo={goto} reload={data.reload} canAccess={canAccess}
            />
          ) : view === 'search' ? (
            <AdvancedSearchView
              items={data.items} categories={data.categories} suppliers={data.suppliers}
              employees={data.employees} stockIn={data.stockIn} stockOut={data.stockOut}
              returns={data.returns}
            />
          ) : view === 'items' ? (
            canAccess('items') ? <ItemsView items={data.items} categories={data.categories} reload={data.reload} canAdd={canAdd('items')} canEdit={canEdit('items')} /> : <NoPermission />
          ) : view === 'categories' ? (
            canAccess('categories') ? <CategoriesView categories={data.categories} reload={data.reload} canAdd={canAdd('categories')} canEdit={canEdit('categories')} /> : <NoPermission />
          ) : view === 'suppliers' ? (
            canAccess('suppliers') ? <SuppliersView suppliers={data.suppliers} reload={data.reload} canAdd={canAdd('suppliers')} canEdit={canEdit('suppliers')} /> : <NoPermission />
          ) : view === 'employees' ? (
            canAccess('employees') ? <EmployeesView employees={data.employees} reload={data.reload} canAdd={canAdd('employees')} canEdit={canEdit('employees')} /> : <NoPermission />
          ) : view === 'stock-in' ? (
            canAccess('stock-in') ? <StockInView stockIn={data.stockIn} items={data.items} suppliers={data.suppliers} reload={data.reload} canAdd={canAdd('stock-in')} canEdit={canEdit('stock-in')} /> : <NoPermission />
          ) : view === 'stock-out' ? (
            canAccess('stock-out') ? <StockOutView stockOut={data.stockOut} items={data.items} employees={data.employees} reload={data.reload} canAdd={canAdd('stock-out')} canEdit={canEdit('stock-out')} /> : <NoPermission />
          ) : view === 'returns' ? (
            canAccess('returns') ? <ReturnsView returns={data.returns} items={data.items} reload={data.reload} canAdd={canAdd('returns')} canEdit={canEdit('returns')} /> : <NoPermission />
          ) : view === 'users' ? (
            isAdmin ? <UsersView /> : <NoPermission />
          ) : view === 'settings' ? (
            isAdmin ? <SettingsView /> : <NoPermission />
          ) : view === 'backup' ? (
            canAccess('backup') ? <BackupView /> : <NoPermission />
          ) : view === 'reports' ? (
            <ReportsView
              items={data.items} categories={data.categories} suppliers={data.suppliers}
              employees={data.employees} stockIn={data.stockIn} stockOut={data.stockOut}
              returns={data.returns}
            />
          ) : view === 'purchase-orders' ? (
            canAccess('purchase-orders') ? <PurchaseOrdersView items={data.items} suppliers={data.suppliers} reload={data.reload} canAdd={canAdd('purchase-orders')} canEdit={canEdit('purchase-orders')} /> : <NoPermission />
          ) : view === 'invoices' ? (
            canAccess('invoices') ? <InvoicesView items={data.items} suppliers={data.suppliers} canAdd={canAdd('invoices')} canEdit={canEdit('invoices')} /> : <NoPermission />
          ) : view === 'inventory' ? (
            canAccess('inventory') ? <InventoryView items={data.items} reload={data.reload} canAdd={canAdd('inventory')} canEdit={canEdit('inventory')} /> : <NoPermission />
          ) : null}
        </main>
      </div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={data.reload} />
    </div>
  )
}

function NoPermission() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <ShieldCheck size={48} className="text-secondary-300" />
      <p className="mt-4 text-lg font-semibold text-secondary-600">ليس لديك صلاحية للوصول إلى هذا القسم</p>
      <p className="mt-1 text-sm text-secondary-400">تواصل مع مدير النظام</p>
    </div>
  )
}

function SidebarContent({ view, onNav, onSignOut, email, isAdmin, canAccess }: {
  view: string; onNav: (v: string) => void; onSignOut: () => void; email: string; isAdmin: boolean; canAccess: (key: string) => boolean
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-secondary-100 px-5 py-4">
        <SchoolLogo size={40} className="rounded-lg" />
        <div>
          <h2 className="text-sm font-bold text-secondary-800">مخازن مدارس طلائع المبدعين الأهلية</h2>
          <p className="text-xs text-secondary-500">نظام الإدارة</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) =>
            (!item.adminOnly || isAdmin) && canAccess(item.key)
          )
          if (visibleItems.length === 0) return null
          return (
            <div key={section.label}>
              <p className="mb-1.5 px-3 text-xs font-semibold uppercase text-secondary-400">{section.label}</p>
              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <button key={item.key} onClick={() => onNav(item.key)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      view === item.key ? 'bg-primary-600 text-white shadow-sm' : 'text-secondary-600 hover:bg-secondary-100'
                    }`}>
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-secondary-100 p-3">
        <div className="mb-2 truncate rounded-lg bg-secondary-50 px-3 py-2 text-xs text-secondary-500" dir="ltr">{email}</div>
        <button onClick={onSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-danger-600 transition hover:bg-danger-50">
          <LogOut size={18} /> تسجيل الخروج
        </button>
      </div>
    </div>
  )
}
