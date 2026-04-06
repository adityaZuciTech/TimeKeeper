import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, Clock, CheckCircle2, XCircle, CalendarDays, X } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { formatDistanceToNow, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import {
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  clearAllNotifications,
  restoreNotifications,
  selectNotifications,
  selectUnreadCount,
} from '../features/notifications/notificationSlice'

const TYPE_CONFIG = {
  TIMESHEET_SUBMITTED: { Icon: Clock,         color: 'text-blue-600 bg-blue-50' },
  TIMESHEET_APPROVED:  { Icon: CheckCircle2,  color: 'text-emerald-600 bg-emerald-50' },
  TIMESHEET_REJECTED:  { Icon: XCircle,       color: 'text-red-600 bg-red-50' },
  LEAVE_APPLIED:       { Icon: CalendarDays,  color: 'text-amber-600 bg-amber-50' },
  LEAVE_APPROVED:      { Icon: CheckCircle2,  color: 'text-emerald-600 bg-emerald-50' },
  LEAVE_REJECTED:      { Icon: XCircle,       color: 'text-red-600 bg-red-50' },
}
const DEFAULT_CONFIG = { Icon: Bell, color: 'text-muted-foreground bg-muted' }

const UNDO_MS = 5000

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => { if (!ref.current || ref.current.contains(e.target)) return; handler() }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}

export default function NotificationBell({ buttonClassName }) {
  const [open, setOpen]           = useState(false)
  const [dismissingId, setDismissingId] = useState(null)
  const [isClearing, setIsClearing] = useState(false)
  const ref         = useRef(null)
  const undoRef     = useRef(null)   // holds the setTimeout ID for the pending clear-all API call
  const snapshotRef = useRef([])     // notification array snapshot taken before clearing
  const dispatch    = useDispatch()
  const notifications = useSelector(selectNotifications)
  const unreadCount   = useSelector(selectUnreadCount)
  useClickOutside(ref, () => setOpen(false))

  // If the component unmounts while the undo window is open (user navigated away),
  // cancel the timer and fire the delete immediately so data is not orphaned.
  useEffect(() => {
    return () => {
      if (undoRef.current) {
        clearTimeout(undoRef.current)
        dispatch(clearAllNotifications())
      }
    }
  }, [dispatch])

  const handleNotificationClick = (n) => {
    if (!n.read) dispatch(markNotificationRead(n.id))
  }

  const handleMarkAllRead = (e) => {
    e.stopPropagation()
    dispatch(markAllNotificationsRead())
  }

  // Animate the row out then dispatch the optimistic delete
  const handleDismiss = useCallback((id) => {
    setDismissingId(id)
    setTimeout(() => {
      setDismissingId(null)
      dispatch(dismissNotification(id))
        .unwrap()
        .catch(() => toast.error('Failed to dismiss notification'))
    }, 200)
  }, [dispatch])

  const handleClearAll = useCallback((e) => {
    e.stopPropagation()
    if (undoRef.current) return

    snapshotRef.current = [...notifications]
    dispatch(restoreNotifications([]))
    setIsClearing(true)

    undoRef.current = setTimeout(() => {
      undoRef.current = null
      setIsClearing(false)
      dispatch(clearAllNotifications())
        .unwrap()
        .catch(() => toast.error('Failed to clear notifications'))
    }, UNDO_MS)
  }, [notifications, dispatch])

  const handleUndo = useCallback((e) => {
    e.stopPropagation()
    clearTimeout(undoRef.current)
    undoRef.current = null
    setIsClearing(false)
    dispatch(restoreNotifications(snapshotRef.current))
    snapshotRef.current = []
  }, [dispatch])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={buttonClassName ?? 'relative w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors'}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-primary rounded-full flex items-center justify-center px-1">
            <span className="text-[10px] font-bold text-primary-foreground leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
              {unreadCount > 0 && notifications.length > 0 && (
                <span className="text-muted-foreground/30 text-xs select-none">·</span>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {isClearing ? (
              <div className="px-5 pt-5 pb-4 flex flex-col items-center gap-3">
                <style>{`@keyframes _tk_shrink{from{width:100%}to{width:0%}}`}</style>
                <p className="text-sm font-medium text-foreground">Notifications cleared</p>
                <button
                  onClick={handleUndo}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-1 rounded hover:bg-primary/10"
                >
                  Undo
                </button>
                <div className="w-full h-[3px] bg-border/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ animation: `_tk_shrink ${UNDO_MS}ms linear forwards` }}
                  />
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG
                const { Icon } = cfg
                return (
                  // Outer div handles the slide-out animation; inner layout separates click zones
                  <div
                    key={n.id}
                    className={`group transition-all duration-200 overflow-hidden
                      ${dismissingId === n.id ? 'opacity-0 max-h-0 py-0' : 'opacity-100 max-h-40'}`}
                  >
                    <div className={`flex items-start gap-0 transition-colors hover:bg-muted/50 ${!n.read ? 'bg-primary/5' : ''}`}>
                      {/* Notification content — clicking marks as read */}
                      <button
                        className="flex-1 flex gap-3 text-left px-4 py-3 min-w-0"
                        onClick={() => handleNotificationClick(n)}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-tight ${n.read ? 'font-normal text-foreground' : 'font-semibold text-foreground'}`}>
                              {n.title}
                            </p>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                          <p className="text-[11px] text-muted-foreground/60 mt-1">
                            {formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </button>

                      {/* Dismiss × — only visible on row hover, stops propagation */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDismiss(n.id) }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity self-start mt-2.5 mr-2.5 p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted flex-shrink-0"
                        aria-label="Dismiss notification"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
