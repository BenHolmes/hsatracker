const VARIANTS = {
  green:  'bg-emerald-100 text-emerald-700',
  blue:   'bg-blue-100 text-blue-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red:    'bg-red-100 text-red-700',
  gray:   'bg-slate-100 text-slate-500',
} as const

interface Props {
  variant?: keyof typeof VARIANTS
  children: React.ReactNode
}

export default function Badge({ variant = 'gray', children }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  )
}
