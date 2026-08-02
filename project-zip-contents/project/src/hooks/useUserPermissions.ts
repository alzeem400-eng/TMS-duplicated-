import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PermissionLevel } from '../types'

export type SectionKey =
  | 'overview' | 'items' | 'categories' | 'suppliers' | 'employees'
  | 'stock-in' | 'stock-out' | 'returns' | 'reports'
  | 'purchase-orders' | 'inventory' | 'invoices' | 'search' | 'backup' | 'settings'

const ALL_SECTIONS: SectionKey[] = [
  'overview', 'items', 'categories', 'suppliers', 'employees',
  'stock-in', 'stock-out', 'returns', 'reports',
  'purchase-orders', 'inventory', 'invoices', 'search', 'backup', 'settings',
]

export function useUserPermissions(isAdmin: boolean) {
  const [permissions, setPermissions] = useState<Map<string, PermissionLevel>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAdmin) { setLoading(false); return }
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { setLoading(false); return }
      supabase
        .from('user_permissions')
        .select('section, level')
        .eq('user_id', session.user.id)
        .then(({ data }) => {
          if (cancelled) return
          const m = new Map<string, PermissionLevel>()
          ;(data || []).forEach((p: { section: string; level: PermissionLevel }) => m.set(p.section, p.level))
          setPermissions(m)
          setLoading(false)
        })
    })
    return () => { cancelled = true }
  }, [isAdmin])

  function canAccess(section: string): boolean {
    if (isAdmin) return true
    return permissions.has(section)
  }

  function canAdd(section: string): boolean {
    if (isAdmin) return true
    const level = permissions.get(section)
    return level === 'add' || level === 'edit'
  }

  function canEdit(section: string): boolean {
    if (isAdmin) return true
    return permissions.get(section) === 'edit'
  }

  return { permissions, loading, canAccess, canAdd, canEdit, sections: ALL_SECTIONS }
}
