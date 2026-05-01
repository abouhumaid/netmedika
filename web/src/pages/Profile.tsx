import React, { useEffect, useState } from 'react'
import { showErrorAlert } from '../lib/alerts'
import { authService } from '../services/authService'
import type { SessionUser } from '../lib/types'

const PROFILE_STORAGE_KEY = 'netmedika.profile.preferences'

type EditableProfile = {
  username: string
  email: string
  phone: string
  avatarUrl: string
}

function getStoredProfileDetails() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<EditableProfile>) : null
  } catch {
    return null
  }
}

function getEditableProfile(user: SessionUser | null): EditableProfile {
  const stored = getStoredProfileDetails()

  return {
    username: stored?.username || user?.username || 'Admin user',
    email: stored?.email || user?.email || 'Not available',
    phone: stored?.phone || user?.phone || '',
    avatarUrl: stored?.avatarUrl || user?.avatarUrl || '',
  }
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'A'
}

export default function Profile() {
  const [user, setUser] = useState<SessionUser | null>(authService.getCurrentUser())
  const [profile, setProfile] = useState<EditableProfile>(() => getEditableProfile(authService.getCurrentUser()))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await authService.fetchProfile()
        setUser(profile)
        setProfile(getEditableProfile(profile))
      } catch (err) {
        await showErrorAlert('Profile unavailable', err instanceof Error ? err.message : 'Unable to load profile.')
      }
    }

    loadProfile()
  }, [])

  function updateField<K extends keyof EditableProfile>(field: K, value: EditableProfile[K]) {
    setProfile((current) => ({ ...current, [field]: value }))
  }

  function saveProfile() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
    }
    setEditing(false)
  }

  const hasAvatar = Boolean(profile.avatarUrl)

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          {hasAvatar ? (
            <img
              src={profile.avatarUrl}
              alt={`${profile.username} avatar`}
              className="h-28 w-28 rounded-full object-cover shadow-lg shadow-teal-900/10"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-teal-100 text-3xl font-black text-teal-700">
              {getInitials(profile.username)}
            </div>
          )}

          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">Profile</h1>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Keep your admin identity up to date across the web workspace.
          </p>
        </div>

        <div className="mt-8 rounded-3xl bg-teal-50/80 p-5">
          <label className="block text-sm font-semibold text-slate-700">Avatar image URL</label>
          <input
            value={profile.avatarUrl}
            onChange={(event) => updateField('avatarUrl', event.target.value)}
            placeholder="Paste an image URL to add your picture"
            className="mt-3 w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
          />
          <button
            type="button"
            onClick={saveProfile}
            className="mt-4 w-full rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-teal-800"
          >
            {hasAvatar ? 'Update picture' : 'Add picture'}
          </button>
        </div>

        <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 px-5 py-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Account role</div>
          <div className="mt-2 text-lg font-semibold capitalize text-slate-900">{user?.role || 'admin'}</div>
        </div>
      </section>

      <section className="rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Contact card</h2>
            <p className="mt-2 text-sm text-slate-500">Username, email, and phone details with quick inline editing.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (editing) {
                saveProfile()
              } else {
                setEditing(true)
              }
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
          >
            <span aria-hidden="true">✎</span>
            <span>{editing ? 'Save' : 'Edit'}</span>
          </button>
        </div>

        <div className="mt-8 space-y-4">
          {[
            { key: 'username', label: 'Username', value: profile.username, placeholder: 'Enter username' },
            { key: 'email', label: 'Email', value: profile.email, placeholder: 'Enter email address' },
            { key: 'phone', label: 'Phone', value: profile.phone, placeholder: 'Add a phone number' },
          ].map((item) => (
            <div key={item.key} className="rounded-3xl border border-teal-100 bg-teal-50/60 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">{item.label}</div>
              {editing ? (
                <input
                  value={item.value}
                  onChange={(event) => updateField(item.key as keyof EditableProfile, event.target.value)}
                  placeholder={item.placeholder}
                  className="mt-3 w-full rounded-2xl border border-white bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                />
              ) : (
                <div className="mt-3 text-lg font-semibold text-slate-900">{item.value || 'Not added yet'}</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
