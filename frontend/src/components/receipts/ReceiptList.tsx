import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { deleteReceipt, getReceiptFileUrl } from '../../api/receipts'
import { formatFileSize } from '../../lib/formatters'
import type { ReceiptOut } from '../../types'
import ReceiptThumbnail from './ReceiptThumbnail'

interface Props {
  expenseId: string
  receipts: ReceiptOut[]
}

export default function ReceiptList({ expenseId, receipts }: Props) {
  const queryClient = useQueryClient()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: deleteReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-receipts', expenseId] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Receipt deleted')
      setDeletingId(null)
    },
    onError: () => {
      toast.error('Failed to delete receipt')
      setDeletingId(null)
    },
  })

  if (receipts.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-2">No receipts attached.</p>
    )
  }

  return (
    <ul className="space-y-2">
      {receipts.map(receipt => (
        <li
          key={receipt.id}
          className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
        >
          <ReceiptThumbnail receipt={receipt} />

          {/* File info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
              {receipt.original_filename}
            </p>
            <p className="text-xs text-slate-400">{formatFileSize(receipt.file_size)}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <a
              href={getReceiptFileUrl(receipt.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Open"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {deletingId === receipt.id ? (
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-xs text-slate-500">Delete?</span>
                <button
                  onClick={() => deleteMutation.mutate(receipt.id)}
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
              <button
                onClick={() => setDeletingId(receipt.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
