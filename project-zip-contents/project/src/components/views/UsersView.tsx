import { useState, useEffect, useCallback } from 'react'
import { Loader2, Plus, KeyRound, Shield, Trash2, Search, UserCog, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { UserWithRole, UserRole, PermissionLevel } from '../../types'
import { Modal, ErrorBox, Field, Select, FormActions } from './CategoriesView'

const ROLE_LABELS: Record<UserRole, string> = { admin: 'مدير', manager: 'مسؤول', viewer: 'مشاهدة' }
const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-primary-100 text-primary-700',
  manager: 'bg-accent-100 text-accent-700',
  viewer: 'bg-secondary-100 text-secondary-600',
}

const LEVEL_LABELS: Record<PermissionLevel, string> = {
  view: 'استعراض فقط',
  add: 'استعراض وإضافة',
  edit: 'استعراض وإضافة وتعديل',
}

const SECTIONS: { key: string; label: string }[] = [
  { key: 'overview', label: 'لوحة التحكم' },
  { key: 'search', label: 'البحث المتقدم' },
  { key: 'items', label: 'الأصناف' },
  { key: 'categories', label: 'التصنيفات' },
  { key: 'stock-in', label: 'المخزون الوارد' },
  { key: 'stock-out', label: 'المخزون المنصرف' },
  { key: 'returns', label: 'المرتجعات والتالف' },
  { key: 'suppliers', label: 'الموردون' },
  { key: 'employees', label: 'الموظفون' },
  { key: 'purchase-orders', label: 'طلبات الشراء' },
  { key: 'invoices', label: 'الفواتير' },
  { key: 'inventory', label: 'الجرد' },
  { key: 'reports', label: 'التقارير' },
  { key: 'backup', label: 'النسخ الاحتياطي' },
]

const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export function UsersView() {
  const [users, setUsers] = useState<UserWithRole[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [pwdTarget, setPwdTarget] = useState<UserWithRole | null>(null)
  const [roleTarget, setRoleTarget] = useState<UserWithRole | null>(null)
  const [permTarget, setPermTarget] = useState<UserWithRole | null>(null)
  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'viewer' as UserRole })
  const [pwdForm, setPwdForm] = useState({ newPassword: '' })
  const [roleForm, setRoleForm] = useState<UserRole>('viewer')
  const [permForm, setPermForm] = useState<Record<string, PermissionLevel>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }
    try {
      const res = await fetch(`${fnUrl}?action=list`, {
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: anonKey },
      })
      const json = await res.json()
      if (res.ok) setUsers(json.users || [])
      else setError(json.error || 'تعذّر التحميل')
    } catch {
      setError('تعذّر الاتصال بالخادم')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter((u) => u.email.includes(query))

  async function callApi(action: string, body: Record<string, unknown>) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { error: 'لا يوجد جلسة' }
    const res = await fetch(`${fnUrl}?action=${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', apikey: anonKey },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error || 'فشل الطلب' }
    return { error: null }
  }

  async function handleCreate() {
    setError(null)
    if (!createForm.email.trim() || !createForm.password) { setError('البريد وكلمة المرور مطلوبان'); return }
    setBusy(true)
    const { error: err } = await callApi('create', createForm)
    setBusy(false)
    if (err) { setError(err); return }
    setCreateOpen(false); setCreateForm({ email: '', password: '', role: 'viewer' }); load()
  }

  async function handleResetPassword() {
    if (!pwdTarget) return
    setError(null)
    if (!pwdForm.newPassword) { setError('كلمة المرور الجديدة مطلوبة'); return }
    setBusy(true)
    const { error: err } = await callApi('reset-password', { targetUserId: pwdTarget.id, newPassword: pwdForm.newPassword })
    setBusy(false)
    if (err) { setError(err); return }
    setPwdTarget(null); setPwdForm({ newPassword: '' }); load()
  }

  async function handleUpdateRole() {
    if (!roleTarget) return
    setError(null)
    setBusy(true)
    const { error: err } = await callApi('update-role', { targetUserId: roleTarget.id, role: roleForm })
    setBusy(false)
    if (err) { setError(err); return }
    setRoleTarget(null); load()
  }

  async function handleDelete(u: UserWithRole) {
    if (!confirm(`حذف المستخدم ${u.email}؟`)) return
    setBusy(true)
    const { error: err } = await callApi('delete', { targetUserId: u.id })
    setBusy(false)
    if (err) { setError(err); return }
    load()
  }

  function openPermissions(u: UserWithRole) {
    const existing: Record<string, PermissionLevel> = {}
    ;(u.permissions || []).forEach((p) => { existing[p.section] = p.level })
    setPermForm(existing)
    setPermTarget(u)
    setError(null)
  }

  async function handleSavePermissions() {
    if (!permTarget) return
    setError(null)
    setBusy(true)
    // delete all existing then re-insert — simplest sync
    const { error: dErr } = await callApi('delete-permission', { targetUserId: permTarget.id, section: '*' })
    if (dErr) { setBusy(false); setError(dErr); return }
    const entries = Object.entries(permForm)
    for (const [section, level] of entries) {
      const { error: err } = await callApi('set-permission', { targetUserId: permTarget.id, section, level })
      if (err) { setBusy(false); setError(err); return }
    }
    setBusy(false)
    setPermTarget(null)
    load()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-primary-600" />
        <p className="mt-3 text-secondary-500">جارٍ تحميل المستخدمين…</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-secondary-800">إدارة المستخدمين <span className="text-sm font-normal text-secondary-400">({users.length})</span></h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث…"
              className="w-40 rounded-lg border border-secondary-200 bg-white py-2 pr-9 pl-3 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 sm:w-52" />
          </div>
          <button onClick={() => { setCreateOpen(true); setError(null) }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-700">
            <Plus size={16} /> <span className="hidden sm:inline">إضافة مستخدم</span>
          </button>
        </div>
      </div>

      {error && <div className="mb-4"><ErrorBox text={error} /></div>}

      <div className="overflow-x-auto rounded-xl border border-secondary-200 bg-white">
        <table className="w-full text-right text-sm">
          <thead className="bg-secondary-50 text-xs text-secondary-500">
            <tr>
              <th className="px-4 py-3 font-medium">البريد الإلكتروني</th>
              <th className="px-4 py-3 font-medium">الدور</th>
              <th className="px-4 py-3 font-medium">الصلاحيات</th>
              <th className="px-4 py-3 font-medium">تاريخ الإنشاء</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100">
            {filtered.map((u) => (
              <tr key={u.id} className="transition hover:bg-secondary-50/60">
                <td className="px-4 py-3 font-medium text-secondary-800" dir="ltr">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                </td>
                <td className="px-4 py-3 text-secondary-600">
                  {u.role === 'admin' ? (
                    <span className="text-xs text-primary-600">صلاحيات كاملة</span>
                  ) : (u.permissions || []).length === 0 ? (
                    <span className="text-xs text-secondary-400">لا توجد</span>
                  ) : (
                    <span className="text-xs text-secondary-500">{(u.permissions || []).length} قسم</span>
                  )}
                </td>
                <td className="px-4 py-3 text-secondary-600" dir="ltr">{u.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openPermissions(u)} title="إدارة الصلاحيات"
                      className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><Lock size={15} /></button>
                    <button onClick={() => { setRoleTarget(u); setRoleForm(u.role); setError(null) }} title="تغيير الدور"
                      className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><Shield size={15} /></button>
                    <button onClick={() => { setPwdTarget(u); setPwdForm({ newPassword: '' }); setError(null) }} title="تغيير كلمة المرور"
                      className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-secondary-100 hover:text-primary-600"><KeyRound size={15} /></button>
                    <button onClick={() => handleDelete(u)} disabled={busy} title="حذف"
                      className="rounded-lg p-1.5 text-secondary-400 transition hover:bg-danger-50 hover:text-danger-600"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create user modal */}
      {createOpen && (
        <Modal title="إضافة مستخدم جديد" onClose={() => setCreateOpen(false)}>
          <div className="space-y-4">
            {error && <ErrorBox text={error} />}
            <Field label="البريد الإلكتروني" value={createForm.email} onChange={(v) => setCreateForm({ ...createForm, email: v })} />
            <Field label="كلمة المرور" type="password" value={createForm.password} onChange={(v) => setCreateForm({ ...createForm, password: v })} />
            <Select label="الدور" value={createForm.role} onChange={(v) => setCreateForm({ ...createForm, role: v as UserRole })}
              options={[{ value: 'admin', label: 'مدير (صلاحيات كاملة)' }, { value: 'manager', label: 'مسؤول (إدارة البيانات)' }, { value: 'viewer', label: 'مشاهدة فقط' }]} />
            <p className="text-xs text-secondary-500">كلمة المرور يجب أن تكون قوية (حروف وأرقام ورموز). بعد الإنشاء يمكنك تحديد صلاحيات الأقسام.</p>
            <FormActions busy={busy} onCancel={() => setCreateOpen(false)} submitLabel="إنشاء" onSubmit={handleCreate} />
          </div>
        </Modal>
      )}

      {/* Reset password modal */}
      {pwdTarget && (
        <Modal title={`تغيير كلمة المرور — ${pwdTarget.email}`} onClose={() => setPwdTarget(null)}>
          <div className="space-y-4">
            {error && <ErrorBox text={error} />}
            <Field label="كلمة المرور الجديدة" type="password" value={pwdForm.newPassword} onChange={(v) => setPwdForm({ newPassword: v })} />
            <p className="text-xs text-secondary-500">كلمة المرور يجب أن تكون قوية (حروف وأرقام ورموز)</p>
            <FormActions busy={busy} onCancel={() => setPwdTarget(null)} submitLabel="تحديث" onSubmit={handleResetPassword} />
          </div>
        </Modal>
      )}

      {/* Change role modal */}
      {roleTarget && (
        <Modal title={`تغيير دور — ${roleTarget.email}`} onClose={() => setRoleTarget(null)}>
          <div className="space-y-4">
            {error && <ErrorBox text={error} />}
            <Select label="الدور" value={roleForm} onChange={(v) => setRoleForm(v as UserRole)}
              options={[{ value: 'admin', label: 'مدير (صلاحيات كاملة)' }, { value: 'manager', label: 'مسؤول (إدارة البيانات)' }, { value: 'viewer', label: 'مشاهدة فقط' }]} />
            <FormActions busy={busy} onCancel={() => setRoleTarget(null)} submitLabel="حفظ" onSubmit={handleUpdateRole} />
          </div>
        </Modal>
      )}

      {/* Permissions modal */}
      {permTarget && (
        <Modal title={`صلاحيات الأقسام — ${permTarget.email}`} onClose={() => setPermTarget(null)}>
          <div className="space-y-4">
            {error && <ErrorBox text={error} />}
            {permTarget.role === 'admin' ? (
              <p className="text-sm text-primary-600">المدير لديه صلاحيات كاملة على جميع الأقسام تلقائيًا.</p>
            ) : (
              <>
                <p className="text-sm text-secondary-600">حدّد مستوى الصلاحية لكل قسم. الأقسام غير المحددة لن تكون متاحة للمستخدم.</p>
                <div className="max-h-80 space-y-2 overflow-y-auto pl-1">
                  {SECTIONS.map((s) => (
                    <div key={s.key} className="flex items-center justify-between rounded-lg border border-secondary-200 bg-secondary-50/50 px-3 py-2">
                      <span className="text-sm font-medium text-secondary-700">{s.label}</span>
                      <select
                        value={permForm[s.key] || ''}
                        onChange={(e) => {
                          const v = e.target.value as PermissionLevel | ''
                          const next = { ...permForm }
                          if (v === '') delete next[s.key]
                          else next[s.key] = v
                          setPermForm(next)
                        }}
                        className="rounded-lg border border-secondary-200 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-primary-400">
                        <option value="">بدون صلاحية</option>
                        <option value="view">{LEVEL_LABELS.view}</option>
                        <option value="add">{LEVEL_LABELS.add}</option>
                        <option value="edit">{LEVEL_LABELS.edit}</option>
                      </select>
                    </div>
                  ))}
                </div>
                <FormActions busy={busy} onCancel={() => setPermTarget(null)} submitLabel="حفظ الصلاحيات" onSubmit={handleSavePermissions} />
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
