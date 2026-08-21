import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types'

export function useUserRole() {
  const [role, setRole] = useState<UserRole>('viewer')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { setRole('viewer'); setLoading(false); return }
      supabase.from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle()
        .then(({ data }) => {
          if (cancelled) return
          if (data?.role) setRole(data.role as UserRole)
          else setRole('admin')
          setLoading(false)
        })
    })
    return () => { cancelled = true }
  }, [])

  const isAdmin = role === 'admin'
  return { role, isAdmin, loading }
}
