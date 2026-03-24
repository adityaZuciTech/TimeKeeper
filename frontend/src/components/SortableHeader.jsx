import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'

/**
 * SortableHeader — a <th> cell content that shows sort direction.
 *
 * Usage inside a <th>:
 *   <th className="table-header">
 *     <SortableHeader col="name" label="Employee" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
 *   </th>
 *
 * Props:
 *   col      — the column key (string)
 *   label    — display label
 *   sortBy   — currently sorted column key
 *   sortDir  — 'asc' | 'desc'
 *   onSort   — (col: string) => void  — toggles dir if already active, else sets asc
 */
export default function SortableHeader({ col, label, sortBy, sortDir, onSort }) {
  const isActive = sortBy === col
  return (
    <button
      onClick={() => onSort(col)}
      className={`sort-th ${isActive ? 'active' : ''}`}
    >
      {label}
      <span className="flex-shrink-0 text-muted-foreground/60">
        {isActive
          ? sortDir === 'asc'
            ? <ChevronUp size={12} className="text-primary" />
            : <ChevronDown size={12} className="text-primary" />
          : <ChevronsUpDown size={11} className="opacity-40" />
        }
      </span>
    </button>
  )
}
