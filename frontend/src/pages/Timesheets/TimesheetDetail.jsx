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
import { format, parseISO, isAfter, startOfDay } from 'date-fns'
import toast from 'react-hot-toast'

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

// Returns true if the given DAY_OF_WEEK string within the timesheet week is in the future
function isFutureDay(weekStartDate, dayName) {
  if (!weekStartDate) return false
  const dayIndex = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].indexOf(dayName)
  if (dayIndex === -1) return false
  const dayDate = startOfDay(new Date(parseISO(weekStartDate).getTime() + dayIndex * 86400000))
  return isAfter(dayDate, startOfDay(new Date()))
}

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
  const isEditable = (day) => !isSubmitted && !isFutureDay(timesheet?.weekStartDate, day)

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
      <div className="mb-8 flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="mt-1 flex items-center gap-1.5 text-sm font-heading font-medium text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {format(new Date(timesheet.weekStartDate), 'MMM d')} &ndash; {format(new Date(timesheet.weekEndDate), 'MMM d, yyyy')}
            </h1>
            <StatusBadge status={timesheet.status} />
          </div>
          <p className="text-sm text-gray-400 mt-1.5">
            Total &nbsp;<span className="font-semibold text-gray-700">{Number(timesheet.totalHours || 0).toFixed(1)} hrs</span> logged this week
          </p>
        </div>
        {!isSubmitted && (
          <button className="btn-primary flex-shrink-0" onClick={handleSubmit}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Submit
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
            <div key={day} className="card p-0 overflow-hidden">
              {/* Day header */}
              <div className={`flex items-center justify-between px-5 py-3.5 ${
                dayStatus !== 'WORK' ? 'bg-warning/10 border-b border-warning/20' : 'bg-muted/50 border-b border-border'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className="font-heading font-semibold text-foreground text-sm capitalize">{day.charAt(0) + day.slice(1).toLowerCase()}</span>
                  {dayStatus !== 'WORK' && (
                    <span className="text-xs bg-warning/15 text-warning-foreground border border-warning/20 px-2 py-0.5 rounded-full font-heading font-medium">
                      {dayStatus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-heading font-semibold text-muted-foreground">{totalHours > 0 ? `${totalHours.toFixed(1)} hrs` : 'No entries'}</span>
                  {isEditable(day) && (
                    <button
                      onClick={() => openAddModal(day)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                      Add
                    </button>
                  )}
                </div>
              </div>

              {entries.length === 0 ? (
                <div className="px-5 py-4 text-sm text-gray-400 italic">
                  {isEditable(day) ? 'No entries yet - click Add to log time.' : 'No entries.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {entries.map((entry) => (
                    <div key={entry.entryId} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        {entry.entryType === 'WORK' ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-heading font-semibold text-foreground truncate">{entry.projectName}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {entry.startTime?.substring(0, 5)} &ndash; {entry.endTime?.substring(0, 5)}
                                {entry.description && <span className="text-gray-300"> &middot; </span>}
                                {entry.description && <span className="italic">{entry.description}</span>}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                            <p className="text-sm font-semibold text-gray-700">{entry.entryType}</p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="text-sm font-heading font-semibold text-foreground tabular-nums">
                          {Number(entry.hoursLogged || 0).toFixed(1)} hrs
                        </span>
                        {isEditable(day) && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(entry, day)}
                              className="text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(entry.entryId)}
                              className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
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
