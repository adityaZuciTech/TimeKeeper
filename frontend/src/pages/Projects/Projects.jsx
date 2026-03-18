import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchProjects, createProject, updateProject, updateProjectStatus,
  selectProjects, selectProjectsLoading,
} from '../../features/projects/projectSlice'
import { fetchDepartments, selectDepartments } from '../../features/departments/departmentSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import Layout from '../../components/Layout'
import { LoadingSpinner } from '../../components/ui'
import Modal from '../../components/Modal'
import { reportService } from '../../services/reportService'
import toast from 'react-hot-toast'
import { format, differenceInDays, isPast, isFuture } from 'date-fns'
import {
  Plus, Search, MoreHorizontal, X, ChevronRight,
  Calendar, Building2, Users, Clock, Briefcase,
  AlertTriangle, CheckCircle2, PauseCircle, Zap,
  Edit3, RefreshCw,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_META = {
  ACTIVE:    { label: 'Active',    cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  COMPLETED: { label: 'Completed', cls: 'bg-primary/10 text-primary',       dot: 'bg-primary'     },
  ON_HOLD:   { label: 'On Hold',   cls: 'bg-amber-100  text-amber-700',    dot: 'bg-amber-400'   },
  DELAYED:   { label: 'Delayed',   cls: 'bg-red-100    text-red-700',      dot: 'bg-red-400'     },
}

const DEPT_COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d, fallback = '—') {
  if (!d) return fallback
  try { return format(new Date(d + 'T00:00:00'), 'MMM d, yyyy') } catch { return d }
}

function calcProgress(startDate, endDate) {
  if (!startDate || !endDate) return null
  const start = new Date(startDate + 'T00:00:00')
  const end   = new Date(endDate   + 'T00:00:00')
  const now   = new Date()
  const total = differenceInDays(end, start)
  if (total <= 0) return 100
  const elapsed = differenceInDays(now, start)
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)))
}

function deriveStatus(proj) {
  if (proj.status === 'COMPLETED' || proj.status === 'ON_HOLD') return proj.status
  if (proj.endDate && isPast(new Date(proj.endDate + 'T00:00:00')) && proj.status === 'ACTIVE') return 'DELAYED'
  return proj.status
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function deptColor(name = '', depts = []) {
  const idx = depts.findIndex(d => d.name === name || d.id === name)
  return DEPT_COLORS[Math.abs(idx) % DEPT_COLORS.length]
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
function Avatar({ name, size = 28, idx = 0 }) {
  const bg = AVATAR_PALETTE[idx % AVATAR_PALETTE.length]
  return (
    <div
      title={name}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38, border: '2px solid white' }}
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
    >
      {getInitials(name)}
    </div>
  )
}

function AvatarGroup({ contributors = [], max = 3 }) {
  if (!contributors.length) return <span className="text-xs text-muted-foreground">—</span>
  const shown    = contributors.slice(0, max)
  const overflow = contributors.length - max
  return (
    <div className="flex items-center" style={{ gap: -8 }}>
      {shown.map((c, i) => (
        <div key={c.employeeId} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: max - i }}>
          <Avatar name={c.employeeName} size={26} idx={i} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{ width: 26, height: 26, marginLeft: -8, border: '2px solid white', fontSize: 10 }}
          className="rounded-full bg-muted text-muted-foreground flex items-center justify-center font-medium z-0"
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function ProjStatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.ON_HOLD
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function TimelineBar({ pct, status }) {
  if (pct === null) return <span className="text-xs text-muted-foreground">—</span>
  const color =
    status === 'DELAYED'   ? '#EF4444'
    : status === 'COMPLETED' ? '#6366F1'
    : status === 'ON_HOLD'   ? '#F59E0B'
    : pct >= 80            ? '#F59E0B'
    :                          '#10B981'
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{pct}% elapsed</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── Quick actions menu (3 dots) ─────────────────────────────────────────────
function RowMenu({ proj, onEdit, onStatusChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const statuses = ['ACTIVE', 'ON_HOLD', 'COMPLETED'].filter(s => s !== proj.status)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg py-1 z-40">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(proj) }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2.5"
          >
            <Edit3 size={13} className="text-primary" /> Edit project
          </button>
          <div className="border-t border-border my-1" />
          <p className="px-4 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Change status</p>
          {statuses.map(s => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onStatusChange(proj, s) }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2.5"
            >
              <span className={`w-2 h-2 rounded-full ${STATUS_META[s]?.dot}`} />
              {STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Project Drawer ───────────────────────────────────────────────────────────
function ProjectDrawer({ proj, onClose, onEdit, onStatusChange, canLoadEffort }) {
  const [effort, setEffort]     = useState(null)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (!proj || !canLoadEffort) return
    setEffort(null)
    setLoading(true)
    reportService.getProjectEffort(proj.id)
      .then(res => setEffort(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [proj?.id, canLoadEffort])

  if (!proj) return null

  const ds     = deriveStatus(proj)
  const pct    = calcProgress(proj.startDate, proj.endDate)
  const totalDays = proj.startDate && proj.endDate
    ? differenceInDays(new Date(proj.endDate + 'T00:00:00'), new Date(proj.startDate + 'T00:00:00'))
    : null
  const daysLeft = proj.endDate
    ? differenceInDays(new Date(proj.endDate + 'T00:00:00'), new Date())
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Project Details</p>
            <h2 className="text-lg font-heading font-bold text-foreground leading-tight">{proj.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Status + quick change */}
          <div className="flex items-center justify-between">
            <ProjStatusBadge status={ds} />
            <div className="flex gap-2">
              {['ACTIVE', 'ON_HOLD', 'COMPLETED'].filter(s => s !== proj.status).map(s => (
                <button
                  key={s}
                  onClick={() => onStatusChange(proj, s)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground flex items-center gap-1.5"
                >
                  <RefreshCw size={11} />
                  {STATUS_META[s]?.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Building2 size={13} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Client</span>
              </div>
              <p className="text-sm font-medium text-foreground">{proj.clientName || '—'}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Briefcase size={13} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Department</span>
              </div>
              <p className="text-sm font-medium text-foreground">{proj.departmentName || '—'}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={13} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Timeline</span>
            </div>
            <div className="flex items-center gap-2 text-sm mb-3">
              <span className="font-medium text-foreground">{fmtDate(proj.startDate)}</span>
              <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
              <span className="font-medium text-foreground">{fmtDate(proj.endDate)}</span>
            </div>
            {pct !== null && <TimelineBar pct={pct} status={ds} />}
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              {totalDays !== null && <span>{totalDays} day project</span>}
              {daysLeft !== null && (
                <span className={daysLeft < 0 ? 'text-red-500 font-medium' : daysLeft < 14 ? 'text-amber-600 font-medium' : ''}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d remaining`}
                </span>
              )}
            </div>
          </div>

          {/* Hours logged */}
          {canLoadEffort && (
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={13} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hours Logged</span>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Loading…
                </div>
              ) : effort ? (
                <p className="text-2xl font-heading font-bold text-foreground">{Number(effort.totalHoursLogged || 0).toFixed(0)}h</p>
              ) : (
                <p className="text-sm text-muted-foreground">No timesheet data available</p>
              )}
            </div>
          )}

          {/* Contributors */}
          {canLoadEffort && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users size={13} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Team {effort?.contributors?.length ? `· ${effort.contributors.length} members` : ''}
                </span>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-11 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : effort?.contributors?.length > 0 ? (
                <div className="space-y-2">
                  {effort.contributors.map((c, i) => (
                    <div key={c.employeeId} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <Avatar name={c.employeeName} size={32} idx={i} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.employeeName}</p>
                      </div>
                      <span className="text-sm font-heading font-bold tabular-nums text-foreground">
                        {Number(c.hoursLogged || 0).toFixed(0)}h
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No contributors yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={() => onEdit(proj)}
            className="btn-primary w-full gap-2"
          >
            <Edit3 size={14} /> Edit Project
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Summary stat card ────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, iconCls, valueCls }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${iconCls}`}>
        <Icon size={16} />
      </div>
      <p className="text-2xl font-heading font-bold text-foreground mb-0.5 tabular-nums">{value}</p>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Projects() {
  const dispatch    = useDispatch()
  const projects    = useSelector(selectProjects)
  const loading     = useSelector(selectProjectsLoading)
  const departments = useSelector(selectDepartments)
  const currentUser = useSelector(selectCurrentUser)

  const canLoadEffort = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER'

  const [showModal, setShowModal]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]             = useState({ name: '', clientName: '', departmentId: '', startDate: '', endDate: '' })

  // Filters
  const [search,     setSearch]     = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')

  // Drawer
  const [drawerProj, setDrawerProj] = useState(null)

  useEffect(() => {
    dispatch(fetchProjects())
    dispatch(fetchDepartments())
  }, [dispatch])

  // ── Derived lists ──────────────────────────────────────────────────────────
  const filtered = projects.filter(p => {
    const nameMatch = !search     || p.name.toLowerCase().includes(search.toLowerCase())
    const deptMatch = !deptFilter || p.departmentId === deptFilter || p.departmentName === deptFilter
    const statMatch = !statFilter || deriveStatus(p) === statFilter || p.status === statFilter
    return nameMatch && deptMatch && statMatch
  })

  const stats = {
    total:     projects.length,
    active:    projects.filter(p => p.status === 'ACTIVE').length,
    completed: projects.filter(p => p.status === 'COMPLETED').length,
    onHold:    projects.filter(p => p.status === 'ON_HOLD').length,
    delayed:   projects.filter(p => deriveStatus(p) === 'DELAYED').length,
  }

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', clientName: '', departmentId: '', startDate: '', endDate: '' })
    setShowModal(true)
  }

  const openEdit = (proj) => {
    setEditTarget(proj)
    setForm({
      name: proj.name, clientName: proj.clientName || '',
      departmentId: proj.departmentId || '',
      startDate: proj.startDate || '', endDate: proj.endDate || '',
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
    } catch (err) { toast.error(err || 'Failed') }
  }

  const changeStatus = async (proj, status) => {
    try {
      await dispatch(updateProjectStatus({ id: proj.id, status })).unwrap()
      toast.success(`Marked as ${STATUS_META[status]?.label || status}`)
    } catch (err) { toast.error(err || 'Failed') }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''} total
          </p>
        </div>
        {currentUser?.role === 'ADMIN' && (
          <button className="btn-primary gap-2" onClick={openCreate}>
            <Plus size={15} /> New Project
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total"     value={stats.total}     icon={Briefcase}     iconCls="bg-primary/10 text-primary"       />
        <SummaryCard label="Active"    value={stats.active}    icon={Zap}           iconCls="bg-emerald-100 text-emerald-600"  />
        <SummaryCard label="Completed" value={stats.completed} icon={CheckCircle2}  iconCls="bg-primary/10 text-primary"       />
        <SummaryCard label="On Hold"   value={stats.onHold}    icon={PauseCircle}   iconCls="bg-amber-100 text-amber-600"     />
      </div>

      {/* Search + Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Department filter */}
        <select
          className="input text-sm w-auto min-w-36 max-w-48"
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {/* Status filter */}
        <div className="flex gap-1.5 p-1 bg-muted rounded-xl">
          {[
            { val: '',          label: 'All'       },
            { val: 'ACTIVE',    label: 'Active'    },
            { val: 'COMPLETED', label: 'Completed' },
            { val: 'ON_HOLD',   label: 'On Hold'   },
          ].map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setStatFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
                ${statFilter === val ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Clear filters */}
        {(search || deptFilter || statFilter) && (
          <button
            onClick={() => { setSearch(''); setDeptFilter(''); setStatFilter('') }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Briefcase size={22} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {projects.length === 0 ? 'No projects yet' : 'No projects match your filters'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3.5 text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider">Project</th>
                    <th className="text-left px-4 py-3.5 text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Client</th>
                    <th className="text-left px-4 py-3.5 text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Department</th>
                    <th className="text-left px-4 py-3.5 text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Timeline</th>
                    <th className="text-left px-4 py-3.5 text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider w-40 hidden lg:table-cell">Progress</th>
                    <th className="text-left px-4 py-3.5 text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3.5 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((proj, idx) => {
                    const ds   = deriveStatus(proj)
                    const pct  = calcProgress(proj.startDate, proj.endDate)
                    const dc   = deptColor(proj.departmentName || proj.departmentId, departments)

                    return (
                      <tr
                        key={proj.id}
                        onClick={() => setDrawerProj(proj)}
                        className={`group transition-colors cursor-pointer hover:bg-muted/40
                          ${idx < filtered.length - 1 ? 'border-b border-border/60' : ''}`}
                      >
                        {/* Project name */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                              style={{ background: dc }}
                            >
                              {(proj.name || 'P')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-heading font-semibold text-foreground text-sm leading-tight">{proj.name}</p>
                              <p className="text-xs text-muted-foreground md:hidden">{proj.clientName || proj.departmentName || ''}</p>
                            </div>
                          </div>
                        </td>

                        {/* Client */}
                        <td className="px-4 py-4 text-sm text-muted-foreground hidden md:table-cell">
                          {proj.clientName || <span className="text-muted-foreground/30">—</span>}
                        </td>

                        {/* Department */}
                        <td className="px-4 py-4 hidden lg:table-cell">
                          {proj.departmentName ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{ background: dc + '1A', color: dc }}
                            >
                              {proj.departmentName}
                            </span>
                          ) : <span className="text-muted-foreground/30 text-sm">—</span>}
                        </td>

                        {/* Timeline */}
                        <td className="px-4 py-4 hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">
                          {proj.startDate ? (
                            <span>
                              {format(new Date(proj.startDate + 'T00:00:00'), 'MMM d')}
                              <span className="mx-1.5">→</span>
                              {proj.endDate ? format(new Date(proj.endDate + 'T00:00:00'), 'MMM d, yyyy') : '—'}
                            </span>
                          ) : '—'}
                        </td>

                        {/* Progress */}
                        <td className="px-4 py-4 hidden lg:table-cell w-40">
                          {pct !== null ? (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${pct}%`,
                                    background: ds === 'DELAYED' ? '#EF4444' : ds === 'COMPLETED' ? '#6366F1' : pct >= 80 ? '#F59E0B' : '#10B981',
                                  }}
                                />
                              </div>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <ProjStatusBadge status={ds} />
                          {ds === 'DELAYED' && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle size={10} className="text-red-500" />
                              <span className="text-[10px] text-red-500 font-medium">Past due</span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        {currentUser?.role === 'ADMIN' ? (
                          <td className="px-3 py-4" onClick={e => e.stopPropagation()}>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <RowMenu proj={proj} onEdit={openEdit} onStatusChange={changeStatus} />
                            </div>
                          </td>
                        ) : (
                          <td className="px-3 py-4">
                            <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Drawer */}
      {drawerProj && (
        <ProjectDrawer
          proj={drawerProj}
          onClose={() => setDrawerProj(null)}
          onEdit={(p) => { setDrawerProj(null); openEdit(p) }}
          onStatusChange={(p, s) => { changeStatus(p, s); setDrawerProj(prev => prev?.id === p.id ? { ...prev, status: s } : prev) }}
          canLoadEffort={canLoadEffort}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Project' : 'New Project'}>
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
            <button className="btn-primary flex-1" onClick={handleSave}>Save Project</button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
