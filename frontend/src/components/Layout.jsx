import Sidebar from './Sidebar'
import { format } from 'date-fns'
import { Bell } from 'lucide-react'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '../features/auth/authSlice'

export default function Layout({ children }) {
  const user = useSelector(selectCurrentUser)
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2) || '?'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0 lg:sticky lg:top-0 lg:z-10">
          <p className="text-sm text-muted-foreground font-body hidden sm:block">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
          <div className="flex items-center gap-3 ml-auto">
            <button className="w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <Bell size={18} />
            </button>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-heading font-semibold">
              {initials}
            </div>
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
