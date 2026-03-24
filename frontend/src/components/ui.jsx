import { useEffect } from 'react'
import { FileText, CheckCircle2, AlertTriangle, Minus, XCircle, Ban, AlertCircle, Clock } from 'lucide-react'

// ---- PageTransition -------------------------------------------------------
// Wrap page content for a consistent fade+slide entrance animation.
export function PageTransition({ children, className = '' }) {
  return (
    <div className={`animate-slide-up ${className}`}>
      {children}
    </div>
  )
}

// ---- StatusBadge ----------------------------------------------------------
// Semantic color mapping � consistent across ALL pages:
//   Draft    ? gray    | Submitted ? blue
//   Approved ? green   | Rejected  ? red
//   Pending  ? amber   | Overdue   ? red
const badgeConfig = {
  DRAFT:          { cls: 'badge-draft',         Icon: FileText,     label: 'Draft'          },
  SUBMITTED:      { cls: 'badge-submitted',     Icon: CheckCircle2, label: 'Submitted'      },
  AUTO_SUBMITTED: { cls: 'badge-auto-submitted', Icon: CheckCircle2, label: 'Submitted'     },
  APPROVED:       { cls: 'badge-approved',      Icon: CheckCircle2, label: 'Approved'       },
  REJECTED:       { cls: 'badge-rejected',      Icon: XCircle,      label: 'Rejected'       },
  OVERDUE:        { cls: 'badge-overdue',        Icon: AlertTriangle,label: 'Overdue'        },
  PENDING:        { cls: 'badge-pending',        Icon: Clock,        label: 'Pending'        },
  ACTIVE:         { cls: 'badge-active',         Icon: CheckCircle2, label: 'Active'         },
  INACTIVE:       { cls: 'badge-inactive',       Icon: Minus,        label: 'Inactive'       },
  ON_HOLD:        { cls: 'badge-on-hold',        Icon: AlertTriangle,label: 'On Hold'        },
  COMPLETED:      { cls: 'badge-completed',      Icon: CheckCircle2, label: 'Completed'      },
  CANCELLED:      { cls: 'badge-cancelled',      Icon: Ban,          label: 'Cancelled'      },
}

export function StatusBadge({ status }) {
  const cfg = badgeConfig[status] || {
    cls: 'badge-inactive',
    Icon: Minus,
    label: status?.replace(/_/g, ' ') || '�',
  }
  const { cls, Icon, label } = cfg
  return (
    <span className={cls}>
      <Icon size={11} className="shrink-0" />
      {label}
    </span>
  )
}

// ---- StatCard ------------------------------------------------------------
const statVariants = {
  blue:   'bg-primary/10 text-primary',
  green:  'bg-emerald-50 text-emerald-600',
  amber:  'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  red:    'bg-red-50 text-red-600',
  gray:   'bg-muted text-muted-foreground',
}

export function StatCard({ title, value, subtitle, icon, color = 'blue' }) {
  const variant = statVariants[color] || statVariants.blue
  return (
    <div className="card-hover p-5 flex items-start gap-4">
      {icon && (
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${variant}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
        <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ---- DataCard ------------------------------------------------------------
// General-purpose card with title/subtitle + optional footer action.
export function DataCard({ title, subtitle, children, action, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="text-base font-medium text-foreground">{title}</h3>}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

// ---- LoadingSpinner ------------------------------------------------------
export function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-label={label}>
      <div className="relative w-9 h-9">
        <div className="absolute inset-0 rounded-full border-2 border-border"></div>
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    </div>
  )
}

// ---- LoadingButton -------------------------------------------------------
// Drop-in replacement for any <button> that needs a loading state.
// Usage: <LoadingButton loading={saving} onClick={�}>Save</LoadingButton>
export function LoadingButton({ loading = false, disabled = false, children, className = '', type = 'button', onClick, variant = 'primary', autoFocus }) {
  const base = variant === 'ghost' ? 'btn-ghost' : variant === 'danger' ? 'btn-danger' : 'btn-primary'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      autoFocus={autoFocus}
      className={`${base} ${className} inline-flex items-center justify-center gap-2`}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}

// ---- FieldError ----------------------------------------------------------
// Inline form validation error shown below a field.
export function FieldError({ error }) {
  if (!error) return null
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600 font-medium" role="alert">
      <AlertCircle size={12} className="flex-shrink-0" />
      {error}
    </p>
  )
}

// ---- ConfirmDialog -------------------------------------------------------
// Accessible confirmation modal for destructive / irreversible actions.
// Usage:
//   <ConfirmDialog
//     open={showConfirm}
//     title="Submit Timesheet?"
//     description="Once submitted, you can't make changes."
//     confirmLabel="Submit"
//     variant="primary"        // "primary" | "danger"
//     onConfirm={handleSubmit}
//     onCancel={() => setShowConfirm(false)}
//   />
export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'primary', onConfirm, onCancel, loading = false }) {
  // ESC to cancel
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onCancel?.() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onCancel} />
      {/* Panel */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-start gap-4 mb-5">
          <div className={`p-2 rounded-xl flex-shrink-0 ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
            {variant === 'danger' ? <AlertTriangle size={20} /> : <AlertCircle size={20} />}
          </div>
          <div>
            <h2 id="confirm-title" className="text-base font-semibold text-foreground">{title}</h2>
            {description && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{description}</p>}
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn-ghost"
          >
            {cancelLabel}
          </button>
          <LoadingButton
            type="button"
            loading={loading}
            onClick={onConfirm}
            variant={variant === 'danger' ? 'danger' : 'primary'}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          >
            {confirmLabel}
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}

// ---- SkeletonRows --------------------------------------------------------
// Animated placeholder rows for table/list loading states.
export function SkeletonRows({ rows = 5, cols = 4 }) {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading�">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/50 last:border-0">
          <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
          <div className="flex-1 flex gap-4">
            {Array.from({ length: cols }).map((__, j) => (
              <div key={j} className={`h-3 bg-muted rounded ${j === 0 ? 'w-1/3' : 'w-1/5'}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---- PageHeader ----------------------------------------------------------
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1 className="text-page-title">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-4 flex items-center gap-2">{action}</div>}
    </div>
  )
}

// ---- EmptyState ----------------------------------------------------------
// Contextual empty state. Pass `icon`, `title`, `description` for rich display.
export function EmptyState({ icon: Icon, title, description, message, action }) {
  const displayTitle = title || message || 'Nothing here yet'
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-muted/70 flex items-center justify-center mb-4">
        {Icon ? <Icon size={24} className="text-muted-foreground/40" /> : <FileText size={24} className="text-muted-foreground/40" />}
      </div>
      <p className="text-base font-semibold text-foreground mb-1">{displayTitle}</p>
      {description && <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
