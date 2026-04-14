import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createExpense, updateExpense } from '../../api/expenses'
import { HSA_CATEGORIES } from '../../lib/constants'
import { formatLabel } from '../../lib/formatters'
import type { ExpenseOut } from '../../types'
import Modal from '../ui/Modal'

const schema = z.object({
  date:           z.string().min(1, 'Date is required'),
  provider_name:  z.string().min(1, 'Provider is required'),
  description:    z.string().min(1, 'Description is required'),
  amount:         z.string().min(1, 'Amount is required').refine(
    val => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: 'Amount must be greater than 0' },
  ),
  category:       z.string().min(1, 'Please select a category'),
  payment_method: z.enum(['out_of_pocket', 'hsa']),
  notes:          z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  expense?: ExpenseOut | null
  onClose: () => void
}

export default function ExpenseFormModal({ expense, onClose }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!expense

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: expense
      ? {
          date:           expense.date,
          provider_name:  expense.provider_name,
          description:    expense.description,
          amount:         expense.amount,
          category:       expense.category,
          payment_method: expense.payment_method,
          notes:          expense.notes ?? '',
        }
      : {
          date:           new Date().toISOString().slice(0, 10),
          payment_method: 'out_of_pocket',
          notes:          '',
        },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? updateExpense(expense!.id, data) : createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success(isEdit ? 'Expense updated' : 'Expense added')
      onClose()
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.')
    },
  })

  const fieldClass =
    'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  return (
    <Modal title={isEdit ? 'Edit Expense' : 'Add Expense'} onClose={onClose}>
      <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">

        {/* Date + Amount */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" {...register('date')} className={fieldClass} />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register('amount')}
              className={fieldClass}
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
        </div>

        {/* Provider */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
          <input
            type="text"
            placeholder="e.g. Dr. Smith, CVS Pharmacy"
            {...register('provider_name')}
            className={fieldClass}
          />
          {errors.provider_name && (
            <p className="text-red-500 text-xs mt-1">{errors.provider_name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <input
            type="text"
            placeholder="e.g. Annual physical, Prescription refill"
            {...register('description')}
            className={fieldClass}
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Category + Payment Method */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select {...register('category')} className={fieldClass}>
              <option value="">Select category…</option>
              {HSA_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{formatLabel(cat)}</option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <select {...register('payment_method')} className={fieldClass}>
              <option value="out_of_pocket">Out of Pocket</option>
              <option value="hsa">HSA</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Any additional notes…"
            {...register('notes')}
            className={`${fieldClass} resize-none`}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
