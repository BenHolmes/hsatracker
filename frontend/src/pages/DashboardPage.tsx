import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getExpenses } from '../api/expenses'
import { getSummary } from '../api/summary'
import ContributionLimitBar from '../components/contributions/ContributionLimitBar'
import Badge from '../components/ui/Badge'
import { formatCurrency, formatDate, formatLabel } from '../lib/formatters'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

function StatCard({
  label,
  value,
  sub,
  accent = 'text-slate-900',
}: {
  label:   string
  value:   string
  sub?:    string
  accent?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold truncate ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [year, setYear] = useState(CURRENT_YEAR)

  const { data: summary, isLoading } = useQuery({
    queryKey: ['summary', year],
    queryFn:  () => getSummary(year),
  })

  const { data: recent } = useQuery({
    queryKey: ['expenses', { year, limit: 5 }],
    queryFn:  () => getExpenses({ year, limit: 5 }),
  })

  const dash = (val?: string) =>
    isLoading ? '—' : formatCurrency(val ?? '0')

  const selectClass =
    'border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  return (
    <div className="p-6 space-y-6">

      {/* Year filter */}
      <div className="flex justify-end">
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className={selectClass}
        >
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Row 1 — Balance + expenses overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="HSA Balance"
          value={
            isLoading
              ? '—'
              : summary?.latest_balance
                ? formatCurrency(summary.latest_balance)
                : 'No data'
          }
          sub={
            summary?.latest_balance_date
              ? `As of ${formatDate(summary.latest_balance_date)}`
              : undefined
          }
          accent="text-emerald-600"
        />
        <StatCard label="Total Expenses"  value={dash(summary?.total_expenses)} />
        <StatCard label="Out of Pocket"   value={dash(summary?.out_of_pocket_expenses)} />
        <StatCard label="HSA Paid"        value={dash(summary?.hsa_paid_expenses)} />
      </div>

      {/* Row 2 — Reimbursement + contributions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Pending Reimbursement"
          value={dash(summary?.pending_reimbursement)}
          accent="text-amber-600"
        />
        <StatCard
          label="Reimbursed YTD"
          value={dash(summary?.reimbursed_ytd)}
          accent="text-emerald-600"
        />
        <StatCard
          label="Total Contributed"
          value={dash(summary?.total_contributed)}
        />
      </div>

      {/* Contribution limit bar */}
      {!isLoading && summary && (
        <ContributionLimitBar
          totalContributed={summary.total_contributed}
          limitIndividual={summary.limit_individual}
          limitFamily={summary.limit_family}
        />
      )}

      {/* Recent expenses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Recent Expenses
          </h2>
          <Link
            to="/expenses"
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Provider</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Method</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody>
              {!recent || recent.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No expenses for {year}.{' '}
                    <Link to="/expenses" className="text-emerald-600 hover:underline">
                      Add your first expense.
                    </Link>
                  </td>
                </tr>
              ) : (
                recent.items.map(expense => (
                  <tr
                    key={expense.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {expense.provider_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap hidden sm:table-cell">
                      {formatLabel(expense.category)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant={expense.payment_method === 'hsa' ? 'green' : 'blue'}>
                        {expense.payment_method === 'hsa' ? 'HSA' : 'Out of Pocket'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
