import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * PaginationBar
 *
 * Props:
 *   page          — current page (1-based)
 *   totalItems    — total record count
 *   pageSize      — items per page
 *   onPageChange  — (newPage: number) => void
 *   onPageSize    — (newSize: number) => void  (optional, hides selector if omitted)
 *   pageSizeOptions — [10, 25, 50] (default)
 *   className     — extra wrapper classes
 */
const DEFAULT_SIZE_OPTIONS = [10, 25, 50]

function pageWindow(current, total) {
  // Always show up to 7 page numbers with ellipsis
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  if (current <= 4) {
    pages.push(1, 2, 3, 4, 5, '…', total)
  } else if (current >= total - 3) {
    pages.push(1, '…', total - 4, total - 3, total - 2, total - 1, total)
  } else {
    pages.push(1, '…', current - 1, current, current + 1, '…', total)
  }
  return pages
}

export default function PaginationBar({
  page = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSize,
  pageSizeOptions = DEFAULT_SIZE_OPTIONS,
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const end   = Math.min(page * pageSize, totalItems)
  const pages = pageWindow(page, totalPages)

  if (totalItems === 0) return null

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-border/60 ${className}`}>
      {/* Left: count */}
      <p className="text-[12.5px] text-muted-foreground font-medium tabular-nums whitespace-nowrap">
        Showing <span className="text-foreground font-semibold">{start}–{end}</span> of{' '}
        <span className="text-foreground font-semibold">{totalItems}</span>
      </p>

      {/* Center: page buttons */}
      <div className="flex items-center gap-1">
        <button
          className="pg-btn"
          onClick={() => onPageChange?.(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-sm text-muted-foreground select-none">…</span>
          ) : (
            <button
              key={p}
              className={`pg-btn ${p === page ? 'active' : ''}`}
              onClick={() => onPageChange?.(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          className="pg-btn"
          onClick={() => onPageChange?.(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Right: page size selector */}
      {onPageSize && (
        <div className="flex items-center gap-2">
          <span className="text-[12.5px] text-muted-foreground whitespace-nowrap">Per page</span>
          <select
            value={pageSize}
            onChange={e => { onPageSize(Number(e.target.value)); onPageChange?.(1) }}
            className="h-8 rounded-lg border border-border bg-card px-2 text-sm text-foreground
                       focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50
                       transition-all duration-150 cursor-pointer"
            style={{ boxShadow: 'var(--shadow-xs)' }}
          >
            {pageSizeOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
