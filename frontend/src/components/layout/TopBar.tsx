import { useLocation } from 'react-router-dom'

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
    <header className="hidden md:flex h-14 shrink-0 items-center px-6 bg-white border-b border-slate-200">
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>
    </header>
  )
}
