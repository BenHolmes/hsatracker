import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Landmark,
  LayoutDashboard,
  Menu,
  Receipt,
  Settings,
  Stethoscope,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ThemeToggle } from '../../lib/theme'

const navItems = [
  { to: '/',               label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/expenses',       label: 'Expenses',       icon: Receipt,         end: false },
  { to: '/reimbursements', label: 'Reimbursements', icon: ArrowRightLeft,  end: false },
  { to: '/account',        label: 'Account',        icon: Landmark,        end: false },
]

const bottomNavItems = [
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

const allNavItems = [...navItems, ...bottomNavItems]

export default function Sidebar() {
  const [collapsed, setCollapsed]         = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const closeMobile = () => setMobileMenuOpen(false)

  // Shared nav link class builder
  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center rounded-lg text-sm font-medium transition-colors',
      collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
      isActive
        ? 'bg-emerald-600 text-white'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white',
    ].join(' ')

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
      isActive
        ? 'bg-emerald-600 text-white'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white',
    ].join(' ')

  return (
    <>
      {/* ── Mobile top nav (hidden on md+) ─────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900">
        <div className="flex items-center justify-between h-14 px-4 border-b border-slate-700">
          <Link
            to="/"
            onClick={closeMobile}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <Stethoscope className="w-5 h-5 text-emerald-400" />
            <span className="text-white font-semibold text-base tracking-tight">HSATracker</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle className="text-slate-400 hover:text-white hover:bg-slate-800" />
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-700 px-2 py-3 space-y-0.5 shadow-xl">
            {allNavItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={closeMobile}
                className={mobileLinkClass}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop sidebar (hidden below md) ──────────────────────── */}
      <aside
        className={[
          'hidden md:flex flex-col shrink-0 bg-slate-900 h-screen transition-[width] duration-200 overflow-hidden',
          collapsed ? 'w-16' : 'w-60',
        ].join(' ')}
      >
        {/* Logo */}
        <Link
          to="/"
          title={collapsed ? 'HSATracker' : undefined}
          className={[
            'flex items-center gap-2.5 border-b border-slate-700 h-16 hover:opacity-80 transition-opacity shrink-0',
            collapsed ? 'justify-center px-3' : 'px-5',
          ].join(' ')}
        >
          <Stethoscope className="w-6 h-6 text-emerald-400 shrink-0" />
          {!collapsed && (
            <span className="text-white font-semibold text-base tracking-tight whitespace-nowrap">
              HSATracker
            </span>
          )}
        </Link>

        {/* Main nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={desktopLinkClass}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom nav + collapse toggle */}
        <div className="px-2 pb-3 space-y-0.5">
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={[
              'w-full flex items-center justify-center rounded-lg py-2 text-sm font-medium transition-colors text-slate-400 hover:bg-slate-800 hover:text-white',
            ].join(' ')}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4 shrink-0" />
              : <ChevronLeft className="w-4 h-4 shrink-0" />
            }
          </button>

          {bottomNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={desktopLinkClass}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && label}
            </NavLink>
          ))}
        </div>

      </aside>
    </>
  )
}
