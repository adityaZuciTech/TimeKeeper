import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { reportService } from '../../services/reportService'
import Layout from '../../components/Layout'
import { PageTransition } from '../../components/ui'
import SortableHeader from '../../components/SortableHeader'
import { format } from 'date-fns'
import { DATE_OPTIONS, getMondayStr, formatWeekRange, getMonday } from '../../lib/weekUtils'
import toast from 'react-hot-toast'
import {
  BarChart2, ChevronDown, Search, ArrowUpRight, ArrowDownRight,
  Minus, FolderKanban, Users, Clock,
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

function TrendBadge({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground text-sm">—</span>
  }
  const pos = value > 0
  const neg = value < 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-medium
      ${pos ? 'text-emerald-600' : neg ? 'text-red-500' : 'text-muted-foreground'}`}>
      {pos ? <ArrowUpRight size={13} /> : neg ? <ArrowDownRight size={13} /> : <Minus size={13} />}
      {pos ? '+' : ''}{Number(value).toFixed(1)}%
    </span>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, iconColor, label, value, sub }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
      <div className={`p-2 rounded-lg w-fit mb-3 ${iconColor}`}>
        <Icon size={18} />
      </div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function ProjectEffortList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialWeek = DATE_OPTIONS.find(o => o.value === searchParams.get('week'))?.value || 'this_week'
  const [selectedWeek, setSelectedWeek] = useState(initialWeek)
  const [filterOpen, setFilterOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [includeZero, setIncludeZero] = useState(false)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('hours')
  const [sortDir, setSortDir] = useState('desc')

  const filterRef = useRef(null)

  const selectedOption = DATE_OPTIONS.find(o => o.value === selectedWeek) || DATE_OPTIONS[0]
  const weekMonday = getMonday(selectedOption.weeksAgo)

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setSearchParams({ week: selectedWeek }, { replace: true })
    const load = async () => {
      setLoading(true)
      try {
        const res = await reportService.getProjectEffortList(
          getMondayStr(selectedOption.weeksAgo),
          includeZero,
        )
        setReport(res.data.data)
      } catch {
        toast.error('Failed to load project effort data')
        setReport(null)
      }
      setLoading(false)
    }
    load()
  }, [selectedWeek, includeZero]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close filter on outside click ─────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Sorting + filtering ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!report?.projects) return []
    let rows = report.projects.filter(p =>
      p.projectName.toLowerCase().includes(search.toLowerCase())
    )
    rows = [...rows].sort((a, b) => {
      let va, vb
      if (sortBy === 'name')         { va = a.projectName.toLowerCase(); vb = b.projectName.toLowerCase() }
      else if (sortBy === 'hours')   { va = Number(a.totalHours); vb = Number(b.totalHours) }
      else if (sortBy === 'pct')     { va = a.percentOfTotal; vb = b.percentOfTotal }
      else if (sortBy === 'contrib') { va = a.contributorsCount; vb = b.contributorsCount }
      else                           { va = a.trendVsLastWeek ?? -Infinity; vb = b.trendVsLastWeek ?? -Infinity }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
    })
    return rows
  }, [report, search, sortBy, sortDir])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const handleRowClick = (projectId) => {
    navigate(`/reports/project/${projectId}?week=${selectedWeek}`)
  }

  const totalHours = Number(report?.totalHours || 0)
  const projectCount = report?.projects?.filter(p => Number(p.totalHours) > 0).length ?? 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <PageTransition>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-page-title">Project Effort</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedOption.weeksAgo === 0 ? 'Week of' : `${selectedOption.label} ·`}{' '}
            {format(weekMonday, 'MMMM d, yyyy')}
            {report?.scopeLabel && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {report.scopeLabel}
              </span>
            )}
          </p>
        </div>

        {/* Week filter */}
        <div className="relative flex-shrink-0" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(v => !v)}
            className="btn-secondary gap-2 text-sm w-full sm:w-auto"
          >
            {selectedOption.label}
            <ChevronDown size={14} className={`transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-card border border-border rounded-xl shadow-lg py-1 z-30">
              {DATE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSelectedWeek(opt.value); setFilterOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors
                    ${selectedWeek === opt.value ? 'text-primary font-medium' : 'text-foreground'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Scope + freshness bar ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mb-6">
        <span>Viewing: Week of {formatWeekRange(selectedOption.weeksAgo)}</span>
        <span className="text-border hidden sm:inline">·</span>
        <span>As of {format(new Date(), 'dd MMM yyyy, HH:mm')}</span>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          icon={FolderKanban}
          iconColor="bg-indigo-50 text-indigo-600"
          label="Projects with Hours"
          value={loading ? '—' : projectCount}
          sub="Logged this week"
        />
        <StatCard
          icon={Clock}
          iconColor="bg-emerald-50 text-emerald-600"
          label="Total Hours"
          value={loading ? '—' : `${totalHours.toFixed(0)}h`}
          sub={report?.scopeLabel || 'All projects'}
        />
        <StatCard
          icon={Users}
          iconColor="bg-amber-50 text-amber-600"
          label="Total Contributors"
          value={loading ? '—' : (report?.projects?.reduce((s, p) => s + p.contributorsCount, 0) ?? 0)}
          sub="Unique employees"
        />
      </div>

      {/* ── Search + toggle bar ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none flex-shrink-0">
          <input
            type="checkbox"
            checked={includeZero}
            onChange={e => setIncludeZero(e.target.checked)}
            className="rounded"
          />
          Show zero-hour projects
        </label>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <SortableHeader col="name"    active={sortBy} dir={sortDir} onToggle={toggleSort} className="px-5 py-3.5 text-left">Project Name</SortableHeader>
                <th className="px-4 py-3.5 text-left font-medium text-muted-foreground whitespace-nowrap">Status</th>
                <SortableHeader col="hours"   active={sortBy} dir={sortDir} onToggle={toggleSort} className="px-4 py-3.5 text-right whitespace-nowrap">Total Hours</SortableHeader>
                <SortableHeader col="pct"     active={sortBy} dir={sortDir} onToggle={toggleSort} className="px-4 py-3.5 text-right whitespace-nowrap hidden md:table-cell">% of Total</SortableHeader>
                <SortableHeader col="contrib" active={sortBy} dir={sortDir} onToggle={toggleSort} className="px-4 py-3.5 text-right whitespace-nowrap hidden sm:table-cell">Contributors</SortableHeader>
                <SortableHeader col="trend"   active={sortBy} dir={sortDir} onToggle={toggleSort} className="px-4 py-3.5 text-right whitespace-nowrap hidden lg:table-cell">vs Last Week</SortableHeader>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 px-4">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                        <BarChart2 size={24} className="text-muted-foreground/50" />
                      </div>
                      <p className="text-[15px] font-semibold text-foreground">No projects found</p>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        {search
                          ? `No projects match "${search}". Try a different search term.`
                          : `No projects logged hours for the week of ${formatWeekRange(selectedOption.weeksAgo)}.`}
                      </p>
                      {search && (
                        <button
                          onClick={() => setSearch('')}
                          className="text-sm text-primary hover:underline mt-1"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr
                    key={p.projectId}
                    onClick={() => handleRowClick(p.projectId)}
                    className="border-b border-border last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <FolderKanban size={15} className="text-primary/60 flex-shrink-0" />
                        <span className="font-medium text-foreground truncate max-w-[180px] sm:max-w-none">{p.projectName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(p.status)}`}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-foreground whitespace-nowrap">
                      {Number(p.totalHours).toFixed(1)}h
                    </td>
                    <td className="px-4 py-4 text-right hidden md:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, p.percentOfTotal)}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground text-xs w-10 text-right">
                          {p.percentOfTotal.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-foreground hidden sm:table-cell">
                      {p.contributorsCount}
                    </td>
                    <td className="px-4 py-4 text-right hidden lg:table-cell">
                      <TrendBadge value={p.trendVsLastWeek} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <p className="text-xs text-muted-foreground">
              {filtered.length} project{filtered.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
            </p>
            <p className="text-xs text-muted-foreground">
              Click a project to view contributor breakdown
            </p>
          </div>
        )}
      </div>

      </PageTransition>
    </Layout>
  )
}
