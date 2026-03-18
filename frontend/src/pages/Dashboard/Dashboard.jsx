import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { fetchMyTimesheets, selectMyTimesheets, selectTimesheetsLoading } from '../../features/timesheets/timesheetSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner } from '../../components/ui'
import { format, parseISO, isSameWeek } from 'date-fns'
import { FileText, CheckCircle2, Clock, Edit3, Plus, ArrowRight, CalendarDays, Zap } from 'lucide-react'

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

  useEffect(() => { dispatch(fetchMyTimesheets()) }, [dispatch])

  const stats = useMemo(() => {
    const submitted  = timesheets.filter(t => t.status === 'SUBMITTED').length
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

  const recent = timesheets.slice(0, 6)

  const activity = useMemo(() => timesheets.slice(0, 8).map(ts => ({
    id:   ts.id,
    icon: ts.status === 'SUBMITTED' ? '✅' : '📝',
    text: ts.status === 'SUBMITTED'
      ? `Submitted ${format(parseISO(ts.weekStartDate), 'MMM d')}–${format(parseISO(ts.weekEndDate), 'MMM d')}`
      : `Draft: ${format(parseISO(ts.weekStartDate), 'MMM d')}–${format(parseISO(ts.weekEndDate), 'MMM d')}`,
    sub:  `${Number(ts.totalHours || 0).toFixed(1)} hours logged`,
    to:   `/timesheets/${ts.id}`,
  })), [timesheets])

  const weekLabel = ts =>
    `${format(parseISO(ts.weekStartDate), 'MMM d')} – ${format(parseISO(ts.weekEndDate), 'MMM d')}`

  const barColor = pct => pct >= 100 ? '#10B981' : pct >= 60 ? '#6366F1' : '#F59E0B'

  return (
    <Layout>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-heading font-semibold text-foreground">
              {greeting()}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Here's your timesheet activity at a glance.</p>
          </div>
          <button className="btn-primary shrink-0" onClick={() => navigate('/timesheets/new')}>
            <Plus size={15} /> New Timesheet
          </button>
        </div>

        {/* Weekly progress card */}
        <div className="card p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">This Week</p>
              <p className="text-3xl font-bold font-heading text-foreground tabular-nums leading-none">
                {weekHours.toFixed(1)}
                <span className="text-base font-normal text-muted-foreground"> / {weekTarget}h</span>
              </p>
            </div>
            <div className="text-right">
              {currentWeekTs ? (
                <>
                  <StatusBadge status={currentWeekTs.status} />
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {weekPct >= 100 ? '🎉 Target reached!' : `${(weekTarget - weekHours).toFixed(1)}h remaining`}
                  </p>
                </>
              ) : (
                <span className="text-xs text-muted-foreground italic">No timesheet this week</span>
              )}
            </div>
          </div>
          <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${weekPct}%`, background: barColor(weekPct) }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">0h</span>
            <span className="text-[10px] text-muted-foreground">{weekTarget}h target</span>
          </div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total Timesheets', value: stats.total,
            icon: <FileText size={15} />, accent: '#6366F1',
            sub: 'across all weeks',
          },
          {
            label: 'Submitted', value: stats.submitted,
            icon: <CheckCircle2 size={15} />, accent: '#10B981',
            sub: `${stats.total ? Math.round((stats.submitted / stats.total) * 100) : 0}% completion rate`,
          },
          {
            label: 'In Draft', value: stats.drafts,
            icon: <Edit3 size={15} />, accent: '#F59E0B',
            sub: stats.drafts > 0 ? 'Pending submission' : 'All up to date',
          },
          {
            label: 'Avg Hours / Week', value: `${stats.avgHours}h`,
            icon: <Clock size={15} />, accent: '#8B5CF6',
            sub: `${stats.totalHours.toFixed(0)}h total logged`,
          },
        ].map(card => (
          <div key={card.label} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground">{card.label}</span>
              <span className="p-1.5 rounded-lg" style={{ background: `${card.accent}1a`, color: card.accent }}>
                {card.icon}
              </span>
            </div>
            <p className="text-2xl font-bold font-heading text-foreground tabular-nums leading-none">{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: <Plus size={17} />, label: 'New Timesheet',
              desc: 'Start logging this week',
              color: '#6366F1',
              onClick: () => navigate('/timesheets/new'),
            },
            {
              icon: <CalendarDays size={17} />, label: 'My Timesheets',
              desc: 'View all your timesheets',
              color: '#10B981',
              onClick: () => navigate('/timesheets'),
            },
            {
              icon: <Zap size={17} />, label: 'Log Time',
              desc: currentWeekTs ? 'Continue this week' : 'Open existing draft',
              color: '#F59E0B',
              onClick: () => currentWeekTs ? navigate(`/timesheets/${currentWeekTs.id}`) : navigate('/timesheets'),
            },
          ].map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="card p-4 flex items-center gap-3 text-left hover:shadow-md hover:-translate-y-px transition-all duration-200 group"
            >
              <span
                className="p-2.5 rounded-xl flex-shrink-0"
                style={{ background: `${action.color}1a`, color: action.color }}
              >
                {action.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{action.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent + Activity ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Recent Timesheets */}
        <div className="lg:col-span-3 card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-heading font-semibold text-foreground">Recent Timesheets</h2>
            <Link to="/timesheets" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="py-12"><LoadingSpinner /></div>
          ) : recent.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground mb-3">No timesheets yet</p>
              <button className="btn-primary text-xs" onClick={() => navigate('/timesheets/new')}>Create your first</button>
            </div>
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
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor(pct) }} />
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums">{hrs.toFixed(1)}h</span>
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

        {/* Activity Feed */}
        <div className="lg:col-span-2 card p-0 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-heading font-semibold text-foreground">Activity</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Your recent timesheet actions</p>
          </div>
          {loading ? (
            <div className="py-12"><LoadingSpinner /></div>
          ) : activity.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No activity yet</div>
          ) : (
            <div className="divide-y divide-border/40 overflow-y-auto">
              {activity.map(item => (
                <Link
                  key={item.id}
                  to={item.to}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                >
                  <span className="text-sm mt-0.5 flex-shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug">{item.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </Layout>
  )
}
