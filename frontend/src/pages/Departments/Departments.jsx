import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchDepartments, createDepartment, updateDepartment, updateDepartmentStatus,
  selectDepartments, selectDepartmentsLoading
} from '../../features/departments/departmentSlice'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner, PageHeader } from '../../components/ui'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'

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
        action={<button className="btn-primary" onClick={openCreate}>+ Add Department</button>}
      />

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <div key={dept.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{dept.description || 'No description'}</p>
                </div>
                <StatusBadge status={dept.status} />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => openEdit(dept)} className="btn-secondary text-sm flex-1">Edit</button>
                <button
                  onClick={() => toggleStatus(dept)}
                  className={`text-sm px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                    dept.status === 'ACTIVE'
                      ? 'border-red-200 text-red-600 hover:bg-red-50'
                      : 'border-green-200 text-green-600 hover:bg-green-50'
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
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Engineering" />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea className="input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Department description..." />
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
