import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { deleteBalance, getBalance } from '../api/balance'
import { deleteContribution, getContributionYears, getContributions } from '../api/contributions'
import { getSettings } from '../api/settings'
import BalanceFormModal from '../components/balance/BalanceFormModal'
import ContributionFormModal from '../components/contributions/ContributionFormModal'
import ContributionLimitBar from '../components/contributions/ContributionLimitBar'
import { Skeleton, TableSkeleton } from '../components/ui/Skeleton'
import { formatCurrency, formatDate, formatLabel } from '../lib/formatters'
import type { ContributionOut } from '../types'

const CURRENT_YEAR = new Date().getFullYear()

export default function AccountPage() {
  const queryClient = useQueryClient()

  // ── Balance state ────────────────────────────────────────────────────────
  const [balanceModalOpen, setBalanceModalOpen]   = useState(false)
  const [deletingBalanceId, setDeletingBalanceId] = useState<string | null>(null)

  const {
    data:      balanceData,
    isLoading: balanceLoading,
    isError:   balanceError,
  } = useQuery({
    queryKey: ['balance'],
    queryFn:  getBalance,
  })

  const deleteBalanceMutation = useMutation({
    mutationFn: deleteBalance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success('Balance snapshot deleted')
      setDeletingBalanceId(null)
    },
    onError: () => {
      toast.error('Failed to delete snapshot')
      setDeletingBalanceId(null)
    },
  })

  // ── Contributions state ──────────────────────────────────────────────────
  const [taxYear, setTaxYear]               = useState(CURRENT_YEAR)
  const [modalOpen, setModalOpen]           = useState(false)
  const [editingContrib, setEditingContrib] = useState<ContributionOut | null>(null)
  const [deletingId, setDeletingId]         = useState<string | null>(null)

  const { data: rawYears } = useQuery({ queryKey: ['contribution-years'], queryFn: getContributionYears })
  const yearOptions = useMemo(() => {
    const years = rawYears ?? []
    return years.includes(CURRENT_YEAR) ? years : [CURRENT_YEAR, ...years]
  }, [rawYears])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contributions', { taxYear }],
    queryFn:  () => getContributions(taxYear),
  })

  const { data: appSettings } = useQuery({
    queryKey: ['settings'],
    queryFn:  getSettings,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteContribution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success('Contribution deleted')
      setDeletingId(null)
    },
    onError: () => {
      toast.error('Failed to delete contribution')
      setDeletingId(null)
    },
  })

  const openAdd    = () => { setEditingContrib(null); setModalOpen(true) }
  const openEdit   = (c: ContributionOut) => { setEditingContrib(c); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditingContrib(null) }

  const selectClass =
    'border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  return (
    <div className="p-6 space-y-10">

      {/* ── Balance section ───────────────────────────────────────────── */}
      <section className="space-y-4">

        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Balance</h2>
          <button
            onClick={() => setBalanceModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Snapshot
          </button>
        </div>

        {/* Latest balance card */}
        {balanceLoading ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-4">
            <Skeleton className="h-3 w-28 mb-3" />
            <Skeleton className="h-9 w-36" />
          </div>
        ) : !balanceError && balanceData?.latest ? (
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Current Balance
              </p>
              <p className="text-3xl font-bold text-emerald-600">
                {formatCurrency(balanceData.latest.balance)}
              </p>
              {balanceData.latest.notes && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{balanceData.latest.notes}</p>
              )}
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              As of {formatDate(balanceData.latest.as_of_date)}
            </p>
          </div>
        ) : null}

        {/* Balance history table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">As of Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Balance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notes</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {balanceLoading ? (
                <TableSkeleton rows={3} cols={4} />
              ) : balanceError ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-red-500">
                    Failed to load balance. Is the backend running?
                  </td>
                </tr>
              ) : balanceData?.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    No balance snapshots yet.{' '}
                    <button
                      onClick={() => setBalanceModalOpen(true)}
                      className="text-emerald-600 hover:underline"
                    >
                      Add your first snapshot.
                    </button>
                  </td>
                </tr>
              ) : (
                balanceData?.items.map(b => (
                  <tr
                    key={b.id}
                    className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(b.as_of_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {formatCurrency(b.balance)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-64 truncate" title={b.notes ?? ''}>
                      {b.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {deletingBalanceId === b.id ? (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Delete?</span>
                          <button
                            onClick={() => deleteBalanceMutation.mutate(b.id)}
                            disabled={deleteBalanceMutation.isPending}
                            className="text-xs text-red-600 hover:underline disabled:opacity-50"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeletingBalanceId(null)}
                            className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingBalanceId(b.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Contributions section ──────────────────────────────────────── */}
      <section className="space-y-4">

        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Contributions</h2>
          <div className="flex items-center gap-3">
            <select
              value={taxYear}
              onChange={e => setTaxYear(Number(e.target.value))}
              className={selectClass}
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Contribution
            </button>
          </div>
        </div>

        {/* IRS limit bar */}
        {!isLoading && !isError && data && (
          <ContributionLimitBar
            totalContributed={data.total_contributed}
            limitIndividual={data.limit_individual}
            limitFamily={data.limit_family}
            coverageType={appSettings?.coverage_type}
          />
        )}

        {/* Contributions table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Source</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Tax Year</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Notes</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton rows={3} cols={6} />
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-red-500">
                    Failed to load contributions. Is the backend running?
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    No contributions for {taxYear}.{' '}
                    <button onClick={openAdd} className="text-emerald-600 hover:underline">
                      Add your first contribution.
                    </button>
                  </td>
                </tr>
              ) : (
                data?.items.map(c => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDate(c.date)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatLabel(c.source)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.tax_year}
                    </td>
                    <td
                      className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-48 truncate"
                      title={c.notes ?? ''}
                    >
                      {c.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {deletingId === c.id ? (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Delete?</span>
                          <button
                            onClick={() => deleteMutation.mutate(c.id)}
                            disabled={deleteMutation.isPending}
                            className="text-xs text-red-600 hover:underline disabled:opacity-50"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(c.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Delete"
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

        {/* Total row */}
        {!isLoading && !isError && data && data.items.length > 0 && (
          <div className="flex justify-end pr-1">
            <span className="text-sm text-slate-500 dark:text-slate-400 mr-4">Total contributed {taxYear}</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {formatCurrency(data.total_contributed)}
            </span>
          </div>
        )}
      </section>

      {/* Modals */}
      {balanceModalOpen && (
        <BalanceFormModal onClose={() => setBalanceModalOpen(false)} />
      )}
      {modalOpen && (
        <ContributionFormModal
          contribution={editingContrib}
          defaultTaxYear={taxYear}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
