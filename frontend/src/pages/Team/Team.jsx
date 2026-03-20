import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchTeam, selectTeam } from '../../features/employees/employeeSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import { reportService } from '../../services/reportService'
import Layout from '../../components/Layout'
import { LoadingSpinner, EmptyState, SkeletonRows } from '../../components/ui'
import { format } from 'date-fns'
import {
  Users, TrendingUp, AlertTriangle, Clock,
  ChevronRight, Search, X, ChevronDown,
} from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]
function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]
}
function initials(name) {
  return name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?'
}

function getCurrentMonday() {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(new Date().setDate(diff))
}

// ─── status logic ─────────────────────────────────────────────────────────────

function getStatus(hours) {
  if (hours === 0)   return 'NOT_STARTED'
  if (hours < 20)    return 'BEHIND'
  if (hours < 40)    return 'ON_TRACK'
  return 'COMPLETED'
}

const STATUS_CFG = {
  NOT_STARTED: {
    label: 'Not Started',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    dot:   'bg-slate-400',
    bar:   'from-slate-300 to-slate-400',
    insight: 'No activity yet this week',
    insightColor: 'text-muted-foreground',
  },
  BEHIND: {
    label: 'Behind',
    badge: 'bg-red-100 text-red-700 border-red-200',
    dot:   'bg-red-500',
    bar:   'from-red-400 to-rose-500',
    insight: 'Behind schedule',
    insightColor: 'text-red-600',
  },
  ON_TRACK: {
    label: 'On Track',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot:   'bg-amber-500',
    bar:   'from-amber-400 to-yellow-400',
    insight: 'Making good progress',
    insightColor: 'text-amber-600',
  },
  COMPLETED: {
    label: 'Completed',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot:   'bg-emerald-500',
    bar:   'from-emerald-400 to-teal-500',
    insight: hours => hours > 40 ? `Overtime: ${(hours - 40).toFixed(1)}h extra` : 'Full week logged',
    insightColor: 'text-emerald-600',
  },
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function ProgressBar({ pct, status }) {
  const cfg = STATUS_CFG[status]
  return (
    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${cfg.bar} transition-all duration-700 ease-out`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  )
}

function StatCard({ label, value, sub, Icon, iconCls, highlight }) {
  return (
    <div className={`bg-card rounded-xl border shadow-sm p-4 ${highlight ? 'border-primary/30' : 'border-border'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${iconCls}`}>
        <Icon size={15} />
      </div>
      <p className="text-xl font-heading font-bold text-foreground">{value}</p>
      <p className="text-xs font-medium text-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function MemberCard({ emp, hours, onView }) {
  const status  = getStatus(hours)
  const cfg     = STATUS_CFG[status]
  const pct     = Math.min(110, (hours / 40) * 100)
  const insight = typeof cfg.insight === 'function' ? cfg.insight(hours) : cfg.insight

  return (
    <div className="group bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-4">
      {/* top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-heading font-bold flex-shrink-0 ${avatarColor(emp.name)}`}>
            {initials(emp.name)}
          </div>
          <div className="min-w-0">
            <p className="font-heading font-semibold text-foreground text-sm truncate">{emp.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{emp.email}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* meta pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border capitalize">
          {emp.role?.toLowerCase()}
        </span>
        {emp.departmentName && (
          <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
            {emp.departmentName}
          </span>
        )}
      </div>

      {/* hours + progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-heading font-bold text-foreground tabular-nums">{hours.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">/ 40h</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
        </div>
        <ProgressBar pct={pct} status={status} />
      </div>

      {/* insight + CTA */}
      <div className="flex items-center justify-between pt-1 border-t border-border mt-auto">
        <span className={`text-[11px] font-medium ${cfg.insightColor}`}>{insight}</span>
        <button
          onClick={onView}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          View Details
          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function Team() {
  const dispatch  = useDispatch()
  const navigate  = useNavigate()
  const user      = useSelector(selectCurrentUser)
  const team      = useSelector(selectTeam)

  const [utilization, setUtilization] = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [deptFilter, setDeptFilter]   = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const weekStartDate = format(getCurrentMonday(), 'yyyy-MM-dd')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await dispatch(fetchTeam(user.id))
      try {
        const res = await reportService.getTeamUtilization(weekStartDate)
        setUtilization(res.data.data.team || [])
      } catch (_) {}
      setLoading(false)
    }
    load()
  }, [dispatch, user.id])

  const getHours = (empId) => {
    const found = utilization.find(u => u.employeeId === empId)
    return found ? Number(found.hoursLogged) : 0
  }

  // derived data
  const departments = useMemo(() => {
    const depts = [...new Set(team.map(e => e.departmentName).filter(Boolean))]
    return depts.sort()
  }, [team])

  const enriched = useMemo(() =>
    team.map(emp => ({ ...emp, hours: getHours(emp.id), status: getStatus(getHours(emp.id)) })),
    [team, utilization]
  )

  const filtered = useMemo(() => enriched.filter(emp => {
    const matchSearch = !search ||
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase())
    const matchDept   = deptFilter === 'ALL' || emp.departmentName === deptFilter
    const matchStatus = statusFilter === 'ALL' || emp.status === statusFilter
    return matchSearch && matchDept && matchStatus
  }), [enriched, search, deptFilter, statusFilter])

  const stats = useMemo(() => ({
    total:      enriched.length,
    active:     enriched.filter(e => e.hours > 0).length,
    behind:     enriched.filter(e => e.status === 'BEHIND').length,
    notStarted: enriched.filter(e => e.status === 'NOT_STARTED').length,
  }), [enriched])

  const hasFilters = search || deptFilter !== 'ALL' || statusFilter !== 'ALL'

  return (
    <Layout>
      {/* header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">My Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Week of {format(getCurrentMonday(), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <SkeletonRows rows={5} cols={3} />
        </div>
      ) : (
        <>
          {/* stat strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total Members"  value={stats.total}      sub="in your team"             Icon={Users}         iconCls="bg-blue-50 text-blue-600" />
            <StatCard label="Active"         value={stats.active}     sub="logged hours this week"   Icon={TrendingUp}    iconCls="bg-emerald-50 text-emerald-600" highlight={false} />
            <StatCard label="Behind"         value={stats.behind}     sub="below 20h threshold"      Icon={AlertTriangle} iconCls="bg-red-50 text-red-500" />
            <StatCard label="Not Started"    value={stats.notStarted} sub="no hours this week"       Icon={Clock}         iconCls="bg-slate-100 text-slate-500" />
          </div>

          {/* filters */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {/* search */}
            <div className="relative flex-1 min-w-48 max-w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search team member…"
                className="input pl-8 pr-8 h-9 text-sm w-full"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* department dropdown */}
            <div className="relative">
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className={`h-9 pl-3 pr-8 rounded-lg border text-sm font-medium appearance-none outline-none cursor-pointer transition-colors bg-card ${
                  deptFilter !== 'ALL'
                    ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* status dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className={`h-9 pl-3 pr-8 rounded-lg border text-sm font-medium appearance-none outline-none cursor-pointer transition-colors bg-card ${
                  statusFilter !== 'ALL'
                    ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                <option value="ALL">All Statuses</option>
                {Object.entries(STATUS_CFG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setDeptFilter('ALL'); setStatusFilter('ALL') }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 h-9 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>

          {/* result count */}
          {hasFilters && (
            <p className="text-xs text-muted-foreground mb-4">
              Showing {filtered.length} of {enriched.length} members
            </p>
          )}

          {/* grid */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={enriched.length === 0 ? 'No team members yet' : 'No members match your filters'}
              description={enriched.length === 0
                ? 'Your team will appear here once members are assigned to you.'
                : 'Try adjusting your search or filter criteria.'}
              action={hasFilters ? (
                <button
                  onClick={() => { setSearch(''); setDeptFilter('ALL'); setStatusFilter('ALL') }}
                  className="btn-ghost text-sm"
                >
                  Clear all filters
                </button>
              ) : null}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(emp => (
                <MemberCard
                  key={emp.id}
                  emp={emp}
                  hours={emp.hours}
                  onView={() => navigate(`/team/${emp.id}/timesheets`)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  )
}
