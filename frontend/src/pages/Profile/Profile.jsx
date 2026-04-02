import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectCurrentUser, changePassword } from '../../features/auth/authSlice'
import Layout from '../../components/Layout'
import { PageHeader, PageTransition } from '../../components/ui'
import toast from 'react-hot-toast'
import { User, Mail, Shield, Building2, Lock, Eye, EyeOff, CreditCard, ChevronDown } from 'lucide-react'

export default function Profile() {
  const user = useSelector(selectCurrentUser)
  const dispatch = useDispatch()
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [open, setOpen] = useState({ personal: false, role: false, security: false })

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?'
  const toggleShow = (field) => setShowPasswords(v => ({ ...v, [field]: !v[field] }))
  const toggleSection = (key) => setOpen(v => ({ ...v, [key]: !v[key] }))

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters')
      return
    }
    setSaving(true)
    try {
      const message = await dispatch(changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })).unwrap()
      toast.success(message || 'Password changed successfully')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const roleBadgeColor = {
    ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    MANAGER: 'bg-blue-100 text-blue-700 border-blue-200',
    EMPLOYEE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  }[user?.role] ?? 'bg-muted text-foreground border-border'

  const passwordFields = [
    { field: 'current', label: 'Current Password', key: 'currentPassword' },
    { field: 'new', label: 'New Password', key: 'newPassword' },
    { field: 'confirm', label: 'Confirm New Password', key: 'confirmPassword' },
  ]

  return (
    <Layout>
      <PageTransition>
      <PageHeader title="My Profile" subtitle="Manage your personal information and account settings" />

      <div className="max-w-3xl space-y-5">

        {/* Hero card */}
        <div className="card relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold text-white tracking-tight">{initials}</span>
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" title="Online" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">{user?.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className={`inline-flex items-center text-xs font-semibold border px-2.5 py-0.5 rounded-full ${roleBadgeColor}`}>
                  {user?.role}
                </span>
                {user?.departmentName && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">
                    <Building2 size={11} />
                    {user.departmentName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Personal information */}
        <div className="card">
          <button
            type="button"
            onClick={() => toggleSection('personal')}
            className="w-full flex items-center gap-2.5 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <User size={15} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
              <p className="text-xs text-muted-foreground">Your account details</p>
            </div>
            <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 flex-shrink-0 ${open.personal ? 'rotate-180' : ''}`} />
          </button>
          {open.personal && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              <div>
                <label className="label">Full Name</label>
                <div className="input flex items-center gap-2 bg-muted/50 cursor-default select-none">
                  <User size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-foreground">{user?.name}</span>
                </div>
              </div>
              <div>
                <label className="label">Email Address</label>
                <div className="input flex items-center gap-2 bg-muted/50 cursor-default select-none">
                  <Mail size={14} className="text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-foreground">{user?.email}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Role & access */}
        <div className="card">
          <button
            type="button"
            onClick={() => toggleSection('role')}
            className="w-full flex items-center gap-2.5 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <Shield size={15} className="text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Role &amp; Access</h3>
              <p className="text-xs text-muted-foreground">Your permissions and organisational details</p>
            </div>
            <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 flex-shrink-0 ${open.role ? 'rotate-180' : ''}`} />
          </button>
          {open.role && <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Role</p>
              <span className={`inline-flex items-center text-xs font-semibold border px-2.5 py-1 rounded-full ${roleBadgeColor}`}>
                {user?.role}
              </span>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Department</p>
              <div className="flex items-center gap-1.5">
                <Building2 size={14} className="text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-semibold text-foreground">{user?.departmentName || 'Not assigned'}</span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Employee ID</p>
              <div className="flex items-center gap-1.5">
                <CreditCard size={14} className="text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-mono font-semibold text-foreground">{user?.id}</span>
              </div>
            </div>
          </div>}
        </div>

        {/* Security */}
        <div className="card">
          <button
            type="button"
            onClick={() => toggleSection('security')}
            className="w-full flex items-center gap-2.5 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Lock size={15} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Security</h3>
              <p className="text-xs text-muted-foreground">Update your password</p>
            </div>
            <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 flex-shrink-0 ${open.security ? 'rotate-180' : ''}`} />
          </button>
          {open.security && <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm mt-5">
            {passwordFields.map(({ field, label, key }) => (
              <div key={field}>
                <label htmlFor={`pw-${field}`} className="label">{label}</label>
                <div className="relative">
                  <input
                    id={`pw-${field}`}
                    type={showPasswords[field] ? 'text' : 'password'}
                    className="input pr-10"
                    value={pwForm[key]}
                    onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow(field)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPasswords[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>}
        </div>

      </div>
      </PageTransition>
    </Layout>
  )
}
