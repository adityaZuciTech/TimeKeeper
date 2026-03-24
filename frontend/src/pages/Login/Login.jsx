import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { login, selectIsAuthenticated, selectAuthError, selectAuthLoading, clearError } from '../../features/auth/authSlice'
import { Clock, Eye, EyeOff, BarChart2, Users, Timer, AlertCircle } from 'lucide-react'

const features = [
  { Icon: Timer,    label: 'Track time across projects',    desc: 'Log work hours with precision across multiple projects' },
  { Icon: BarChart2, label: 'Real-time utilization reports', desc: 'Visual insights for managers and admins' },
  { Icon: Users,    label: 'Team-based access control',    desc: 'Role-based views for Employees, Managers & Admins' },
]

const demoAccounts = [
  { role: 'Admin',    email: 'admin@timekeeper.app',   password: 'Admin123!' },
  { role: 'Manager',  email: 'manager@timekeeper.app', password: 'Manager123!' },
  { role: 'Employee', email: 'john@timekeeper.app',    password: 'Employee123!' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [inlineError, setInlineError] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const isAuthenticated = useSelector(selectIsAuthenticated)
  const error = useSelector(selectAuthError)
  const loading = useSelector(selectAuthLoading)

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true })
  }, [isAuthenticated, navigate])

  // Show error inline instead of (only) as a disappearing toast
  useEffect(() => {
    if (error) {
      setInlineError(error)
      dispatch(clearError())
    }
  }, [error, dispatch])

  const handleSubmit = (e) => {
    e.preventDefault()
    setInlineError('')
    dispatch(login({ email, password }))
  }

  const fillDemo = (e, p) => { setEmail(e); setPassword(p); setInlineError('') }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[52%] bg-sidebar flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center">
            <Clock size={18} className="text-primary-foreground" />
          </div>
          <span className="text-[15px] font-semibold text-sidebar-foreground tracking-tight">TimeKeeper</span>
        </div>

        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-sidebar-foreground leading-tight mb-4">
            Track time.<br />
            <span className="text-primary">Work smarter.</span>
          </h1>
          <p className="text-sidebar-muted text-base leading-relaxed mb-10 max-w-sm">
            The modern time-tracking platform built for teams who value simplicity, visibility, and control.
          </p>

          <div className="space-y-5">
            {features.map(({ Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center text-sidebar-foreground flex-shrink-0">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sidebar-foreground font-medium text-sm">{label}</p>
                  <p className="text-sidebar-muted text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-sidebar-muted/50 text-xs relative z-10">&copy; 2026 TimeKeeper. All rights reserved.</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center">
              <Clock size={18} className="text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground text-lg">TimeKeeper</span>
          </div>

          <div className="card">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h2>
              <p className="text-muted-foreground text-sm mt-1">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="label">Email address</label>
                <input
                  id="email"
                  type="email" className="input" placeholder="you@company.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoFocus
                />
              </div>

              <div>
                <label htmlFor="password" className="label">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-11" placeholder="Enter your password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full animate-submit-glow" disabled={loading}>
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign in'}
              </button>

              {/* Inline error � persists until user retries (heuristic #9) */}
              {inlineError && (
                <div className="flex items-start gap-2.5 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg" role="alert">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 leading-snug">{inlineError}</p>
                </div>
              )}
            </form>

            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">Demo accounts - click to fill</p>
              <div className="space-y-1">
                {demoAccounts.map(({ role, email: e, password: p }) => (
                  <button
                    key={role} type="button"
                    onClick={() => fillDemo(e, p)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors group flex items-center justify-between"
                  >
                    <span className="text-xs font-medium text-foreground group-hover:text-accent-foreground">{role}</span>
                    <span className="text-xs text-muted-foreground">{e}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
