import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  fetchDepartments, createDepartment, updateDepartment, updateDepartmentStatus,
  selectDepartments, selectDepartmentsLoading,
} from '../../features/departments/departmentSlice'
import { selectEmployees, fetchEmployees } from '../../features/employees/employeeSlice'
import { departmentService } from '../../services/departmentService'
import { reportService } from '../../services/reportService'
import Layout from '../../components/Layout'
import { LoadingSpinner, EmptyState, SkeletonRows } from '../../components/ui'
import Modal from '../../components/Modal'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  Plus, Search, MoreHorizontal, X, Building2, Users, Clock,
  Activity, Edit3, UserX, UserCheck, ChevronDown, Lightbulb,
  Zap, AlertTriangle, TrendingUp, Eye,
} from 'lucide-react'

// --- Constants ----------------------------------------------------------------
const PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']
function deptColor(name = '') {
  return PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length]
}

function getMonday() {
  const today = new Date()
  const day   = today.getDay()
  const diff  = today.getDate() - day + (day === 0 ? -6 : 1)
  const m     = new Date(today)
  m.setDate(diff)
  return format(m, 'yyyy-MM-dd')
}

// --- Avatar -------------------------------------------------------------------
const AVATAR_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
function Avatar({ name = '', size = 28, idx = 0 }) {
  const bg       = AVATAR_COLORS[idx % AVATAR_COLORS.length]
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div
      title={name}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38, border: '2px solid white' }}
      className="rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 select-none"
    >
      {initials}
    </div>
  )
}

function AvatarGroup({ people = [], max = 3 }) {
  if (!people.length) return <span className="text-xs text-muted-foreground">No members</span>
  const shown    = people.slice(0, max)
  const overflow = people.length - max
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <div key={p.id || i} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: max - i }}>
          <Avatar name={p.name} size={26} idx={i} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{ width: 26, height: 26, marginLeft: -8, border: '2px solid white', fontSize: 10 }}
          className="rounded-full bg-muted text-muted-foreground flex items-center justify-center font-medium"
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}

// --- Smart insight tag --------------------------------------------------------
function InsightTag({ dept, utilPct, allDepts, employees, utilMap }) {
  const getUtil = (d) => {
    const count = employees.filter(e => e.departmentId === d.id).length
    const hours = utilMap[d.id] ?? 0
    return count > 0 ? Math.min(100, Math.round((hours / (count * 40)) * 100)) : 0
  }
  const allUtils = allDepts.map(d => getUtil(d))
  const maxUtil  = allUtils.length ? Math.max(...allUtils) : 0
  const minUtil  = allUtils.length ? Math.min(...allUtils) : 0
  const empCount = employees.filter(e => e.departmentId === dept.id).length

  if (utilPct === maxUtil && utilPct > 0) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700"><Zap size={9} />Most Active</span>
  }
  if (utilPct === minUtil && minUtil < 30 && allDepts.length > 1) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600"><AlertTriangle size={9} />Low Activity</span>
  }
  if (empCount >= 5) {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700"><TrendingUp size={9} />Growing Team</span>
  }
  return null
}

// --- 3-dot menu ---------------------------------------------------------------
function DeptMenu({ dept, onView, onEdit, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="p-1.5 rounded-lg hover:bg-black/5 transition-colors text-white/70 hover:text-white"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg py-1 z-40">
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); onView(dept) }}
            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2.5"
          >
            <Eye size={13} className="text-muted-foreground" /> View Details
          </button>
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); onEdit(dept) }}
            className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2.5"
          >
            <Edit3 size={13} className="text-primary" /> Edit
          </button>
          <div className="border-t border-border my-1" />
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); onToggle(dept) }}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2.5 ${dept.status === 'ACTIVE' ? 'text-red-600' : 'text-emerald-600'}`}
          >
            {dept.status === 'ACTIVE'
              ? <><UserX size={13} /> Deactivate</>
              : <><UserCheck size={13} /> Activate</>}
          </button>
        </div>
      )}
    </div>
  )
}

// --- Department card ---------------------------------------------------------
function DeptCard({ dept, allDepts, employees, utilMap, onView, onEdit, onToggle }) {
  const color     = deptColor(dept.name)
  const members   = employees.filter(e => e.departmentId === dept.id)
  const managers  = members.filter(e => e.role === 'MANAGER')
  const hours     = utilMap[dept.id] ?? 0
  const utilPct   = members.length > 0 ? Math.min(100, Math.round((hours / (members.length * 40)) * 100)) : 0
  const barColor  = utilPct >= 80 ? '#10B981' : utilPct >= 50 ? '#F59E0B' : utilPct > 0 ? '#EF4444' : '#E5E7EB'

  return (
    <div
      onClick={() => onView(dept)}
      className="group relative bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer"
    >
      {/* Colored header strip */}
      <div className="h-1.5 w-full" style={{ background: color }} />

      <div className="p-5">
        {/* Top row: icon + name + menu */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-base"
              style={{ background: color }}
            >
              {dept.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{dept.name}</h3>
              {managers.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">Led by {managers[0].name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <InsightTag dept={dept} utilPct={utilPct} allDepts={allDepts} employees={employees} utilMap={utilMap} />
            {/* status dot */}
            <span className={`w-2 h-2 rounded-full ${dept.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-gray-300'}`} />
            <DeptMenu dept={dept} onView={onView} onEdit={onEdit} onToggle={onToggle} />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
          {dept.description || 'No description provided.'}
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-muted/50 rounded-xl p-2.5 text-center">
            <p className="text-base font-bold text-foreground tabular-nums">{members.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Members</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-2.5 text-center">
            <p className="text-base font-bold text-foreground tabular-nums">{hours.toFixed(0)}h</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">This week</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-2.5 text-center">
            <p className="text-base font-bold tabular-nums" style={{ color: barColor }}>{utilPct}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Utilization</p>
          </div>
        </div>

        {/* Utilization bar */}
        <div className="mb-4">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${utilPct}%`, background: barColor }}
            />
          </div>
        </div>

        {/* Avatar group */}
        <div className="flex items-center justify-between">
          <AvatarGroup people={members} max={4} />
          <span className="text-xs text-muted-foreground">
            {dept.status === 'ACTIVE'
              ? <span className="text-emerald-600 font-medium">Active</span>
              : <span className="text-muted-foreground">Inactive</span>}
          </span>
        </div>
      </div>
    </div>
  )
}

// --- Department Drawer --------------------------------------------------------
function DeptDrawer({ dept, employees, utilMap, onClose, onEdit, onToggle }) {
  const [deptEmps,    setDeptEmps]    = useState(null)
  const [empsLoading, setEmpsLoading] = useState(false)
  const [empsError,   setEmpsError]   = useState(false)

  const color    = deptColor(dept.name)
  const hours    = utilMap[dept.id] ?? 0
  const members  = employees.filter(e => e.departmentId === dept.id)
  const utilPct  = members.length > 0 ? Math.min(100, Math.round((hours / (members.length * 40)) * 100)) : 0
  const barColor = utilPct >= 80 ? '#10B981' : utilPct >= 50 ? '#F59E0B' : '#EF4444'
  const managers = members.filter(e => e.role === 'MANAGER')

  useEffect(() => {
    if (!dept?.id) return
    setDeptEmps(null)
    setEmpsError(false)
    setEmpsLoading(true)
    departmentService.getEmployees(dept.id)
      .then(res => setDeptEmps(res.data?.data?.employees || []))
      .catch(() => { setEmpsError(true); setDeptEmps([]) })
      .finally(() => setEmpsLoading(false))
  }, [dept.id])

  const displayEmps = deptEmps ?? members

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Colored banner header */}
        <div className="flex-shrink-0" style={{ background: color }}>
          <div className="flex items-start justify-between px-6 pt-5 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {dept.name[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">{dept.name}</h2>
                {managers.length > 0 && (
                  <p className="text-sm text-white/75 mt-0.5">Led by {managers[0].name}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white ml-4">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Status + actions */}
          <div className="flex items-center justify-between">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
              ${dept.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dept.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-gray-400'}`} />
              {dept.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </span>
            <div className="flex gap-2">
              <button onClick={() => onEdit(dept)} className="btn-secondary gap-1.5 text-xs h-8 px-3">
                <Edit3 size={12} /> Edit
              </button>
              <button
                onClick={() => onToggle(dept)}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium transition-colors border
                  ${dept.status === 'ACTIVE'
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
              >
                {dept.status === 'ACTIVE' ? <><UserX size={12} />Deactivate</> : <><UserCheck size={12} />Activate</>}
              </button>
            </div>
          </div>

          {/* Description */}
          {dept.description && (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-4 leading-relaxed">
              {dept.description}
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <Users size={16} className="text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xl font-bold text-foreground tabular-nums">{members.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Members</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <Clock size={16} className="text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xl font-bold text-foreground tabular-nums">{hours.toFixed(0)}h</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">This Week</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <Activity size={16} className="text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xl font-bold tabular-nums" style={{ color: barColor }}>{utilPct}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Utilization</p>
            </div>
          </div>

          {/* Utilization bar */}
          <div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${utilPct}%`, background: barColor }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {utilPct >= 80 ? 'High utilization — team is at capacity' : utilPct >= 50 ? 'Moderate utilization' : 'Low utilization this week'}
            </p>
          </div>

          {/* Employee list */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Team Members {displayEmps.length > 0 && `· ${displayEmps.length}`}
            </h3>
            {empsLoading ? (
              <div className="space-y-2 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-xl" />)}
              </div>
            ) : empsError ? (
              <p className="text-xs text-red-500 bg-red-50 rounded-xl p-3">Failed to load team members.</p>
            ) : displayEmps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No employees assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {displayEmps.map((emp, i) => (
                  <div key={emp.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    <Avatar name={emp.name} size={32} idx={i} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium
                      ${emp.role === 'ADMIN'   ? 'bg-violet-100 text-violet-700'
                      : emp.role === 'MANAGER' ? 'bg-primary/10 text-primary'
                      :                          'bg-muted text-muted-foreground'}`}>
                      {emp.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// --- Summary Card -------------------------------------------------------------
function SummaryCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex items-start gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// --- Insights panel -----------------------------------------------------------
function InsightsPanel({ depts, employees, utilMap }) {
  const active   = depts.filter(d => d.status === 'ACTIVE')
  const inactive = depts.filter(d => d.status !== 'ACTIVE')

  const byUtil = active
    .map(d => {
      const count = employees.filter(e => e.departmentId === d.id).length
      const hours = utilMap[d.id] ?? 0
      const pct   = count > 0 ? Math.round((hours / (count * 40)) * 100) : 0
      return { ...d, pct, count }
    })
    .sort((a, b) => b.pct - a.pct)

  const topDept    = byUtil[0]
  const lowDept    = byUtil[byUtil.length - 1]
  const largestDept = active
    .map(d => ({ ...d, count: employees.filter(e => e.departmentId === d.id).length }))
    .sort((a, b) => b.count - a.count)[0]

  const insights = []
  if (topDept?.pct > 0)
    insights.push({ icon: Zap, color: 'text-amber-600', text: `${topDept.name} leads with ${topDept.pct}% utilization this week` })
  if (inactive.length > 0)
    insights.push({ icon: AlertTriangle, color: 'text-red-500', text: `${inactive.length} department${inactive.length > 1 ? 's are' : ' is'} currently inactive` })
  if (largestDept?.count > 0)
    insights.push({ icon: Users, color: 'text-primary', text: `${largestDept.name} is the largest team with ${largestDept.count} members` })
  if (lowDept && lowDept.id !== topDept?.id && lowDept.pct < 30)
    insights.push({ icon: TrendingUp, color: 'text-muted-foreground', text: `${lowDept.name} has low activity — only ${lowDept.pct}% utilized` })

  if (!insights.length) return null

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={15} className="text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Insights</h3>
      </div>
      <ul className="space-y-2.5">
        {insights.map((ins, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <ins.icon size={13} className={`${ins.color} mt-0.5 flex-shrink-0`} />
            <span className="text-xs text-muted-foreground leading-relaxed">{ins.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// --- Main component -----------------------------------------------------------
export default function Departments() {
  const dispatch    = useDispatch()
  const departments = useSelector(selectDepartments)
  const loading     = useSelector(selectDepartmentsLoading)
  const employees   = useSelector(selectEmployees)

  const [utilMap,     setUtilMap]     = useState({})      // { deptId: totalHours }
  const [search,      setSearch]      = useState('')
  const [statusTab,   setStatusTab]   = useState('ALL')   // ALL / ACTIVE / INACTIVE
  const [sizeFilter,  setSizeFilter]  = useState('ALL')   // ALL / SMALL / MEDIUM / LARGE
  const [drawerDept,  setDrawerDept]  = useState(null)
  const [showModal,   setShowModal]   = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)
  const [form,        setForm]        = useState({ name: '', description: '' })

  useEffect(() => {
    dispatch(fetchDepartments())
    dispatch(fetchEmployees())
    reportService.getDepartmentUtilization(getMonday())
      .then(res => {
        const rows = res.data?.data || []
        const map  = {}
        rows.forEach(r => { map[r.departmentId] = r.totalHours ?? 0 })
        setUtilMap(map)
      })
      .catch(() => {/* silently fail – utilization is enhancement only */})
  }, [dispatch])

  // -- Filtering --------------------------------------------------------------
  const filtered = departments.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusTab === 'ALL' || d.status === statusTab
    const count = employees.filter(e => e.departmentId === d.id).length
    const matchSize =
      sizeFilter === 'ALL'    ? true :
      sizeFilter === 'SMALL'  ? count < 5 :
      sizeFilter === 'MEDIUM' ? count >= 5 && count <= 15 :
      count > 15

    return matchSearch && matchStatus && matchSize
  })

  // -- Summary stats ----------------------------------------------------------
  const totalActive   = departments.filter(d => d.status === 'ACTIVE').length
  const totalInactive = departments.filter(d => d.status !== 'ACTIVE').length
  const totalEmps     = employees.length

  // -- Actions ----------------------------------------------------------------
  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', description: '' })
    setShowModal(true)
  }

  const openEdit = dept => {
    setDrawerDept(null)
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

  const toggleStatus = async dept => {
    const newStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await dispatch(updateDepartmentStatus({ id: dept.id, status: newStatus })).unwrap()
      toast.success(`Department ${newStatus.toLowerCase()}d`)
      if (drawerDept?.id === dept.id) setDrawerDept(prev => ({ ...prev, status: newStatus }))
    } catch (err) {
      toast.error(err || 'Failed')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">

        {/* -- Page header --------------------------------------------------- */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-page-title">Departments</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {departments.length} department{departments.length !== 1 ? 's' : ''} · {totalEmps} total employees
            </p>
          </div>
          <button className="btn-primary flex-shrink-0" onClick={openCreate}>
            <Plus size={15} /> Add Department
          </button>
        </div>

        {/* -- Summary cards ------------------------------------------------- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Total Departments" value={departments.length} icon={Building2} color="#6366F1" />
          <SummaryCard label="Active"            value={totalActive}        icon={Activity}  color="#10B981" />
          <SummaryCard label="Inactive"          value={totalInactive}      icon={AlertTriangle} color="#EF4444" />
          <SummaryCard label="Total Employees"   value={totalEmps}          icon={Users}     color="#F59E0B" />
        </div>

        {/* -- Insights ------------------------------------------------------ */}
        <InsightsPanel depts={departments} employees={employees} utilMap={utilMap} />

        {/* -- Filters ------------------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-shrink-0 w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="input pl-9 h-9 text-sm w-full"
              placeholder="Search departments…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status pills */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {['ALL', 'ACTIVE', 'INACTIVE'].map(t => (
              <button
                key={t}
                onClick={() => setStatusTab(t)}
                className={`px-3 h-9 text-xs font-medium transition-colors
                  ${statusTab === t
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted'}`}
              >
                {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Size filter */}
          <div className="relative">
            <select
              value={sizeFilter}
              onChange={e => setSizeFilter(e.target.value)}
              className="h-9 pl-3 pr-8 text-xs rounded-lg border border-border bg-card text-foreground appearance-none cursor-pointer"
            >
              <option value="ALL">All sizes</option>
              <option value="SMALL">Small (&lt;5)</option>
              <option value="MEDIUM">Medium (5–15)</option>
              <option value="LARGE">Large (&gt;15)</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          {(search || statusTab !== 'ALL' || sizeFilter !== 'ALL') && (
            <button
              onClick={() => { setSearch(''); setStatusTab('ALL'); setSizeFilter('ALL') }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* -- Grid ---------------------------------------------------------- */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-52 bg-card rounded-2xl border border-border animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={search || statusTab !== 'ALL' || sizeFilter !== 'ALL' ? 'No departments match your filters' : 'No departments yet'}
            description={search || statusTab !== 'ALL' || sizeFilter !== 'ALL'
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first department to start organizing your team.'}
            action={
              search || statusTab !== 'ALL' || sizeFilter !== 'ALL'
                ? <button onClick={() => { setSearch(''); setStatusTab('ALL'); setSizeFilter('ALL') }} className="btn-ghost text-sm">Clear filters</button>
                : <button onClick={openCreate} className="btn-primary text-sm"><Plus size={14} /> Create first department</button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(dept => (
              <DeptCard
                key={dept.id}
                dept={dept}
                allDepts={filtered}
                employees={employees}
                utilMap={utilMap}
                onView={setDrawerDept}
                onEdit={openEdit}
                onToggle={toggleStatus}
              />
            ))}
          </div>
        )}
      </div>

      {/* -- Drawer ------------------------------------------------------------ */}
      {drawerDept && (
        <DeptDrawer
          dept={drawerDept}
          employees={employees}
          utilMap={utilMap}
          onClose={() => setDrawerDept(null)}
          onEdit={openEdit}
          onToggle={toggleStatus}
        />
      )}

      {/* -- Create / Edit Modal ----------------------------------------------- */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editTarget ? 'Edit Department' : 'Add Department'}>
        <div className="space-y-4">
          <div>
            <label className="label">Department Name</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Engineering"
            />
          </div>
          <div>
            <label className="label">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What does this department do?"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={!form.name.trim()}>
              {editTarget ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
