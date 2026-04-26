import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { showErrorAlert } from '../lib/alerts'
import { getFieldErrors, loginSchema, type LoginFormValues } from '../lib/validation'
import { authService } from '../services/authService'

export default function Login() {
  const [values, setValues] = useState<LoginFormValues>({ email: '', password: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const user = authService.getCurrentUser()
    if (user?.role === 'admin') {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  function updateField<K extends keyof LoginFormValues>(field: K, value: LoginFormValues[K]) {
    const nextValues = { ...values, [field]: value }
    setValues(nextValues)
    setErrors((prev) => ({ ...prev, [field]: getFieldErrors(loginSchema, nextValues)[field] }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors = getFieldErrors(loginSchema, values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      await showErrorAlert('Validation error', 'Please correct the highlighted fields and try again.')
      return
    }

    setSubmitting(true)

    try {
      const user = await authService.login(values)
      navigate(user.role === 'admin' ? '/dashboard' : '/login', { replace: true })
    } catch (err) {
      await showErrorAlert('Sign in failed', err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section className="relative mx-auto w-full max-w-md overflow-hidden rounded-[32px] border border-white/60 bg-white/45 p-8 shadow-2xl shadow-teal-950/10 backdrop-blur-md sm:p-10">
        <div className="pointer-events-none absolute -left-16 top-10 h-44 w-44 rounded-full bg-[radial-gradient(circle,_rgba(20,184,166,0.22),_transparent_68%)]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(16,185,129,0.18),_transparent_70%)]" />

        <div className="items-center gap-2 text-center">
          <p className="text-[15px] font-semibold uppercase tracking-[3px] text-teal-700">Sign in</p>
          <h2 className="text-center text-[36px] font-black tracking-[2px] text-slate-900 sm:text-[42px]">
            <span className="text-teal-700">Net</span>
            <span className="text-emerald-500">medika</span>
          </h2>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
            <input
              className={`w-full rounded-2xl border px-4 py-3 text-slate-900 outline-none transition focus:bg-white focus:ring-4 ${
                errors.email
                  ? 'border-rose-300 bg-rose-50/50 focus:border-rose-400 focus:ring-rose-100'
                  : 'border-teal-100 bg-white/80 focus:border-teal-400 focus:ring-teal-100'
              }`}
              value={values.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="admin@netmedika.com"
              required
            />
            {errors.email ? <span className="mt-2 block text-sm font-medium text-rose-600">{errors.email}</span> : null}
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full rounded-2xl border px-4 py-3 pr-20 text-slate-900 outline-none transition focus:bg-white focus:ring-4 ${
                  errors.password
                    ? 'border-rose-300 bg-rose-50/50 focus:border-rose-400 focus:ring-rose-100'
                    : 'border-teal-100 bg-white/80 focus:border-teal-400 focus:ring-teal-100'
                }`}
                value={values.password}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-700 transition hover:bg-teal-50"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password ? <span className="mt-2 block text-sm font-medium text-rose-600">{errors.password}</span> : null}
          </label>

          <button
            className="w-full rounded-2xl bg-teal-700 px-5 py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* <div className="mt-6 text-sm text-slate-600 text-center">
          Need New Account ?{' '}
          <Link to="/register" className="font-semibold text-teal-700 transition hover:text-teal-900">
            Create one
          </Link>
        </div> */}
      </section>
    </div>
  )
}
