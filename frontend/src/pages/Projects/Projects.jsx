import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchProjects, createProject, updateProject, updateProjectStatus,
  selectProjects, selectProjectsLoading
} from '../../features/projects/projectSlice'
import { fetchDepartments, selectDepartments } from '../../features/departments/departmentSlice'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner, PageHeader, EmptyState } from '../../components/ui'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const STATUSES = ['ACTIVE', 'ON_HOLD', 'COMPLETED']

const filterTabs = [
  { val: '',          label: 'All' },
  { val: 'ACTIVE',    label: 'Active' },
  { val: 'ON_HOLD',   label: 'On Hold' },
  { val: 'COMPLETED', label: 'Completed' },
]

function fmtDate(d) {
  if (!d) return <span className="text-gray-300">-</span>
  try { return format(new Date(d), 'MMM d, yyyy') } catch { return d }
}

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
    setForm({ name: proj.name, clientName: proj.clientName || '', departmentId: proj.departmentId || '', startDate: proj.startDate || '', endDate: proj.endDate || '' })
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
      toast.success(`Status updated to ${status}`)
    } catch (err) {
      toast.error(err || 'Failed')
    }
  }

  return (
    <Layout>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''}`}
        action={
          <button className="btn-primary" onClick={openCreate}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Project
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-5 p-1 bg-gray-100 rounded-xl w-fit">
        {filterTabs.map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
              statusFilter === val
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          {projects.length === 0 ? (
            <EmptyState message="No projects found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Project</th>
                    <th className="table-header">Client</th>
                    <th className="table-header">Department</th>
                    <th className="table-header">Start</th>
                    <th className="table-header">End</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-muted/30 transition-colors">
                      <td className="table-cell">
                        <p className="font-heading font-semibold text-foreground text-sm">{proj.name}</p>
                      </td>
                      <td className="table-cell text-muted-foreground text-sm">{proj.clientName || <span className="text-muted-foreground/30">-</span>}</td>
                      <td className="table-cell text-muted-foreground text-sm">{proj.departmentName || <span className="text-muted-foreground/30">-</span>}</td>
                      <td className="table-cell text-gray-500 text-sm">{fmtDate(proj.startDate)}</td>
                      <td className="table-cell text-gray-500 text-sm">{fmtDate(proj.endDate)}</td>
                      <td className="table-cell"><StatusBadge status={proj.status} /></td>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEdit(proj)} className="text-primary hover:text-primary/80 text-xs font-heading font-semibold">Edit</button>
                          <select
                            className="text-xs border border-input rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            value={proj.status}
                            onChange={(e) => changeStatus(proj, e.target.value)}
                          >
                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Project' : 'Add Project'}>
        <div className="space-y-4">
          <div>
            <label className="label">Project Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Project Alpha" />
          </div>
          <div>
            <label className="label">Client Name</label>
            <input className="input" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Acme Corp" />
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">No department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
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
