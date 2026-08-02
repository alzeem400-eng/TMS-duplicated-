import { useState, useEffect } from 'react'
import { Warehouse } from 'lucide-react'
import { supabase } from '../lib/supabase'

let cachedLogoUrl: string | null = null
let cachePromise: Promise<string | null> | null = null

async function fetchLogoUrl(): Promise<string | null> {
  if (cachedLogoUrl !== null) return cachedLogoUrl
  if (cachePromise) return cachePromise
  cachePromise = (async () => {
    const { data } = await supabase.from('system_settings').select('logo_url').maybeSingle()
    cachedLogoUrl = (data?.logo_url as string) || ''
    return cachedLogoUrl
  })()
  return cachePromise
}

/**
 * شعار المدرسة — يقرأ الشعار من إعدادات النظام (system_settings.logo_url).
 * إذا لم يوجد، يرجع إلى الصورة الافتراضية في مجلد public، ثم إلى شعار SVG.
 */
export function SchoolLogo({ size = 64, className = '' }: { size?: number; className?: string }) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchLogoUrl().then((url) => { if (!cancelled) setLogoUrl(url) })
    return () => { cancelled = true }
  }, [])

  // Try settings logo, then default file, then SVG fallback
  const imgSrc = logoUrl === '' ? null : logoUrl || '/WhatsApp_Image_2026-07-07_at_5.04.48_PM.jpeg'

  if (imgSrc && !failed) {
    return (
      <img
        src={imgSrc}
        alt="شعار مدارس طلائع المبدعين الأهلية"
        style={{ width: size, height: size, objectFit: 'contain' }}
        className={className}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white ${className}`}
      style={{ width: size, height: size }}
    >
      <Warehouse size={size * 0.35} />
      <span className="text-[7px] font-bold leading-none mt-0.5 text-center px-1">طلائع المبدعين</span>
    </div>
  )
}

/** مسح الكاش — يُستدعى بعد تحديث الشعار من صفحة الإعدادات */
export function invalidateLogoCache() {
  cachedLogoUrl = null
  cachePromise = null
}
