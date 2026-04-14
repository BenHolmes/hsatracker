import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createContribution, updateContribution } from '../../api/contributions'
import { formatLabel } from '../../lib/formatters'
import type { ContributionOut, ContributionSource } from '../../types'
import Modal from '../ui/Modal'

const SOURCES: ContributionSource[] = ['self', 'employer', 'other']

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

const schema = z.object({
  date:     z.string().min(1, 'Date is required'),
  amount:   z.string().min(1, 'Amount is required').refine(
    val => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: 'Amount must be greater than 0' },
  ),
  source:   z.enum(['self', 'employer', 'other']),
  tax_year: z.coerce.number().int().min(2000),
  notes:    z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  contribution?: ContributionOut | null
  defaultTaxYear?: number
  onClose: () => void
}

export default function ContributionFormModal({ contribution, defaultTaxYear, onClose }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!contribution

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: contribution
      ? {
          date:     contribution.date,
          amount:   contribution.amount,
          source:   contribution.source,
          tax_year: contribution.tax_year,
          notes:    contribution.notes ?? '',
        }
      : {
          date:     new Date().toISOString().slice(0, 10),
          source:   'self',
          tax_year: defaultTaxYear ?? CURRENT_YEAR,
          notes:    '',
        },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit
        ? updateContribution(contribution!.id, data)
        : createContribution(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contributions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      toast.success(isEdit ? 'Contribution updated' : 'Contribution added')
      onClose()
    },
    onError: () => {
      toast.error('Something went wrong. Please try again.')
    },
  })

  const fieldClass =
    'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'

  return (
    <Modal title={isEdit ? 'Edit Contribution' : 'Add Contribution'} onClose={onClose}>
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

        {/* Source + Tax Year */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
            <select {...register('source')} className={fieldClass}>
              {SOURCES.map(s => (
                <option key={s} value={s}>{formatLabel(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tax Year</label>
            <select {...register('tax_year')} className={fieldClass}>
              {YEAR_OPTIONS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
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
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Contribution'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
