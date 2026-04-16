import { Monitor, Moon, Sun } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../../lib/theme'

const PAGE_TITLES: Record<string, string> = {
  '/':               'Dashboard',
  '/expenses':       'Expenses',
  '/reimbursements': 'Reimbursements',
  '/account':        'Account',
  '/settings':       'Settings',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'HSATracker'
  const { theme, setTheme } = useTheme()

  return (
    <header className="hidden md:flex h-14 shrink-0 items-center px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <h1 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex-1">{title}</h1>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setTheme('system')}
          title="System theme"
          className={`p-1.5 rounded transition-colors ${
            theme === 'system'
              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Monitor className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTheme('light')}
          title="Light theme"
          className={`p-1.5 rounded transition-colors ${
            theme === 'light'
              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Sun className="w-4 h-4" />
        </button>
        <button
          onClick={() => setTheme('dark')}
          title="Dark theme"
          className={`p-1.5 rounded transition-colors ${
            theme === 'dark'
              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          <Moon className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
