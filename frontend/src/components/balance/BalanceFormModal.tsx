import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createBalance } from '../../api/balance'
import Modal from '../ui/Modal'

const schema = z.object({
  balance:    z.string().min(1, 'Balance is required').refine(
    val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    { message: 'Balance must be 0 or greater' },
  ),
  as_of_date: z.string().min(1, 'Date is required'),
  notes:      z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  onClose: () => void
}

export default function BalanceFormModal({ onClose }: Props) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      as_of_date: new Date().toISOString().slice(0, 10),
      notes:      '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => createBalance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success('Balance snapshot added')
      onClose()
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        toast.error('A snapshot already exists for this date')
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    },
  })

  const fieldClass =
    'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  return (
    <Modal title="Add Balance Snapshot" onClose={onClose} maxWidth="max-w-md">
      <form onSubmit={handleSubmit(data => mutation.mutate(data))}>
        <fieldset disabled={mutation.isPending} className="space-y-4 disabled:opacity-60">

        {/* Balance + Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Balance ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register('balance')}
              className={fieldClass}
            />
            {errors.balance && (
              <p className="text-red-500 text-xs mt-1">{errors.balance.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">As of Date</label>
            <input type="date" {...register('as_of_date')} className={fieldClass} />
            {errors.as_of_date && (
              <p className="text-red-500 text-xs mt-1">{errors.as_of_date.message}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Notes <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="e.g. After employer deposit"
            {...register('notes')}
            className={`${fieldClass} resize-none`}
          />
        </div>

        </fieldset>

        {/* Actions */}
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
            {mutation.isPending ? 'Saving…' : 'Add Snapshot'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
