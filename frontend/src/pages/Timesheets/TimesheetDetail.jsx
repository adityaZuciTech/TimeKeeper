import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchTimesheetById, submitTimesheet, addEntry, updateEntry, deleteEntry,
  selectCurrentTimesheet, selectTimesheetsLoading, selectEntriesLoading, selectTimesheetError, clearError
} from '../../features/timesheets/timesheetSlice'
import { fetchProjects, selectActiveProjects } from '../../features/projects/projectSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner, ConfirmDialog, FieldError } from '../../components/ui'
import { format, parseISO, isAfter, startOfDay } from 'date-fns'
import toast from 'react-hot-toast'

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
const PROJECT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

function isFutureDay(weekStartDate, dayName) {
  if (!weekStartDate) return false
  const dayIndex = DAYS.indexOf(dayName)
  if (dayIndex === -1) return false
  const dayDate = startOfDay(new Date(parseISO(weekStartDate).getTime() + dayIndex * 86400000))
  return isAfter(dayDate, startOfDay(new Date()))
}

function toMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + (m || 0)
}

function minutesToHours(min) {
  return min > 0 ? (min / 60).toFixed(1) : null
}

// ─── TimeInput ─────────────────────────────────────────────────────────────────
function parseTimeInput(raw) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  let h, m
  if (digits.length <= 2)      { h = parseInt(digits, 10);              m = 0 }
  else if (digits.length === 3){ h = parseInt(digits[0], 10);           m = parseInt(digits.slice(1), 10) }
  else                          { h = parseInt(digits.slice(0, 2), 10); m = parseInt(digits.slice(2, 4), 10) }
  if (h > 23 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function clampAddMinutes(timeStr, delta) {
  const total = Math.max(0, Math.min(23 * 60 + 45, toMinutes(timeStr) + delta))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function TimeInput({ value, onChange, label, error }) {
  const [draft, setDraft] = useState(value || '')
  useEffect(() => { setDraft(value || '') }, [value])

  const commit = (raw) => {
    const parsed = parseTimeInput(raw)
    if (parsed) { onChange(parsed); setDraft(parsed) }
    else setDraft(value || '')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp')   { e.preventDefault(); const v = clampAddMinutes(value || '00:00',  15); onChange(v); setDraft(v) }
    if (e.key === 'ArrowDown') { e.preventDefault(); const v = clampAddMinutes(value || '00:00', -15); onChange(v); setDraft(v) }
  }

  return (
    <div className="relative">
      <input
        className={`input h-9 text-sm w-full font-mono tracking-widest ${error ? 'border-red-400 ring-1 ring-red-300' : ''}`}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onFocus={e => e.target.select()}
        onBlur={e => commit(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="09:00"
        autoComplete="off"
        spellCheck={false}
        inputMode="numeric"
      />
      <span className="absolute left-3 -top-2 text-[9px] text-muted-foreground bg-card px-0.5">{label}</span>
    </div>
  )
}

const DAY_WIN_START = 7 * 60
const DAY_WIN_END   = 20 * 60
const DAY_WIN_SPAN  = DAY_WIN_END - DAY_WIN_START
const HOUR_MARKS    = [8, 10, 12, 14, 16, 18]

// ─── Slim Timeline ─────────────────────────────────────────────────────────────
function TimelineBar({ entries, colorMap }) {
  const work = entries.filter(e => e.entryType === 'WORK' && e.startTime && e.endTime)
  return (
    <div className="relative mt-2 mb-0.5 select-none">
      <div className="relative h-2 bg-muted/60 rounded-full overflow-hidden">
        {work.map(entry => {
          const s    = Math.max(toMinutes(entry.startTime), DAY_WIN_START)
          const e_   = Math.min(toMinutes(entry.endTime), DAY_WIN_END)
          const left = ((s - DAY_WIN_START) / DAY_WIN_SPAN) * 100
          const w    = Math.max(0, ((e_ - s) / DAY_WIN_SPAN) * 100)
          if (w <= 0) return null
          return (
            <div
              key={entry.entryId}
              className="absolute inset-y-0 opacity-75 hover:opacity-100 transition-opacity cursor-default"
              style={{ left: `${left}%`, width: `${w}%`, background: colorMap[entry.projectId] || '#6366F1' }}
              title={`${entry.projectName}: ${entry.startTime?.substring(0,5)} – ${entry.endTime?.substring(0,5)}`}
            />
          )
        })}
      </div>
      <div className="relative h-3.5 mt-0.5">
        {HOUR_MARKS.map(h => (
          <span
            key={h}
            className="absolute text-[9px] text-muted-foreground/50 -translate-x-1/2 leading-none"
            style={{ left: `${((h * 60 - DAY_WIN_START) / DAY_WIN_SPAN) * 100}%` }}
          >
            {h}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Entry row ─────────────────────────────────────────────────────────────────
function EntryRow({ entry, color, editable, onEdit, onDelete }) {
  return (
    <div className="group grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-1.5 px-1 rounded-md hover:bg-muted/40 transition-colors">
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-px" style={{ background: color }} />
      <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
        <span className="text-sm font-medium text-foreground truncate">{entry.projectName}</span>
        <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap flex-shrink-0">
          {entry.startTime?.substring(0,5)} – {entry.endTime?.substring(0,5)}
        </span>
        {entry.description && (
          <span className="text-[11px] text-muted-foreground/60 italic truncate hidden sm:block">
            {entry.description}
          </span>
        )}
      </div>
      <span className="text-sm font-semibold text-foreground tabular-nums flex-shrink-0">
        {Number(entry.hoursLogged || 0).toFixed(1)}h
      </span>
      {editable ? (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(entry)}
            className="p-1 rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
            title="Edit"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(entry.entryId)}
            className="p-1 rounded text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ) : (
        <span />
      )}
    </div>
  )
}

// ─── Gap detector ──────────────────────────────────────────────────────────────
function detectGaps(entries) {
  const work = entries
    .filter(e => e.entryType === 'WORK' && e.startTime && e.endTime)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
  const gaps = []
  for (let i = 0; i < work.length - 1; i++) {
    const gapMin = toMinutes(work[i + 1].startTime) - toMinutes(work[i].endTime)
    if (gapMin > 30) {
      gaps.push({ from: work[i].endTime.substring(0,5), to: work[i+1].startTime.substring(0,5), minutes: gapMin })
    }
  }
  return gaps
}

function dayDate(weekStartDate, dayName) {
  const idx = DAYS.indexOf(dayName)
  if (idx === -1 || !weekStartDate) return ''
  const d = new Date(parseISO(weekStartDate).getTime() + idx * 86400000)
  return format(d, 'MMM d')
}

// ─── Entry Drawer ──────────────────────────────────────────────────────────────
function EntryDrawer({
  open, onClose, isEditing, saving,
  days, projects,
  formDay, formType, formProject, formStart, formEnd, formDesc,
  setFormDay, setFormType, setFormProject, setFormStart, setFormEnd, setFormDesc,
  onSave, errors,
}) {
  const firstFieldRef = useRef(null)
  const panelRef      = useRef(null)

  // Auto-focus first field when drawer opens
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => firstFieldRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open])

  // ESC to close
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const durationMin = toMinutes(formEnd) - toMinutes(formStart)
  const durationLabel = durationMin > 0 ? `${minutesToHours(durationMin)}h` : null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-250 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col
          transition-transform duration-300 ease-out
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-heading font-semibold text-foreground">
              {isEditing ? 'Edit Entry' : 'New Entry'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEditing ? 'Update time entry details' : 'Log time for a project'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Day */}
          <div>
            <label className="label text-xs mb-1.5">Day</label>
            <select
              ref={firstFieldRef}
              className="input h-9 text-sm"
              value={formDay}
              onChange={e => setFormDay(e.target.value)}
              disabled={isEditing}
            >
              {days.map(d => (
                <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="label text-xs mb-1.5">Entry Type</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {['WORK', 'LEAVE', 'HOLIDAY'].map(t => (
                <button
                  key={t}
                  onClick={() => setFormType(t)}
                  className={`flex-1 py-1.5 text-xs font-medium transition-colors
                    ${formType === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-muted'}`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {formType === 'WORK' && (
            <>
              {/* Project */}
              <div>
                <label className="label text-xs mb-1.5">Project</label>
                <select
                  className={`input h-9 text-sm ${errors?.project ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                  value={formProject}
                  onChange={e => setFormProject(e.target.value)}
                >
                  <option value="">Select project…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {errors?.project && (
                  <FieldError error={errors.project} />
                )}
              </div>

              {/* Time range */}
              <div>
                <label className="label text-xs mb-1.5">
                  Time Range
                  {durationLabel && (
                    <span className="ml-2 text-[11px] font-normal text-primary tabular-nums">
                      = {durationLabel}
                    </span>
                  )}
                  {durationMin < 0 && (
                    <span className="ml-2 text-[11px] font-normal text-red-500">End before start</span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <TimeInput label="FROM" value={formStart} onChange={setFormStart} error={!!errors?.time} />
                  <TimeInput label="TO"   value={formEnd}   onChange={setFormEnd}   error={!!errors?.time} />
                </div>
                {/* Quick-adjust end time */}
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-muted-foreground mr-0.5">Adjust end:</span>
                  {[15, 30, 60].map(min => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setFormEnd(clampAddMinutes(formEnd || '00:00', min))}
                      className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors border border-border"
                    >
                      +{min < 60 ? `${min}m` : '1h'}
                    </button>
                  ))}
                </div>
                {errors?.time && (
                  <FieldError error={errors.time} />
                )}
              </div>

              {/* Description */}
              <div>
                <label className="label text-xs mb-1.5">
                  Description
                  <span className="font-normal text-muted-foreground ml-1">(optional)</span>
                </label>
                <input
                  type="text"
                  className="input h-9 text-sm"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="e.g. Backend API development"
                />
              </div>
            </>
          )}
        </div>

        {/* Drawer footer */}
        <div className="flex-shrink-0 border-t border-border px-5 py-4 flex gap-3">
          <button
            className="btn-secondary flex-1 h-9 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-primary flex-1 h-9 text-sm"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving…
              </span>
            ) : isEditing ? 'Save Changes' : 'Add Entry'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function TimesheetDetail() {
  const { id }         = useParams()
  const dispatch       = useDispatch()
  const navigate       = useNavigate()

  const timesheet      = useSelector(selectCurrentTimesheet)
  const loading        = useSelector(selectTimesheetsLoading)
  const entriesLoading = useSelector(selectEntriesLoading)
  const error          = useSelector(selectTimesheetError)
  const projects       = useSelector(selectActiveProjects)
  const currentUser    = useSelector(selectCurrentUser)

  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [editEntry,   setEditEntry]   = useState(null)
  const [formDay,     setFormDay]     = useState('MONDAY')
  const [formType,    setFormType]    = useState('WORK')
  const [formProject, setFormProject] = useState('')
  const [formStart,   setFormStart]   = useState('09:00')
  const [formEnd,     setFormEnd]     = useState('17:00')
  const [formDesc,    setFormDesc]    = useState('')
  const [formErrors,  setFormErrors]  = useState({})
  // Confirmation dialogs — replaces browser confirm() for better UX (heuristic #3 & #5)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // holds entryId to delete
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    dispatch(fetchTimesheetById(id))
    dispatch(fetchProjects({ status: 'ACTIVE', departmentId: currentUser?.departmentId }))
  }, [id, dispatch, currentUser?.departmentId])

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()) }
  }, [error, dispatch])

  const projectColorMap = useMemo(() => {
    if (!timesheet?.days) return {}
    const ids = []
    timesheet.days.forEach(d => d.entries?.forEach(e => {
      if (e.projectId && !ids.includes(e.projectId)) ids.push(e.projectId)
    }))
    const map = {}
    ids.forEach((pid, i) => { map[pid] = PROJECT_COLORS[i % PROJECT_COLORS.length] })
    return map
  }, [timesheet])

  const isSubmitted = timesheet?.status === 'SUBMITTED'
  const getDayData  = (day) => timesheet?.days?.find(d => d.day === day)

  const isEditable = (day) => {
    const dayData = getDayData(day)
    if (dayData && typeof dayData.editable === 'boolean') return dayData.editable
    return !isSubmitted && !isFutureDay(timesheet?.weekStartDate, day)
  }

  const openDrawer = (day, entry = null) => {
    setFormErrors({})
    setEditEntry(entry)
    setFormDay(day)
    if (entry) {
      setFormType(entry.entryType)
      setFormProject(entry.projectId || '')
      setFormStart(entry.startTime ? entry.startTime.substring(0,5) : '09:00')
      setFormEnd(entry.endTime     ? entry.endTime.substring(0,5)   : '17:00')
      setFormDesc(entry.description || '')
    } else {
      setFormType('WORK')
      setFormProject(projects[0]?.id || '')
      setFormStart('09:00')
      setFormEnd('17:00')
      setFormDesc('')
    }
    setDrawerOpen(true)
  }

  const validate = () => {
    const errs = {}
    if (formType === 'WORK') {
      if (!formProject) errs.project = 'Please select a project'
      if (toMinutes(formEnd) <= toMinutes(formStart)) errs.time = 'End time must be after start time'
    }
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    const payload = {
      day: formDay, entryType: formType,
      ...(formType === 'WORK' && { projectId: formProject, startTime: formStart, endTime: formEnd, description: formDesc }),
    }
    try {
      if (editEntry) {
        await dispatch(updateEntry({ timesheetId: id, entryId: editEntry.entryId, data: payload })).unwrap()
        toast.success('Entry updated')
      } else {
        await dispatch(addEntry({ timesheetId: id, data: payload })).unwrap()
        toast.success('Entry added')
      }
      setDrawerOpen(false)
    } catch (err) {
      toast.error(err || 'Failed to save entry')
    }
  }

  const handleDelete = (entryId) => {
    setConfirmDelete(entryId)
  }

  const doDelete = async () => {
    setDeleteLoading(true)
    try {
      await dispatch(deleteEntry({ timesheetId: id, entryId: confirmDelete })).unwrap()
      toast.success('Entry deleted')
      setConfirmDelete(null)
    } catch (err) {
      toast.error(err || 'Failed to delete entry')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleSubmit = () => setConfirmSubmit(true)

  const doSubmit = async () => {
    setSubmitLoading(true)
    try {
      await dispatch(submitTimesheet(id)).unwrap()
      toast.success('Timesheet submitted successfully!')
      setConfirmSubmit(false)
    } catch (err) {
      toast.error(err || 'Failed to submit')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading || !timesheet) return <Layout><LoadingSpinner /></Layout>

  const totalHoursWeek = Number(timesheet.totalHours || 0)
  const weekPct   = Math.min(100, (totalHoursWeek / 40) * 100)
  const weekColor = weekPct >= 100 ? '#10B981' : weekPct >= 60 ? '#6366F1' : '#F59E0B'

  return (
    <Layout>
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3 flex-wrap min-w-0">
          <h1 className="text-xl font-heading font-bold text-foreground">
            {format(new Date(timesheet.weekStartDate), 'MMM d')} – {format(new Date(timesheet.weekEndDate), 'MMM d, yyyy')}
          </h1>
          <StatusBadge status={timesheet.status} />
        </div>
        {!isSubmitted && (
          <button className="btn-primary flex-shrink-0 h-8 px-4 text-sm" onClick={handleSubmit}>
            Submit
          </button>
        )}
      </div>

      {/* Week progress bar */}
      <div className="flex items-center gap-2 mb-6 max-w-sm">
        <div className="flex-1 h-1 bg-muted/60 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${weekPct}%`, background: weekColor }} />
        </div>
        <span className="text-xs tabular-nums font-medium flex-shrink-0" style={{ color: weekColor }}>
          {totalHoursWeek.toFixed(1)}<span className="text-muted-foreground font-normal">/40h</span>
        </span>
      </div>

      {/* ── Day rows ────────────────────────────────────────────────── */}
      <div className="divide-y divide-border/50">
        {DAYS.map((day) => {
          const dayData    = getDayData(day)
          const entries    = dayData?.entries || []
          const totalHours = Number(dayData?.totalHours || 0)
          const dayStatus  = dayData?.dayStatus || 'WORK'
          const leaveType  = dayData?.leaveType
          const editable   = isEditable(day)
          const dayLabel   = day.charAt(0) + day.slice(1).toLowerCase()
          const dateLabel  = dayDate(timesheet.weekStartDate, day)
          const hasWork    = entries.some(e => e.entryType === 'WORK')

          if (dayStatus === 'HOLIDAY') {
            return (
              <div key={day} className="py-3 flex items-center gap-4">
                <div className="w-32 flex-shrink-0">
                  <p className="text-sm font-medium text-foreground capitalize">{dayLabel}</p>
                  <p className="text-[11px] text-muted-foreground">{dateLabel}</p>
                </div>
                <span className="text-lg">🏖️</span>
                <span className="text-xs text-blue-600 font-medium">Company holiday</span>
                <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-700">Holiday</span>
              </div>
            )
          }

          if (dayStatus === 'LEAVE') {
            return (
              <div key={day} className="py-3 flex items-center gap-4">
                <div className="w-32 flex-shrink-0">
                  <p className="text-sm font-medium text-foreground capitalize">{dayLabel}</p>
                  <p className="text-[11px] text-muted-foreground">{dateLabel}</p>
                </div>
                <span className="text-lg">🌴</span>
                <span className="text-xs text-amber-700 font-medium">
                  {leaveType ? leaveType.replace(/_/g, ' ') : 'Leave'}
                </span>
                <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700">Leave</span>
              </div>
            )
          }

          const workEntries = entries
            .filter(e => e.entryType === 'WORK')
            .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))
          const gaps = detectGaps(entries)

          return (
            <div key={day} className="py-3">
              <div className="flex items-center gap-4 mb-1.5">
                <div className="w-32 flex-shrink-0">
                  <p className="text-sm font-medium text-foreground capitalize">{dayLabel}</p>
                  <p className="text-[11px] text-muted-foreground">{dateLabel}</p>
                </div>
                <div className="flex-1 flex items-center justify-end gap-2.5 min-w-0">
                  {hasWork ? (
                    <>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {totalHours.toFixed(1)}<span className="text-xs font-normal text-muted-foreground"> / 8h</span>
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                        totalHours >= 8 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {totalHours >= 8 ? 'Complete' : 'Incomplete'}
                      </span>
                    </>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/50">{editable ? 'No entries yet' : 'No entries'}</span>
                  )}
                </div>
              </div>

              {hasWork && (
                <div className="ml-36 mr-14 mb-2">
                  <TimelineBar entries={entries} colorMap={projectColorMap} />
                </div>
              )}

              {workEntries.length > 0 && (
                <div className="ml-32 space-y-0.5">
                  {workEntries.map((entry, ei) => (
                    <EntryRow
                      key={entry.entryId}
                      entry={entry}
                      color={projectColorMap[entry.projectId] || PROJECT_COLORS[ei % PROJECT_COLORS.length]}
                      editable={editable}
                      onEdit={e => openDrawer(day, e)}
                      onDelete={handleDelete}
                    />
                  ))}
                  {gaps.map((gap, i) => (
                    <div key={i} className="flex items-center gap-1.5 py-0.5 pl-1">
                      <span className="text-[10px] text-amber-500">⚠ {gap.from}–{gap.to} gap ({(gap.minutes / 60).toFixed(1)}h)</span>
                    </div>
                  ))}
                </div>
              )}

              {editable && (
                <div className="ml-32 mt-1.5">
                  <button
                    onClick={() => openDrawer(day)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-primary transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Add entry
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Entry Drawer ──────────────────────────────────────────────── */}
      <EntryDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isEditing={!!editEntry}
        saving={entriesLoading}
        days={DAYS}
        projects={projects}
        formDay={formDay}     formType={formType}    formProject={formProject}
        formStart={formStart} formEnd={formEnd}       formDesc={formDesc}
        setFormDay={setFormDay}     setFormType={setFormType}    setFormProject={setFormProject}
        setFormStart={setFormStart} setFormEnd={setFormEnd}       setFormDesc={setFormDesc}
        onSave={handleSave}
        errors={formErrors}
      />

      {/* ── Submit confirmation ───────────────────────────────────────── */}
      <ConfirmDialog
        open={confirmSubmit}
        title="Submit this timesheet?"
        description="Once submitted, you won't be able to make changes. Your manager will review it."
        confirmLabel="Submit"
        cancelLabel="Not yet"
        variant="primary"
        loading={submitLoading}
        onConfirm={doSubmit}
        onCancel={() => setConfirmSubmit(false)}
      />

      {/* ── Delete confirmation ───────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this entry?"
        description="This action cannot be undone. The time entry will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Keep it"
        variant="danger"
        loading={deleteLoading}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </Layout>
  )
}
