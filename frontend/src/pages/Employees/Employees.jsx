import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  fetchEmployees, createEmployee, updateEmployee, updateEmployeeStatus,
  selectEmployees, selectEmployeesLoading
} from '../../features/employees/employeeSlice'
import { fetchDepartments, selectDepartments } from '../../features/departments/departmentSlice'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner, PageHeader, EmptyState } from '../../components/ui'
import Modal from '../../components/Modal'
import { Plus } from 'lucide-react'

const ROLES = ['EMPLOYEE', 'MANAGER', 'ADMIN']

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]
function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]
}

const roleBadge = {
  ADMIN:    'bg-violet-50 text-violet-700 border border-violet-100',
  MANAGER:  'bg-blue-50 text-blue-700 border border-blue-100',
  EMPLOYEE: 'bg-gray-50 text-gray-600 border border-gray-100',
}

export default function Employees() {
  const dispatch = useDispatch()
  const employees = useSelector(selectEmployees)
  const loading = useSelector(selectEmployeesLoading)
  const departments = useSelector(selectDepartments)

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '', managerId: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [search, setSearch] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dispatch(fetchEmployees())
    dispatch(fetchDepartments())
  }, [dispatch])

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '', managerId: '' })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (emp) => {
    setEditTarget(emp)
    setForm({ name: emp.name, email: emp.email, password: '', role: emp.role, departmentId: emp.departmentId || '', managerId: emp.managerId || '' })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setFormError('')
    setSaving(true)
    try {
      if (editTarget) {
        await dispatch(updateEmployee({ id: editTarget.id, data: { name: form.name, role: form.role, departmentId: form.departmentId, managerId: form.managerId } })).unwrap()
        toast.success('Employee updated successfully')
      } else {
        await dispatch(createEmployee(form)).unwrap()
        toast.success('Employee created successfully')
      }
      setShowModal(false)
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (emp) => {
    const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await dispatch(updateEmployeeStatus({ id: emp.id, status: newStatus })).unwrap()
      toast.success(`Employee ${newStatus.toLowerCase()}`)
    } catch (err) {
      toast.error(err || 'Failed')
    }
  }

  const managers = employees.filter((e) => e.role === 'MANAGER' || e.role === 'ADMIN')
  const filtered = employees.filter(
    (e) =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout>
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} total employees`}
        action={
          <button className="btn-primary" onClick={openCreate}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Employee
          </button>
        }
      />

      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          {/* Search bar */}
          <div className="px-5 py-4 border-b border-border">
            <div className="relative max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 py-2 text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Employee</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5}><EmptyState message="No employees match your search" /></td></tr>
                ) : filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(emp.name)}`}>
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-heading font-semibold text-foreground text-sm">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleBadge[emp.role] || roleBadge.EMPLOYEE}`}>
                        {emp.role}
                      </span>
                    </td>
                    <td className="table-cell text-muted-foreground text-sm">{emp.departmentName || <span className="text-muted-foreground/30">-</span>}</td>
                    <td className="table-cell"><StatusBadge status={emp.status} /></td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEdit(emp)} className="text-primary hover:text-primary/80 text-xs font-heading font-semibold">Edit</button>
                        <button
                          onClick={() => toggleStatus(emp)}
                          className={`text-xs font-semibold ${
                            emp.status === 'ACTIVE'
                              ? 'text-red-500 hover:text-red-700'
                              : 'text-emerald-600 hover:text-emerald-800'
                          }`}
                        >
                          {emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Employee' : 'Add Employee'}>
        <div className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
          </div>
          {!editTarget && (
            <>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" />
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">No department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Manager</label>
            <select className="input" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
              <option value="">No manager</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
