import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { updateReimbursement } from '../../api/reimbursements'
import { formatCurrency, formatDate } from '../../lib/formatters'
import type { ReimbursementOut } from '../../types'
import Modal from '../ui/Modal'

type FormData = {
  reimbursed_amount: string
  reimbursed_date: string
}

interface Props {
  reimbursement: ReimbursementOut
  onClose: () => void
}

export default function MarkReimbursedModal({ reimbursement, onClose }: Props) {
  const queryClient = useQueryClient()

  // Schema is defined inside the component so it can reference the expense
  // amount from props and provide a precise validation message.
  const expenseAmount = parseFloat(reimbursement.expense.amount)
  const schema = z.object({
    reimbursed_amount: z.string().refine(
      val => !val || (parseFloat(val) > 0 && parseFloat(val) <= expenseAmount),
      { message: `Must be between $0.01 and ${formatCurrency(reimbursement.expense.amount)}` },
    ),
    reimbursed_date: z.string().optional(),
  })

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      reimbursed_amount: reimbursement.reimbursed_amount ?? '',
      reimbursed_date:   reimbursement.reimbursed_date   ?? new Date().toISOString().slice(0, 10),
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      updateReimbursement(reimbursement.id, {
        status:            'reimbursed',
        reimbursed_amount: data.reimbursed_amount || undefined,
        reimbursed_date:   data.reimbursed_date   || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success('Marked as reimbursed')
      onClose()
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.')
    },
  })

  const fieldClass =
    'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  return (
    <Modal title="Mark as Reimbursed" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4">

        {/* Expense summary */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-4 py-3 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Provider</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{reimbursement.expense.provider_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Date</span>
            <span className="text-slate-700 dark:text-slate-300">{formatDate(reimbursement.expense.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Expense Amount</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">{formatCurrency(reimbursement.expense.amount)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(data => mutation.mutate(data))}>
          <fieldset disabled={mutation.isPending} className="space-y-4 disabled:opacity-60">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Amount Reimbursed ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={expenseAmount}
                placeholder="0.00"
                {...register('reimbursed_amount')}
                className={fieldClass}
              />
              {errors.reimbursed_amount && (
                <p className="text-red-500 text-xs mt-1">{errors.reimbursed_amount.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reimbursement Date
              </label>
              <input type="date" {...register('reimbursed_date')} className={fieldClass} />
            </div>
          </div>

          </fieldset>

          <div className="flex justify-end gap-3 pt-2 mt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Saving…' : 'Mark Reimbursed'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
