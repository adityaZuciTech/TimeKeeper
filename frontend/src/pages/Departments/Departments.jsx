import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchDepartments, createDepartment, updateDepartment, updateDepartmentStatus,
  selectDepartments, selectDepartmentsLoading
} from '../../features/departments/departmentSlice'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner, PageHeader, EmptyState } from '../../components/ui'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'

const DEPT_COLORS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
]
function deptColor(name) {
  return DEPT_COLORS[(name?.charCodeAt(0) || 0) % DEPT_COLORS.length]
}

export default function Departments() {
  const dispatch = useDispatch()
  const departments = useSelector(selectDepartments)
  const loading = useSelector(selectDepartmentsLoading)

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', description: '' })

  useEffect(() => { dispatch(fetchDepartments()) }, [dispatch])

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', description: '' })
    setShowModal(true)
  }

  const openEdit = (dept) => {
    setEditTarget(dept)
    setForm({ name: dept.name, description: dept.description || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editTarget) {
        await dispatch(updateDepartment({ id: editTarget.id, data: form })).unwrap()
        toast.success('Department updated')
      } else {
        await dispatch(createDepartment(form)).unwrap()
        toast.success('Department created')
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err || 'Failed')
    }
  }

  const toggleStatus = async (dept) => {
    const newStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await dispatch(updateDepartmentStatus({ id: dept.id, status: newStatus })).unwrap()
      toast.success(`Department ${newStatus.toLowerCase()}`)
    } catch (err) {
      toast.error(err || 'Failed')
    }
  }

  return (
    <Layout>
      <PageHeader
        title="Departments"
        subtitle={`${departments.length} departments`}
        action={
          <button className="btn-primary" onClick={openCreate}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Department
          </button>
        }
      />

      {loading ? <LoadingSpinner /> : departments.length === 0 ? <EmptyState message="No departments yet" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="card flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${deptColor(dept.name)} flex items-center justify-center flex-shrink-0`}>
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
              <h3 className="font-heading font-semibold text-foreground text-sm leading-tight">{dept.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{dept.description || 'No description'}</p>
                  </div>
                </div>
                <StatusBadge status={dept.status} />
              </div>
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                <button onClick={() => openEdit(dept)} className="btn-secondary text-xs flex-1 py-1.5">Edit</button>
                <button
                  onClick={() => toggleStatus(dept)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors flex-1 ${
                    dept.status === 'ACTIVE'
                      ? 'border-red-100 text-red-600 hover:bg-red-50'
                      : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  {dept.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Department' : 'Add Department'}>
        <div className="space-y-4">
          <div>
            <label className="label">Department Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Engineering" />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Department description..." />
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
