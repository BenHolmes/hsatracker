import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { deleteExpense, getExpenses } from '../api/expenses'
import ExpenseFormModal from '../components/expenses/ExpenseFormModal'
import Badge from '../components/ui/Badge'
import { HSA_CATEGORIES } from '../lib/constants'
import { formatCurrency, formatDate, formatLabel } from '../lib/formatters'
import type { ExpenseOut } from '../types'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

function ReimbursementBadge({ status }: { status?: string | null }) {
  if (!status) return <Badge variant="gray">Not tracked</Badge>
  if (status === 'pending') return <Badge variant="yellow">Pending</Badge>
  return <Badge variant="green">Reimbursed</Badge>
}

export default function ExpensesPage() {
  const queryClient = useQueryClient()

  // Filters
  const [year, setYear]                   = useState(CURRENT_YEAR)
  const [category, setCategory]           = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')

  // Modal state
  const [modalOpen, setModalOpen]           = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseOut | null>(null)

  // Inline delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['expenses', { year, category, paymentMethod }],
    queryFn: () =>
      getExpenses({
        year,
        category:       category      || undefined,
        payment_method: paymentMethod || undefined,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success('Expense deleted')
      setDeletingId(null)
    },
    onError: () => {
      toast.error('Failed to delete expense')
      setDeletingId(null)
    },
  })

  const openAdd = () => {
    setEditingExpense(null)
    setModalOpen(true)
  }

  const openEdit = (expense: ExpenseOut) => {
    setEditingExpense(expense)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingExpense(null)
  }

  const selectClass =
    'border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  return (
    <div className="p-6">

      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">
          {isLoading ? 'Loading…' : `${data?.total ?? 0} expense${data?.total !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={year} onChange={e => setYear(Number(e.target.value))} className={selectClass}>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select value={category} onChange={e => setCategory(e.target.value)} className={selectClass}>
          <option value="">All Categories</option>
          {HSA_CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{formatLabel(cat)}</option>
          ))}
        </select>

        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={selectClass}>
          <option value="">All Payment Methods</option>
          <option value="out_of_pocket">Out of Pocket</option>
          <option value="hsa">HSA</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Provider</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Method</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reimbursement</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  Loading expenses…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-red-500">
                  Failed to load expenses. Is the backend running?
                </td>
              </tr>
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  No expenses found.{' '}
                  <button onClick={openAdd} className="text-emerald-600 hover:underline">
                    Add your first expense.
                  </button>
                </td>
              </tr>
            ) : (
              data?.items.map(expense => (
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
                  <td
                    className="px-4 py-3 text-slate-600 max-w-48 truncate"
                    title={expense.description}
                  >
                    {expense.description}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {formatLabel(expense.category)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={expense.payment_method === 'hsa' ? 'green' : 'blue'}>
                      {expense.payment_method === 'hsa' ? 'HSA' : 'Out of Pocket'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <ReimbursementBadge status={expense.reimbursement?.status} />
                  </td>
                  <td className="px-4 py-3">
                    {deletingId === expense.id ? (
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-xs text-slate-500">Delete?</span>
                        <button
                          onClick={() => deleteMutation.mutate(expense.id)}
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
                        <button
                          onClick={() => openEdit(expense)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(expense.id)}
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

      {/* Modal */}
      {modalOpen && (
        <ExpenseFormModal expense={editingExpense} onClose={closeModal} />
      )}
    </div>
  )
}
