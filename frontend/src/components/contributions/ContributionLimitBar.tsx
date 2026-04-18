import type { CoverageType } from '../../types'
import { formatCurrency } from '../../lib/formatters'

interface Props {
  totalContributed: string
  limitIndividual:  string
  limitFamily:      string
  /** When provided, the matching bar is highlighted as "Your plan". */
  coverageType?:    CoverageType
}

function Bar({
  label,
  contributed,
  limit,
  color,
  active,
}: {
  label:       string
  contributed: number
  limit:       number
  color:       string
  active?:     boolean
}) {
  const pct       = limit > 0 ? Math.min((contributed / limit) * 100, 100) : 0
  const over      = contributed > limit
  const remaining = Math.max(limit - contributed, 0)

  return (
    <div className={`space-y-1.5 ${active ? '' : 'opacity-50'}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
          {label}
          {active && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
              Your plan
            </span>
          )}
        </span>
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
  coverageType,
}: Props) {
  const contributed = parseFloat(totalContributed) || 0
  const indLimit    = parseFloat(limitIndividual)   || 0
  const famLimit    = parseFloat(limitFamily)       || 0

  // When no coverageType is supplied both bars show at full opacity.
  const indActive = coverageType == null ? undefined : coverageType === 'individual'
  const famActive = coverageType == null ? undefined : coverageType === 'family'

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
        active={indActive}
      />
      <Bar
        label="Family"
        contributed={contributed}
        limit={famLimit}
        color="bg-sky-500"
        active={famActive}
      />
    </div>
  )
}
