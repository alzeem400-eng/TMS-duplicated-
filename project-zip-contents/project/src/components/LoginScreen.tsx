import { useState, type FormEvent } from 'react'
import { Loader2, Lock, Mail, UserPlus, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from './AuthContext'
import { SchoolLogo } from './SchoolLogo'

export function LoginScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور')
      return
    }
    setBusy(true)
    const fn = mode === 'login' ? signIn : signUp
    const { error: err } = await fn(email.trim(), password)
    setBusy(false)
    if (err) {
      if (err.includes('Invalid login')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      } else if (err.includes('already registered') || err.includes('already been registered')) {
        setError('هذا البريد مسجل بالفعل — سجّل الدخول بدلاً من ذلك')
      } else if (err.includes('password')) {
        setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      } else {
        setError(err)
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-secondary-50 via-primary-50/40 to-accent-50/30 px-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo / title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <SchoolLogo size={80} className="rounded-2xl shadow-lg shadow-primary-600/20" />
          </div>
          <h1 className="text-2xl font-bold text-secondary-800">مخازن مدارس طلائع المبدعين الأهلية</h1>
          <p className="mt-1 text-sm text-secondary-500">نظام إدارة المخازن</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-secondary-200 bg-white p-6 shadow-xl sm:p-8">
          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-secondary-100 p-1">
            <button
              onClick={() => { setMode('login'); setError(null) }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                mode === 'login' ? 'bg-white text-primary-700 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              <LogIn size={16} />
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null) }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                mode === 'signup' ? 'bg-white text-primary-700 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              <UserPlus size={16} />
              إنشاء حساب
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary-700">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@school.edu"
                  className="w-full rounded-lg border border-secondary-200 bg-secondary-50/50 py-2.5 pr-10 pl-3 text-secondary-800 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
                  dir="ltr"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-secondary-700">كلمة المرور</label>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-secondary-200 bg-secondary-50/50 py-2.5 pr-10 pl-3 text-secondary-800 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
              {mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
            </button>
          </form>

          {mode === 'signup' && (
            <p className="mt-4 text-center text-xs text-secondary-500">
              بعد إنشاء الحساب سيتم تسجيل دخولك تلقائيًا
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-secondary-400">
          © {new Date().getFullYear()} مخازن مدارس طلائع المبدعين الأهلية
        </p>
      </div>
    </div>
  )
}
