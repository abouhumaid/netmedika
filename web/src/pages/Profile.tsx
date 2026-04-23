import React, { useEffect, useState } from 'react'
import { showErrorAlert } from '../lib/alerts'
import { authService } from '../services/authService'
import type { SessionUser } from '../lib/types'

export default function Profile() {
  const [user, setUser] = useState<SessionUser | null>(authService.getCurrentUser())

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await authService.fetchProfile()
        setUser(profile)
      } catch (err) {
        await showErrorAlert('Profile unavailable', err instanceof Error ? err.message : 'Unable to load profile.')
      }
    }

    loadProfile()
  }, [])

  return (
    <section className="rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-black tracking-tight text-slate-900">Profile</h1>
      <p className="mt-2 text-sm text-slate-500">Your current web admin account details synced from the API.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-teal-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Name</div>
          <div className="mt-2 text-lg font-semibold text-slate-800">{user?.username || 'Admin user'}</div>
        </div>
        <div className="rounded-2xl bg-teal-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Email</div>
          <div className="mt-2 text-lg font-semibold text-slate-800">{user?.email || 'Not available'}</div>
        </div>
        <div className="rounded-2xl bg-teal-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Role</div>
          <div className="mt-2 text-lg font-semibold capitalize text-slate-800">{user?.role || 'admin'}</div>
        </div>
      </div>
    </section>
  )
}
