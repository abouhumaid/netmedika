import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { applyTheme, getStoredTheme, saveTheme, type AppTheme } from '../lib/theme'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/dashboard/orders', label: 'Orders', icon: '📦' },
  { to: '/dashboard/users', label: 'Users', icon: '👥' },
]

export default function DashboardLayout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 1024
  )
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState<AppTheme>(() => getStoredTheme())
  const menuRef = useRef<HTMLDivElement | null>(null)
  const user = authService.getCurrentUser()
  const firstName = user?.username?.trim().split(/\s+/)[0] || 'Admin'
  const avatarLetter = firstName.charAt(0).toUpperCase()

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 1024) setSidebarOpen(false)
      if (window.innerWidth >= 1024) setSidebarOpen(true)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    applyTheme(theme)
    saveTheme(theme)
  }, [theme])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  async function handleLogout() {
    await authService.logout()
    navigate('/')
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = search.trim()
    navigate(value ? `/dashboard/orders?search=${encodeURIComponent(value)}` : '/dashboard/orders')
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  function handleThemeToggle() {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  return (
    <div className="min-h-screen bg-app text-slate-900 transition-colors dark:text-slate-100">
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
              <div>
                <div className="text-lg font-black tracking-tight">Netmedika</div>
                <div className="text-xs uppercase tracking-[0.18em] text-teal-100/80">Admin Dashboard</div>
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
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isActive ? 'bg-white text-teal-800 shadow-sm' : 'text-teal-50 hover:bg-white/10'
                    }`
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="border-t border-white/10 px-4 py-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white">
                {avatarLetter}
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
          <header className="sticky top-0 z-10 border-b border-teal-100 bg-white/90 px-4 py-4 shadow-sm backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-teal-100 text-teal-700 transition hover:border-teal-200 hover:bg-teal-50 dark:border-slate-800 dark:text-teal-300 dark:hover:bg-slate-900"
                  onClick={() => setSidebarOpen((open) => !open)}
                  aria-label="Toggle sidebar"
                >
                  <span className="text-lg font-black">=</span>
                </button>
                <form
                  onSubmit={handleSearchSubmit}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/80 px-4 py-3 transition-colors dark:border-slate-800 dark:bg-slate-900 sm:min-w-[320px]"
                >
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
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
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    className="flex items-center gap-3 rounded-full border border-teal-100 bg-white px-2 py-2 text-left shadow-sm transition hover:border-teal-200 hover:bg-teal-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 text-sm font-black text-white">
                      {avatarLetter}
                    </span>
                    <span className="hidden sm:block">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{firstName}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{user?.email || 'admin@netmedika.com'}</span>
                    </span>
                  </button>

                  {menuOpen ? (
                    <div className="absolute right-0 mt-3 w-72 rounded-[24px] border border-teal-100 bg-white p-3 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950">
                      <div className="flex items-center gap-3 rounded-2xl bg-teal-50 px-3 py-3 dark:bg-slate-900">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 text-base font-black text-white">
                          {avatarLetter}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.username || 'Admin'}</div>
                          <div className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email || 'admin@netmedika.com'}</div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1">
                        <Link
                          to="/dashboard/profile"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-teal-50 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          Profile
                        </Link>
                        <Link
                          to="/dashboard/settings"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-teal-50 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          Settings
                        </Link>
                        <button
                          type="button"
                          onClick={handleThemeToggle}
                          className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-teal-50 dark:text-slate-200 dark:hover:bg-slate-900"
                        >
                          <span>Dark mode</span>
                          <span
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                              theme === 'dark' ? 'bg-teal-700' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 rounded-full bg-white transition ${
                                theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center rounded-2xl px-3 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  ) : null}
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
