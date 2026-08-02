import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface SystemSettings {
  id: string
  app_name: string
  app_description: string
  contact_email: string
  contact_phone: string
  contact_address: string
  logo_url: string
  storage_mode: string
  updated_at: string
  report_org_line1: string
  report_org_line2: string
  report_org_line3: string
  report_org_line4: string
  report_org_line5: string
  report_basmala: string
  report_attachments_label: string
  report_date_label: string
  report_number_label: string
}

const DEFAULT_SETTINGS: SystemSettings = {
  id: '',
  app_name: 'مخازن مدارس طلائع المبدعين الأهلية',
  app_description: 'نظام إدارة المخازن',
  contact_email: '',
  contact_phone: '',
  contact_address: '',
  logo_url: '',
  storage_mode: 'supabase',
  updated_at: '',
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

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('system_settings')
      .select('*')
      .maybeSingle()
    if (err) {
      setError(err.message)
      setSettings(DEFAULT_SETTINGS)
    } else if (data) {
      setSettings(data as SystemSettings)
    } else {
      setSettings(DEFAULT_SETTINGS)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function update(patch: Partial<SystemSettings>): Promise<boolean> {
    const { data, error: err } = await supabase
      .from('system_settings')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', settings.id)
      .select('*')
      .maybeSingle()
    if (err) { setError(err.message); return false }
    if (data) { setSettings(data as SystemSettings); return true }
    return false
  }

  return { settings, loading, error, update, reload: load }
}
