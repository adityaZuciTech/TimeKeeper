import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '../features/auth/authSlice'
import {
  LayoutDashboard, Clock, Users, UserCheck, Building2,
  FolderKanban, BarChart2, User, Menu, X, ChevronRight, ChevronsLeft, ChevronsRight,
  CalendarOff, CalendarDays,
} from 'lucide-react'

// Each role's nav is split into labelled sections.
// Set `collapsible: true` on a section to make it toggleable (default expanded).
const navGroups = {
  EMPLOYEE: [
    {
      section: 'OVERVIEW',
      items: [
        { path: '/dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
      ],
    },
    {
      section: 'WORK',
      items: [
        { path: '/timesheets', label: 'Timesheets', Icon: Clock },
        { path: '/leaves/my',  label: 'My Leaves',  Icon: CalendarOff },
        { path: '/holidays',   label: 'Holidays',   Icon: CalendarDays },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { path: '/profile', label: 'Profile', Icon: User },
      ],
    },
  ],
  MANAGER: [
    {
      section: 'OVERVIEW',
      items: [
        { path: '/dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
      ],
    },
    {
      section: 'WORK',
      items: [
        { path: '/timesheets',  label: 'Timesheets',  Icon: Clock },
        { path: '/team',        label: 'My Team',     Icon: UserCheck },
        { path: '/leaves/my',   label: 'My Leaves',   Icon: CalendarOff },
        { path: '/leaves/team', label: 'Team Leaves', Icon: Users },
        { path: '/holidays',    label: 'Holidays',    Icon: CalendarDays },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { path: '/profile', label: 'Profile', Icon: User },
      ],
    },
  ],
  ADMIN: [
    {
      section: 'OVERVIEW',
      items: [
        { path: '/dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
      ],
    },
    {
      section: 'WORK',
      items: [
        { path: '/timesheets',  label: 'Timesheets',  Icon: Clock },
        { path: '/leaves/my',   label: 'My Leaves',   Icon: CalendarOff },
        { path: '/leaves/team', label: 'Team Leaves', Icon: UserCheck },
      ],
    },
    {
      section: 'ORGANIZATION',
      collapsible: true,
      items: [
        { path: '/employees',   label: 'Employees',   Icon: Users },
        { path: '/departments', label: 'Departments', Icon: Building2 },
        { path: '/projects',    label: 'Projects',    Icon: FolderKanban },
      ],
    },
    {
      section: 'INSIGHTS',
      items: [
        { path: '/organization', label: 'Reports', Icon: BarChart2 },
      ],
    },
    {
      section: 'ADMINISTRATION',
      items: [
        { path: '/holidays', label: 'Holidays', Icon: CalendarDays },
      ],
    },
    {
      section: 'ACCOUNT',
      items: [
        { path: '/profile', label: 'Profile', Icon: User },
      ],
    },
  ],
}

function SidebarContent({ user, groups, collapsed = false, onToggleCollapse }) {
  // Track which collapsible sections are toggled shut (default: all expanded)
  const [closedSections, setClosedSections] = useState({})

  const toggleSection = (section) =>
    setClosedSections((prev) => ({ ...prev, [section]: !prev[section] }))

  // Flat item list used in collapsed (icon-only) mode
  const allItems = groups.flatMap((g) => g.items)

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`h-[72px] flex items-center border-b border-slate-700 flex-shrink-0 ${collapsed ? 'justify-center px-3' : 'px-4'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-0.5">
            <NavLink
              to="/dashboard"
              className="w-9 h-9 bg-primary rounded-md flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <Clock size={18} className="text-primary-foreground" />
            </NavLink>
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-700/60 transition-all duration-200"
              title="Expand sidebar"
            >
              <ChevronsRight size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 w-full">
            <NavLink to="/dashboard" className="flex items-center gap-2.5 flex-1 min-w-0 group/logo">
              <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center flex-shrink-0 group-hover/logo:opacity-90 transition-opacity">
                <Clock size={18} className="text-primary-foreground" />
              </div>
              <span className="font-heading font-semibold text-white text-[15px] tracking-tight leading-tight truncate">
                TimeKeeper
              </span>
            </NavLink>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200 flex-shrink-0"
                title="Collapse sidebar"
              >
                <ChevronsLeft size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 sidebar-scroll overflow-y-auto">
        {collapsed ? (
          /* ── Collapsed: flat icon-only list with tooltips ── */
          <div className="space-y-1">
            {allItems.map(({ path, label, Icon }) => (
              <div key={path} className="relative group/nav">
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    `flex justify-center p-2.5 rounded-md transition-all duration-200 ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <Icon size={18} className={`transition-colors ${
                      isActive ? 'text-primary' : 'text-slate-400 group-hover/nav:text-white'
                    }`} />
                  )}
                </NavLink>
                {/* Tooltip — slide-in from left */}
                <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-medium whitespace-nowrap shadow-lg z-50 opacity-0 -translate-x-1 group-hover/nav:opacity-100 group-hover/nav:translate-x-0 transition-all duration-150 ease-out">
                  {label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          /* ── Expanded: sectioned groups ── */
          <div className="space-y-5">
            {groups.map(({ section, items, collapsible }) => {
              const isClosed = closedSections[section]
              return (
                <div key={section}>
                  {/* Section header */}
                  <div
                    role={collapsible ? 'button' : undefined}
                    tabIndex={collapsible ? 0 : undefined}
                    onClick={collapsible ? () => toggleSection(section) : undefined}
                    onKeyDown={collapsible ? (e) => e.key === 'Enter' && toggleSection(section) : undefined}
                    className={`flex items-center justify-between px-3 mb-1.5 ${
                      collapsible ? 'cursor-pointer group/sh select-none' : 'cursor-default'
                    }`}
                  >
                    <span className="text-[10px] font-heading font-semibold uppercase tracking-widest text-slate-500 group-hover/sh:text-slate-300 transition-colors">
                      {section}
                    </span>
                    {collapsible && (
                      <ChevronRight
                        size={11}
                        className={`text-slate-500 group-hover/sh:text-slate-300 transition-all duration-200 ${
                          isClosed ? '' : 'rotate-90'
                        }`}
                      />
                    )}
                  </div>

                  {/* Items (hidden when section is collapsed) */}
                  {!isClosed && (
                    <div className="space-y-0.5">
                      {items.map(({ path, label, Icon }) => (
                        <NavLink
                          key={path}
                          to={path}
                          className={({ isActive }) =>
                            `w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-all duration-200 group border-l-2 ${
                              isActive
                                ? 'bg-slate-700 text-white font-medium border-primary'
                                : 'text-slate-300 hover:bg-slate-700/60 hover:text-white border-transparent'
                            }`
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <Icon
                                size={16}
                                className={`flex-shrink-0 transition-colors ${
                                  isActive ? 'text-primary' : 'text-slate-400 group-hover:text-white'
                                }`}
                              />
                              <span className="flex-1 font-body">{label}</span>
                              {isActive && <ChevronRight size={12} className="text-primary opacity-60" />}
                            </>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </nav>

    </div>
  )
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })
  const user = useSelector(selectCurrentUser)

  const groups = navGroups[user?.role] ?? navGroups.EMPLOYEE

  const handleToggleCollapse = () => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col h-screen bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700 flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent
          user={user}
          groups={groups}
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
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
              groups={groups}
              collapsed={true}
            />
          </div>
        </div>
      )}
    </>
  )
}
