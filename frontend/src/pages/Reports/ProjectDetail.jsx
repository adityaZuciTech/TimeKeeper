import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { reportService } from '../../services/reportService'
import Layout from '../../components/Layout'
import { PageTransition } from '../../components/ui'
import { format } from 'date-fns'
import { DATE_OPTIONS, getMondayStr, formatWeekRange, getMonday } from '../../lib/weekUtils'
import toast from 'react-hot-toast'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  ArrowLeft, FolderKanban, Users, Clock, ArrowUpRight,
  ArrowDownRight, Minus, ChevronRight, Building2,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusBadge(status) {
  switch (status) {
    case 'ACTIVE':    return 'bg-emerald-100 text-emerald-700'
    case 'ON_HOLD':   return 'bg-amber-100 text-amber-700'
    case 'COMPLETED': return 'bg-slate-100 text-slate-600'
    default:          return 'bg-slate-100 text-slate-500'
  }
}

function statusLabel(status) {
  if (status === 'ON_HOLD') return 'On Hold'
  return status ? status.charAt(0) + status.slice(1).toLowerCase() : '—'
}

function TrendBadge({ value, size = 'md' }) {
  if (value === null || value === undefined) return null
  const pos = value > 0
  const neg = value < 0
  const base = `inline-flex items-center gap-1 font-medium rounded-full px-2 py-0.5 ${size === 'lg' ? 'text-sm' : 'text-xs'}`
  return (
    <span className={`${base} ${pos ? 'bg-emerald-100 text-emerald-700' : neg ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
      {pos ? <ArrowUpRight size={12} /> : neg ? <ArrowDownRight size={12} /> : <Minus size={12} />}
      {pos ? '+' : ''}{Number(value).toFixed(1)}% vs last week
    </span>
  )
}

function AreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-medium text-foreground mb-0.5">{label}</p>
      <p className="text-primary font-bold">{Number(payload[0]?.value || 0).toFixed(1)}h logged</p>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const weekParam = searchParams.get('week') || 'this_week'
  const fromParam  = searchParams.get('from') || 'reports'
  const fromOrg      = fromParam === 'org'
  const fromProjects = fromParam === 'projects'
  const selectedOption = DATE_OPTIONS.find(o => o.value === weekParam) || DATE_OPTIONS[0]
  const weekMonday = getMonday(selectedOption.weeksAgo)

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return
    const load = async () => {
      setLoading(true)
      try {
        const res = await reportService.getProjectDetail(
          projectId,
          getMondayStr(selectedOption.weeksAgo),
        )
        setReport(res.data.data)
      } catch (err) {
        const status = err?.response?.status
        if (status === 404) {
          toast.error('Project not found')
          navigate('/reports', { replace: true })
        } else {
          toast.error('Failed to load project detail')
          setReport(null)
        }
      }
      setLoading(false)
    }
    load()
  }, [projectId, weekParam]) // eslint-disable-line react-hooks/exhaustive-deps

  const trendChartData = (report?.weeklyTrend || []).map(p => ({
    label: p.weekLabel,
    hours: Number(p.totalHours || 0),
  }))

  const handleBack = () => {
    if (fromOrg)      return navigate('/organization')
    if (fromProjects) return navigate('/projects')
    return navigate(`/reports?week=${weekParam}`)
  }

  // ─── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <PageTransition>
          <div className="space-y-6">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-card border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
            <div className="h-64 bg-card border border-border rounded-2xl animate-pulse" />
            <div className="h-64 bg-card border border-border rounded-2xl animate-pulse" />
          </div>
        </PageTransition>
      </Layout>
    )
  }

  if (!report) return null

  return (
    <Layout>
      <PageTransition>

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 flex-wrap">
        {fromOrg ? (
          <>
            <button onClick={() => navigate('/organization')} className="hover:text-foreground transition-colors">Organization Overview</button>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">{report.projectName}</span>
          </>
        ) : fromProjects ? (
          <>
            <button onClick={() => navigate('/projects')} className="hover:text-foreground transition-colors">Projects</button>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">{report.projectName}</span>
          </>
        ) : (
          <>
            <button onClick={() => navigate('/reports')} className="hover:text-foreground transition-colors">Reports</button>
            <ChevronRight size={14} />
            <button onClick={handleBack} className="hover:text-foreground transition-colors">Project Effort</button>
            <ChevronRight size={14} />
            <span className="text-foreground font-medium">{report.projectName}</span>
          </>
        )}
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h1 className="text-page-title truncate">{report.projectName}</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusBadge(report.status)}`}>
              {statusLabel(report.status)}
            </span>
            <TrendBadge value={report.trendVsLastWeek} size="lg" />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {report.clientName && (
              <span>Client: <span className="text-foreground font-medium">{report.clientName}</span></span>
            )}
            <span>
              {selectedOption.weeksAgo === 0 ? 'Week of' : `${selectedOption.label} ·`}{' '}
              {format(weekMonday, 'MMMM d, yyyy')}
            </span>
          </div>
        </div>
        <button onClick={handleBack} className="btn-secondary gap-2 text-sm flex-shrink-0 self-start">
          <ArrowLeft size={14} />
          <span className="hidden sm:inline">Back to Project Effort</span>
          <span className="sm:hidden">Back</span>
        </button>
      </div>

      {/* ── Scope + freshness ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mb-6">
        <span>Viewing: Week of {formatWeekRange(selectedOption.weeksAgo)}</span>
        <span className="text-border hidden sm:inline">·</span>
        <span>As of {format(new Date(), 'dd MMM yyyy, HH:mm')}</span>
      </div>

      {/* ── Summary stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="p-2 rounded-lg w-fit mb-3 bg-indigo-50 text-indigo-600">
            <Clock size={18} />
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Hours This Week</p>
          <p className="text-3xl font-bold text-foreground">{Number(report.totalHours).toFixed(1)}h</p>
          {report.trendVsLastWeek !== null && report.trendVsLastWeek !== undefined ? (
            <p className={`text-xs mt-1.5 flex items-center gap-1 font-medium
              ${report.trendVsLastWeek > 0 ? 'text-emerald-600' : report.trendVsLastWeek < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {report.trendVsLastWeek > 0 ? <ArrowUpRight size={12} /> : report.trendVsLastWeek < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
              {report.trendVsLastWeek > 0 ? '+' : ''}{Number(report.trendVsLastWeek).toFixed(1)}% from last week
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1.5">No prior week data</p>
          )}
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="p-2 rounded-lg w-fit mb-3 bg-emerald-50 text-emerald-600">
            <Users size={18} />
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Contributors</p>
          <p className="text-3xl font-bold text-foreground">{report.contributorsCount}</p>
          <p className="text-xs text-muted-foreground mt-1.5">Logged time this week</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="p-2 rounded-lg w-fit mb-3 bg-amber-50 text-amber-600">
            <FolderKanban size={18} />
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Project</p>
          <p className="text-lg font-bold text-foreground truncate">{report.projectName}</p>
          {report.clientName && (
            <p className="text-xs text-muted-foreground mt-1.5">{report.clientName}</p>
          )}
        </div>
      </div>

      {/* ── 6-Week Trend Chart ───────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="text-base font-semibold text-foreground">Weekly Hours Trend</h2>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">Last 6 weeks</span>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Total hours logged on this project per week</p>

        {trendChartData.every(p => p.hours === 0) ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            No hours logged in the last 6 weeks
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendChartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="projectTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false} axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                tickLine={false} axisLine={false}
                tickFormatter={v => `${v}h`}
              />
              <Tooltip content={<AreaTooltip />} />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="#6366F1"
                strokeWidth={2.5}
                fill="url(#projectTrendGradient)"
                dot={{ fill: '#6366F1', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: '#6366F1' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Contributors Table ───────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Contributors</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {report.contributors.length
              ? `${report.contributors.length} employee${report.contributors.length !== 1 ? 's' : ''} logged time this week`
              : 'No contributors for this week'}
          </p>
        </div>

        {report.contributors.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No contributors logged time on this project this week</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 sm:px-6 py-3.5 text-left font-medium text-muted-foreground">Employee</th>
                    <th className="px-4 py-3.5 text-right font-medium text-muted-foreground whitespace-nowrap">Hours Logged</th>
                    <th className="px-4 sm:px-6 py-3.5 text-right font-medium text-muted-foreground whitespace-nowrap">% Contribution</th>
                  </tr>
                </thead>
                <tbody>
                  {report.contributors.map((c, idx) => (
                    <tr key={c.employeeId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {c.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground truncate max-w-[120px] sm:max-w-none">{c.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-foreground whitespace-nowrap">
                        {Number(c.hoursLogged).toFixed(1)}h
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center justify-end gap-2 sm:gap-3">
                          <div className="w-14 sm:w-24 bg-muted rounded-full h-1.5">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(100, c.percentContribution)}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground text-xs w-10 text-right">
                            {c.percentContribution.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Hours shown are for the selected week only. All values are WORK entries.
              </p>
            </div>
          </>
        )}
      </div>

      </PageTransition>
    </Layout>
  )
}
