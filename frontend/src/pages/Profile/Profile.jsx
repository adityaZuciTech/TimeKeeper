import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectCurrentUser } from '../../features/auth/authSlice'
import { changePassword } from '../../features/auth/authSlice'
import Layout from '../../components/Layout'
import { PageHeader } from '../../components/ui'
import toast from 'react-hot-toast'

export default function Profile() {
  const user = useSelector(selectCurrentUser)
  const dispatch = useDispatch()
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)

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
      await dispatch(changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })).unwrap()
      toast.success('Password changed successfully')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err || 'Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <PageHeader title="My Profile" subtitle="Manage your account settings" />

      <div className="max-w-2xl space-y-6">
        {/* Profile card */}
        <div className="card">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-gray-500 text-sm">{user?.email}</p>
              <span className="inline-flex items-center mt-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-0.5 rounded-full">{user?.role}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-md p-4">
              <p className="text-xs text-muted-foreground mb-1">Role</p>
              <p className="font-heading font-semibold text-foreground">{user?.role}</p>
            </div>
            <div className="bg-muted rounded-md p-4">
              <p className="text-xs text-muted-foreground mb-1">Department</p>
              <p className="font-heading font-semibold text-foreground">{user?.departmentName || 'Not assigned'}</p>
            </div>
            <div className="bg-muted rounded-md p-4 col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Employee ID</p>
              <p className="font-heading font-semibold text-foreground font-mono text-sm">{user?.id}</p>
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="card">
          <h3 className="text-lg font-heading font-semibold text-foreground mb-4">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input
                type="password"
                className="input"
                value={pwForm.currentPassword}
                onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">New Password</label>
              <input
                type="password"
                className="input"
                value={pwForm.newPassword}
                onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                type="password"
                className="input"
                value={pwForm.confirmPassword}
                onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
