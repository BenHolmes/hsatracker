import { useLocation } from 'react-router-dom'
import { ThemeToggle } from '../../lib/theme'

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

  return (
    <header className="hidden md:flex h-14 shrink-0 items-center px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <h1 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex-1">{title}</h1>
      <ThemeToggle className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700" />
    </header>
  )
}
