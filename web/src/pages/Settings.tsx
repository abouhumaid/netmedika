import React, { useEffect, useState } from 'react'
import { API_BASE_URL } from '../lib/api'
import { getStoredTheme } from '../lib/theme'

const SETTINGS_STORAGE_KEY = 'netmedika.settings.preferences'

type StoredSettings = {
  twoFactorEnabled: boolean
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function Settings() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (!raw) {
        return
      }

      const stored = JSON.parse(raw) as Partial<StoredSettings>
      setTwoFactorEnabled(Boolean(stored.twoFactorEnabled))
      setCurrentPassword(stored.currentPassword || '')
      setNewPassword(stored.newPassword || '')
      setConfirmPassword(stored.confirmPassword || '')
    } catch {
      // Ignore malformed local state and keep defaults.
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const payload: StoredSettings = {
      twoFactorEnabled,
      currentPassword,
      newPassword,
      confirmPassword,
    }
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload))
  }, [twoFactorEnabled, currentPassword, newPassword, confirmPassword])

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Manage account security and workspace preferences.</p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-teal-100 bg-teal-50/70 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-slate-900">2-factor authentication</div>
                <p className="mt-1 text-sm text-slate-500">Add an extra sign-in verification layer for this admin account.</p>
              </div>
              <button
                type="button"
                onClick={() => setTwoFactorEnabled((enabled) => !enabled)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                  twoFactorEnabled ? 'bg-teal-700' : 'bg-slate-300'
                }`}
                aria-pressed={twoFactorEnabled}
                aria-label="Toggle two-factor authentication"
              >
                <span
                  className={`inline-block h-6 w-6 rounded-full bg-white transition ${
                    twoFactorEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700">
              Status: <span className="font-bold text-teal-700">{twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-sm">
            <div className="text-lg font-bold text-slate-900">Workspace summary</div>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Theme', value: getStoredTheme() === 'dark' ? 'Dark mode' : 'Light mode' },
                { label: 'Store timezone', value: 'Africa/Lagos' },
                { label: 'API mode', value: 'Live backend' },
                { label: 'API endpoint', value: API_BASE_URL },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="font-medium text-slate-700">{item.label}</span>
                  <span className="text-sm font-semibold text-teal-700">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Change password</h2>
          <p className="mt-2 text-sm text-slate-500">Prepare updated credentials for this admin workspace.</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Enter current password"
              className="w-full rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
              className="w-full rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-2xl border border-teal-100 bg-teal-50/50 px-4 py-3 text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
            />
          </label>
        </div>

        <div className="mt-6 rounded-3xl bg-teal-50 px-5 py-4 text-sm text-slate-600">
          {newPassword && confirmPassword && newPassword === confirmPassword
            ? 'New password entries match and are ready for backend wiring.'
            : 'Password fields are currently a frontend settings surface and can be connected to the API when an endpoint is available.'}
        </div>
      </section>
    </div>
  )
}
