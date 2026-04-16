import { FolderOpen, HardDrive, Info } from 'lucide-react'

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

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          HSATracker is configured via environment variables in your <code className="font-mono text-xs bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-1 py-0.5 rounded">.env</code> file.
          Restart the stack after making changes.
        </p>
      </div>

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
