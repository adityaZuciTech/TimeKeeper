import { useState, useRef, useEffect } from 'react'
import { Bell, Clock, CheckCircle2, XCircle, CalendarDays } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  markNotificationRead,
  markAllNotificationsRead,
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

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => { if (!ref.current || ref.current.contains(e.target)) return; handler() }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}

/**
 * Notification bell button + dropdown panel.
 * Data fetching / polling is handled by the parent (Layout).
 * Pass buttonClassName to override the trigger button styles (e.g. for the dark mobile top bar).
 */
export default function NotificationBell({ buttonClassName }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const dispatch = useDispatch()
  const notifications = useSelector(selectNotifications)
  const unreadCount = useSelector(selectUnreadCount)
  useClickOutside(ref, () => setOpen(false))

  const handleNotificationClick = (n) => {
    if (!n.read) dispatch(markNotificationRead(n.id))
  }

  const handleMarkAllRead = (e) => {
    e.stopPropagation()
    dispatch(markAllNotificationsRead())
  }

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
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? DEFAULT_CONFIG
                const { Icon } = cfg
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-muted/50 ${!n.read ? 'bg-primary/5' : ''}`}
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
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
