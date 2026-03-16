import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout, selectCurrentUser } from '../features/auth/authSlice'
import {
  LayoutDashboard, Clock, Users, UserCheck, Building2,
  FolderKanban, BarChart2, User, LogOut, Menu, X, ChevronRight, ChevronsLeft,
} from 'lucide-react'

const navItems = {
  EMPLOYEE: [
    { path: '/dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
    { path: '/timesheets', label: 'Timesheets', Icon: Clock },
    { path: '/profile',    label: 'Profile',    Icon: User },
  ],
  MANAGER: [
    { path: '/dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
    { path: '/timesheets', label: 'Timesheets', Icon: Clock },
    { path: '/team',       label: 'My Team',    Icon: UserCheck },
    { path: '/profile',    label: 'Profile',    Icon: User },
  ],
  ADMIN: [
    { path: '/dashboard',    label: 'Dashboard',   Icon: LayoutDashboard },
    { path: '/timesheets',   label: 'Timesheets',  Icon: Clock },
    { path: '/employees',    label: 'Employees',   Icon: Users },
    { path: '/departments',  label: 'Departments', Icon: Building2 },
    { path: '/projects',     label: 'Projects',    Icon: FolderKanban },
    { path: '/organization', label: 'Reports',     Icon: BarChart2 },
    { path: '/profile',      label: 'Profile',     Icon: User },
  ],
}

function SidebarContent({ user, items, onLogout, collapsed = false, onToggleCollapse }) {
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`h-[72px] flex items-center border-b border-slate-700 flex-shrink-0 ${collapsed ? 'justify-center px-3' : 'px-5'}`}>
        {collapsed ? (
          /* In collapsed mode the logo icon doubles as the expand button */
          <button
            onClick={onToggleCollapse}
            className="w-9 h-9 bg-primary rounded-md flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity"
            title="Expand sidebar"
          >
            <Clock size={18} className="text-primary-foreground" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
                <Clock size={18} className="text-primary-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-heading font-semibold text-white text-[15px] tracking-tight leading-tight">
                  TimeKeeper
                </span>
              </div>
            </div>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="ml-2 p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-all duration-200 flex-shrink-0"
                title="Collapse sidebar"
              >
                <ChevronsLeft size={16} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-2 space-y-1 sidebar-scroll overflow-y-auto">
        {items.map(({ path, label, Icon }) =>
          collapsed ? (
            /* Collapsed: icon-only + custom tooltip. NavLink never touches collapsed state. */
            <div key={path} className="relative group">
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `flex justify-center p-2.5 rounded-md text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <Icon size={18} className={isActive ? 'text-primary' : 'text-slate-300 group-hover:text-white'} />
                )}
              </NavLink>
              {/* Tooltip */}
              <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap shadow-md z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {label}
              </span>
            </div>
          ) : (
            /* Expanded: icon + label with left accent indicator */
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 group border-l-2 ${
                  isActive
                    ? 'bg-slate-700 text-white font-medium border-primary'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-primary' : 'text-slate-300 group-hover:text-white'} />
                  <span className="flex-1 font-body">{label}</span>
                  {isActive && <ChevronRight size={14} className="text-primary opacity-70" />}
                </>
              )}
            </NavLink>
          )
        )}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 border-t border-slate-700 px-2 py-3">
        {collapsed ? (
          <div className="relative group flex justify-center">
            <div className="relative p-2 rounded-md hover:bg-slate-700 transition-all duration-200 cursor-default">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs font-heading font-bold text-primary-foreground">{initials}</span>
              </div>
              <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-800" />
            </div>
            <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap shadow-md z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {user?.name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-700 transition-all duration-200 cursor-default">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs font-heading font-bold text-primary-foreground">{initials}</span>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-800" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-heading font-medium text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-300 truncate capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <button
              onClick={onLogout}
              title="Sign out"
              className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex-shrink-0"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectCurrentUser)

  const items = navItems[user?.role] ?? navItems.EMPLOYEE

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col h-screen bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700 flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent
          user={user}
          items={items}
          onLogout={handleLogout}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
            <Clock size={14} className="text-primary-foreground" />
          </div>
          <span className="font-heading font-semibold text-white text-sm">TimeKeeper</span>
        </div>
      </div>

      {/* Mobile overlay — icon-only compact sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-20 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-2 z-10 p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
            <SidebarContent
              user={user}
              items={items}
              onLogout={handleLogout}
              collapsed={true}
            />
          </div>
        </div>
      )}
    </>
  )
}
