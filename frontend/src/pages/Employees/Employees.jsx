import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchEmployees, createEmployee, updateEmployee, updateEmployeeStatus,
  selectEmployees, selectEmployeesLoading
} from '../../features/employees/employeeSlice'
import { fetchDepartments, selectDepartments } from '../../features/departments/departmentSlice'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner, PageHeader } from '../../components/ui'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'

const ROLES = ['EMPLOYEE', 'MANAGER', 'ADMIN']

export default function Employees() {
  const dispatch = useDispatch()
  const employees = useSelector(selectEmployees)
  const loading = useSelector(selectEmployeesLoading)
  const departments = useSelector(selectDepartments)

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '', managerId: '' })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    dispatch(fetchEmployees())
    dispatch(fetchDepartments())
  }, [dispatch])

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '', managerId: '' })
    setShowModal(true)
  }

  const openEdit = (emp) => {
    setEditTarget(emp)
    setForm({ name: emp.name, email: emp.email, password: '', role: emp.role, departmentId: emp.departmentId || '', managerId: emp.managerId || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editTarget) {
        await dispatch(updateEmployee({ id: editTarget.id, data: { name: form.name, role: form.role, departmentId: form.departmentId, managerId: form.managerId } })).unwrap()
        toast.success('Employee updated')
      } else {
        await dispatch(createEmployee(form)).unwrap()
        toast.success('Employee created')
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err || 'Failed')
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

  const managers = employees.filter(e => e.role === 'MANAGER' || e.role === 'ADMIN')

  return (
    <Layout>
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} total employees`}
        action={<button className="btn-primary" onClick={openCreate}>+ Add Employee</button>}
      />

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                          {emp.name.charAt(0)}
                        </div>
                        <span className="font-medium">{emp.name}</span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-500">{emp.email}</td>
                    <td className="table-cell">
                      <span className="text-xs font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded">{emp.role}</span>
                    </td>
                    <td className="table-cell text-gray-500">{emp.departmentName || '—'}</td>
                    <td className="table-cell"><StatusBadge status={emp.status} /></td>
                    <td className="table-cell">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(emp)} className="text-primary-600 hover:text-primary-800 text-sm font-medium">Edit</button>
                        <button
                          onClick={() => toggleStatus(emp)}
                          className={`text-sm font-medium ${emp.status === 'ACTIVE' ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}
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
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
          </div>
          {!editTarget && (
            <>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" />
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">No department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Manager</label>
            <select className="input" value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })}>
              <option value="">No manager</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleSave}>Save</button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
