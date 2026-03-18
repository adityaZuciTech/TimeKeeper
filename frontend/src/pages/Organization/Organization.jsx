import { useEffect, useState, useRef } from 'react'
import { reportService } from '../../services/reportService'
import Layout from '../../components/Layout'
import { LoadingSpinner } from '../../components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import {
  Building2, Users, Clock, Activity, ChevronDown, ChevronUp,
  Send, Download, FileText, AlertTriangle, Zap, ArrowUpRight,
  ArrowDownRight, Minus, BarChart2, Lightbulb, Target,
} from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const DATE_OPTIONS = [
  { label: 'This Week',   value: 'this_week',    weeksAgo: 0 },
  { label: 'Last Week',   value: 'last_week',    weeksAgo: 1 },
  { label: '2 Weeks Ago', value: 'two_weeks',    weeksAgo: 2 },
  { label: '3 Weeks Ago', value: 'three_weeks',  weeksAgo: 3 },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getMonday(weeksAgo = 0) {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today)
  monday.setDate(diff - weeksAgo * 7)
  return monday
}

function getMondayStr(weeksAgo = 0) {
  return format(getMonday(weeksAgo), 'yyyy-MM-dd')
}

function calcUtil(dept) {
  if (!dept.employeeCount) return 0
  return Math.min(100, (Number(dept.totalHours) / (dept.employeeCount * 40)) * 100)
}

function utilBadge(pct) {
  if (pct >= 80) return { label: 'High',     cls: 'bg-emerald-100 text-emerald-700' }
  if (pct >= 50) return { label: 'Moderate', cls: 'bg-amber-100  text-amber-700'   }
  return             { label: 'Low',      cls: 'bg-red-100    text-red-600'      }
}

// ─── SparkLine ─────────────────────────────────────────────────────────────────
function SparkLine({ data, color }) {
  if (!data || data.length < 2) return null
  const chartData = data.map((v, i) => ({ i, v }))
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── StatCardPremium ───────────────────────────────────────────────────────────
function StatCardPremium({ title, value, subtitle, trend, sparkData, icon: Icon, iconColor }) {
  const pos = trend > 0
  const neg = trend < 0
  const sparkColor = pos ? '#10B981' : neg ? '#EF4444' : '#6366F1'
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon size={18} />
        </div>
        {sparkData && <SparkLine data={sparkData} color={sparkColor} />}
      </div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
      <p className="text-3xl font-heading font-bold text-foreground">{value}</p>
      {trend !== undefined && trend !== null ? (
        <p className={`text-xs mt-1.5 flex items-center gap-1 font-medium
          ${pos ? 'text-emerald-600' : neg ? 'text-red-500' : 'text-muted-foreground'}`}>
          {pos ? <ArrowUpRight size={12} /> : neg ? <ArrowDownRight size={12} /> : <Minus size={12} />}
          {pos ? '+' : ''}{Number(trend).toFixed(1)}% from last week
        </p>
      ) : subtitle ? (
        <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
      ) : null}
    </div>
  )
}

// ─── Tooltips ──────────────────────────────────────────────────────────────────
function AreaTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-medium text-foreground mb-0.5">{label}</p>
      <p className="text-primary font-bold">{payload[0]?.value}h logged</p>
    </div>
  )
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-medium text-foreground">{payload[0]?.name}</p>
      <p className="font-bold" style={{ color: payload[0]?.payload?.color }}>{payload[0]?.value}h</p>
    </div>
  )
}

// ─── InsightItem ───────────────────────────────────────────────────────────────
function InsightItem({ icon: Icon, iconBg, text, highlight }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className={`p-1.5 rounded-md mt-0.5 flex-shrink-0 ${iconBg}`}>
        <Icon size={14} />
      </div>
      <p className="text-sm text-foreground leading-relaxed">
        {text}{highlight && <span className="font-semibold"> {highlight}</span>}
      </p>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function Organization() {
  const [dateRange, setDateRange]       = useState('this_week')
  const [departments, setDepartments]   = useState([])
  const [trendData, setTrendData]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [sortBy, setSortBy]             = useState('hours')
  const [sortDir, setSortDir]           = useState('desc')
  const [actionsOpen, setActionsOpen]   = useState(false)
  const [filterOpen, setFilterOpen]     = useState(false)
  const [reminderSending, setReminderSending] = useState(false)

  const actionsRef = useRef(null)
  const filterRef  = useRef(null)

  const selectedOption = DATE_OPTIONS.find(o => o.value === dateRange) || DATE_OPTIONS[0]
  const weekMonday     = getMonday(selectedOption.weeksAgo)

  // ── Load departments for selected week ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await reportService.getDepartmentUtilization(getMondayStr(selectedOption.weeksAgo))
        setDepartments(res.data.data || [])
      } catch { /* */ }
      setLoading(false)
    }
    load()
  }, [dateRange]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load 6-week trend (once on mount) ───────────────────────────────────────
  useEffect(() => {
    const loadTrend = async () => {
      try {
        const weeks = [5, 4, 3, 2, 1, 0]
        const results = await Promise.all(
          weeks.map(w => reportService.getDepartmentUtilization(getMondayStr(w)).catch(() => null))
        )
        const data = results.map((res, i) => {
          const depts = res?.data?.data || []
          const hours = depts.reduce((acc, d) => acc + Number(d.totalHours || 0), 0)
          return { label: format(getMonday(weeks[i]), 'MMM d'), hours: Math.round(hours) }
        })
        setTrendData(data)
      } catch { /* */ }
    }
    loadTrend()
  }, [])

  // ── Close dropdowns on outside click ────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target)) setActionsOpen(false)
      if (filterRef.current  && !filterRef.current.contains(e.target))  setFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalHours     = departments.reduce((acc, d) => acc + Number(d.totalHours || 0), 0)
  const totalEmployees = departments.reduce((acc, d) => acc + (d.employeeCount || 0), 0)
  const avgUtil        = departments.length > 0
    ? departments.reduce((acc, d) => acc + calcUtil(d), 0) / departments.length
    : 0

  const curHours   = trendData[5]?.hours ?? 0
  const prevHours  = trendData[4]?.hours ?? 0
  const hoursTrend = prevHours > 0 ? ((curHours - prevHours) / prevHours * 100) : null
  const sparkHours = trendData.map(d => d.hours)

  // ── Stable color assignment per department ───────────────────────────────────
  const deptWithColor = departments.map((d, i) => ({ ...d, color: CHART_COLORS[i % CHART_COLORS.length] }))

  // ── Sorted table rows ────────────────────────────────────────────────────────
  const sortedDepts = [...deptWithColor].sort((a, b) => {
    let aVal, bVal
    if      (sortBy === 'hours')       { aVal = Number(a.totalHours); bVal = Number(b.totalHours) }
    else if (sortBy === 'utilization') { aVal = calcUtil(a);          bVal = calcUtil(b)           }
    else if (sortBy === 'employees')   { aVal = a.employeeCount;      bVal = b.employeeCount       }
    else                               { aVal = a.departmentName;     bVal = b.departmentName      }
    if (aVal === bVal) return 0
    return sortDir === 'desc' ? (bVal > aVal ? 1 : -1) : (aVal > bVal ? 1 : -1)
  })

  // ── Donut data ───────────────────────────────────────────────────────────────
  const donutData = deptWithColor
    .filter(d => Number(d.totalHours) > 0)
    .map(d => ({ name: d.departmentName, value: Math.round(Number(d.totalHours)), color: d.color }))

  // ── Insights ─────────────────────────────────────────────────────────────────
  const bestDept  = deptWithColor.length > 0 ? deptWithColor.reduce((a, b) => calcUtil(a) >= calcUtil(b) ? a : b) : null
  const worstDept = deptWithColor.length > 1 ? deptWithColor.reduce((a, b) => calcUtil(a) <= calcUtil(b) ? a : b) : null
  const zeroDepts = deptWithColor.filter(d => Number(d.totalHours) === 0)

  const insights = [
    bestDept && {
      icon: Zap, iconBg: 'bg-amber-100 text-amber-600',
      text: 'Top performing department:',
      highlight: `${bestDept.departmentName} (${calcUtil(bestDept).toFixed(0)}% utilization)`,
    },
    worstDept && calcUtil(worstDept) < 50 && {
      icon: AlertTriangle, iconBg: 'bg-red-100 text-red-600',
      text: 'Low utilization alert:',
      highlight: `${worstDept.departmentName} at ${calcUtil(worstDept).toFixed(0)}%`,
    },
    zeroDepts.length > 0 && {
      icon: AlertTriangle, iconBg: 'bg-orange-100 text-orange-600',
      text: `${zeroDepts.map(d => d.departmentName).join(', ')} ${zeroDepts.length > 1 ? 'have' : 'has'} no hours logged this week.`,
      highlight: null,
    },
    {
      icon: BarChart2, iconBg: 'bg-primary/10 text-primary',
      text: 'Organization-wide utilization is at',
      highlight: `${avgUtil.toFixed(0)}% this week`,
    },
    {
      icon: Target, iconBg: 'bg-emerald-100 text-emerald-600',
      text: `${totalEmployees} employees tracked across ${departments.length} departments.`,
      highlight: null,
    },
  ].filter(Boolean)

  // ── Actions ───────────────────────────────────────────────────────────────────
  const handleSendReminders = async () => {
    setReminderSending(true)
    try {
      await reportService.triggerTimesheetReminders()
      toast.success('Timesheet reminders sent!')
    } catch {
      toast.error('Failed to send reminders')
    } finally {
      setReminderSending(false)
    }
    setActionsOpen(false)
  }

  const handleExportCSV = () => {
    const headers = ['Department', 'Employees', 'Total Hours', 'Avg Hours/Employee', 'Utilization %']
    const rows = sortedDepts.map(d => {
      const avg  = d.employeeCount > 0 ? (Number(d.totalHours) / d.employeeCount).toFixed(1) : '0.0'
      const util = calcUtil(d).toFixed(0)
      return [d.departmentName, d.employeeCount, Number(d.totalHours || 0).toFixed(0), avg, util].join(',')
    })
    const csv  = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `timekeeper-org-${selectedOption.label.replace(/\s+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
    setActionsOpen(false)
  }

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const getSortIcon = (col) => {
    if (sortBy !== col) return <ChevronDown size={12} className="text-muted-foreground/40" />
    return sortDir === 'desc'
      ? <ChevronDown size={12} className="text-primary" />
      : <ChevronUp   size={12} className="text-primary" />
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <Layout>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">
            Organization Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedOption.weeksAgo === 0 ? 'Week of' : `${selectedOption.label} •`}{' '}
            {format(weekMonday, 'MMMM d, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date filter */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen(v => !v)}
              className="btn-secondary gap-2 text-sm"
            >
              {selectedOption.label}
              <ChevronDown size={14} className={`transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-card border border-border rounded-xl shadow-lg py-1 z-30">
                {DATE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setDateRange(opt.value); setFilterOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors
                      ${dateRange === opt.value ? 'text-primary font-medium' : 'text-foreground'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions dropdown */}
          <div className="relative" ref={actionsRef}>
            <button
              onClick={() => setActionsOpen(v => !v)}
              className="btn-primary gap-2"
            >
              Actions
              <ChevronDown size={14} className={`transition-transform duration-200 ${actionsOpen ? 'rotate-180' : ''}`} />
            </button>
            {actionsOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-lg py-1 z-30">
                <button
                  onClick={handleSendReminders}
                  disabled={reminderSending}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  <Send size={14} className="text-primary" />
                  {reminderSending ? 'Sending…' : 'Send Reminders'}
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3"
                >
                  <Download size={14} className="text-muted-foreground" />
                  Download CSV
                </button>
                <div className="border-t border-border my-1" />
                <button
                  onClick={() => { toast('PDF export coming soon'); setActionsOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3 text-muted-foreground"
                >
                  <FileText size={14} />
                  Export PDF Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 1: Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCardPremium
          title="Departments"
          value={loading ? '—' : departments.length}
          subtitle="Active departments"
          icon={Building2}
          iconColor="bg-primary/10 text-primary"
        />
        <StatCardPremium
          title="Total Employees"
          value={loading ? '—' : totalEmployees}
          subtitle="Tracked this period"
          icon={Users}
          iconColor="bg-emerald-100 text-emerald-600"
        />
        <StatCardPremium
          title="Hours This Week"
          value={loading ? '—' : `${totalHours.toFixed(0)}h`}
          trend={dateRange === 'this_week' ? hoursTrend : null}
          sparkData={sparkHours.length >= 2 ? sparkHours : null}
          icon={Clock}
          iconColor="bg-amber-100 text-amber-600"
        />
        <StatCardPremium
          title="Avg Utilization"
          value={loading ? '—' : `${avgUtil.toFixed(0)}%`}
          subtitle={
            loading ? undefined
            : avgUtil >= 80 ? 'Excellent performance'
            : avgUtil >= 50 ? 'Moderate performance'
            : 'Needs attention'
          }
          icon={Activity}
          iconColor={
            loading         ? 'bg-muted text-muted-foreground'
            : avgUtil >= 80 ? 'bg-emerald-100 text-emerald-600'
            : avgUtil >= 50 ? 'bg-amber-100 text-amber-700'
            :                 'bg-red-100 text-red-600'
          }
        />
      </div>

      {/* ── Rows 2 & 3 ─────────────────────────────────────────────────────── */}
      {loading ? <LoadingSpinner /> : (
        <>
          {/* Row 2: Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            {/* Area chart — weekly trend */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-heading font-semibold text-foreground">Weekly Hours Trend</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Total hours logged across all departments</p>
                </div>
                <span className="px-3 py-1.5 bg-primary/10 rounded-lg text-xs font-medium text-primary">
                  Last 6 weeks
                </span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 89%)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(215 14% 46%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(215 14% 46%)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<AreaTooltip />} />
                  <Area
                    type="monotone" dataKey="hours"
                    stroke="#6366F1" strokeWidth={2}
                    fill="url(#hoursGrad)"
                    dot={{ r: 3, fill: '#6366F1', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Donut — department distribution */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <h2 className="text-base font-heading font-semibold text-foreground mb-0.5">Department Distribution</h2>
              <p className="text-xs text-muted-foreground mb-4">Hours by department</p>

              {donutData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                  No hours logged this week
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={donutData} cx="50%" cy="50%"
                        innerRadius={45} outerRadius={72}
                        dataKey="value" paddingAngle={3}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-2 mt-2">
                    {donutData.map((d) => {
                      const total = donutData.reduce((a, b) => a + b.value, 0)
                      const pct   = total > 0 ? ((d.value / total) * 100).toFixed(0) : 0
                      return (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                            <span className="text-foreground truncate max-w-[110px]">{d.name}</span>
                          </div>
                          <span className="text-muted-foreground font-medium tabular-nums">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Row 3: Insights + Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Insights panel */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-amber-100 rounded-lg">
                  <Lightbulb size={15} className="text-amber-600" />
                </div>
                <h2 className="text-base font-heading font-semibold text-foreground">Insights</h2>
              </div>
              {insights.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data available.</p>
              ) : (
                <div>
                  {insights.map((ins, i) => <InsightItem key={i} {...ins} />)}
                </div>
              )}
            </div>

            {/* Department table */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-heading font-semibold text-foreground">Department Utilization</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Click column headers to sort</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        { col: 'name',        label: 'Department' },
                        { col: 'employees',   label: 'Employees'  },
                        { col: 'hours',       label: 'Hours'      },
                        { col: null,          label: 'Avg/Emp',    hidden: true },
                        { col: 'utilization', label: 'Utilization' },
                      ].map(({ col, label, hidden }) => (
                        <th
                          key={label}
                          className={`text-left pb-3 pr-4 text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider ${hidden ? 'hidden md:table-cell' : ''}`}
                        >
                          {col ? (
                            <button
                              onClick={() => toggleSort(col)}
                              className="flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              {label} {getSortIcon(col)}
                            </button>
                          ) : label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDepts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          No department data for this period.
                        </td>
                      </tr>
                    ) : sortedDepts.map((dept, idx) => {
                      const avg  = dept.employeeCount > 0
                        ? (Number(dept.totalHours) / dept.employeeCount).toFixed(1) : '0.0'
                      const util  = calcUtil(dept)
                      const badge = utilBadge(util)

                      return (
                        <tr
                          key={dept.departmentId}
                          className={`hover:bg-muted/30 transition-colors ${idx < sortedDepts.length - 1 ? 'border-b border-border/60' : ''}`}
                        >
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dept.color }} />
                              <span className="font-medium text-sm text-foreground">{dept.departmentName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-sm text-muted-foreground">{dept.employeeCount}</td>
                          <td className="py-3.5 pr-4 text-sm font-medium text-foreground tabular-nums">
                            {Number(dept.totalHours || 0).toFixed(0)}h
                          </td>
                          <td className="py-3.5 pr-4 text-sm text-muted-foreground tabular-nums hidden md:table-cell">
                            {avg}h
                          </td>
                          <td className="py-3.5">
                            <div className="flex items-center gap-3 min-w-[140px]">
                              <div className="flex-1 bg-muted rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full transition-all duration-500"
                                  style={{
                                    width: `${util}%`,
                                    background: util >= 80 ? '#10B981' : util >= 50 ? '#F59E0B' : '#EF4444',
                                  }}
                                />
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${badge.cls}`}>
                                {badge.label}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
