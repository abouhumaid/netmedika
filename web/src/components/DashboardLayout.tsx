import React, { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/orders', label: 'Orders' },
  { to: '/dashboard/profile', label: 'Profile' },
  { to: '/dashboard/settings', label: 'Settings' },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 1024
  )
  const [search, setSearch] = useState('')
  const user = authService.getCurrentUser()
  const initials = (user?.username || 'Admin')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 1024) setSidebarOpen(false)
      if (window.innerWidth >= 1024) setSidebarOpen(true)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  async function handleLogout() {
    await authService.logout()
    navigate('/login')
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = search.trim()
    navigate(value ? `/orders?search=${encodeURIComponent(value)}` : '/orders')
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-app text-slate-900">
      {sidebarOpen ? (
        <button
          className="fixed inset-0 z-20 bg-slate-950/35 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      ) : null}

      <div className={`grid min-h-screen ${sidebarOpen ? 'lg:grid-cols-[280px_minmax(0,1fr)]' : 'lg:grid-cols-[0px_minmax(0,1fr)]'}`}>
        <aside
          className={`fixed inset-y-0 left-0 z-30 flex w-[280px] flex-col border-r border-teal-900/20 bg-sidebar text-white shadow-2xl shadow-slate-950/25 transition-transform duration-200 lg:static ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-r-0'
          }`}
        >
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-sm font-black tracking-[0.2em] text-white">
                NM
              </span>
              <div>
                <div className="text-lg font-black tracking-tight">Netmedika</div>
                <div className="text-xs uppercase tracking-[0.18em] text-teal-100/80">Admin workspace</div>
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 py-5">
            <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-100/70">Navigation</div>
            <nav className="mt-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false)
                  }}
                  className={({ isActive }) =>
                    `flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isActive ? 'bg-white text-teal-800 shadow-sm' : 'text-teal-50 hover:bg-white/10'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="border-t border-white/10 px-4 py-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{user?.username || 'Admin'}</div>
                <div className="truncate text-xs text-teal-100/80">{user?.email || 'admin@netmedika.com'}</div>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-teal-50 transition hover:bg-white/10"
              >
                Log out
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 border-b border-teal-100 bg-white/90 px-4 py-4 shadow-sm backdrop-blur sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-100 text-teal-700 transition hover:border-teal-200 hover:bg-teal-50"
                  onClick={() => setSidebarOpen((open) => !open)}
                  aria-label="Toggle sidebar"
                >
                  <span className="text-lg font-black">=</span>
                </button>
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/80 px-4 py-3 sm:min-w-[320px]"
                >
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    placeholder="Search orders by user, order ID, or medicine"
                    aria-label="Search orders"
                  />
                  <button type="submit" className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                    Search
                  </button>
                </form>
              </div>

              <div className="flex items-center justify-end gap-3">
                <div className="rounded-full border border-teal-100 bg-teal-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
                  {user?.role || 'admin'}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
