import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchProjects, createProject, updateProject, updateProjectStatus,
  selectProjects, selectProjectsLoading
} from '../../features/projects/projectSlice'
import { fetchDepartments, selectDepartments } from '../../features/departments/departmentSlice'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner, PageHeader } from '../../components/ui'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'

const STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED']

export default function Projects() {
  const dispatch = useDispatch()
  const projects = useSelector(selectProjects)
  const loading = useSelector(selectProjectsLoading)
  const departments = useSelector(selectDepartments)

  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ name: '', clientName: '', departmentId: '', startDate: '', endDate: '' })
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    dispatch(fetchProjects(statusFilter ? { status: statusFilter } : undefined))
    dispatch(fetchDepartments())
  }, [dispatch, statusFilter])

  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', clientName: '', departmentId: '', startDate: '', endDate: '' })
    setShowModal(true)
  }

  const openEdit = (proj) => {
    setEditTarget(proj)
    setForm({
      name: proj.name,
      clientName: proj.clientName || '',
      departmentId: proj.departmentId || '',
      startDate: proj.startDate || '',
      endDate: proj.endDate || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (editTarget) {
        await dispatch(updateProject({ id: editTarget.id, data: form })).unwrap()
        toast.success('Project updated')
      } else {
        await dispatch(createProject(form)).unwrap()
        toast.success('Project created')
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err || 'Failed')
    }
  }

  const changeStatus = async (proj, status) => {
    try {
      await dispatch(updateProjectStatus({ id: proj.id, status })).unwrap()
      toast.success(`Project status changed to ${status}`)
    } catch (err) {
      toast.error(err || 'Failed')
    }
  }

  return (
    <Layout>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} projects`}
        action={<button className="btn-primary" onClick={openCreate}>+ Add Project</button>}
      />

      <div className="mb-4 flex gap-2">
        {['', 'ACTIVE', 'ON_HOLD', 'COMPLETED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-header">Project</th>
                  <th className="table-header">Client</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Timeline</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projects.map(proj => (
                  <tr key={proj.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{proj.name}</td>
                    <td className="table-cell text-gray-500">{proj.clientName || '—'}</td>
                    <td className="table-cell text-gray-500">{proj.departmentName || '—'}</td>
                    <td className="table-cell text-gray-500 text-xs">
                      {proj.startDate} → {proj.endDate}
                    </td>
                    <td className="table-cell"><StatusBadge status={proj.status} /></td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(proj)} className="text-primary-600 hover:text-primary-800 text-sm font-medium">Edit</button>
                        <select
                          className="text-xs border border-gray-200 rounded px-1 py-0.5"
                          value={proj.status}
                          onChange={e => changeStatus(proj, e.target.value)}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Project' : 'Add Project'}>
        <div className="space-y-4">
          <div>
            <label className="label">Project Name</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Project Alpha" />
          </div>
          <div>
            <label className="label">Client Name</label>
            <input className="input" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} placeholder="Acme Corp" />
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">No department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>
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
