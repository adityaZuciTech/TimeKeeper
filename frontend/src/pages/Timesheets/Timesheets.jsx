import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  fetchMyTimesheets, createTimesheet,
  selectMyTimesheets, selectTimesheetsLoading,
} from '../../features/timesheets/timesheetSlice'
import { markSectionRead } from '../../features/notifications/notificationSlice'
import Layout from '../../components/Layout'
import { StatCard, EmptyState, SkeletonRows, PageTransition } from '../../components/ui'
import { format, isThisWeek, isPast, parseISO, getWeek } from 'date-fns'
import toast from 'react-hot-toast'
import {
  Clock, CheckCircle2, FileEdit, TrendingUp,
  AlertTriangle, Calendar, Plus, ArrowRight, Flame,
} from 'lucide-react'

// ─── helpers ──────────────────────────────────────────────────────────────────

function getMondayOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  return d
}

function formatDate(d) { return format(new Date(d), 'yyyy-MM-dd') }

function isCurrentWeek(weekStartDate) {
  return isThisWeek(parseISO(weekStartDate), { weekStartsOn: 1 })
}

function isOverdue(ts) {
  return ts.status === 'DRAFT' && isPast(parseISO(ts.weekEndDate))
}

function getEffectiveStatus(ts) {
  return isOverdue(ts) ? 'OVERDUE' : ts.status
}

// ─── config ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  DRAFT:     { label: 'Draft',     badge: 'bg-gray-100 text-gray-600 border-gray-200',          dot: 'bg-gray-400',    Icon: FileEdit },
  SUBMITTED: { label: 'Submitted', badge: 'bg-blue-50 text-blue-700 border-blue-200',             dot: 'bg-blue-500',    Icon: CheckCircle2 },
  APPROVED:  { label: 'Approved',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',    dot: 'bg-emerald-500', Icon: CheckCircle2 },
  REJECTED:  { label: 'Rejected',  badge: 'bg-red-50 text-red-700 border-red-200',                dot: 'bg-red-500',     Icon: AlertTriangle },
  OVERDUE:   { label: 'Overdue',   badge: 'bg-red-100 text-red-700 border-red-200',               dot: 'bg-red-600',     Icon: AlertTriangle },
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.DRAFT
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function getInsight(ts, hours, effectiveStatus) {
  if (effectiveStatus === 'OVERDUE')   return { text: 'Overdue — submit immediately',    color: 'text-red-600',   Icon: AlertTriangle }
  if (effectiveStatus === 'SUBMITTED' || effectiveStatus === 'APPROVED')
                                       return { text: 'Submitted on time',               color: 'text-emerald-600', Icon: CheckCircle2 }
  if (hours >= 40)                     return { text: 'Full week logged',                color: 'text-primary',   Icon: Flame }
  if (hours >= 32)                     return { text: 'Almost complete — 1 day to go',   color: 'text-primary',   Icon: TrendingUp }
  if (hours >= 16)                     return { text: 'Good progress — keep going',      color: 'text-amber-600', Icon: TrendingUp }
  if (hours > 0)                       return { text: `${(40 - hours).toFixed(0)}h remaining this week`, color: 'text-amber-600', Icon: Clock }
  return { text: 'No hours logged yet', color: 'text-muted-foreground', Icon: Clock }
}

const DAYS = ['M', 'T', 'W', 'T', 'F']

function DayDots({ hours }) {
  const filled = Math.min(5, Math.round(hours / 8))
  return (
    <div className="flex items-center gap-1.5">
      {DAYS.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div className={`w-5 h-1.5 rounded-full transition-all duration-500 ${i < filled ? 'bg-gradient-to-r from-primary to-indigo-400' : 'bg-muted'}`} />
          <span className="text-[9px] text-muted-foreground font-medium">{d}</span>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ pct, effectiveStatus }) {
  const gradient =
    effectiveStatus === 'OVERDUE'                                         ? 'from-red-500 to-red-400'
    : effectiveStatus === 'SUBMITTED' || effectiveStatus === 'APPROVED'   ? 'from-emerald-500 to-emerald-400'
    : pct >= 100                                                           ? 'from-emerald-500 to-emerald-400'
    : pct >= 70                                                            ? 'from-primary to-indigo-400'
    : pct >= 40                                                            ? 'from-amber-500 to-yellow-400'
    : 'from-amber-300 to-yellow-300'

  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ─── featured "current week" card ─────────────────────────────────────────────

function FeaturedCard({ ts, onOpen }) {
  const hours          = Number(ts.totalHours || 0)
  const pct            = Math.min(100, (hours / 40) * 100)
  const effectiveStatus = getEffectiveStatus(ts)
  const canEdit        = ts.status === 'DRAFT'
  const weekLabel      = `${format(parseISO(ts.weekStartDate), 'MMM d')} - ${format(parseISO(ts.weekEndDate), 'MMM d, yyyy')}`
  const weekNum        = getWeek(parseISO(ts.weekStartDate), { weekStartsOn: 1 })
  const insight        = getInsight(ts, hours, effectiveStatus)
  const remaining      = Math.max(0, 40 - hours)

  return (
    <div className="relative bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden mb-6">
      {/* accent stripe */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-indigo-400 to-primary/20" />

      <div className="p-6">
        {/* header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-primary bg-primary/8 px-2 py-0.5 rounded-md">
                Current Week
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">Week {weekNum}</span>
            </div>
            <p className="font-semibold text-foreground">{weekLabel}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={effectiveStatus} />
            {Number(ts.totalOvertimeHours ?? 0) > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                OT: {Number(ts.totalOvertimeHours).toFixed(2)}h
              </span>
            )}
          </div>
        </div>

        {/* big numbers */}
        <div className="flex items-end gap-8 mb-5">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Hours logged</p>
            <p className="text-4xl font-bold text-foreground tabular-nums leading-none">{hours.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground mt-1">/ 40h target</p>
          </div>
          <div className="pb-1">
            <p className="text-[11px] text-muted-foreground mb-1">Remaining</p>
            <p className="text-2xl font-semibold text-muted-foreground tabular-nums">{remaining.toFixed(1)}h</p>
          </div>
        </div>

        {/* progress */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <DayDots hours={hours} />
            <span className="text-xs font-semibold text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
          </div>
          <ProgressBar pct={pct} effectiveStatus={effectiveStatus} />
        </div>

        {/* insight + CTAs */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-1.5 min-w-0">
            <insight.Icon size={13} className={`flex-shrink-0 ${insight.color}`} />
            <span className={`text-xs font-medium truncate ${insight.color}`}>{insight.text}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onOpen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-muted hover:bg-muted/70 transition-colors"
            >
              View Details
            </button>
            {canEdit && (
              <button
                onClick={onOpen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground bg-primary hover:opacity-90 shadow-sm hover:shadow transition-all duration-200"
              >
                Continue Filling
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── regular past-week card ───────────────────────────────────────────────────

function WeekCard({ ts, onOpen }) {
  const hours           = Number(ts.totalHours || 0)
  const pct             = Math.min(100, (hours / 40) * 100)
  const effectiveStatus = getEffectiveStatus(ts)
  const canEdit         = ts.status === 'DRAFT'
  const weekLabel       = `${format(parseISO(ts.weekStartDate), 'MMM d')} - ${format(parseISO(ts.weekEndDate), 'MMM d')}`
  const weekNum         = getWeek(parseISO(ts.weekStartDate), { weekStartsOn: 1 })
  const insight         = getInsight(ts, hours, effectiveStatus)

  return (
    <div
      onClick={onOpen}
      className="group bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-primary/25 transition-all duration-200 p-4 cursor-pointer"
    >
      {/* header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Week {weekNum}</p>
          <p className="text-sm font-semibold text-foreground truncate">{weekLabel}</p>
        </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <StatusBadge status={effectiveStatus} />
            {Number(ts.totalOvertimeHours ?? 0) > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                OT: {Number(ts.totalOvertimeHours).toFixed(2)}h
              </span>
            )}
          </div>
        <span className="text-xs text-muted-foreground">/ 40h</span>
      </div>

      {/* progress */}
      <ProgressBar pct={pct} effectiveStatus={effectiveStatus} />

      {/* day dots */}
      <div className="mt-3 mb-3">
        <DayDots hours={hours} />
      </div>

      {/* insight + arrow */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border">
        <div className="flex items-center gap-1 min-w-0">
          <insight.Icon size={11} className={`flex-shrink-0 ${insight.color}`} />
          <span className={`text-[11px] truncate ${insight.color}`}>{insight.text}</span>
        </div>
        <span className="text-xs font-semibold text-primary flex-shrink-0 flex items-center gap-0.5 group-hover:gap-1.5 transition-all duration-150">
          {canEdit ? 'Edit' : 'View'}
          <ArrowRight size={11} />
        </span>
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function Timesheets() {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const timesheets = useSelector(selectMyTimesheets)
  const loading    = useSelector(selectTimesheetsLoading)
  const [creating, setCreating] = useState(false)
  // Quick status filter (heuristic #7 — flexibility and efficiency)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => { dispatch(fetchMyTimesheets()) }, [dispatch])
  useEffect(() => { dispatch(markSectionRead('TIMESHEET')) }, [dispatch])

  const handleOpen = (id) => navigate(`/timesheets/${id}`)

  const handleCreateNew = async () => {
    const monday = getMondayOfWeek(new Date())
    setCreating(true)
    try {
      const result = await dispatch(createTimesheet({ weekStartDate: formatDate(monday) })).unwrap()
      navigate(`/timesheets/${result.id}`)
    } catch (err) {
      toast.error(err || 'Failed to create timesheet')
    } finally {
      setCreating(false)
    }
  }

  // Sort newest first, split current vs past
  const sorted        = [...timesheets].sort((a, b) => new Date(b.weekStartDate) - new Date(a.weekStartDate))
  const currentWeekTs = sorted.find(ts => isCurrentWeek(ts.weekStartDate))
  const allOlderTs    = sorted.filter(ts => !isCurrentWeek(ts.weekStartDate))

  // Apply status filter to older timesheets only
  const olderTs = statusFilter === 'ALL'
    ? allOlderTs
    : allOlderTs.filter(ts => {
        if (statusFilter === 'OVERDUE') return isOverdue(ts)
        return ts.status === statusFilter
      })

  // Stats
  const totalHours   = timesheets.reduce((s, ts) => s + Number(ts.totalHours || 0), 0)
  const submitted    = timesheets.filter(ts => ts.status === 'SUBMITTED' || ts.status === 'APPROVED').length
  const drafts       = timesheets.filter(ts => ts.status === 'DRAFT').length
  const overdueCount = timesheets.filter(ts => isOverdue(ts)).length
  const avgHours     = timesheets.length > 0 ? totalHours / timesheets.length : 0

  return (
    <Layout>
      <PageTransition>
      {/* page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-page-title">My Timesheets</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage your weekly time entries</p>
        </div>
        <button
          className="btn-primary flex-shrink-0 flex items-center gap-2"
          onClick={handleCreateNew}
          disabled={creating}
        >
          <Plus size={15} />
          {creating ? 'Creating…' : 'This Week'}
        </button>
      </div>

      {/* stat strip */}
      {timesheets.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard title="Total Weeks"  value={timesheets.length}           icon={<Calendar size={16} />}     color="blue"   subtitle="all time" />
          <StatCard title="Hours Logged" value={`${totalHours.toFixed(0)}h`}  icon={<Clock size={16} />}        color="blue"   subtitle="across all weeks" />
          <StatCard title="Submitted"    value={submitted}                    icon={<CheckCircle2 size={16} />} color="green"  subtitle={`${timesheets.length > 0 ? Math.round((submitted / timesheets.length) * 100) : 0}% rate`} />
          <StatCard title="Avg / Week"   value={`${avgHours.toFixed(1)}h`}    icon={<Clock size={16} />}        color={overdueCount > 0 ? 'red' : 'violet'} subtitle={overdueCount > 0 ? `${overdueCount} overdue` : drafts > 0 ? `${drafts} draft${drafts > 1 ? 's' : ''} pending` : 'all up to date'} />
        </div>
      )}

      {loading ? (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <SkeletonRows rows={5} cols={3} />
        </div>
      ) : timesheets.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No timesheets yet"
          description="Create your first timesheet to start tracking your weekly hours."
          action={
            <button className="btn-primary flex items-center gap-2" onClick={handleCreateNew} disabled={creating}>
              <Plus size={14} />{creating ? 'Creating…' : 'Create This Week'}
            </button>
          }
        />
      ) : (
        <>
          {/* current week */}
          {currentWeekTs ? (
            <FeaturedCard ts={currentWeekTs} onOpen={() => handleOpen(currentWeekTs.id)} />
          ) : (
            <div className="mb-6 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">No timesheet for this week</p>
                  <p className="text-xs text-amber-600 mt-0.5">Start logging today to stay on track</p>
                </div>
              </div>
              <button
                className="btn-primary flex-shrink-0 flex items-center gap-1.5 text-xs"
                onClick={handleCreateNew}
                disabled={creating}
              >
                <Plus size={13} />
                {creating ? 'Creating…' : 'Start Now'}
              </button>
            </div>
          )}

          {/* previous weeks */}
          {allOlderTs.length > 0 && (
            <div>
              {/* Filter bar (heuristic #7 — efficiency) */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Previous Weeks</p>
                <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
                  {[{ val: 'ALL', label: 'All' }, { val: 'DRAFT', label: 'Draft' }, { val: 'SUBMITTED', label: 'Submitted' }, { val: 'APPROVED', label: 'Approved' }, { val: 'OVERDUE', label: 'Overdue' }].map(({ val, label }) => (
                    <button
                      key={val}
                      onClick={() => setStatusFilter(val)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all
                        ${statusFilter === val ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {olderTs.length === 0 ? (
                <EmptyState
                  icon={FileEdit}
                  title={`No ${statusFilter.toLowerCase()} timesheets`}
                  description="Try selecting a different filter above."
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {olderTs.map(ts => (
                    <WeekCard key={ts.id} ts={ts} onOpen={() => handleOpen(ts.id)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
      </PageTransition>
    </Layout>
  )
}


