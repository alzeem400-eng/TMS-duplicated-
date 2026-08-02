import { useState, useRef, useCallback } from 'react'
import {
  Settings, Image as ImageIcon, Database, Download, Upload, HardDrive,
  Loader2, CheckCircle2, AlertCircle, Save, Github, Code2, Server, Cloud,
  RotateCcw, FileJson, AlertTriangle, X, Info, FileText,
} from 'lucide-react'
import { useSystemSettings, type SystemSettings } from '../../hooks/useSystemSettings'
import { supabase } from '../../lib/supabase'
import { exportJSONBackup, parseJSONBackup, restoreJSONBackup, type JSONRestorePreview } from '../../lib/excel'
import { ErrorBox, Modal } from './CategoriesView'
import { invalidateLogoCache } from '../SchoolLogo'
import { invalidateHeaderCache } from '../ReportHeader'

export function SettingsView() {
  const { settings, loading, update, reload } = useSystemSettings()
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<SystemSettings>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string>('')

  // Backup / restore
  const [backupBusy, setBackupBusy] = useState(false)
  const [restorePreview, setRestorePreview] = useState<JSONRestorePreview | null>(null)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [restoreResult, setRestoreResult] = useState<{ restored: Record<string, number>; errors: string[] } | null>(null)

  // Storage stats
  const [storageStats, setStorageStats] = useState<Record<string, number> | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const currentForm: SystemSettings = { ...settings, ...form }

  async function handleSave() {
    setSaving(true); setError(null); setSavedMsg(null)
    const ok = await update(form)
    setSaving(false)
    if (ok) {
      invalidateLogoCache()
      invalidateHeaderCache()
      setSavedMsg('تم حفظ الإعدادات بنجاح')
      setForm({})
      setTimeout(() => setSavedMsg(null), 3000)
    } else {
      setError('تعذّر حفظ الإعدادات. تأكد من أن لديك صلاحيات المدير.')
    }
  }

  async function handleLogoUpload(file: File) {
    setUploadingLogo(true); setError(null)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const fileName = `logo-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('school-assets')
        .upload(fileName, file, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('school-assets').getPublicUrl(fileName)
      const logoUrl = urlData.publicUrl
      setLogoPreview(logoUrl)
      setForm((f) => ({ ...f, logo_url: logoUrl }))
    } catch {
      setError('تعذّر رفع الشعار. تأكد من أن لديك صلاحيات المدير.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleExportJSON() {
    setBackupBusy(true); setError(null)
    try {
      await exportJSONBackup()
      setSavedMsg('تم تصدير النسخة الاحتياطية بنجاح')
      setTimeout(() => setSavedMsg(null), 3000)
    } catch {
      setError('تعذّر تصدير النسخة الاحتياطية')
    } finally {
      setBackupBusy(false)
    }
  }

  async function handleRestoreFile(file: File) {
    try {
      const preview = await parseJSONBackup(file)
      setRestorePreview(preview)
    } catch {
      setError('ملف غير صالح. تأكد من أنه نسخة احتياطية JSON صحيحة.')
    }
  }

  async function confirmRestore() {
    if (!restorePreview) return
    setRestoreBusy(true); setError(null)
    try {
      const result = await restoreJSONBackup(restorePreview)
      setRestoreResult(result)
      setRestorePreview(null)
      if (result.errors.length === 0) {
        setSavedMsg('تم استعادة البيانات بنجاح')
        setTimeout(() => setSavedMsg(null), 4000)
      }
    } catch {
      setError('تعذّر استعادة البيانات')
    } finally {
      setRestoreBusy(false)
    }
  }

  const loadStorageStats = useCallback(async () => {
    setLoadingStats(true)
    const tables = ['categories', 'items', 'suppliers', 'employees', 'stock_in', 'stock_out', 'returns_scrap', 'purchase_orders', 'invoices', 'invoice_items']
    const results = await Promise.all(
      tables.map((t) => supabase.from(t).select('*', { count: 'exact', head: true })),
    )
    const stats: Record<string, number> = {}
    tables.forEach((t, i) => { stats[t] = results[i].count || 0 })
    setStorageStats(stats)
    setLoadingStats(false)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-primary-600" />
        <p className="mt-3 text-secondary-500">جارٍ تحميل الإعدادات…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary-600 p-2.5 text-white"><Settings size={24} /></div>
        <div>
          <h2 className="text-lg font-bold text-secondary-800">إعدادات النظام وإدارة البيانات</h2>
          <p className="text-sm text-secondary-500">إدارة هوية التطبيق، التخزين، النسخ الاحتياطي، وتصدير الكود</p>
        </div>
      </div>

      {error && <ErrorBox text={error} />}
      {savedMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-success-50 p-3 text-sm text-success-700">
          <CheckCircle2 size={18} /> <span>{savedMsg}</span>
        </div>
      )}

      {/* 1. Project Identity */}
      <SectionCard icon={<ImageIcon size={20} />} title="هوية المشروع" desc="تخصيص الاسم، الوصف، بيانات التواصل، والشعار">
        <div className="space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 border-secondary-200 bg-secondary-50">
              {logoPreview || currentForm.logo_url ? (
                <img src={logoPreview || currentForm.logo_url} alt="شعار" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon size={28} className="text-secondary-300" />
              )}
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50">
                {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                رفع شعار جديد
              </button>
              {currentForm.logo_url && (
                <button onClick={() => { setForm((f) => ({ ...f, logo_url: '' })); setLogoPreview('') }}
                  className="mr-2 inline-flex items-center gap-1 rounded-lg border border-secondary-200 px-3 py-2 text-sm text-secondary-600 transition hover:bg-secondary-50">
                  <X size={14} /> إزالة
                </button>
              )}
              <p className="mt-1.5 text-xs text-secondary-400">PNG, JPG — يُرفع إلى تخزين Supabase</p>
            </div>
          </div>

          {/* Text fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SettingsField label="اسم التطبيق" value={currentForm.app_name}
              onChange={(v) => setForm((f) => ({ ...f, app_name: v }))} />
            <SettingsField label="الوصف" value={currentForm.app_description}
              onChange={(v) => setForm((f) => ({ ...f, app_description: v }))} />
            <SettingsField label="بريد التواصل" value={currentForm.contact_email}
              onChange={(v) => setForm((f) => ({ ...f, contact_email: v }))} />
            <SettingsField label="هاتف التواصل" value={currentForm.contact_phone}
              onChange={(v) => setForm((f) => ({ ...f, contact_phone: v }))} />
            <div className="sm:col-span-2">
              <SettingsField label="العنوان" value={currentForm.contact_address}
                onChange={(v) => setForm((f) => ({ ...f, contact_address: v }))} />
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving || Object.keys(form).length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              حفظ التغييرات
            </button>
          </div>
        </div>
      </SectionCard>

      {/* 2. Storage */}
      <SectionCard icon={<Database size={20} />} title="مكان حفظ البيانات" desc="اختيار وضع التخزين وعرض حالة البيانات والمساحة">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StorageModeCard active={currentForm.storage_mode === 'supabase'} icon={<Cloud size={20} />}
              title="قاعدة بيانات Supabase" desc="التخزين السحابي المتصل"
              onClick={() => setForm((f) => ({ ...f, storage_mode: 'supabase' }))} />
            <StorageModeCard active={currentForm.storage_mode === 'local'} icon={<HardDrive size={20} />}
              title="تخزين محلي" desc="Local Storage / IndexedDB"
              onClick={() => setForm((f) => ({ ...f, storage_mode: 'local' }))} />
            <StorageModeCard active={currentForm.storage_mode === 'api'} icon={<Server size={20} />}
              title="API خارجي" desc="اتصال بخادم خارجي"
              onClick={() => setForm((f) => ({ ...f, storage_mode: 'api' }))} />
          </div>

          {form.storage_mode && form.storage_mode !== settings.storage_mode && (
            <div className="flex items-center gap-2 rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
              <AlertTriangle size={16} />
              <span>سيتم تغيير وضع التخزين عند الضغط على «حفظ التغييرات». قد تحتاج إلى إعادة تحميل الصفحة.</span>
            </div>
          )}

          <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-secondary-700">حالة التخزين الحالية</h4>
              <button onClick={loadStorageStats} disabled={loadingStats}
                className="inline-flex items-center gap-1.5 rounded-lg border border-secondary-200 bg-white px-3 py-1.5 text-xs font-medium text-secondary-700 transition hover:bg-secondary-100 disabled:opacity-50">
                {loadingStats ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                تحديث الإحصاء
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-primary-50 p-3 text-sm">
              {currentForm.storage_mode === 'supabase' ? <Cloud size={18} className="text-primary-600" /> : <HardDrive size={18} className="text-primary-600" />}
              <span className="font-medium text-primary-800">
                {currentForm.storage_mode === 'supabase' && 'متصل بقاعدة بيانات Supabase'}
                {currentForm.storage_mode === 'local' && 'التخزين المحلي (Local Storage)'}
                {currentForm.storage_mode === 'api' && 'اتصال API خارجي'}
              </span>
            </div>
            {storageStats && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {Object.entries(storageStats).map(([table, count]) => (
                  <div key={table} className="rounded-lg bg-white p-2.5 text-center ring-1 ring-secondary-100">
                    <p className="text-lg font-bold text-secondary-800">{count}</p>
                    <p className="text-[10px] text-secondary-400" dir="ltr">{table}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentForm.storage_mode === 'local' && (
            <div className="rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-700">
              <Info size={18} className="mb-1 inline-block" />
  التخزين المحلي يحفظ البيانات في متصفحك فقط. لن تظهر البيانات على أجهزة أخرى، وقد تُفقد إذا مسحت بيانات المتصفح. استخدم النسخ الاحتياطي بانتظام.
            </div>
          )}
          {currentForm.storage_mode === 'api' && (
            <div className="rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm text-accent-700">
              <Info size={18} className="mb-1 inline-block" />
  وضع API الخارجي يتطلب إعداد عنوان الخادم ومفتاح الاتصال. يمكنك تحديد ذلك من إعدادات الاتصال في ملف .env.
            </div>
          )}
        </div>
      </SectionCard>

      {/* 2.5 Report Header */}
      <SectionCard icon={<FileText size={20} />} title="ترويسة التقارير الرسمية" desc="تخصيص الجهات والعناوين والبسملة في تقارير النظام">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SettingsField label="السطر الأول (الجمهورية)" value={currentForm.report_org_line1}
              onChange={(v) => setForm((f) => ({ ...f, report_org_line1: v }))} />
            <SettingsField label="السطر الثاني (الوزارة)" value={currentForm.report_org_line2}
              onChange={(v) => setForm((f) => ({ ...f, report_org_line2: v }))} />
            <SettingsField label="السطر الثالث (المحافظة)" value={currentForm.report_org_line3}
              onChange={(v) => setForm((f) => ({ ...f, report_org_line3: v }))} />
            <SettingsField label="السطر الرابع (المديرية)" value={currentForm.report_org_line4}
              onChange={(v) => setForm((f) => ({ ...f, report_org_line4: v }))} />
            <div className="sm:col-span-2">
              <SettingsField label="السطر الخامس (المدرسة)" value={currentForm.report_org_line5}
                onChange={(v) => setForm((f) => ({ ...f, report_org_line5: v }))} />
            </div>
            <div className="sm:col-span-2">
              <SettingsField label="نص البسملة" value={currentForm.report_basmala}
                onChange={(v) => setForm((f) => ({ ...f, report_basmala: v }))} />
            </div>
            <SettingsField label="تسمية حقل المرفقات" value={currentForm.report_attachments_label}
              onChange={(v) => setForm((f) => ({ ...f, report_attachments_label: v }))} />
            <SettingsField label="تسمية حقل التاريخ" value={currentForm.report_date_label}
              onChange={(v) => setForm((f) => ({ ...f, report_date_label: v }))} />
            <SettingsField label="تسمية حقل الرقم" value={currentForm.report_number_label}
              onChange={(v) => setForm((f) => ({ ...f, report_number_label: v }))} />
          </div>

          {/* Live preview */}
          <div className="rounded-xl border-2 border-dashed border-secondary-200 bg-secondary-50 p-4">
            <p className="mb-2 text-xs font-semibold text-secondary-500">معاينة الترويسة:</p>
            <div className="flex items-start justify-between gap-4 rounded-lg bg-white p-4">
              <div className="flex-1 text-right">
                <p className="text-xs font-bold text-secondary-800">{currentForm.report_org_line1}</p>
                <p className="text-xs text-secondary-700">{currentForm.report_org_line2}</p>
                <p className="text-xs text-secondary-600">{currentForm.report_org_line3}</p>
                <p className="text-xs text-secondary-600">{currentForm.report_org_line4}</p>
                <p className="text-xs font-bold text-secondary-700">{currentForm.report_org_line5}</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-secondary-800">{currentForm.report_basmala}</p>
                <p className="mt-1 text-xs text-secondary-400">[ الشعار ]</p>
              </div>
              <div className="flex-1 text-left text-xs text-secondary-600">
                <p>{currentForm.report_attachments_label}: —</p>
                <p>{currentForm.report_date_label}: —</p>
                <p>{currentForm.report_number_label}: —</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving || Object.keys(form).length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              حفظ التغييرات
            </button>
          </div>
        </div>
      </SectionCard>

      {/* 3. Backup & Restore */}
      <SectionCard icon={<HardDrive size={20} />} title="النسخ الاحتياطي واستعادة البيانات" desc="تصدير واستيراد جميع بيانات التطبيق بصيغة JSON">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Export */}
            <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Download size={20} className="text-primary-600" />
                <h4 className="font-semibold text-secondary-800">تصدير نسخة احتياطية</h4>
              </div>
              <p className="mb-3 text-sm text-secondary-600">
                تنزيل جميع بيانات التطبيق الحالية في ملف JSON واحد قابل للاستعادة لاحقاً.
              </p>
              <button onClick={handleExportJSON} disabled={backupBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50">
                {backupBusy ? <Loader2 size={16} className="animate-spin" /> : <FileJson size={16} />}
                تصدير JSON
              </button>
            </div>

            {/* Restore */}
            <div className="rounded-xl border border-warning-200 bg-warning-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <RotateCcw size={20} className="text-warning-600" />
                <h4 className="font-semibold text-secondary-800">استعادة البيانات</h4>
              </div>
              <p className="mb-3 text-sm text-secondary-600">
                رفع ملف JSON لاسترجاع البيانات. سيتم استبدال البيانات الحالية.
              </p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-warning-300 bg-white px-4 py-2.5 text-sm font-semibold text-warning-700 transition hover:bg-warning-100">
                <Upload size={16} />
                اختيار ملف JSON
                <input type="file" accept=".json,application/json" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRestoreFile(f); e.target.value = '' }} />
              </label>
            </div>
          </div>

          {/* Restore result */}
          {restoreResult && (
            <div className="rounded-xl border border-secondary-200 bg-white p-4">
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-secondary-800">
                <CheckCircle2 size={18} className="text-success-600" /> نتيجة الاستعادة
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Object.entries(restoreResult.restored).map(([table, count]) => (
                  <div key={table} className="rounded-lg bg-secondary-50 p-2.5 text-center">
                    <p className="text-sm font-bold text-secondary-800">{count}</p>
                    <p className="text-[10px] text-secondary-400" dir="ltr">{table}</p>
                  </div>
                ))}
              </div>
              {restoreResult.errors.length > 0 && (
                <div className="mt-3 rounded-lg bg-danger-50 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-danger-700">
                    <AlertTriangle size={16} /> {restoreResult.errors.length} خطأ
                  </p>
                  <ul className="list-inside list-disc text-xs text-danger-600">
                    {restoreResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
              <button onClick={() => setRestoreResult(null)} className="mt-3 text-sm text-secondary-500 hover:text-secondary-700">إغلاق</button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* 4. Code Export */}
      <SectionCard icon={<Code2 size={20} />} title="تصدير الكود البرمجي للمشروع" desc="إرشادات لتحميل الكود الكامل أو ربطه مع GitHub">
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-secondary-200 bg-secondary-50 p-4">
            <Info size={20} className="mt-0.5 shrink-0 text-primary-600" />
            <div className="text-sm text-secondary-600">
              <p className="mb-2 font-medium text-secondary-800">كيفية تحميل الكود البرمجي الكامل للمشروع:</p>
              <ol className="list-inside list-decimal space-y-1.5 text-secondary-600">
                <li>من شريط الأدوات العلوي، اضغط على زر القائمة <span className="font-medium text-secondary-800">≡</span> (في الجانب الأيسر).</li>
                <li>اختر <span className="font-medium text-secondary-800">Download</span> أو <span className="font-medium text-secondary-800">تحميل المشروع</span>.</li>
                <li>سيتم تنزيل المشروع كملف ZIP يحتوي على جميع الملفات البرمجية.</li>
              </ol>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-secondary-200 bg-secondary-50 p-4">
            <Github size={20} className="mt-0.5 shrink-0 text-secondary-700" />
            <div className="text-sm text-secondary-600">
              <p className="mb-2 font-medium text-secondary-800">ربط المشروع مع GitHub:</p>
              <ol className="list-inside list-decimal space-y-1.5 text-secondary-600">
                <li>اضغط على زر <span className="font-medium text-secondary-800">GitHub</span> في شريط الأدوات العلوي.</li>
                <li>سجّل الدخول بحساب GitHub الخاص بك وامنح الصلاحيات.</li>
                <li>اختر مستودعاً (Repository) موجوداً أو أنشئ مستودعاً جديداً.</li>
                <li>سيتم رفع الكود تلقائياً ويمكنك متابعة التحديثات المستقبلية.</li>
              </ol>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-accent-200 bg-accent-50 p-4">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-accent-600" />
            <p className="text-sm text-accent-700">
              ملاحظة: هذه الإجراءات تتم من واجهة Bolt الأساسية وليس من داخل التطبيق نفسه.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Restore confirmation modal */}
      {restorePreview && (
        <Modal title="تأكيد استعادة البيانات" onClose={() => setRestorePreview(null)}>
          <div className="space-y-4">
            <div className="rounded-lg bg-warning-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-warning-600" />
                <p className="font-semibold text-warning-800">تحذير: سيتم إضافة البيانات إلى البيانات الحالية</p>
              </div>
              <p className="mt-2 text-sm text-warning-700">
                هذه العملية ستضيف السجلات من الملف إلى قاعدة البيانات. لا يمكن التراجع عنها.
              </p>
            </div>
            <div className="rounded-lg border border-secondary-200 bg-white p-4">
              <p className="mb-2 text-sm font-medium text-secondary-700">تفاصيل الملف:</p>
              <p className="text-xs text-secondary-500">تاريخ التصدير: {restorePreview.exported_at || 'غير معروف'}</p>
              <p className="text-xs text-secondary-500">إجمالي السجلات: {restorePreview.totalRecords} سجل</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(restorePreview.tables).map(([table, rows]) => (
                  Array.isArray(rows) && rows.length > 0 ? (
                    <span key={table} className="rounded-full bg-secondary-100 px-2.5 py-0.5 text-xs text-secondary-600">
                      {table}: {rows.length}
                    </span>
                  ) : null
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRestorePreview(null)} className="rounded-lg border border-secondary-200 px-4 py-2 text-sm font-medium text-secondary-600 transition hover:bg-secondary-50">
                إلغاء
              </button>
              <button onClick={confirmRestore} disabled={restoreBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-warning-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-warning-700 disabled:opacity-50">
                {restoreBusy ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                تأكيد الاستعادة
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function SectionCard({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-secondary-200 bg-white shadow-sm">
      <div className="border-b border-secondary-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-50 p-2 text-primary-600">{icon}</div>
          <div>
            <h3 className="font-bold text-secondary-800">{title}</h3>
            <p className="text-xs text-secondary-500">{desc}</p>
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function SettingsField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-secondary-700">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-secondary-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-400" />
    </div>
  )
}

function StorageModeCard({ active, icon, title, desc, onClick }: {
  active: boolean; icon: React.ReactNode; title: string; desc: string; onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className={`cursor-pointer rounded-xl border p-4 text-right transition ${active ? 'border-primary-300 bg-primary-50 ring-1 ring-primary-200' : 'border-secondary-200 bg-white hover:border-primary-200 hover:bg-primary-25'}`}>
      <div className={`mb-2 inline-flex rounded-lg p-2 ${active ? 'bg-primary-100 text-primary-700' : 'bg-secondary-100 text-secondary-500'}`}>
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-secondary-800">{title}</h4>
      <p className="text-xs text-secondary-500">{desc}</p>
      {active && <p className="mt-2 text-xs font-medium text-primary-600">— الحالي —</p>}
    </button>
  )
}
