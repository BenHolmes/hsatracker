import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Paperclip, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createExpense, updateExpense } from '../../api/expenses'
import { getReceipts, uploadReceipt } from '../../api/receipts'
import { updateReimbursement } from '../../api/reimbursements'
import { HSA_CATEGORIES } from '../../lib/constants'
import { formatLabel } from '../../lib/formatters'
import type { ExpenseOut, HsaCategory } from '../../types'
import ReceiptList from '../receipts/ReceiptList'
import ReceiptUpload from '../receipts/ReceiptUpload'
import Modal from '../ui/Modal'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

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
  reimbursed_amount: z.string().optional(),
  reimbursed_date:   z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  expense?: ExpenseOut | null
  onClose: () => void
}

export default function ExpenseFormModal({ expense, onClose }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!expense
  const reimbursement = expense?.reimbursement ?? null

  // Staged receipt for the create flow (uploaded after expense is saved)
  const [pendingFile, setPendingFile]     = useState<File | null>(null)
  const [draggingNew, setDraggingNew]     = useState(false)
  const fileInputRef                       = useRef<HTMLInputElement>(null)
  // Tracks receipt upload failure so onSuccess can show the right toast
  const receiptUploadFailed               = useRef(false)

  // Live receipt list — refetches when uploads/deletes happen
  const { data: receipts = [] } = useQuery({
    queryKey: ['expense-receipts', expense?.id],
    queryFn: () => getReceipts(expense!.id),
    enabled: isEdit,
    initialData: expense?.receipts ?? [],
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: expense
      ? {
          date:              expense.date,
          provider_name:     expense.provider_name,
          description:       expense.description,
          amount:            expense.amount,
          category:          expense.category,
          payment_method:    expense.payment_method,
          notes:             expense.notes ?? '',
          reimbursed_amount: reimbursement?.reimbursed_amount ?? '',
          reimbursed_date:   reimbursement?.reimbursed_date   ?? '',
        }
      : {
          date:           new Date().toISOString().slice(0, 10),
          payment_method: 'out_of_pocket',
          notes:          '',
        },
  })

  const handleNewFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPG, PNG, or PDF.')
      return
    }
    setPendingFile(file)
  }

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      receiptUploadFailed.current = false

      const payload = {
        date:           data.date,
        provider_name:  data.provider_name,
        description:    data.description,
        amount:         data.amount,
        category:       data.category as HsaCategory,
        payment_method: data.payment_method,
        notes:          data.notes,
      }

      const result = isEdit
        ? await updateExpense(expense!.id, payload)
        : await createExpense(payload)

      if (isEdit && reimbursement) {
        await updateReimbursement(reimbursement.id, {
          reimbursed_amount: data.reimbursed_amount || undefined,
          reimbursed_date:   data.reimbursed_date   || undefined,
        })
      }

      // Upload the staged receipt after the expense exists
      if (!isEdit && pendingFile) {
        try {
          await uploadReceipt(result.id, pendingFile)
        } catch {
          receiptUploadFailed.current = true
        }
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      if (receiptUploadFailed.current) {
        toast.warning('Expense saved, but receipt upload failed. Add it from the edit view.')
      } else {
        toast.success(isEdit ? 'Expense updated' : 'Expense added')
      }
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

        {/* Receipt attachment — create flow only */}
        {!isEdit && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Receipt <span className="font-normal normal-case text-slate-400">(optional)</span>
            </p>
            {pendingFile ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-sm text-slate-700 truncate flex-1">{pendingFile.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingFile(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDraggingNew(true) }}
                onDragLeave={() => setDraggingNew(false)}
                onDrop={e => {
                  e.preventDefault()
                  setDraggingNew(false)
                  const file = e.dataTransfer.files[0]
                  if (file) handleNewFile(file)
                }}
                className={[
                  'flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition-colors',
                  draggingNew
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50',
                ].join(' ')}
              >
                <Upload className={`w-4 h-4 shrink-0 ${draggingNew ? 'text-emerald-500' : 'text-slate-400'}`} />
                <div>
                  <p className="text-sm text-slate-600">
                    Drop a file or{' '}
                    <span className="text-emerald-600 font-medium">browse</span>
                  </p>
                  <p className="text-xs text-slate-400">JPG, PNG, or PDF · max 10 MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleNewFile(file)
                    e.target.value = ''
                  }}
                  className="hidden"
                />
              </div>
            )}
          </div>
        )}

        {/* Reimbursement section */}
        {isEdit && reimbursement && (
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Reimbursement
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount Reimbursed ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...register('reimbursed_amount')}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reimbursement Date
                </label>
                <input
                  type="date"
                  {...register('reimbursed_date')}
                  className={fieldClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Receipts section — edit flow only */}
        {isEdit && (
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Receipts
            </p>
            <ReceiptList expenseId={expense!.id} receipts={receipts} />
            <ReceiptUpload expenseId={expense!.id} />
          </div>
        )}

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
