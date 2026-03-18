import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  fetchEmployees, createEmployee, updateEmployee, updateEmployeeStatus,
  selectEmployees, selectEmployeesLoading,
} from '../../features/employees/employeeSlice'
import { fetchDepartments, selectDepartments } from '../../features/departments/departmentSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import Layout from '../../components/Layout'
import { LoadingSpinner } from '../../components/ui'
import Modal from '../../components/Modal'
import { employeeService } from '../../services/employeeService'
import {
  Plus, Search, MoreHorizontal, X, User, Mail, Building2,
  Users, Shield, ChevronRight, Clock, Calendar,
  Eye, Edit3, UserCheck, UserX, Briefcase, Lightbulb,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = ['EMPLOYEE', 'MANAGER', 'ADMIN']

const AVATAR_BG = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']
function avatarBg(name = '') {
  return AVATAR_BG[(name.charCodeAt(0) || 0) % AVATAR_BG.length]
}

const ROLE_META = {
  ADMIN:    { cls: 'bg-violet-100 text-violet-700', label: 'Admin',    icon: Shield     },
  MANAGER:  { cls: 'bg-primary/10 text-primary',    label: 'Manager',  icon: Users      },
  EMPLOYEE: { cls: 'bg-muted text-muted-foreground', label: 'Employee', icon: User       },
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name = '', size = 36, online, className = '' }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold select-none"
        style={{ background: avatarBg(name), fontSize: size * 0.38 }}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card ${online ? 'bg-emerald-400' : 'bg-gray-300'}`}
          title={online ? 'Online' : 'Offline'}
        />
      )}
    </div>
  )
}

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.EMPLOYEE
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${m.cls}`}>
      <m.icon size={11} />
      {m.label}
    </span>
  )
}

// ─── Status dot ───────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const active = status === 'ACTIVE'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
      <span className={active ? 'text-emerald-700' : 'text-muted-foreground'}>{active ? 'Active' : 'Inactive'}</span>
    </span>
  )
}

// ─── 3-dot row menu ───────────────────────────────────────────────────────────
function RowMenu({ emp, onView, onEdit, onToggleStatus, isAdmin }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v) }}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-40">
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); onView(emp) }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2.5"
          >
            <Eye size={13} className="text-muted-foreground" /> View Profile
          </button>
          {isAdmin && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setOpen(false); onEdit(emp) }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2.5"
              >
                <Edit3 size={13} className="text-primary" /> Edit
              </button>
              <div className="border-t border-border my-1" />
              <button
                onClick={e => { e.stopPropagation(); setOpen(false); onToggleStatus(emp) }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2.5 ${emp.status === 'ACTIVE' ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {emp.status === 'ACTIVE'
                  ? <><UserX size={13} /> Deactivate</>
                  : <><UserCheck size={13} /> Activate</>}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, iconCls }) {
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

// ─── Employee Drawer ──────────────────────────────────────────────────────────
function TsSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-3 bg-muted rounded w-28" />
          <div className="h-3 bg-muted rounded w-12" />
        </div>
      ))}
    </div>
  )
}

function EmployeeDrawer({ emp, employees, onClose, onEdit, onToggleStatus, isAdmin }) {
  const [timesheets, setTimesheets] = useState(null)
  const [tsLoading,  setTsLoading]  = useState(false)
  const [tsError,    setTsError]    = useState(false)

  const manager = emp.managerId ? employees.find(e => e.id === emp.managerId) : null

  useEffect(() => {
    if (!emp?.id) return
    setTimesheets(null)
    setTsError(false)
    setTsLoading(true)
    employeeService.getTimesheets(emp.id)
      // backend wraps as { timesheets: [...] }
      .then(res => setTimesheets(res.data?.data?.timesheets || []))
      .catch(() => { setTsError(true); setTimesheets([]) })
      .finally(() => setTsLoading(false))
  }, [emp.id])

  const recentTs = timesheets?.slice(0, 3) || []
  const totalHours = timesheets?.reduce((acc, t) => acc + Number(t.totalHours || 0), 0) || 0

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-4">
            <Avatar name={emp.name} size={48} online={emp.status === 'ACTIVE'} />
            <div>
              <h2 className="text-lg font-heading font-bold text-foreground leading-tight">{emp.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{emp.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground ml-4">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <RoleBadge role={emp.role} />
            <StatusDot status={emp.status} />
          </div>

          {/* Meta cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Building2 size={12} className="text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Department</span>
              </div>
              <p className="text-sm font-medium text-foreground">{emp.departmentName || '—'}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <User size={12} className="text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Reports To</span>
              </div>
              <p className="text-sm font-medium text-foreground">{manager ? manager.name : '—'}</p>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Mail size={12} className="text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Contact</span>
            </div>
            <p className="text-sm text-foreground break-all">{emp.email}</p>
          </div>

          {/* Hours summary */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock size={12} className="text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">Timesheet Summary</span>
            </div>
            {tsLoading ? (
              <TsSkeleton />
            ) : tsError ? (
              <p className="text-xs text-red-500">Failed to load timesheet data.</p>
            ) : (
              <>
                <p className="text-2xl font-heading font-bold text-foreground mb-3">
                  {totalHours.toFixed(0)}h
                  <span className="text-sm font-normal text-muted-foreground ml-1">total logged</span>
                </p>
                {recentTs.length > 0 ? (
                  <div className="space-y-2">
                    {recentTs.map(ts => (
                      <div key={ts.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar size={11} />
                          <span>Week of {ts.weekStartDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground tabular-nums">{Number(ts.totalHours || 0).toFixed(0)}h</span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium
                            ${ts.status === 'SUBMITTED'      ? 'bg-emerald-100 text-emerald-700'
                            : ts.status === 'AUTO_SUBMITTED' ? 'bg-emerald-100 text-emerald-600'
                            : ts.status === 'DRAFT'          ? 'bg-amber-100  text-amber-700'
                            :                                  'bg-muted text-muted-foreground'}`}>
                            {ts.status?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No timesheets submitted yet.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        {isAdmin && (
          <div className="px-6 py-4 border-t border-border flex-shrink-0 flex gap-3">
            <button onClick={() => onEdit(emp)} className="btn-secondary flex-1 gap-2">
              <Edit3 size={14} /> Edit
            </button>
            <button
              onClick={() => onToggleStatus(emp)}
              className={`flex-1 gap-2 inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium transition-colors
                ${emp.status === 'ACTIVE'
                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
            >
              {emp.status === 'ACTIVE' ? <><UserX size={14} /> Deactivate</> : <><UserCheck size={14} /> Activate</>}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Employees() {
  const dispatch    = useDispatch()
  const employees   = useSelector(selectEmployees)
  const loading     = useSelector(selectEmployeesLoading)
  const departments = useSelector(selectDepartments)
  const currentUser = useSelector(selectCurrentUser)
  const isAdmin     = currentUser?.role === 'ADMIN'

  const [showModal,  setShowModal]  = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm]             = useState({ name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '', managerId: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError]   = useState('')
  const [saving,    setSaving]      = useState(false)

  // Filters
  const [search,     setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')

  // Drawer
  const [drawerEmp, setDrawerEmp]   = useState(null)

  useEffect(() => {
    dispatch(fetchEmployees())
    dispatch(fetchDepartments())
  }, [dispatch])

  // ── Derived ────────────────────────────────────────────────────────────────
  const managers = employees.filter(e => e.role === 'MANAGER' || e.role === 'ADMIN')

  const filtered = employees.filter(emp => {
    const q = search.toLowerCase()
    const nameMatch = !search || emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q)
    const roleMatch = !roleFilter || emp.role === roleFilter
    const deptMatch = !deptFilter || emp.departmentId === deptFilter || emp.departmentName === deptFilter
    const statMatch = !statFilter || emp.status === statFilter
    return nameMatch && roleMatch && deptMatch && statMatch
  })

  const stats = {
    total:    employees.length,
    active:   employees.filter(e => e.status === 'ACTIVE').length,
    inactive: employees.filter(e => e.status !== 'ACTIVE').length,
    managers: employees.filter(e => e.role === 'MANAGER').length,
  }

  // ── Insights ───────────────────────────────────────────────────────────────
  const deptCounts = departments.map(d => ({
    name: d.name,
    count: employees.filter(e => e.departmentId === d.id).length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count)

  const managersWithoutTeam = managers.filter(m =>
    !employees.some(e => e.managerId === m.id && e.role === 'EMPLOYEE')
  )

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null)
    setForm({ name: '', email: '', password: '', role: 'EMPLOYEE', departmentId: '', managerId: '' })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (emp) => {
    setDrawerEmp(null)
    setEditTarget(emp)
    setForm({ name: emp.name, email: emp.email, password: '', role: emp.role, departmentId: emp.departmentId || '', managerId: emp.managerId || '' })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    setFormError('')
    setSaving(true)
    try {
      if (editTarget) {
        await dispatch(updateEmployee({ id: editTarget.id, data: { name: form.name, role: form.role, departmentId: form.departmentId, managerId: form.managerId } })).unwrap()
        toast.success('Employee updated successfully')
      } else {
        await dispatch(createEmployee(form)).unwrap()
        toast.success('Employee created successfully')
      }
      setShowModal(false)
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (emp) => {
    const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await dispatch(updateEmployeeStatus({ id: emp.id, status: newStatus })).unwrap()
      toast.success(`Employee ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`)
      if (drawerEmp?.id === emp.id) setDrawerEmp(prev => ({ ...prev, status: newStatus }))
    } catch (err) {
      toast.error(err || 'Failed')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground mt-1">{employees.length} total members</p>
        </div>
        {isAdmin && (
          <button className="btn-primary gap-2" onClick={openCreate}>
            <Plus size={15} /> Add Employee
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total"     value={stats.total}    icon={Users}      iconCls="bg-primary/10 text-primary"       />
        <SummaryCard label="Active"    value={stats.active}   icon={UserCheck}  iconCls="bg-emerald-100 text-emerald-600"  />
        <SummaryCard label="Inactive"  value={stats.inactive} icon={UserX}      iconCls="bg-red-100 text-red-600"          />
        <SummaryCard label="Managers"  value={stats.managers} icon={Briefcase}  iconCls="bg-amber-100 text-amber-600"      />
      </div>

      {/* Insights */}
      {(stats.inactive > 0 || managersWithoutTeam.length > 0 || deptCounts.length > 0) && (
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <Lightbulb size={14} className="text-amber-600" />
            </div>
            <h2 className="text-sm font-heading font-semibold text-foreground">People Insights</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {stats.inactive > 0 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl">
                <UserX size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700"><span className="font-semibold">{stats.inactive}</span> inactive employee{stats.inactive > 1 ? 's' : ''} in the system</p>
              </div>
            )}
            {managersWithoutTeam.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl">
                <Users size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700"><span className="font-semibold">{managersWithoutTeam.map(m => m.name).join(', ')}</span> {managersWithoutTeam.length === 1 ? 'has' : 'have'} no direct reports</p>
              </div>
            )}
            {deptCounts.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-xl">
                <Building2 size={14} className="text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-foreground">Largest team: <span className="font-semibold">{deptCounts[0].name}</span> ({deptCounts[0].count} members)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select className="input text-sm w-auto min-w-32" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
        </select>

        <select className="input text-sm w-auto min-w-36 max-w-44" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <div className="flex gap-1.5 p-1 bg-muted rounded-xl">
          {[{ val: '', label: 'All' }, { val: 'ACTIVE', label: 'Active' }, { val: 'INACTIVE', label: 'Inactive' }].map(({ val, label }) => (
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

        {(search || roleFilter || deptFilter || statFilter) && (
          <button
            onClick={() => { setSearch(''); setRoleFilter(''); setDeptFilter(''); setStatFilter('') }}
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
                <Users size={22} className="text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {employees.length === 0 ? 'No employees yet' : 'No employees match your filters'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3.5 text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                      <th className="text-left px-4 py-3.5 text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                      <th className="text-left px-4 py-3.5 text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Department</th>
                      <th className="text-left px-4 py-3.5 text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Reports To</th>
                      <th className="text-left px-4 py-3.5 text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3.5 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((emp, idx) => {
                      const mgr = emp.managerId ? employees.find(e => e.id === emp.managerId) : null
                      return (
                        <tr
                          key={emp.id}
                          onClick={() => setDrawerEmp(emp)}
                          className={`group cursor-pointer hover:bg-muted/40 transition-colors
                            ${idx < filtered.length - 1 ? 'border-b border-border/60' : ''}`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={emp.name} size={36} online={emp.status === 'ACTIVE'} />
                              <div>
                                <p className="font-heading font-semibold text-foreground text-sm leading-tight">{emp.name}</p>
                                <p className="text-xs text-muted-foreground">{emp.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4"><RoleBadge role={emp.role} /></td>
                          <td className="px-4 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                            {emp.departmentName || <span className="text-muted-foreground/30">—</span>}
                          </td>
                          <td className="px-4 py-4 hidden xl:table-cell text-sm text-muted-foreground">
                            {mgr ? mgr.name : <span className="text-muted-foreground/30">—</span>}
                          </td>
                          <td className="px-4 py-4"><StatusDot status={emp.status} /></td>
                          <td className="px-3 py-4" onClick={e => e.stopPropagation()}>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <RowMenu
                                emp={emp}
                                onView={setDrawerEmp}
                                onEdit={openEdit}
                                onToggleStatus={toggleStatus}
                                isAdmin={isAdmin}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card layout */}
              <div className="md:hidden divide-y divide-border">
                {filtered.map(emp => {
                  const mgr = emp.managerId ? employees.find(e => e.id === emp.managerId) : null
                  return (
                    <div
                      key={emp.id}
                      onClick={() => setDrawerEmp(emp)}
                      className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <Avatar name={emp.name} size={40} online={emp.status === 'ACTIVE'} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-heading font-semibold text-foreground text-sm truncate">{emp.name}</p>
                          <RoleBadge role={emp.role} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                        {mgr && <p className="text-xs text-muted-foreground mt-0.5">↳ {mgr.name}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusDot status={emp.status} />
                        <ChevronRight size={16} className="text-muted-foreground/30" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Employee Drawer */}
      {drawerEmp && (
        <EmployeeDrawer
          emp={drawerEmp}
          employees={employees}
          onClose={() => setDrawerEmp(null)}
          onEdit={openEdit}
          onToggleStatus={toggleStatus}
          isAdmin={isAdmin}
        />
      )}

      {/* Create / Edit Modal */}
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
                    {showPassword
                      ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
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
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>
          )}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
