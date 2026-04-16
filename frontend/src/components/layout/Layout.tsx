import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 pt-14 md:pt-0">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
          <footer className="border-t border-slate-200 dark:border-slate-700 px-6 py-3 mt-2">
            <p className="text-xs text-slate-400 dark:text-slate-500">Self-hosted · All data local</p>
          </footer>
        </main>
      </div>
    </div>
  )
}
