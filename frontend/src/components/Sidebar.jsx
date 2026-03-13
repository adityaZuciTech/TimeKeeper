import { NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout, selectCurrentUser } from '../features/auth/authSlice'

const navItems = {
  EMPLOYEE: [
    { path: '/dashboard', label: 'Dashboard', icon: '⊞' },
    { path: '/timesheets', label: 'Timesheets', icon: '📋' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ],
  MANAGER: [
    { path: '/dashboard', label: 'Dashboard', icon: '⊞' },
    { path: '/timesheets', label: 'Timesheets', icon: '📋' },
    { path: '/team', label: 'Team', icon: '👥' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ],
  ADMIN: [
    { path: '/dashboard', label: 'Dashboard', icon: '⊞' },
    { path: '/timesheets', label: 'Timesheets', icon: '📋' },
    { path: '/team', label: 'Team', icon: '👥' },
    { path: '/employees', label: 'Employees', icon: '👤' },
    { path: '/departments', label: 'Departments', icon: '🏢' },
    { path: '/projects', label: 'Projects', icon: '📁' },
    { path: '/organization', label: 'Organization', icon: '📊' },
    { path: '/profile', label: 'Profile', icon: '⚙️' },
  ],
}

export default function Sidebar() {
  const user = useSelector(selectCurrentUser)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const items = navItems[user?.role] || navItems.EMPLOYEE

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            TK
          </div>
          <span className="font-semibold text-lg">TimeKeeper</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
