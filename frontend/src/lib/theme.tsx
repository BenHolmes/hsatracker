import { Monitor, Moon, Sun } from 'lucide-react'
import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function getSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyDark(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    return 'system'
  })

  useEffect(() => {
    if (theme === 'dark') {
      applyDark(true)
    } else if (theme === 'light') {
      applyDark(false)
    } else {
      applyDark(getSystemDark())

      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => applyDark(e.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  const setTheme = (next: Theme) => {
    localStorage.setItem('theme', next)
    setThemeState(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Cycles system → light → dark → system. Pass className for surface-specific styling.
const CYCLE: Theme[] = ['system', 'light', 'dark']
const THEME_ICONS: Record<Theme, React.ElementType> = { system: Monitor, light: Sun, dark: Moon }
const THEME_LABELS: Record<Theme, string> = { system: 'System theme', light: 'Light theme', dark: 'Dark theme' }

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const Icon = THEME_ICONS[theme]
  const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]
  return (
    <button
      onClick={() => setTheme(next)}
      title={THEME_LABELS[theme]}
      aria-label={THEME_LABELS[theme]}
      className={`p-1.5 rounded transition-colors ${className}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}
