import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import Layout from './components/layout/Layout'
import AccountPage from './pages/AccountPage'
import DashboardPage from './pages/DashboardPage'
import ExpensesPage from './pages/ExpensesPage'
import ReimbursementsPage from './pages/ReimbursementsPage'
import SettingsPage from './pages/SettingsPage'
import { ThemeProvider, useTheme, type Theme } from './lib/theme'
import { getSettings } from './api/settings'

// Syncs the backend-stored theme preference into the ThemeProvider on load.
// Must be rendered inside both ThemeProvider and QueryClientProvider.
function ThemeSync() {
  const { setTheme } = useTheme()
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings })

  useEffect(() => {
    if (settings?.theme) setTheme(settings.theme as Theme)
  }, [settings?.theme]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeSync />
        <Toaster position="top-right" richColors />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/reimbursements" element={<ReimbursementsPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
