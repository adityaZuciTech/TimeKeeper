import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSelector as useReduxSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  fetchHolidays, createHoliday, deleteHoliday,
  selectHolidays, selectHolidaysLoading,
} from '../../features/holidays/holidaySlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import Layout from '../../components/Layout'
import { LoadingSpinner, PageHeader } from '../../components/ui'
import Modal from '../../components/Modal'
import { Plus, Trash2, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Holidays() {
  const dispatch  = useDispatch()
  const holidays  = useSelector(selectHolidays)
  const loading   = useSelector(selectHolidaysLoading)
  const user      = useSelector(selectCurrentUser)
  const isAdmin   = user?.role === 'ADMIN'

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', date: '', description: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { dispatch(fetchHolidays()) }, [dispatch])

  const openModal = () => {
    setForm({ name: '', date: '', description: '' })
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
        name:        form.name.trim(),
        date:        form.date,
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

  // Group holidays by month for display
  const grouped = holidays.reduce((acc, h) => {
    const month = new Date(h.date).getMonth()
    if (!acc[month]) acc[month] = []
    acc[month].push(h)
    return acc
  }, {})

  return (
    <Layout>
      <PageHeader
        title="Company Holidays"
        subtitle={`${holidays.length} holiday${holidays.length !== 1 ? 's' : ''} declared`}
        action={isAdmin ? (
          <button className="btn-primary" onClick={openModal}>
            <Plus size={16} />
            Add Holiday
          </button>
        ) : null}
      />

      {loading ? <LoadingSpinner /> : (
        holidays.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <CalendarDays size={40} className="text-muted-foreground/30 mb-3" />
            <p className="font-heading font-semibold text-foreground">No holidays declared yet</p>
            {isAdmin && <p className="text-sm text-muted-foreground mt-1">Click "Add Holiday" to declare company holidays</p>}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(grouped).sort((a, b) => a - b).map(monthIdx => (
              <div key={monthIdx}>
                <h3 className="text-xs font-heading font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">
                  {MONTH_NAMES[monthIdx]}
                </h3>
                <div className="card p-0 overflow-hidden divide-y divide-gray-50">
                  {grouped[monthIdx].map(holiday => (
                    <div key={holiday.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* date chip */}
                        <div className="flex-shrink-0 w-12 text-center">
                          <p className="text-xs text-muted-foreground font-medium uppercase">{MONTH_NAMES[new Date(holiday.date).getMonth()]}</p>
                          <p className="text-xl font-bold text-foreground leading-tight">{new Date(holiday.date).getDate()}</p>
                        </div>
                        <div className="w-px h-10 bg-border" />
                        <div>
                          <p className="font-heading font-semibold text-foreground">{holiday.name}</p>
                          {holiday.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{holiday.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground/60 mt-0.5">
                            {format(new Date(holiday.date), 'EEEE, MMMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(holiday.id, holiday.name)}
                          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete holiday"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add Holiday Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Company Holiday">
        <div className="space-y-4">
          <div>
            <label className="label">Holiday Name</label>
            <input className="input" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. New Year's Day" />
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="label">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <input className="input" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. National public holiday" />
          </div>
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleCreate} disabled={saving}>
              {saving ? 'Saving...' : 'Add Holiday'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
