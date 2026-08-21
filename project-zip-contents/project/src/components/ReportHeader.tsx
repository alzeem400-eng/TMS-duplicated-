import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { SchoolLogo } from './SchoolLogo'
import { supabase } from '../lib/supabase'
import type { SystemSettings } from '../hooks/useSystemSettings'

const DEFAULT_HEADER = {
  report_org_line1: 'الجمهورية اليمنية',
  report_org_line2: 'وزارة التربية والتعليم والبحث العلمي',
  report_org_line3: 'مكتب التربية والتعليم محافظة صنعاء',
  report_org_line4: 'مكتب التربية والتعليم مديرية همدان',
  report_org_line5: 'مدارس طلائع المبدعين الأهلية',
  report_basmala: 'بسم الله الرحمن الرحيم',
  report_attachments_label: 'المرفقات',
  report_date_label: 'التاريخ',
  report_number_label: 'الرقم',
}

let cachedHeader: Partial<SystemSettings> | null = null
let headerPromise: Promise<Partial<SystemSettings>> | null = null

async function fetchHeaderSettings(): Promise<Partial<SystemSettings>> {
  if (cachedHeader) return cachedHeader
  if (headerPromise) return headerPromise
  headerPromise = (async () => {
    const { data } = await supabase.from('system_settings').select('*').maybeSingle()
    cachedHeader = (data as Partial<SystemSettings>) || {}
    return cachedHeader
  })()
  return headerPromise
}

export function invalidateHeaderCache() {
  cachedHeader = null
  headerPromise = null
}

interface ReportHeaderProps {
  title?: string
  subtitle?: string
  attachments?: string
  date?: string
  number?: string
}

export function ReportHeader({
  title,
  subtitle,
  attachments = '',
  date = new Date().toISOString().slice(0, 10),
  number = '',
}: ReportHeaderProps) {
  const [hdr, setHdr] = useState<Partial<SystemSettings>>(DEFAULT_HEADER)

  useEffect(() => {
    let cancelled = false
    fetchHeaderSettings().then((s) => {
      if (!cancelled) setHdr({ ...DEFAULT_HEADER, ...s })
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="report-header w-full border-b-2 border-secondary-300 pb-4">
      <div className="flex items-start justify-between gap-4">
        {/* اليمين — الجهات الرسمية */}
        <div className="flex-1 text-right">
          <p className="text-xs font-bold text-secondary-800 leading-relaxed">{hdr.report_org_line1}</p>
          <p className="text-xs font-semibold text-secondary-700 leading-relaxed">{hdr.report_org_line2}</p>
          <p className="text-xs text-secondary-600 leading-relaxed">{hdr.report_org_line3}</p>
          <p className="text-xs text-secondary-600 leading-relaxed">{hdr.report_org_line4}</p>
          <p className="text-xs font-bold text-secondary-700 leading-relaxed">{hdr.report_org_line5}</p>
        </div>

        {/* الوسط — البسملة والشعار */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-bold text-secondary-800" style={{ fontFamily: 'Amiri, serif' }}>
            {hdr.report_basmala}
          </p>
          <SchoolLogo size={72} />
        </div>

        {/* اليسار — المرفقات */}
        <div className="flex-1">
          <p className="text-xs text-secondary-700">{hdr.report_attachments_label}: {attachments}</p>
          <p className="text-xs text-secondary-700">{hdr.report_date_label}: {date}</p>
          <p className="text-xs text-secondary-700">{hdr.report_number_label}: {number}</p>
        </div>
      </div>

      {/* عنوان التقرير */}
      {title && (
        <div className="mt-4 text-center">
          <h2 className="text-lg font-bold text-secondary-800">{title}</h2>
          {subtitle && <p className="text-sm text-secondary-600">{subtitle}</p>}
        </div>
      )}
    </div>
  )
}

/** غلاف للتقرير يضيف الترويسة + طباعة */
export function ReportDocument({
  children,
  title,
  subtitle,
  attachments,
  date,
  number,
  actions,
}: {
  children: ReactNode
  title?: string
  subtitle?: string
  attachments?: string
  date?: string
  number?: string
  actions?: ReactNode
}) {
  return (
    <div>
      {actions && <div className="mb-4 flex items-center justify-end gap-2 print:hidden">{actions}</div>}
      <div className="rounded-xl border border-secondary-200 bg-white p-6 print:border-0 print:p-0">
        <ReportHeader title={title} subtitle={subtitle} attachments={attachments} date={date} number={number} />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
