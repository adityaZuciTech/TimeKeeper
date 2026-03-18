import { useEffect, useRef, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { applyLeave, fetchMyLeaves, fetchTeamLeaves, selectMyLeaves, selectTeamLeaves, selectLeavesLoading } from '../../features/leaves/leaveSlice'
import { fetchHolidays, selectHolidays } from '../../features/holidays/holidaySlice'
import Layout from '../../components/Layout'
import { LoadingSpinner } from '../../components/ui'
import { Plus, CalendarOff, X, Clock, CheckCircle2, XCircle, AlertCircle, AlertTriangle, Users, Thermometer, Coffee, Umbrella } from 'lucide-react'
import { format, parseISO, isAfter, startOfDay, isSameYear } from 'date-fns'

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LEAVE_TYPES = ['SICK', 'CASUAL', 'VACATION']

const BALANCE_CONFIG = {
  SICK:     { label: 'Sick Leave',     total: 12, color: '#EF4444', hex10: '#EF44441a', bg: '#FEF2F2', badge: 'bg-red-50 text-red-700 border border-red-100',          icon: Thermometer },
  CASUAL:   { label: 'Casual Leave',   total: 6,  color: '#6366F1', hex10: '#6366F11a', bg: '#EEF2FF', badge: 'bg-indigo-50 text-indigo-700 border border-indigo-100',  icon: Coffee },
  VACATION: { label: 'Vacation Leave', total: 15, color: '#10B981', hex10: '#10B9811a', bg: '#ECFDF5', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100', icon: Umbrella },
}

const STATUS_CONFIG = {
  PENDING:  { label: 'Pending',  icon: <AlertCircle size={12} />,  cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
  APPROVED: { label: 'Approved', icon: <CheckCircle2 size={12} />, cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  REJECTED: { label: 'Rejected', icon: <XCircle size={12} />,      cls: 'bg-red-50 text-red-700 border border-red-100' },
}

const REASON_TAGS = {
  SICK:     ['Feeling unwell', 'Medical appointment', 'Doctor visit', 'Recovery'],
  CASUAL:   ['Personal errand', 'Family matter', 'Emergency', 'Other'],
  VACATION: ['Annual vacation', 'Family trip', 'Travel plans', 'Rest & relaxation'],
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function countWorkingDays(start, end, holidays) {
  if (!start || !end || end < start) return 0
  const holidaySet = new Set(holidays.map(h => h.date))
  let count = 0
  const cur   = new Date(start)
  const endDt = new Date(end)
  while (cur <= endDt) {
    const dow  = cur.getDay()
    const ds   = cur.toISOString().split('T')[0]
    if (dow !== 0 && dow !== 6 && !holidaySet.has(ds)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

function findTeamConflicts(start, end, teamLeaves) {
  if (!start || !end) return []
  return teamLeaves.filter(l =>
    l.status === 'APPROVED' && l.startDate <= end && l.endDate >= start
  )
}

function findMyOverlaps(start, end, myLeaves) {
  if (!start || !end) return []
  return myLeaves.filter(l =>
    (l.status === 'PENDING' || l.status === 'APPROVED') &&
    l.startDate <= end && l.endDate >= start
  )
}

// â”€â”€â”€ Avatar initials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Avatar({ name, size = 'sm' }) {
  const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const sz = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-7 h-7 text-[10px]'
  const colors = ['bg-violet-100 text-violet-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700']
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length]
  return <span className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>{initials}</span>
}

// â”€â”€â”€ Leave Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LeaveDrawer({ open, onClose, onSave, saving, error, balances, teamLeaves, myLeaves, holidays }) {
  const today    = new Date().toISOString().split('T')[0]
  const firstRef = useRef(null)
  const [form, setForm] = useState({ startDate: '', endDate: '', leaveType: 'SICK', reason: '' })

  useEffect(() => {
    if (open) {
      setForm({ startDate: '', endDate: '', leaveType: 'SICK', reason: '' })
      const t = setTimeout(() => firstRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // â”€â”€ Live calculations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const workingDays = useMemo(() =>
    countWorkingDays(form.startDate, form.endDate, holidays)
  , [form.startDate, form.endDate, holidays])

  const calDays = useMemo(() => {
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) return 0
    return Math.round((new Date(form.endDate) - new Date(form.startDate)) / 86400000) + 1
  }, [form.startDate, form.endDate])

  const teamConflicts  = useMemo(() => findTeamConflicts(form.startDate, form.endDate, teamLeaves), [form.startDate, form.endDate, teamLeaves])
  const selfOverlaps   = useMemo(() => findMyOverlaps(form.startDate, form.endDate, myLeaves), [form.startDate, form.endDate, myLeaves])

  const activeBal      = balances.find(b => b.type === form.leaveType)
  const isLowBalance   = activeBal && workingDays > 0 && workingDays > activeBal.remaining
  const cfg            = BALANCE_CONFIG[form.leaveType]
  const tags           = REASON_TAGS[form.leaveType] ?? []

  const addTag = (tag) => setForm(f => {
    const trimmed = f.reason.trim()
    const already = trimmed.toLowerCase().includes(tag.toLowerCase())
    return { ...f, reason: already ? trimmed : (trimmed ? `${trimmed}. ${tag}` : tag) }
  })

  const balPct = activeBal ? Math.min(100, ((activeBal.used + workingDays) / activeBal.total) * 100) : 0
  const prevPct = activeBal ? Math.min(100, (activeBal.used / activeBal.total) * 100) : 0

  return (
    <>
      {/* backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-250
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col
          transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-heading font-semibold text-foreground">Request Leave</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Submit a new leave request</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* â”€â”€ Body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* â”€â”€ Leave type cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Leave Type</label>
            <div className="grid grid-cols-3 gap-2">
              {balances.map(b => {
                const c   = BALANCE_CONFIG[b.type]
                const sel = form.leaveType === b.type
                return (
                  <button
                    key={b.type}
                    onClick={() => setForm(f => ({ ...f, leaveType: b.type }))}
                    className={`rounded-xl p-3 text-left border transition-all duration-150
                      ${sel ? 'border-2 shadow-sm' : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'}`}
                    style={sel ? { borderColor: c.color, background: c.bg } : {}}
                  >
                    <c.icon size={16} className="mb-1.5" style={{ color: sel ? c.color : '#94a3b8' }} />
                    <p className={`text-[11px] font-semibold leading-tight ${sel ? '' : 'text-foreground'}`}
                       style={sel ? { color: c.color } : {}}>
                      {c.label.split(' ')[0]}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${sel ? '' : 'text-muted-foreground'}`}
                       style={{ color: sel ? c.color : undefined }}>
                      {b.remaining}/{b.total} left
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* â”€â”€ Date range â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="relative">
                <input ref={firstRef} type="date" className="input h-9 text-sm w-full"
                  value={form.startDate} min={today} onChange={set('startDate')} />
                <span className="absolute left-3 -top-2 text-[9px] text-muted-foreground bg-card px-0.5">FROM</span>
              </div>
              <div className="relative">
                <input type="date" className="input h-9 text-sm w-full"
                  value={form.endDate} min={form.startDate || today} onChange={set('endDate')} />
                <span className="absolute left-3 -top-2 text-[9px] text-muted-foreground bg-card px-0.5">TO</span>
              </div>
            </div>

            {/* Duration summary */}
            {calDays > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div className="flex-1">
                  <p className="text-[11px] text-muted-foreground">Working days requested</p>
                  <p className="text-xl font-bold font-heading text-foreground tabular-nums leading-none mt-0.5">
                    {workingDays}
                    <span className="text-sm font-normal text-muted-foreground ml-1.5">
                      of {calDays} calendar day{calDays !== 1 ? 's' : ''}
                    </span>
                  </p>
                </div>
                {calDays !== workingDays && (
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">{calDays - workingDays} weekend{(calDays - workingDays) !== 1 ? 's' : ''}/holiday{(calDays - workingDays) !== 1 ? 's' : ''}</p>
                    <p className="text-[10px] text-emerald-600 font-medium">excluded</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* â”€â”€ Balance forecast bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {activeBal && workingDays > 0 && (
            <div className="rounded-xl border px-4 py-3 space-y-2"
              style={{ borderColor: isLowBalance ? '#FCA5A5' : cfg?.color + '40', background: isLowBalance ? '#FFF1F2' : cfg?.bg }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: cfg?.color }}>{cfg?.label} Balance</span>
                <span className="text-[11px] tabular-nums font-semibold" style={{ color: isLowBalance ? '#EF4444' : cfg?.color }}>
                  {activeBal.remaining} remaining &rarr; {Math.max(0, activeBal.remaining - workingDays)} after
                </span>
              </div>
              <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
                <div className="h-full rounded-full relative" style={{ width: `${balPct}%`, background: isLowBalance ? '#EF4444' : cfg?.color }}>
                  {prevPct < balPct && (
                    <div className="absolute right-0 inset-y-0 opacity-40 rounded-r-full"
                      style={{ width: `${((balPct - prevPct) / balPct) * 100}%`, background: 'black' }} />
                  )}
                </div>
              </div>
              {isLowBalance && (
                <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle size={11} /> Insufficient balance &mdash; only {activeBal.remaining} day{activeBal.remaining !== 1 ? 's' : ''} available
                </p>
              )}
            </div>
          )}

          {/* â”€â”€ Self-overlap warning â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {selfOverlaps.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5 mb-1.5">
                <AlertTriangle size={12} /> Overlapping leave detected
              </p>
              {selfOverlaps.slice(0, 2).map(l => (
                <p key={l.id} className="text-[11px] text-amber-600">
                  &bull; {format(parseISO(l.startDate), 'MMM d')}&ndash;{format(parseISO(l.endDate), 'MMM d, yyyy')}
                  <span className="ml-1 text-amber-500">({l.status.toLowerCase()})</span>
                </p>
              ))}
            </div>
          )}

          {/* â”€â”€ Team conflicts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          {teamConflicts.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Users size={11} /> Team on leave ({teamConflicts.length})
              </label>
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 space-y-2">
                {teamConflicts.slice(0, 4).map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Avatar name={c.employeeName} size="sm" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{c.employeeName}</p>
                      {c.employeeDepartment && (
                        <p className="text-[10px] text-muted-foreground truncate">{c.employeeDepartment}</p>
                      )}
                    </div>
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                      {format(parseISO(c.startDate), 'MMM d')}&ndash;{format(parseISO(c.endDate), 'MMM d')}
                    </span>
                  </div>
                ))}
                {teamConflicts.length > 4 && (
                  <p className="text-[10px] text-muted-foreground">+{teamConflicts.length - 4} more</p>
                )}
              </div>
            </div>
          )}

          {/* â”€â”€ Reason â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Reason <span className="font-normal normal-case">(optional)</span>
            </label>
            {/* Quick tags */}
            <div className="flex gap-1.5 flex-wrap mb-2">
              {tags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-full border border-border bg-card hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-muted-foreground transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
            <textarea
              className="input text-sm min-h-[72px] resize-none"
              value={form.reason}
              onChange={set('reason')}
              placeholder="Add more context if needed..."
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex-shrink-0 border-t border-border px-5 py-4 space-y-2">
          {workingDays > 0 && (
            <p className="text-[11px] text-center text-muted-foreground mb-1">
              Requesting <span className="font-semibold text-foreground">{workingDays} working day{workingDays !== 1 ? 's' : ''}</span>
              {activeBal && !isLowBalance && <> &middot; <span className="text-emerald-600">{activeBal.remaining - workingDays} will remain</span></>}
            </p>
          )}
          <div className="flex gap-3">
            <button className="btn-secondary flex-1 h-9 text-sm" onClick={onClose} disabled={saving}>Cancel</button>
            <button
              className="btn-primary flex-1 h-9 text-sm"
              disabled={saving || selfOverlaps.length > 0}
              onClick={() => onSave(form)}
            >
              {saving ? (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Submitting...
                </span>
              ) : 'Request Leave'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// â”€â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function MyLeaves() {
  const dispatch   = useDispatch()
  const leaves     = useSelector(selectMyLeaves)
  const teamLeaves = useSelector(selectTeamLeaves)
  const holidays   = useSelector(selectHolidays)
  const loading    = useSelector(selectLeavesLoading)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [formError,  setFormError]  = useState('')

  useEffect(() => {
    dispatch(fetchMyLeaves())
    dispatch(fetchTeamLeaves())
    dispatch(fetchHolidays())
  }, [dispatch])

  // â”€â”€ Leave balances â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const balances = useMemo(() => {
    const used = { SICK: 0, CASUAL: 0, VACATION: 0 }
    leaves.forEach(l => {
      if (l.status === 'APPROVED' && isSameYear(parseISO(l.startDate), new Date())) {
        if (used[l.leaveType] !== undefined) used[l.leaveType] += l.totalDays
      }
    })
    return LEAVE_TYPES.map(type => ({
      type,
      ...BALANCE_CONFIG[type],
      used: used[type],
      remaining: Math.max(0, BALANCE_CONFIG[type].total - used[type]),
    }))
  }, [leaves])

  // â”€â”€ Upcoming holidays â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const upcomingHolidays = useMemo(() => {
    const today = startOfDay(new Date())
    return [...holidays]
      .filter(h => isAfter(parseISO(h.date), today) || startOfDay(parseISO(h.date)).getTime() === today.getTime())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5)
  }, [holidays])

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleApply = async (form) => {
    if (!form.startDate || !form.endDate) { setFormError('Start and end dates are required'); return }
    if (form.endDate < form.startDate)    { setFormError('End date must be on or after start date'); return }
    setFormError('')
    setSaving(true)
    try {
      await dispatch(applyLeave({
        startDate: form.startDate,
        endDate:   form.endDate,
        leaveType: form.leaveType,
        reason:    form.reason || null,
      })).unwrap()
      toast.success('Leave request submitted!')
      setDrawerOpen(false)
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Failed to apply leave')
    } finally {
      setSaving(false)
    }
  }

  // â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pending   = leaves.filter(l => l.status === 'PENDING').length
  const approved  = leaves.filter(l => l.status === 'APPROVED').length
  const totalUsed = leaves.filter(l => l.status === 'APPROVED').reduce((s, l) => s + l.totalDays, 0)

  return (
    <Layout>

      {/* â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground">My Leaves</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your leave requests and balances</p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => { setFormError(''); setDrawerOpen(true) }}>
          <Plus size={15} /> Apply Leave
        </button>
      </div>

      {/* â”€â”€ Summary strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: 'Pending',   value: pending,         icon: <AlertCircle size={15} />,  accent: '#F59E0B' },
          { label: 'Approved',  value: approved,        icon: <CheckCircle2 size={15} />, accent: '#10B981' },
          { label: 'Days Used', value: `${totalUsed}d`, icon: <Clock size={15} />,        accent: '#6366F1' },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <span className="p-2 rounded-xl flex-shrink-0" style={{ background: `${s.accent}1a`, color: s.accent }}>{s.icon}</span>
            <div>
              <p className="text-lg font-bold font-heading text-foreground tabular-nums leading-none">{s.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* â”€â”€ Main grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Leave history */}
        <div className="lg:col-span-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Leave History</h2>

          {loading ? (
            <div className="card flex items-center justify-center py-16"><LoadingSpinner /></div>
          ) : leaves.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <CalendarOff size={38} className="text-muted-foreground/25 mb-3" />
              <p className="font-semibold text-foreground">No leave requests yet</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Apply Leave" to submit your first request.</p>
            </div>
          ) : (
            <div className="card p-0 divide-y divide-border/60 overflow-hidden">
              {leaves.map(leave => {
                const cfg  = BALANCE_CONFIG[leave.leaveType]
                const scfg = STATUS_CONFIG[leave.status]
                return (
                  <div key={leave.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/25 transition-colors">
                    <div className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full" style={{ background: cfg?.color ?? '#CBD5E1' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          {format(parseISO(leave.startDate), 'MMM d')}
                          {leave.startDate !== leave.endDate
                            ? ` \u2013 ${format(parseISO(leave.endDate), 'MMM d, yyyy')}`
                            : `, ${format(parseISO(leave.startDate), 'yyyy')}`}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${cfg?.badge ?? ''}`}>
                          {cfg?.icon && <cfg.icon size={10} />}
                          {leave.leaveType.charAt(0) + leave.leaveType.slice(1).toLowerCase()}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">{leave.totalDays}d</span>
                      </div>
                      {leave.reason && <p className="text-xs text-muted-foreground mt-1 truncate">{leave.reason}</p>}
                      {leave.status === 'REJECTED' && leave.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1">Reason: {leave.rejectionReason}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Applied {format(parseISO(leave.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-full flex-shrink-0 ${scfg?.cls ?? ''}`}>
                      {scfg?.icon}{scfg?.label ?? leave.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">

          {/* Leave Balances */}
          <div>
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Leave Balance</h2>
            <div className="card p-5 space-y-5">
              {balances.map(b => {
                const pct = Math.min(100, (b.used / b.total) * 100)
                const c   = BALANCE_CONFIG[b.type]
                return (
                  <div key={b.type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1.5"><c.icon size={12} style={{ color: c.color }} />{b.label}</span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{b.remaining}</span> / {b.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: b.color }} />
                    </div>
                    {b.used > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">{b.used}d used this year</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Upcoming Holidays */}
          <div>
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming Holidays</h2>
            <div className="card p-0 overflow-hidden">
              {upcomingHolidays.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No upcoming holidays</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {upcomingHolidays.map(h => (
                    <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-primary uppercase leading-none">{format(parseISO(h.date), 'MMM')}</span>
                        <span className="text-sm font-bold text-primary leading-none">{format(parseISO(h.date), 'd')}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{h.name}</p>
                        <p className="text-[10px] text-muted-foreground">{format(parseISO(h.date), 'EEEE')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* â”€â”€ Apply Leave Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <LeaveDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleApply}
        saving={saving}
        error={formError}
        balances={balances}
        teamLeaves={teamLeaves}
        myLeaves={leaves}
        holidays={holidays}
      />
    </Layout>
  )
}
