import React from 'react'
import { API_BASE_URL } from '../lib/api'
import { getStoredTheme } from '../lib/theme'

const settingsItems = [
  { label: 'Notifications', value: 'Enabled' },
  { label: 'Store timezone', value: 'Africa/Lagos' },
  { label: 'Theme', value: getStoredTheme() === 'dark' ? 'Dark mode' : 'Light mode' },
  { label: 'API mode', value: 'Live backend' },
  { label: 'API endpoint', value: API_BASE_URL },
]

export default function Settings() {
  return (
    <section className="rounded-[28px] border border-teal-100 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-black tracking-tight text-slate-900">Settings</h1>
      <p className="mt-2 text-sm text-slate-500">A lightweight settings page for the web admin workspace.</p>

      <div className="mt-8 space-y-4">
        {settingsItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-2xl bg-teal-50 px-4 py-4">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="text-sm font-semibold text-teal-700">{item.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
