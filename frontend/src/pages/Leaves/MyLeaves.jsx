import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { applyLeave, fetchMyLeaves, selectMyLeaves, selectLeavesLoading } from '../../features/leaves/leaveSlice'
import Layout from '../../components/Layout'
import { LoadingSpinner, PageHeader, StatusBadge } from '../../components/ui'
import Modal from '../../components/Modal'
import { Plus, CalendarOff } from 'lucide-react'
import { format } from 'date-fns'

const LEAVE_TYPES = ['SICK', 'CASUAL', 'VACATION']

const leaveTypeBadge = {
  SICK:     'bg-red-50 text-red-700 border border-red-100',
  CASUAL:   'bg-blue-50 text-blue-700 border border-blue-100',
  VACATION: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
}

const statusColor = {
  PENDING:  'bg-amber-50 text-amber-700 border border-amber-100',
  APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  REJECTED: 'bg-red-50 text-red-700 border border-red-100',
}

export default function MyLeaves() {
  const dispatch = useDispatch()
  const leaves   = useSelector(selectMyLeaves)
  const loading  = useSelector(selectLeavesLoading)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ startDate: '', endDate: '', leaveType: 'SICK', reason: '' })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { dispatch(fetchMyLeaves()) }, [dispatch])

  const openModal = () => {
    setForm({ startDate: '', endDate: '', leaveType: 'SICK', reason: '' })
    setFormError('')
    setShowModal(true)
  }

  const handleApply = async () => {
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
      toast.success('Leave applied successfully')
      setShowModal(false)
    } catch (err) {
      setFormError(typeof err === 'string' ? err : 'Failed to apply leave')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <PageHeader
        title="My Leaves"
        subtitle={`${leaves.length} leave request${leaves.length !== 1 ? 's' : ''}`}
        action={
          <button className="btn-primary" onClick={openModal}>
            <Plus size={16} />
            Apply Leave
          </button>
        }
      />

      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          {leaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarOff size={40} className="text-muted-foreground/30 mb-3" />
              <p className="font-heading font-semibold text-foreground">No leave requests yet</p>
              <p className="text-sm text-muted-foreground mt-1">Click "Apply Leave" to submit your first request</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Dates</th>
                    <th className="table-header">Days</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Reason</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-muted/30 transition-colors">
                      <td className="table-cell">
                        <p className="text-sm font-semibold text-foreground">
                          {format(new Date(leave.startDate), 'MMM d')} &ndash; {format(new Date(leave.endDate), 'MMM d, yyyy')}
                        </p>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-muted-foreground">{leave.totalDays}d</span>
                      </td>
                      <td className="table-cell">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${leaveTypeBadge[leave.leaveType] || ''}`}>
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                        {leave.reason || <span className="text-muted-foreground/40 italic">-</span>}
                      </td>
                      <td className="table-cell">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[leave.status] || ''}`}>
                          {leave.status}
                        </span>
                        {leave.status === 'REJECTED' && leave.rejectionReason && (
                          <p className="text-xs text-red-400 mt-0.5">{leave.rejectionReason}</p>
                        )}
                      </td>
                      <td className="table-cell text-xs text-muted-foreground">
                        {format(new Date(leave.createdAt), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Apply for Leave">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" className="input" value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                min={form.startDate || new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <div>
            <label className="label">Leave Type</label>
            <select className="input" value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })}>
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reason <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea className="input min-h-[80px] resize-none" value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder="Brief description of your leave..." />
          </div>
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary flex-1" onClick={handleApply} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}
