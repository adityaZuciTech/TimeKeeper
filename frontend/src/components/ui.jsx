export function StatusBadge({ status }) {
  const map = {
    DRAFT: 'badge-draft',
    SUBMITTED: 'badge-submitted',
    ACTIVE: 'badge-active',
    INACTIVE: 'badge-inactive',
    ON_HOLD: 'badge-on-hold',
    COMPLETED: 'badge-completed',
  }
  const cls = map[status] || 'badge-inactive'
  return <span className={cls}>{status?.replace('_', ' ')}</span>
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function EmptyState({ message = 'No data found' }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <p className="text-base">{message}</p>
    </div>
  )
}
