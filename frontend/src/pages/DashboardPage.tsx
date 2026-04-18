import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getExpenses } from '../api/expenses'
import { getSettings } from '../api/settings'
import { getSummary, getSummaryYears } from '../api/summary'
import ExpenseFormModal from '../components/expenses/ExpenseFormModal'
import ContributionLimitBar from '../components/contributions/ContributionLimitBar'
import Badge from '../components/ui/Badge'
import { Skeleton, TableSkeleton } from '../components/ui/Skeleton'
import { formatCurrency, formatDate, formatLabel } from '../lib/formatters'

const CURRENT_YEAR = new Date().getFullYear()

function StatCard({
  label,
  value,
  sub,
  accent = 'text-slate-900 dark:text-slate-100',
  loading = false,
}: {
  label:    string
  value:    string
  sub?:     string
  accent?:  string
  loading?: boolean
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      {loading
        ? <Skeleton className="h-8 w-28 mt-1" />
        : <p className={`text-2xl font-bold truncate ${accent}`}>{value}</p>
      }
      {!loading && sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [year, setYear]       = useState(CURRENT_YEAR)
  const [modalOpen, setModalOpen] = useState(false)

  const { data: rawYears } = useQuery({ queryKey: ['summary-years'], queryFn: getSummaryYears })
  const yearOptions = useMemo(() => {
    const years = rawYears ?? []
    return years.includes(CURRENT_YEAR) ? years : [CURRENT_YEAR, ...years]
  }, [rawYears])

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['summary', year],
    queryFn:  () => getSummary(year),
  })

  const { data: recent, isLoading: recentLoading } = useQuery({
    queryKey: ['expenses', { year, size: 5, page: 1 }],
    queryFn:  () => getExpenses({ year, size: 5, page: 1 }),
  })

  const { data: appSettings } = useQuery({
    queryKey: ['settings'],
    queryFn:  getSettings,
  })

  const fmt = (val?: string) => formatCurrency(val ?? '0')

  const selectClass =
    'border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  return (
    <div className="p-6 space-y-6">

      {/* Year filter + Add Expense */}
      <div className="flex items-center justify-between">
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className={selectClass}
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Row 1 — Balance + expenses overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="HSA Balance"
          loading={summaryLoading}
          value={summary?.latest_balance ? formatCurrency(summary.latest_balance) : 'No data'}
          sub={summary?.latest_balance_date ? `As of ${formatDate(summary.latest_balance_date)}` : undefined}
          accent="text-emerald-600"
        />
        <StatCard label="Total Expenses"  loading={summaryLoading} value={fmt(summary?.total_expenses)} />
        <StatCard label="Out of Pocket"   loading={summaryLoading} value={fmt(summary?.out_of_pocket_expenses)} />
        <StatCard label="HSA Paid"        loading={summaryLoading} value={fmt(summary?.hsa_paid_expenses)} />
      </div>

      {/* Row 2 — Reimbursement + contributions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Pending Reimbursement"
          loading={summaryLoading}
          value={fmt(summary?.pending_reimbursement)}
          accent="text-amber-600"
        />
        <StatCard
          label="Reimbursed YTD"
          loading={summaryLoading}
          value={fmt(summary?.reimbursed_ytd)}
          accent="text-emerald-600"
        />
        <StatCard
          label="Total Contributed"
          loading={summaryLoading}
          value={fmt(summary?.total_contributed)}
        />
      </div>

      {/* Contribution limit bar */}
      {!summaryLoading && summary && (
        <ContributionLimitBar
          totalContributed={summary.total_contributed}
          limitIndividual={summary.limit_individual}
          limitFamily={summary.limit_family}
          coverageType={appSettings?.coverage_type}
        />
      )}

      {/* Recent expenses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Recent Expenses
          </h2>
          <Link
            to="/expenses"
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Provider</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide hidden md:table-cell">Method</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentLoading ? (
                <TableSkeleton rows={3} cols={5} />
              ) : !recent || recent.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
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
                    className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {expense.provider_name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap hidden sm:table-cell">
                      {formatLabel(expense.category)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant={expense.payment_method === 'hsa' ? 'green' : 'blue'}>
                        {expense.payment_method === 'hsa' ? 'HSA' : 'Out of Pocket'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <ExpenseFormModal onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
