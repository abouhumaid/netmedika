const THEME_KEY = 'netmedika_web_theme'

export type AppTheme = 'light' | 'dark'

export function getStoredTheme(): AppTheme {
  if (typeof window === 'undefined') return 'light'
  const savedTheme = window.localStorage.getItem(THEME_KEY)
  return savedTheme === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: AppTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function saveTheme(theme: AppTheme) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(THEME_KEY, theme)
}
