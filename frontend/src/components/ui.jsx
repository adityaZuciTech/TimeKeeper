import { FileText, CheckCircle2, AlertTriangle, Clock, Minus } from 'lucide-react'

// ---- StatusBadge --------------------------------------------------------
const badgeConfig = {
  DRAFT:          { cls: 'badge-draft',     Icon: FileText },
  SUBMITTED:      { cls: 'badge-submitted', Icon: CheckCircle2 },
  AUTO_SUBMITTED: { cls: 'badge-inactive',  Icon: CheckCircle2 },
  ACTIVE:         { cls: 'badge-active',    Icon: CheckCircle2 },
  INACTIVE:       { cls: 'badge-inactive',  Icon: Minus },
  ON_HOLD:        { cls: 'badge-on-hold',   Icon: AlertTriangle },
  COMPLETED:      { cls: 'badge-completed', Icon: CheckCircle2 },
}

export function StatusBadge({ status }) {
  const { cls, Icon } = badgeConfig[status] || badgeConfig.INACTIVE
  return (
    <span className={cls}>
      <Icon size={12} className="shrink-0" />
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

// ---- StatCard ------------------------------------------------------------
const statVariants = {
  blue:   'bg-primary/10 text-primary',
  green:  'bg-success/10 text-success',
  amber:  'bg-warning/10 text-warning-foreground',
  violet: 'bg-purple-100 text-purple-600',
  gray:   'bg-muted text-muted-foreground',
}

export function StatCard({ title, value, subtitle, icon, color = 'blue' }) {
  const variant = statVariants[color] || statVariants.blue
  return (
    <div className="card flex items-start gap-4">
      {icon && (
        <div className={`p-2.5 rounded-md flex-shrink-0 ${variant}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-heading font-bold text-foreground">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ---- LoadingSpinner ------------------------------------------------------
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="relative w-9 h-9">
        <div className="absolute inset-0 rounded-full border-2 border-border"></div>
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    </div>
  )
}

// ---- PageHeader ----------------------------------------------------------
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  )
}

// ---- EmptyState ----------------------------------------------------------
export function EmptyState({ message = 'No data found', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center mb-4">
        <FileText size={28} className="text-muted-foreground/40" />
      </div>
      <p className="text-sm font-body font-medium text-muted-foreground mb-1">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
