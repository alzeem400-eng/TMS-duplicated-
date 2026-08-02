import { useState, useRef, type ChangeEvent } from 'react'
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Package,
  Database,
} from 'lucide-react'
import {
  parseImportFile,
  importAllData,
  importItemsOnly,
  downloadImportTemplate,
  type ImportPreview,
  type ImportSummary,
} from '../lib/excel'

interface ImportModalProps {
  open: boolean
  onClose: () => void
  onDone: () => void
}

type Phase = 'idle' | 'parsing' | 'preview' | 'importing' | 'result'

export function ImportModal({ open, onClose, onDone }: ImportModalProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'all' | 'items'>('all')
  const [result, setResult] = useState<{ summary: ImportSummary; errors: string[] } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  function reset() {
    setPhase('idle')
    setPreview(null)
    setFile(null)
    setResult(null)
    setParseError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function close() {
    if (phase === 'importing') return
    reset()
    onClose()
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setParseError(null)
    setPhase('parsing')
    try {
      const p = await parseImportFile(f)
      setPreview(p)
      const hasAny =
        p.items.length ||
        p.categories.length ||
        p.suppliers.length ||
        p.employees.length ||
        p.stockIn.length ||
        p.stockOut.length ||
        p.returns.length
      if (!hasAny) {
        setParseError('لم يتم العثور على بيانات صالحة في الملف. تأكد من استخدام القالب الصحيح.')
        setPhase('idle')
      } else {
        // auto-pick mode: if only items sheet has data, default to items-only
        const onlyItems =
          p.items.length > 0 &&
          !p.categories.length &&
          !p.suppliers.length &&
          !p.employees.length &&
          !p.stockIn.length &&
          !p.stockOut.length &&
          !p.returns.length
        setMode(onlyItems ? 'items' : 'all')
        setPhase('preview')
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'تعذر قراءة الملف')
      setPhase('idle')
    }
  }

  async function commit() {
    if (!preview) return
    setPhase('importing')
    try {
      const res = mode === 'items' ? await importItemsOnly(preview) : await importAllData(preview)
      setResult(res)
      setPhase('result')
      if (res.errors.length === 0) onDone()
    } catch (err) {
      setResult({
        summary: { categories: 0, items: 0, suppliers: 0, employees: 0, stockIn: 0, stockOut: 0, returns: 0 },
        errors: [err instanceof Error ? err.message : 'حدث خطأ أثناء الاستيراد'],
      })
      setPhase('result')
    }
  }

  const summary = preview
    ? {
        categories: preview.categories.length,
        items: preview.items.length,
        suppliers: preview.suppliers.length,
        employees: preview.employees.length,
        stockIn: preview.stockIn.length,
        stockOut: preview.stockOut.length,
        returns: preview.returns.length,
      }
    : null

  const totalRows = summary
    ? summary.categories + summary.items + summary.suppliers + summary.employees + summary.stockIn + summary.stockOut + summary.returns
    : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 p-4 backdrop-blur-sm" onClick={close}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-secondary-100 bg-primary-600 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">استيراد البيانات من ملف Excel</h2>
              <p className="text-sm text-primary-100">استورد الأصناف أو كل بيانات المخزن دفعة واحدة</p>
            </div>
          </div>
          <button
            onClick={close}
            disabled={phase === 'importing'}
            className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/20 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {phase === 'idle' && (
            <div className="space-y-6">
              {parseError && (
                <div className="flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Template download */}
              <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-4">
                <h3 className="mb-2 flex items-center gap-2 font-semibold text-secondary-800">
                  <Download size={18} className="text-primary-600" />
                  تحميل ملف القالب
                </h3>
                <p className="mb-3 text-sm text-secondary-600">
                  نزّل قالب Excel الجاهز بالعناوين الصحيحة، ثم عبّئه ببياناتك واستورده.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => downloadImportTemplate(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
                  >
                    <Database size={16} />
                    قالب كامل (كل البيانات)
                  </button>
                  <button
                    onClick={() => downloadImportTemplate(false)}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-50"
                  >
                    <Package size={16} />
                    قالب الأصناف فقط
                  </button>
                </div>
              </div>

              {/* Upload */}
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-secondary-300 bg-secondary-50/50 p-8 text-center transition hover:border-primary-400 hover:bg-primary-50/40"
                onClick={() => inputRef.current?.click()}
              >
                <div className="mb-3 rounded-full bg-primary-100 p-3 text-primary-600">
                  <Upload size={28} />
                </div>
                <p className="font-medium text-secondary-800">اختر ملف Excel للاستيراد</p>
                <p className="mt-1 text-sm text-secondary-500">صيغ مدعومة: .xlsx, .xls</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFile}
                />
              </div>
            </div>
          )}

          {phase === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary-600" />
              <p className="mt-3 text-secondary-600">جارٍ قراءة الملف…</p>
            </div>
          )}

          {phase === 'preview' && summary && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 rounded-lg bg-success-50 p-3 text-sm text-success-700">
                <CheckCircle2 size={18} />
                <span>تمت قراءة الملف بنجاح — وجدنا {totalRows} صف بيانات.</span>
              </div>

              {/* counts grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <CountCard label="التصنيفات" count={summary.categories} active={summary.categories > 0} />
                <CountCard label="الأصناف" count={summary.items} active={summary.items > 0} />
                <CountCard label="الموردون" count={summary.suppliers} active={summary.suppliers > 0} />
                <CountCard label="الموظفون" count={summary.employees} active={summary.employees > 0} />
                <CountCard label="الوارد" count={summary.stockIn} active={summary.stockIn > 0} />
                <CountCard label="المنصرف" count={summary.stockOut} active={summary.stockOut > 0} />
                <CountCard label="المرتجعات" count={summary.returns} active={summary.returns > 0} />
              </div>

              {/* mode selection */}
              <div className="rounded-xl border border-secondary-200 p-4">
                <h3 className="mb-3 font-semibold text-secondary-800">نوع الاستيراد</h3>
                <div className="space-y-2">
                  <ModeOption
                    selected={mode === 'all'}
                    onSelect={() => setMode('all')}
                    icon={<Database size={18} />}
                    title="استيراد كل البيانات"
                    desc="التصنيفات والأصناف والموردون والموظفون وكل حركات المخزون (وارد/منصرف/مرتجعات)"
                    disabled={
                      !summary.categories &&
                      !summary.suppliers &&
                      !summary.employees &&
                      !summary.stockIn &&
                      !summary.stockOut &&
                      !summary.returns
                    }
                  />
                  <ModeOption
                    selected={mode === 'items'}
                    onSelect={() => setMode('items')}
                    icon={<Package size={18} />}
                    title="استيراد الأصناف فقط"
                    desc="استيراد قائمة الأصناف مع تحديث الموجود منها، وإنشاء التصنيفات المذكورة تلقائيًا"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={reset}
                  className="rounded-lg border border-secondary-200 px-4 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={commit}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                >
                  <Upload size={16} />
                  بدء الاستيراد
                </button>
              </div>
            </div>
          )}

          {phase === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-primary-600" />
              <p className="mt-3 text-secondary-600">جارٍ كتابة البيانات في قاعدة المخزن…</p>
            </div>
          )}

          {phase === 'result' && result && (
            <div className="space-y-5">
              {result.errors.length === 0 ? (
                <div className="flex items-start gap-3 rounded-xl bg-success-50 p-4 text-success-700">
                  <CheckCircle2 size={24} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">تم الاستيراد بنجاح</p>
                    <p className="text-sm">تمت إضافة/تحديث جميع البيانات في قاعدة المخزن.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl bg-warning-50 p-4 text-warning-700">
                  <AlertCircle size={24} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">اكتمل الاستيراد مع بعض التحذيرات</p>
                    <p className="text-sm">تم الاستيراد جزئيًا. راجع الأخطاء أدناه.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <CountCard label="التصنيفات" count={result.summary.categories} active={result.summary.categories > 0} />
                <CountCard label="الأصناف" count={result.summary.items} active={result.summary.items > 0} />
                <CountCard label="الموردون" count={result.summary.suppliers} active={result.summary.suppliers > 0} />
                <CountCard label="الموظفون" count={result.summary.employees} active={result.summary.employees > 0} />
                <CountCard label="الوارد" count={result.summary.stockIn} active={result.summary.stockIn > 0} />
                <CountCard label="المنصرف" count={result.summary.stockOut} active={result.summary.stockOut > 0} />
                <CountCard label="المرتجعات" count={result.summary.returns} active={result.summary.returns > 0} />
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-lg bg-danger-50 p-3">
                  <p className="mb-2 text-sm font-semibold text-danger-700">الأخطاء:</p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-danger-600">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={close}
                  className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-primary-700"
                >
                  تم
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CountCard({ label, count, active }: { label: string; count: number; active: boolean }) {
  return (
    <div
      className={`rounded-lg border p-3 text-center transition ${
        active ? 'border-primary-200 bg-primary-50' : 'border-secondary-200 bg-secondary-50 opacity-60'
      }`}
    >
      <p className={`text-2xl font-bold ${active ? 'text-primary-700' : 'text-secondary-400'}`}>
        {count}
      </p>
      <p className="mt-0.5 text-xs text-secondary-600">{label}</p>
    </div>
  )
}

function ModeOption({
  selected,
  onSelect,
  icon,
  title,
  desc,
  disabled,
}: {
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  desc: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-right transition disabled:cursor-not-allowed disabled:opacity-40 ${
        selected ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 bg-white hover:border-secondary-300'
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${selected ? 'text-primary-600' : 'text-secondary-400'}`}>{icon}</span>
      <span className="flex-1">
        <span className={`block text-sm font-semibold ${selected ? 'text-primary-800' : 'text-secondary-800'}`}>
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-secondary-500">{desc}</span>
      </span>
      <span
        className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
          selected ? 'border-primary-600 bg-primary-600' : 'border-secondary-300'
        }`}
      />
    </button>
  )
}
