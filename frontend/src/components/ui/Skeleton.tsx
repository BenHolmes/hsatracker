/**
 * Reusable skeleton components for loading states.
 *
 * Skeleton     — a single animated placeholder block. Set dimensions via className.
 * TableSkeleton — fills a <tbody> with N skeleton rows during data loading.
 */

/** Animated grey block. Pass className to control width/height (e.g. "h-4 w-24"). */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`} />
  )
}

/**
 * Drop-in <tbody> replacement while table data is loading.
 * Alternates column widths so rows don't all look identical.
 */
export function TableSkeleton({ rows = 5, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <Skeleton
                className={`h-4 ${
                  j === cols - 1 ? 'w-12' :   // action column — narrow
                  j === 0        ? 'w-20' :   // first col (date/id) — fixed
                  j % 3 === 0    ? 'w-full' :
                  j % 3 === 1    ? 'w-3/4'  :
                                   'w-1/2'
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
