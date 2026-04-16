const VARIANTS = {
  green:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  red:    'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  gray:   'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
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
