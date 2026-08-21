import { useState } from 'react'
import { Download, Database, FileText, Loader2, HardDriveDownload, CheckCircle2 } from 'lucide-react'
import { exportFullBackup, exportTableCSV } from '../../lib/excel'
import { supabase } from '../../lib/supabase'
import { ErrorBox } from './CategoriesView'

const BACKUP_TABLES = [
  { name: 'categories', label: 'التصنيفات', icon: '🗂️' },
  { name: 'items', label: 'الأصناف', icon: '📦' },
  { name: 'suppliers', label: 'الموردون', icon: '🚚' },
  { name: 'employees', label: 'الموظفون', icon: '👥' },
  { name: 'stock_in', label: 'المخزون الوارد', icon: '📥' },
  { name: 'stock_out', label: 'المخزون المنصرف', icon: '📤' },
  { name: 'returns_scrap', label: 'المرتجعات والتالف', icon: '♻️' },
  { name: 'purchase_orders', label: 'طلبات الشراء', icon: '🛒' },
  { name: 'purchase_order_items', label: 'بنود طلبات الشراء', icon: '📋' },
  { name: 'inventory_counts', label: 'جلسات الجرد', icon: '📝' },
  { name: 'inventory_count_items', label: 'بنود الجرد', icon: '✏️' },
  { name: 'invoices', label: 'الفواتير', icon: '🧾' },
  { name: 'invoice_items', label: 'بنود الفواتير', icon: '💳' },
]

export function BackupView() {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})

  async function loadCounts() {
    setError(null)
    const results = await Promise.all(
      BACKUP_TABLES.map((t) => supabase.from(t.name).select('*', { count: 'exact', head: true })),
    )
    const c: Record<string, number> = {}
    BACKUP_TABLES.forEach((t, i) => { c[t.name] = results[i].count || 0 })
    setCounts(c)
  }

  async function handleFullBackup() {
    setError(null); setDone(null)
    setBusy('full')
    try {
      await exportFullBackup()
      setDone('تم إنشاء النسخة الاحتياطية الكاملة بنجاح')
    } catch {
      setError('تعذّر إنشاء النسخة الاحتياطية')
    } finally {
      setBusy(null)
    }
  }

  async function handleCSV(table: string) {
    setError(null); setDone(null)
    setBusy(table)
    try {
      await exportTableCSV(table)
      setDone(`تم تصدير ${table}.csv`)
    } catch {
      setError(`تعذّر تصدير ${table}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-secondary-800">النسخ الاحتياطي</h2>
          <p className="mt-1 text-sm text-secondary-500">احفظ نسخة من جميع بيانات البرنامج في ملفات على جهازك</p>
        </div>
        <button onClick={loadCounts}
          className="inline-flex items-center gap-1.5 rounded-lg border border-secondary-200 bg-white px-3 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50">
          <Database size={16} /> <span className="hidden sm:inline">إحصاء البيانات</span>
        </button>
      </div>

      {error && <ErrorBox text={error} />}
      {done && (
        <div className="flex items-center gap-2 rounded-lg bg-success-50 p-3 text-sm text-success-700">
          <CheckCircle2 size={18} /> <span>{done}</span>
        </div>
      )}

      {/* Full backup card */}
      <div className="rounded-2xl border border-primary-200 bg-gradient-to-l from-primary-50 to-white p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary-600 p-3 text-white"><HardDriveDownload size={24} /></div>
          <div className="flex-1">
            <h3 className="font-bold text-secondary-800">نسخة احتياطية كاملة</h3>
            <p className="mt-1 text-sm text-secondary-600">
              ملف Excel واحد يحتوي على جميع الجداول (13 جدول) كصفحات منفصلة — مناسب للاستعادة الكاملة
            </p>
            <button onClick={handleFullBackup} disabled={busy === 'full'}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60">
              {busy === 'full' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              تنزيل النسخة الكاملة
            </button>
          </div>
        </div>
      </div>

      {/* Per-table CSV export */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-secondary-700">تصدير جدول منفصل (CSV)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BACKUP_TABLES.map((t) => (
            <div key={t.name} className="flex items-center justify-between rounded-xl border border-secondary-200 bg-white p-4 transition hover:shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">{t.icon}</span>
                <div>
                  <p className="font-medium text-secondary-800">{t.label}</p>
                  <p className="text-xs text-secondary-400" dir="ltr">{t.name}</p>
                  {counts[t.name] !== undefined && (
                    <p className="text-xs text-secondary-500">{counts[t.name]} سجل</p>
                  )}
                </div>
              </div>
              <button onClick={() => handleCSV(t.name)} disabled={busy === t.name}
                className="rounded-lg p-2 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600 disabled:opacity-50"
                title="تصدير CSV">
                {busy === t.name ? <Loader2 size={16} className="animate-spin" /> : <FileText size={18} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
