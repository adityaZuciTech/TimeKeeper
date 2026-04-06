import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Dismissible rejection reason banner.
 * Dismissal state is persisted to localStorage keyed by timesheetId + reason,
 * so a new rejection message always re-shows the banner.
 */
export default function RejectionBanner({ timesheetId, rejectionReason }) {
  const rejectionKey = `rejection-dismissed::${timesheetId}::${rejectionReason}`

  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(rejectionKey) === '1'
  )

  // Sync state when timesheetId or rejectionReason changes
  useEffect(() => {
    setDismissed(localStorage.getItem(rejectionKey) === '1')
  }, [rejectionKey])

  if (dismissed) return null

  const dismiss = () => {
    localStorage.setItem(rejectionKey, '1')
    setDismissed(true)
  }

  return (
    <div
      className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start justify-between gap-2"
      role="alert"
    >
      <span>
        <span className="font-semibold">Rejection reason:</span> {rejectionReason}
      </span>
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
        aria-label="Dismiss rejection reason"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
