import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { fetchMyTimesheets, selectMyTimesheets, selectTimesheetsLoading } from '../../features/timesheets/timesheetSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import { selectBadges } from '../../features/notifications/notificationSlice'
import Layout from '../../components/Layout'
import { StatusBadge, StatCard, EmptyState, SkeletonRows } from '../../components/ui'
import { format, parseISO, isSameWeek } from 'date-fns'
import { FileText, CheckCircle2, Clock, Edit3, Plus, ArrowRight, Users, CalendarOff } from 'lucide-react'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const dispatch   = useDispatch()
  const navigate   = useNavigate()
  const user       = useSelector(selectCurrentUser)
  const timesheets = useSelector(selectMyTimesheets)
  const loading    = useSelector(selectTimesheetsLoading)
  const badges     = useSelector(selectBadges)
  const isManager  = user?.role === 'MANAGER' || user?.role === 'ADMIN'

  useEffect(() => { dispatch(fetchMyTimesheets()) }, [dispatch])

  const stats = useMemo(() => {
    const submitted  = timesheets.filter(t => t.status === 'SUBMITTED' || t.status === 'APPROVED' || t.status === 'AUTO_SUBMITTED').length
    const drafts     = timesheets.filter(t => t.status === 'DRAFT').length
    const totalHours = timesheets.reduce((s, t) => s + Number(t.totalHours || 0), 0)
    const avgHours   = timesheets.length ? (totalHours / timesheets.length).toFixed(1) : '0.0'
    return { submitted, drafts, totalHours, avgHours, total: timesheets.length }
  }, [timesheets])

  const currentWeekTs = useMemo(() =>
    timesheets.find(t => isSameWeek(parseISO(t.weekStartDate), new Date(), { weekStartsOn: 1 }))
  , [timesheets])

  const weekHours  = Number(currentWeekTs?.totalHours || 0)
  const weekTarget = 40
  const weekPct    = Math.min(100, (weekHours / weekTarget) * 100)

  const recent     = timesheets.slice(0, 8)

  const weekLabel = ts =>
    `${format(parseISO(ts.weekStartDate), 'MMM d')} - ${format(parseISO(ts.weekEndDate), 'MMM d')}`

  const barColor = hrs => hrs >= 40 ? '#10B981' : hrs >= 24 ? '#6366F1' : '#F59E0B'

  return (
    <Layout>

      {/* Hero */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-page-title">
            {greeting()}, {user?.name?.split(' ')[0] ?? 'there'} 
          </h1>
          <p className="text-body mt-1">
            {isManager
              ? "Here's what needs your attention today."
              : 'Track your time and stay on top of your week.'}
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => navigate('/timesheets/new')}>
          <Plus size={15} /> New Timesheet
        </button>
      </div>

      {/* This week */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-section-label mb-1">This Week</p>
            <p className="text-3xl font-bold text-foreground tabular-nums leading-none">
              {weekHours.toFixed(1)}
              <span className="text-base font-normal text-muted-foreground"> / {weekTarget}h</span>
            </p>
          </div>
          <div className="text-right">
            {currentWeekTs
              ? <StatusBadge status={currentWeekTs.status} />
              : <span className="text-xs text-muted-foreground">No timesheet this week</span>}
            {currentWeekTs && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {weekPct >= 100 ? 'Target reached' : `${(weekTarget - weekHours).toFixed(1)}h remaining`}
              </p>
            )}
          </div>
        </div>
        <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${weekPct}%`, background: barColor(weekHours) }}
          />
        </div>
        {!currentWeekTs && !loading && (
          <button
            onClick={() => navigate('/timesheets/new')}
            className="mt-4 w-full py-2.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            Start this week's timesheet
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Weeks"  value={stats.total}          icon={<FileText size={16} />}     color="blue"   subtitle="all time" />
        <StatCard title="Submitted"    value={stats.submitted}      icon={<CheckCircle2 size={16} />} color="green"  subtitle={stats.total ? `${Math.round((stats.submitted / stats.total) * 100)}% rate` : '--'} />
        <StatCard title="In Draft"     value={stats.drafts}         icon={<Edit3 size={16} />}         color="amber"  subtitle={stats.drafts > 0 ? 'Needs submission' : 'All clear'} />
        <StatCard title="Avg / Week"   value={`${stats.avgHours}h`} icon={<Clock size={16} />}         color="violet" subtitle={`${stats.totalHours.toFixed(0)}h total`} />
      </div>

      {/* Manager: attention strip (uses existing badge state, no new API calls) */}
      {isManager && (badges.leaves > 0 || badges.team > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {badges.leaves > 0 && (
            <button
              onClick={() => navigate('/leaves/team')}
              className="flex items-center gap-3 px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <CalendarOff size={16} className="text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">
                  {badges.leaves} leave request{badges.leaves !== 1 ? 's' : ''} pending
                </p>
                <p className="text-xs text-amber-600">Review team leave requests</p>
              </div>
              <ArrowRight size={14} className="text-amber-500 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
          {badges.team > 0 && (
            <button
              onClick={() => navigate('/team')}
              className="flex items-center gap-3 px-4 py-3.5 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Users size={16} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-900">
                  {badges.team} team update{badges.team !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-blue-600">View team timesheets and activity</p>
              </div>
              <ArrowRight size={14} className="text-blue-500 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      )}

      {/* Recent timesheets (full width — Activity Feed removed, same data) */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Timesheets</h2>
          <Link to="/timesheets" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {loading ? (
          <SkeletonRows rows={5} cols={3} />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No timesheets yet"
            description="Start tracking your time by creating your first timesheet."
            action={
              <button className="btn-primary text-xs" onClick={() => navigate('/timesheets/new')}>
                <Plus size={13} /> New Timesheet
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-border/50">
            {recent.map(ts => {
              const hrs = Number(ts.totalHours || 0)
              const pct = Math.min(100, (hrs / weekTarget) * 100)
              return (
                <button
                  key={ts.id}
                  onClick={() => navigate(`/timesheets/${ts.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {weekLabel(ts)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="w-24 h-1 bg-muted/60 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor(hrs) }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{hrs.toFixed(1)}h</span>
                    </div>
                  </div>
                  <StatusBadge status={ts.status} />
                  <ArrowRight size={13} className="text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}
