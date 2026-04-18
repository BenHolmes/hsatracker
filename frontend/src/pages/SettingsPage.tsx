import { FolderOpen, HardDrive, Info, Monitor, Moon, Sun } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getSettings, updateSettings } from '../api/settings'
import type { AppSettingsUpdate, CoverageType } from '../types'
import { type Theme, useTheme } from '../lib/theme'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-50 dark:border-slate-700 last:border-0">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm text-slate-800 dark:text-slate-200 text-right ${mono ? 'font-mono' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  )
}

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light',  label: 'Light',  icon: Sun     },
  { value: 'dark',   label: 'Dark',   icon: Moon    },
]

const COVERAGE_OPTIONS: { value: CoverageType; label: string; description: string }[] = [
  { value: 'individual', label: 'Individual', description: 'Covers only yourself' },
  { value: 'family',     label: 'Family',     description: 'Covers you and dependents' },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const queryClient = useQueryClient()

  const { data: appSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn:  getSettings,
  })

  const settingsMutation = useMutation({
    mutationFn: (patch: AppSettingsUpdate) => updateSettings(patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['contributions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success('Preferences saved')
    },
    onError: () => toast.error('Failed to save preferences'),
  })

  const handleTheme = (value: Theme) => {
    setTheme(value)
    settingsMutation.mutate({ theme: value })
  }

  // Use the backend value when loaded, fall back to local context while loading.
  const activeTheme: Theme = (appSettings?.theme as Theme | undefined) ?? theme

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          HSATracker is configured via environment variables in your <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-1 py-0.5 rounded">.env</code> file.
          Restart the stack after making changes.
        </p>
      </div>

      {/* Preferences — appearance + coverage + catch-up */}
      <Section title="Preferences">
        {settingsLoading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-6">

            {/* Appearance */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Appearance</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sets the default theme each time the app loads.{' '}
                <span className="font-medium text-slate-600 dark:text-slate-300">System</span> follows your OS preference.
              </p>
              <div className="flex gap-2 mt-1">
                {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => handleTheme(value)}
                    disabled={settingsMutation.isPending}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors disabled:opacity-60 ${
                      activeTheme === value
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700" />

            {/* Coverage type */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Coverage type</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Determines which IRS contribution limit is highlighted on the Account and Dashboard pages.
              </p>
              <div className="flex gap-3 mt-1">
                {COVERAGE_OPTIONS.map(({ value, label, description }) => {
                  const active = appSettings?.coverage_type === value
                  return (
                    <button
                      key={value}
                      onClick={() => settingsMutation.mutate({ coverage_type: value })}
                      disabled={settingsMutation.isPending}
                      className={`flex-1 text-left px-4 py-3 rounded-lg border transition-colors disabled:opacity-60 ${
                        active
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <p className="text-sm font-medium">{label}</p>
                      <p className={`text-xs mt-0.5 ${active ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        {description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700" />

            {/* Catch-up contributions */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Catch-up contributions</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Account holders age 55 or older may contribute an additional $1,000 per year (IRS rule).
                  Enabling this adds $1,000 to your displayed limit.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={appSettings?.catch_up_eligible ?? false}
                onClick={() => settingsMutation.mutate({ catch_up_eligible: !appSettings?.catch_up_eligible })}
                disabled={settingsMutation.isPending}
                className={`relative shrink-0 mt-0.5 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 ${
                  appSettings?.catch_up_eligible ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    appSettings?.catch_up_eligible ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

          </div>
        )}
      </Section>

      {/* Configuration */}
      <Section title="Configuration">
        <div className="divide-y divide-slate-50">
          <Row label="Frontend port"         value="PORT (default: 3000)" />
          <Row label="Max receipt size"      value="MAX_UPLOAD_SIZE_MB (default: 10 MB)" />
          <Row label="Receipt storage path"  value="UPLOAD_DIR (default: /app/uploads)" />
          <Row label="Database"              value="POSTGRES_DB / POSTGRES_USER / POSTGRES_PASSWORD" />
        </div>
      </Section>

      {/* Data & Backups */}
      <Section title="Data & Backups">
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex gap-3">
            <HardDrive className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-300">Database</p>
              <p className="mt-0.5">Stored in Docker named volume <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-1 py-0.5 rounded">postgres_data</code>. Persists across container restarts.</p>
              <p className="mt-1 font-mono text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-3 py-2 text-slate-700 dark:text-slate-300">
                docker exec hsatracker-db-1 pg_dump -U hsatracker hsatracker &gt; backup.sql
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <FolderOpen className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-300">Receipt Files</p>
              <p className="mt-0.5">Stored in <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-1 py-0.5 rounded">./data/uploads/</code> on the host — accessible directly, easy to back up or move.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* About */}
      <Section title="About">
        <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex gap-3">
            <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
            <p>
              HSATracker is a self-hosted application. All data stays on your machine.
              No telemetry, no accounts, no external services.
            </p>
          </div>
        </div>
      </Section>
    </div>
  )
}
