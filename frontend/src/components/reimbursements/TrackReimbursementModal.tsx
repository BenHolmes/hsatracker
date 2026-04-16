import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { getExpenses } from '../../api/expenses'
import { createReimbursement } from '../../api/reimbursements'
import { formatCurrency, formatDate } from '../../lib/formatters'
import type { ExpenseOut } from '../../types'
import Modal from '../ui/Modal'

interface Props {
  onClose: () => void
}

export default function TrackReimbursementModal({ onClose }: Props) {
  const queryClient = useQueryClient()
  const [selectedExpenseId, setSelectedExpenseId] = useState('')
  const [notes, setNotes]                         = useState('')

  // Fetch all out-of-pocket expenses (no year filter = all years)
  const { data, isLoading } = useQuery({
    queryKey: ['expenses-oop-all'],
    queryFn:  () => getExpenses({ payment_method: 'out_of_pocket', size: 1000, page: 1 }),
  })

  // Only show expenses that aren't already being tracked
  const eligible: ExpenseOut[] = data?.items.filter(e => e.reimbursement === null) ?? []

  const mutation = useMutation({
    mutationFn: () =>
      createReimbursement({ expense_id: selectedExpenseId, notes: notes || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success('Expense added to reimbursement tracking')
      onClose()
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.')
    },
  })

  const fieldClass =
    'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  return (
    <Modal title="Track Reimbursement" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Select an out-of-pocket expense to start tracking for reimbursement.
        </p>

        <fieldset disabled={mutation.isPending} className="disabled:opacity-60">
        {isLoading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">Loading expenses…</p>
        ) : eligible.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">
            No eligible expenses found. All out-of-pocket expenses are already being tracked.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expense</label>
              <select
                value={selectedExpenseId}
                onChange={e => setSelectedExpenseId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Select an expense…</option>
                {eligible.map(e => (
                  <option key={e.id} value={e.id}>
                    {formatDate(e.date)} · {e.provider_name} · {formatCurrency(e.amount)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Notes <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Any notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className={`${fieldClass} resize-none`}
              />
            </div>
          </div>
        )}
        </fieldset>

        <div className="flex justify-end gap-3 pt-2 mt-2 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!selectedExpenseId || mutation.isPending || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Saving…' : 'Start Tracking'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
