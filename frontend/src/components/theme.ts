export type ThemeChoice = 'light' | 'system' | 'dark'

export const THEME_STORAGE_KEY = 'nanko-theme'

export function applyTheme(choice: ThemeChoice): void {
  if (choice === 'system') {
    localStorage.removeItem(THEME_STORAGE_KEY)
    document.documentElement.removeAttribute('data-theme')
  } else {
    localStorage.setItem(THEME_STORAGE_KEY, choice)
    document.documentElement.setAttribute('data-theme', choice)
  }
}

export function getInitialTheme(): ThemeChoice {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  return 'system'
}
