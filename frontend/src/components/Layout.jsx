import { useState, useRef, useEffect } from 'react'
import Sidebar from './Sidebar'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { Bell, User, LogOut, Settings, ChevronDown, Clock, CheckCircle2, XCircle, CalendarDays } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectCurrentUser, logout, logoutAsync } from '../features/auth/authSlice'
import {
  fetchNotifications,
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

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const dispatch = useDispatch()
  const notifications = useSelector(selectNotifications)
  const unreadCount = useSelector(selectUnreadCount)
  useClickOutside(ref, () => setOpen(false))

  // Fetch on mount and poll every 30 seconds
  useEffect(() => {
    dispatch(fetchNotifications())
    const interval = setInterval(() => dispatch(fetchNotifications()), 30_000)
    return () => clearInterval(interval)
  }, [dispatch])

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
        className="relative w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
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

function UserMenu({ user, initials }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  useClickOutside(ref, () => setOpen(false))

  const handleLogout = async () => {
    await dispatch(logoutAsync())
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg hover:bg-accent transition-colors"
        aria-label="User menu"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
            {initials}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
        </div>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <span className="inline-flex mt-1.5 text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {user?.role}
            </span>
          </div>
          <div className="py-1">
            <button
              onClick={() => { navigate('/profile'); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <User size={15} className="text-muted-foreground" />
              My Profile
            </button>
            <button
              onClick={() => { navigate('/profile'); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <Settings size={15} className="text-muted-foreground" />
              Account Settings
            </button>
          </div>
          <div className="border-t border-border py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Layout({ children }) {
  const user = useSelector(selectCurrentUser)
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2) || '?'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-card border-b border-border items-center justify-between px-6 flex-shrink-0 z-10 hidden lg:flex">
          <p className="text-sm text-muted-foreground font-medium hidden sm:block">
            {format(new Date(), 'EEE, d MMM yyyy')}
          </p>
          <div className="flex items-center gap-1 ml-auto">
            <NotificationBell />
            <UserMenu user={user} initials={initials} />
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto pt-[88px] lg:pt-6">
          <div className="max-w-5xl mx-auto animate-slide-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
