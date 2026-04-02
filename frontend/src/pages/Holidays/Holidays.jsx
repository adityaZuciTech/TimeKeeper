import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  fetchHolidays, createHoliday, deleteHoliday,
  selectHolidays, selectHolidaysLoading,
} from '../../features/holidays/holidaySlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import Layout from '../../components/Layout'
import { EmptyState, SkeletonRows, PageTransition } from '../../components/ui'
import Modal from '../../components/Modal'
import {
  Plus, CalendarDays, MoreVertical, Trash2,
  ChevronRight, Clock, MapPin, Sparkles,
} from 'lucide-react'
import { format, parseISO, isAfter, isSameMonth, differenceInCalendarDays } from 'date-fns'

// ─── type inference ───────────────────────────────────────────────────────────

const TYPE_KEYWORDS = {
  NATIONAL:  ['republic', 'independence', 'national', 'gandhi', 'constitution', 'army', 'labour', 'may day'],
  FESTIVAL:  ['diwali', 'holi', 'christmas', 'eid', 'dussehra', 'navratri', 'pongal', 'onam', 'baisakhi',
              'guru nanak', 'shivratri', 'ram navami', 'janmashtami', 'raksha', 'durga', 'muharram',
              'good friday', 'easter', 'new year', 'lohri', 'makar'],
  OPTIONAL:  ['optional', 'regional', 'bank', 'restricted'],
  COMPANY:   ['company', 'team', 'founder', 'annual', 'offsite', 'welcome'],
}

function inferType(name) {
  const lower = name.toLowerCase()
  for (const [type, kws] of Object.entries(TYPE_KEYWORDS)) {
    if (kws.some(kw => lower.includes(kw))) return type
  }
  return 'NATIONAL'
}

const TYPE_CFG = {
  NATIONAL: {
    label: 'National',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    dateBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    accent: 'border-l-blue-500',
  },
  FESTIVAL: {
    label: 'Festival',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    dateBg: 'bg-gradient-to-br from-purple-500 to-violet-600',
    accent: 'border-l-purple-500',
  },
  OPTIONAL: {
    label: 'Optional',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dateBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    accent: 'border-l-amber-500',
  },
  COMPANY: {
    label: 'Company',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dateBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    accent: 'border-l-emerald-500',
  },
}

const FULL_MONTHS = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

// ─── helpers ──────────────────────────────────────────────────────────────────

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => { if (!ref.current || ref.current.contains(e.target)) return; handler() }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}

// ─── sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const cfg = TYPE_CFG[type] || TYPE_CFG.NATIONAL
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.badge}`}>
      {cfg.label}
    </span>
  )
}

function DateBadge({ date, type }) {
  const cfg = TYPE_CFG[type] || TYPE_CFG.NATIONAL
  const d = parseISO(date)
  return (
    <div className={`flex-shrink-0 w-14 h-14 rounded-2xl ${cfg.dateBg} flex flex-col items-center justify-center shadow-sm`}>
      <span className="text-[10px] font-semibold text-white/80 uppercase tracking-widest leading-none">
        {format(d, 'MMM')}
      </span>
      <span className="text-2xl font-bold text-white leading-tight">
        {format(d, 'd')}
      </span>
    </div>
  )
}

function ActionMenu({ onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden py-1">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={13} />
            Delete Holiday
          </button>
        </div>
      )}
    </div>
  )
}

function HolidayCard({ holiday, isAdmin, onDelete }) {
  const type     = inferType(holiday.name)
  const cfg      = TYPE_CFG[type]
  const d        = parseISO(holiday.date)
  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const diff     = differenceInCalendarDays(d, today)
  const isPast   = diff < 0
  const isToday  = diff === 0

  return (
    <div className={`group relative bg-card rounded-xl border border-border border-l-4 ${cfg.accent} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-4 flex items-center gap-4 ${isPast ? 'opacity-60' : ''}`}>
      <DateBadge date={holiday.date} type={type} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-semibold text-foreground text-sm">{holiday.name}</p>
          <TypeBadge type={type} />
          {isToday && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
              <Sparkles size={9} />
              Today
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{format(d, 'EEEE, MMMM d, yyyy')}</p>
        {holiday.description && (
          <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{holiday.description}</p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {!isPast && diff > 0 && diff <= 30 && (
          <span className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            <Clock size={10} />
            {diff === 1 ? 'Tomorrow' : `In ${diff}d`}
          </span>
        )}
        {isAdmin && <ActionMenu onDelete={onDelete} />}
      </div>
    </div>
  )
}

function NextHolidayCard({ holiday }) {
  if (!holiday) return null
  const type  = inferType(holiday.name)
  const cfg   = TYPE_CFG[type]
  const d     = parseISO(holiday.date)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff  = differenceInCalendarDays(d, today)

  return (
    <div className={`relative bg-card rounded-xl border border-border overflow-hidden shadow-sm`}>
      <div className={`absolute inset-0 ${cfg.dateBg} opacity-5 pointer-events-none`} />
      <div className="relative p-4 flex items-center gap-4">
        <DateBadge date={holiday.date} type={type} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Next Holiday</p>
          <p className="font-semibold text-foreground text-sm truncate">{holiday.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{format(d, 'EEEE, MMM d')}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-foreground">{diff === 0 ? 'Today' : diff}</p>
          {diff > 0 && <p className="text-[10px] text-muted-foreground">days away</p>}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, Icon, iconCls }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${iconCls}`}>
        <Icon size={15} />
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-foreground font-medium">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function Holidays() {
  const dispatch = useDispatch()
  const holidays = useSelector(selectHolidays)
  const loading  = useSelector(selectHolidaysLoading)
  const user     = useSelector(selectCurrentUser)
  const isAdmin  = user?.role === 'ADMIN'

  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState({ name: '', date: '', description: '', type: 'NATIONAL' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => { dispatch(fetchHolidays()) }, [dispatch])

  const openModal = () => {
    setForm({ name: '', date: '', description: '', type: 'NATIONAL' })
    setFormError('')
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError('Holiday name is required'); return }
    if (!form.date)        { setFormError('Date is required'); return }
    setFormError('')
    setSaving(true)
    try {
      await dispatch(createHoliday({
        name: form.name.trim(),
        date: form.date,
        description: form.description || null,
      })).unwrap()
      toast.success('Holiday added')
      setShowModal(false)
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Failed to create holiday')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await dispatch(deleteHoliday(id)).unwrap()
      toast.success('Holiday deleted')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to delete')
    }
  }

  // derived stats
  const today      = new Date(); today.setHours(0, 0, 0, 0)
  const sorted     = [...holidays].sort((a, b) => new Date(a.date) - new Date(b.date))
  const nextHol    = sorted.find(h => differenceInCalendarDays(parseISO(h.date), today) >= 0)
  const thisMonth  = holidays.filter(h => isSameMonth(parseISO(h.date), today)).length
  const thisYear   = holidays.filter(h => parseISO(h.date).getFullYear() === today.getFullYear()).length

  // group by month
  const grouped = sorted.reduce((acc, h) => {
    const month = parseISO(h.date).getMonth()
    if (!acc[month]) acc[month] = []
    acc[month].push(h)
    return acc
  }, {})

  return (
    <Layout>
      <PageTransition>
      {/* page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-page-title">Company Holidays</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {holidays.length} holiday{holidays.length !== 1 ? 's' : ''} declared this year
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary flex-shrink-0 flex items-center gap-2" onClick={openModal}>
            <Plus size={15} />
            Add Holiday
          </button>
        )}
      </div>

      {loading ? <SkeletonRows rows={7} cols={4} /> : (
        holidays.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No holidays declared yet"
            description={isAdmin ? 'Click \"Add Holiday\" to get started' : 'No holidays have been added for this year.'}
            action={isAdmin ? <button className="btn-primary flex items-center gap-2" onClick={openModal}><Plus size={14} /> Add Holiday</button> : undefined}
          />
        ) : (
          <>
            {/* summary strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="sm:col-span-1">
                <NextHolidayCard holiday={nextHol} />
              </div>
              <StatCard
                label="This month" value={thisMonth}
                sub={FULL_MONTHS[today.getMonth()]}
                Icon={MapPin} iconCls="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="This year" value={thisYear}
                sub={`${today.getFullYear()} total`}
                Icon={CalendarDays} iconCls="bg-purple-50 text-purple-600"
              />
            </div>

            {/* type legend */}
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mr-1">Type:</span>
              {Object.entries(TYPE_CFG).map(([key, cfg]) => (
                <span key={key} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.badge}`}>
                  {cfg.label}
                </span>
              ))}
            </div>

            {/* grouped list */}
            <div className="space-y-7">
              {Object.keys(grouped).sort((a, b) => a - b).map(monthIdx => (
                <div key={monthIdx}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {FULL_MONTHS[monthIdx]}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 font-medium">
                      {grouped[monthIdx].length} holiday{grouped[monthIdx].length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-2.5">
                    {grouped[monthIdx].map(h => (
                      <HolidayCard
                        key={h.id}
                        holiday={h}
                        isAdmin={isAdmin}
                        onDelete={() => handleDelete(h.id, h.name)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      )}

      {/* Add Holiday Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Company Holiday">
        <div className="space-y-4">
          <div>
            <label className="label">Holiday Name</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Republic Day"
            />
          </div>
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TYPE_CFG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm({ ...form, type: key })}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    form.type === key
                      ? `${cfg.badge} border-current`
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cfg.dateBg}`} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">
              Description
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            </label>
            <input
              className="input"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. National public holiday"
            />
          </div>
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary flex-1" onClick={handleCreate} disabled={saving}>
              {saving ? 'Saving...' : 'Add Holiday'}
            </button>
          </div>
        </div>
      </Modal>
      </PageTransition>
    </Layout>
  )
}
