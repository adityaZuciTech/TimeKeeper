import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchTimesheetById, submitTimesheet, addEntry, updateEntry, deleteEntry,
  selectCurrentTimesheet, selectTimesheetsLoading, selectEntriesLoading, selectTimesheetError, clearError
} from '../../features/timesheets/timesheetSlice'
import { fetchProjects, selectActiveProjects } from '../../features/projects/projectSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner, PageHeader } from '../../components/ui'
import Modal from '../../components/Modal'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

export default function TimesheetDetail() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const timesheet = useSelector(selectCurrentTimesheet)
  const loading = useSelector(selectTimesheetsLoading)
  const entriesLoading = useSelector(selectEntriesLoading)
  const error = useSelector(selectTimesheetError)
  const projects = useSelector(selectActiveProjects)
  const currentUser = useSelector(selectCurrentUser)

  const [showModal, setShowModal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [formDay, setFormDay] = useState('MONDAY')
  const [formType, setFormType] = useState('WORK')
  const [formProject, setFormProject] = useState('')
  const [formStart, setFormStart] = useState('09:00')
  const [formEnd, setFormEnd] = useState('17:00')
  const [formDesc, setFormDesc] = useState('')

  useEffect(() => {
    dispatch(fetchTimesheetById(id))
    dispatch(fetchProjects({ status: 'ACTIVE', departmentId: currentUser?.departmentId }))
  }, [id, dispatch, currentUser?.departmentId])

  useEffect(() => {
    if (error) {
      toast.error(error)
      dispatch(clearError())
    }
  }, [error, dispatch])

  const isSubmitted = timesheet?.status === 'SUBMITTED'

  const openAddModal = (day) => {
    setEditEntry(null)
    setFormDay(day)
    setFormType('WORK')
    setFormProject(projects[0]?.id || '')
    setFormStart('09:00')
    setFormEnd('17:00')
    setFormDesc('')
    setShowModal(true)
  }

  const openEditModal = (entry, day) => {
    setEditEntry(entry)
    setFormDay(day)
    setFormType(entry.entryType)
    setFormProject(entry.projectId || '')
    setFormStart(entry.startTime ? entry.startTime.substring(0, 5) : '09:00')
    setFormEnd(entry.endTime ? entry.endTime.substring(0, 5) : '17:00')
    setFormDesc(entry.description || '')
    setShowModal(true)
  }

  const handleSave = async () => {
    const payload = {
      day: formDay,
      entryType: formType,
      ...(formType === 'WORK' && {
        projectId: formProject,
        startTime: formStart,
        endTime: formEnd,
        description: formDesc,
      }),
    }

    try {
      if (editEntry) {
        await dispatch(updateEntry({ timesheetId: id, entryId: editEntry.entryId, data: payload })).unwrap()
        toast.success('Entry updated')
      } else {
        await dispatch(addEntry({ timesheetId: id, data: payload })).unwrap()
        toast.success('Entry added')
      }
      setShowModal(false)
    } catch (err) {
      toast.error(err || 'Failed to save entry')
    }
  }

  const handleDelete = async (entryId) => {
    if (!confirm('Delete this entry?')) return
    try {
      await dispatch(deleteEntry({ timesheetId: id, entryId })).unwrap()
      toast.success('Entry deleted')
    } catch (err) {
      toast.error(err || 'Failed to delete entry')
    }
  }

  const handleSubmit = async () => {
    if (!confirm('Submit this timesheet? It will become read-only.')) return
    try {
      await dispatch(submitTimesheet(id)).unwrap()
      toast.success('Timesheet submitted!')
    } catch (err) {
      toast.error(err || 'Failed to submit')
    }
  }

  const getDayData = (day) => timesheet?.days?.find(d => d.day === day)

  if (loading || !timesheet) return <Layout><LoadingSpinner /></Layout>

  return (
    <Layout>
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">← Back</button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Week of {format(new Date(timesheet.weekStartDate), 'MMM d')} – {format(new Date(timesheet.weekEndDate), 'MMM d, yyyy')}
            </h1>
            <StatusBadge status={timesheet.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Total hours: <strong>{Number(timesheet.totalHours || 0).toFixed(1)}</strong>
          </p>
        </div>
        {!isSubmitted && (
          <button className="btn-primary" onClick={handleSubmit}>
            Submit Timesheet
          </button>
        )}
      </div>

      <div className="space-y-4">
        {DAYS.map((day) => {
          const dayData = getDayData(day)
          const entries = dayData?.entries || []
          const totalHours = Number(dayData?.totalHours || 0)
          const dayStatus = dayData?.dayStatus || 'WORK'

          return (
            <div key={day} className="card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-gray-900">{day}</h3>
                  {dayStatus !== 'WORK' && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                      {dayStatus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 font-medium">{totalHours.toFixed(1)} hrs</span>
                  {!isSubmitted && (
                    <button
                      onClick={() => openAddModal(day)}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      + Add Entry
                    </button>
                  )}
                </div>
              </div>

              {entries.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No entries</p>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div key={entry.entryId} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-4">
                        {entry.entryType === 'WORK' ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-primary-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{entry.projectName}</p>
                              <p className="text-xs text-gray-500">
                                {entry.startTime?.substring(0, 5)} – {entry.endTime?.substring(0, 5)}
                                {entry.description && <> · {entry.description}</>}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-orange-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium text-gray-700">{entry.entryType}</p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 font-medium">
                          {Number(entry.hoursLogged || 0).toFixed(1)} hrs
                        </span>
                        {!isSubmitted && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(entry, day)}
                              className="text-gray-400 hover:text-gray-600 text-xs"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(entry.entryId)}
                              className="text-red-400 hover:text-red-600 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add/Edit Entry Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editEntry ? 'Edit Entry' : 'Add Time Entry'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Day</label>
            <select className="input" value={formDay} onChange={e => setFormDay(e.target.value)} disabled={!!editEntry}>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={formType} onChange={e => setFormType(e.target.value)}>
              <option value="WORK">Work</option>
              <option value="LEAVE">Leave</option>
              <option value="HOLIDAY">Holiday</option>
            </select>
          </div>

          {formType === 'WORK' && (
            <>
              <div>
                <label className="label">Project</label>
                <select className="input" value={formProject} onChange={e => setFormProject(e.target.value)} required>
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Time</label>
                  <input type="time" className="input" value={formStart} onChange={e => setFormStart(e.target.value)} />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input type="time" className="input" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input type="text" className="input" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="e.g. Backend development" />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
            <button
              className="btn-primary flex-1"
              onClick={handleSave}
              disabled={entriesLoading}
            >
              {entriesLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
