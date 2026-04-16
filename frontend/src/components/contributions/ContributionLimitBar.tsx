import { formatCurrency } from '../../lib/formatters'

interface Props {
  totalContributed: string
  limitIndividual:  string
  limitFamily:      string
}

function Bar({
  label,
  contributed,
  limit,
  color,
}: {
  label:       string
  contributed: number
  limit:       number
  color:       string
}) {
  const pct     = limit > 0 ? Math.min((contributed / limit) * 100, 100) : 0
  const over    = contributed > limit
  const remaining = Math.max(limit - contributed, 0)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">
          {formatCurrency(String(contributed))}
          <span className="text-slate-400 dark:text-slate-500 font-normal"> / {formatCurrency(String(limit))}</span>
        </span>
      </div>

      {/* Track */}
      <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>{over ? 'Over limit' : `${formatCurrency(String(remaining))} remaining`}</span>
        <span>{pct.toFixed(0)}%</span>
      </div>
    </div>
  )
}

export default function ContributionLimitBar({
  totalContributed,
  limitIndividual,
  limitFamily,
}: Props) {
  const contributed = parseFloat(totalContributed) || 0
  const indLimit    = parseFloat(limitIndividual)   || 0
  const famLimit    = parseFloat(limitFamily)       || 0

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-4 space-y-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        IRS Contribution Limits
      </p>
      <Bar
        label="Individual"
        contributed={contributed}
        limit={indLimit}
        color="bg-emerald-500"
      />
      <Bar
        label="Family"
        contributed={contributed}
        limit={famLimit}
        color="bg-sky-500"
      />
    </div>
  )
}
