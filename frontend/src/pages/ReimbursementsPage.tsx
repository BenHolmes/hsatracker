import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getExpenseYears } from '../api/expenses'
import { deleteReimbursement, getReimbursements } from '../api/reimbursements'
import MarkReimbursedModal from '../components/reimbursements/MarkReimbursedModal'
import TrackReimbursementModal from '../components/reimbursements/TrackReimbursementModal'
import Badge from '../components/ui/Badge'
import { Skeleton, TableSkeleton } from '../components/ui/Skeleton'
import { formatCurrency, formatDate } from '../lib/formatters'
import type { ReimbursementOut } from '../types'

const CURRENT_YEAR = new Date().getFullYear()

type Tab = 'pending' | 'reimbursed'

export default function ReimbursementsPage() {
  const queryClient = useQueryClient()

  const [year, setYear]             = useState(CURRENT_YEAR)
  const [tab, setTab]               = useState<Tab>('pending')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [markingReimbursement, setMarkingReimbursement] = useState<ReimbursementOut | null>(null)
  const [trackModalOpen, setTrackModalOpen]             = useState(false)

  const { data: rawYears } = useQuery({ queryKey: ['expense-years'], queryFn: getExpenseYears })
  const yearOptions = useMemo(() => {
    const years = rawYears ?? []
    return years.includes(CURRENT_YEAR) ? years : [CURRENT_YEAR, ...years]
  }, [rawYears])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reimbursements', { year }],
    queryFn:  () => getReimbursements({ year }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteReimbursement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success('Reimbursement removed')
      setDeletingId(null)
    },
    onError: () => {
      toast.error('Failed to remove reimbursement')
      setDeletingId(null)
    },
  })

  const pendingItems    = data?.items.filter(r => r.status === 'pending')    ?? []
  const reimbursedItems = data?.items.filter(r => r.status === 'reimbursed') ?? []
  const activeItems     = tab === 'pending' ? pendingItems : reimbursedItems

  // Reimbursed tab shows 2 extra columns (Amount Reimbursed + Date) that pending doesn't have
  const colSpan = tab === 'reimbursed' ? 7 : 5

  const selectClass =
    'border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
      tab === t
        ? 'bg-emerald-600 text-white'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
    }`

  return (
    <div className="p-6 space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Pending
          </p>
          {isLoading
            ? <Skeleton className="h-8 w-28 mt-1" />
            : <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(data?.pending_amount ?? '0')}</p>
          }
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Reimbursed YTD
          </p>
          {isLoading
            ? <Skeleton className="h-8 w-28 mt-1" />
            : <p className="text-2xl font-bold text-emerald-600">{formatCurrency(data?.reimbursed_amount_ytd ?? '0')}</p>
          }
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button className={tabClass('pending')} onClick={() => setTab('pending')}>
            Pending
            {!isLoading && (
              <span className="ml-1.5 opacity-70">({pendingItems.length})</span>
            )}
          </button>
          <button className={tabClass('reimbursed')} onClick={() => setTab('reimbursed')}>
            Reimbursed
            {!isLoading && (
              <span className="ml-1.5 opacity-70">({reimbursedItems.length})</span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className={selectClass}
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => setTrackModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Track Expense
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Provider</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Expense Amt</th>
              {tab === 'reimbursed' && (
                <>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Reimbursed Amt</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Reimbursed Date</th>
                </>
              )}
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={5} cols={colSpan} />
            ) : isError ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-red-500">
                  Failed to load reimbursements. Is the backend running?
                </td>
              </tr>
            ) : activeItems.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-12 text-center text-slate-400">
                  {tab === 'pending' ? (
                    <>
                      No pending reimbursements.{' '}
                      <button
                        onClick={() => setTrackModalOpen(true)}
                        className="text-emerald-600 hover:underline"
                      >
                        Track an expense.
                      </button>
                    </>
                  ) : (
                    'No reimbursed expenses for this year.'
                  )}
                </td>
              </tr>
            ) : (
              activeItems.map(r => (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(r.expense.date)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {r.expense.provider_name}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {formatCurrency(r.expense.amount)}
                  </td>
                  {tab === 'reimbursed' && (
                    <>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                        {r.reimbursed_amount ? formatCurrency(r.reimbursed_amount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {r.reimbursed_date ? formatDate(r.reimbursed_date) : '—'}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3">
                    <Badge variant={r.status === 'pending' ? 'yellow' : 'green'}>
                      {r.status === 'pending' ? 'Pending' : 'Reimbursed'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {deletingId === r.id ? (
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Remove?</span>
                        <button
                          onClick={() => deleteMutation.mutate(r.id)}
                          disabled={deleteMutation.isPending}
                          className="text-xs text-red-600 hover:underline disabled:opacity-50"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {r.status === 'pending' && (
                          <button
                            onClick={() => setMarkingReimbursement(r)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded hover:bg-emerald-50 transition-colors"
                            title="Mark Reimbursed"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingId(r.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {markingReimbursement && (
        <MarkReimbursedModal
          reimbursement={markingReimbursement}
          onClose={() => setMarkingReimbursement(null)}
        />
      )}

      {trackModalOpen && (
        <TrackReimbursementModal onClose={() => setTrackModalOpen(false)} />
      )}
    </div>
  )
}
