import { useState, useRef, useEffect } from 'react'
import Sidebar from './Sidebar'
import { format } from 'date-fns'
import { Bell, User, LogOut, Settings, ChevronDown, Clock, CheckCircle2 } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectCurrentUser, logout, logoutAsync } from '../features/auth/authSlice'

const SAMPLE_NOTIFICATIONS = [
  { id: 1, Icon: CheckCircle2, title: 'Timesheet approved', body: 'Your timesheet for last week was approved.', time: '2h ago', unread: false },
  { id: 2, Icon: Clock, title: 'Timesheet due soon', body: 'Weekly timesheet is due this Friday.', time: '1d ago', unread: false },
  { id: 3, Icon: User, title: 'Team leave notice', body: 'John Smith is on leave tomorrow.', time: '2d ago', unread: false },
]

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
  useClickOutside(ref, () => setOpen(false))
  const unreadCount = SAMPLE_NOTIFICATIONS.filter(n => n.unread).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-heading font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
            <p className="text-[11px] text-amber-700 font-medium text-center">
              Real-time notifications — Coming Soon
            </p>
          </div>
          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {SAMPLE_NOTIFICATIONS.map(n => (
              <div key={n.id} className="px-4 py-3 flex gap-3 opacity-60">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground">
                  <n.Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-border text-center">
            <span className="text-xs text-muted-foreground font-medium">Notification history — Coming Soon</span>
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
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-heading font-semibold">
            {initials}
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
        </div>
        <ChevronDown size={13} className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-heading font-semibold text-foreground truncate">{user?.name}</p>
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
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0 lg:sticky lg:top-0 lg:z-10">
          <p className="text-sm text-muted-foreground font-body hidden sm:block">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
          <div className="flex items-center gap-1 ml-auto">
            <NotificationBell />
            <UserMenu user={user} initials={initials} />
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto mt-16 lg:mt-0">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
