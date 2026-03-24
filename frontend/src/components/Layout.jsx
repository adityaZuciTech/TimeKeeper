import { useState, useRef, useEffect } from 'react'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'
import { format } from 'date-fns'
import { User, LogOut, Settings, ChevronDown } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectCurrentUser, logoutAsync } from '../features/auth/authSlice'
import { fetchNotifications } from '../features/notifications/notificationSlice'


function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => { if (!ref.current || ref.current.contains(e.target)) return; handler() }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
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
  const dispatch = useDispatch()
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2) || '?'

  // Fetch notifications on mount and poll every 30 s (single source for both mobile & desktop)
  useEffect(() => {
    dispatch(fetchNotifications())
    const interval = setInterval(() => dispatch(fetchNotifications()), 30_000)
    return () => clearInterval(interval)
  }, [dispatch])

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
