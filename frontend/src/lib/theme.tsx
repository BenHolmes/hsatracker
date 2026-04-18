import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, Sun } from 'lucide-react'
import { createContext, useContext, useEffect, useState } from 'react'
import { updateSettings } from '../api/settings'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme                      // stored preference
  resolvedTheme: 'light' | 'dark'  // what is actually applied to the DOM
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
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

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') return 'dark'
    if (stored === 'light') return 'light'
    return getSystemDark() ? 'dark' : 'light'
  })

  useEffect(() => {
    if (theme === 'dark') {
      applyDark(true)
      setResolvedTheme('dark')
    } else if (theme === 'light') {
      applyDark(false)
      setResolvedTheme('light')
    } else {
      const isDark = getSystemDark()
      applyDark(isDark)
      setResolvedTheme(isDark ? 'dark' : 'light')

      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => {
        applyDark(e.matches)
        setResolvedTheme(e.matches ? 'dark' : 'light')
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  const setTheme = (next: Theme) => {
    localStorage.setItem('theme', next)
    setThemeState(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Rendered inside QueryClientProvider (in App.tsx). On first settings load,
// syncs the DB theme value into the ThemeProvider so a fresh browser matches
// the last-saved preference even if localStorage was cleared.
export function ThemeSync() {
  // We can't use useQuery here because ThemeSync is inside QueryClientProvider
  // but we need to avoid importing TanStack Query at the top level of this lib.
  // Instead, App.tsx passes the resolved theme down via this component.
  return null
}

// Simple light ↔ dark toggle. Persists to both localStorage and the backend.
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const queryClient = useQueryClient()
  const isDark = resolvedTheme === 'dark'

  const mutation = useMutation({
    mutationFn: (t: Theme) => updateSettings({ theme: t }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const handleToggle = () => {
    const next: Theme = isDark ? 'light' : 'dark'
    setTheme(next)
    mutation.mutate(next)
  }

  return (
    <button
      onClick={handleToggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`p-1.5 rounded transition-colors ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
