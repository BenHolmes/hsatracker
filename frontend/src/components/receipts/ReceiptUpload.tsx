import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { uploadReceipt } from '../../api/receipts'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const ACCEPTED_LABEL = 'JPG, PNG, or PDF'

interface Props {
  expenseId: string
}

export default function ReceiptUpload({ expenseId }: Props) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const mutation = useMutation({
    mutationFn: (file: File) => uploadReceipt(expenseId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-receipts', expenseId] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Receipt uploaded')
    },
    onError: () => {
      toast.error('Upload failed. Check file type and size.')
    },
  })

  const handleFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(`Invalid file type. Please upload a ${ACCEPTED_LABEL}.`)
      return
    }
    mutation.mutate(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div
      onClick={() => !mutation.isPending && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={[
        'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors cursor-pointer',
        mutation.isPending
          ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 cursor-wait'
          : dragging
            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-700/50',
      ].join(' ')}
    >
      <Upload className={`w-5 h-5 ${dragging || mutation.isPending ? 'text-emerald-500' : 'text-slate-400'}`} />
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {mutation.isPending ? 'Uploading…' : 'Drop a file or click to upload'}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{ACCEPTED_LABEL} · max 10 MB</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={onInputChange}
        className="hidden"
      />
    </div>
  )
}
