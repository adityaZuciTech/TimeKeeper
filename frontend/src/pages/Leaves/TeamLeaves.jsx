import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  fetchTeamLeaves, approveLeave, rejectLeave,
  selectTeamLeaves, selectLeavesLoading,
} from '../../features/leaves/leaveSlice'
import { markSectionRead } from '../../features/notifications/notificationSlice'
import Layout from '../../components/Layout'
import { LoadingSpinner, PageHeader } from '../../components/ui'
import Modal from '../../components/Modal'
import { Users } from 'lucide-react'
import { format } from 'date-fns'

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

export default function TeamLeaves() {
  const dispatch = useDispatch()
  const leaves   = useSelector(selectTeamLeaves)
  const loading  = useSelector(selectLeavesLoading)

  const [filter, setFilter] = useState('ALL')
  const [rejectModal, setRejectModal] = useState(null)  // leave object
  const [rejectNote, setRejectNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { dispatch(fetchTeamLeaves()) }, [dispatch])
  useEffect(() => { dispatch(markSectionRead('TEAM')) }, [dispatch])

  const filtered = filter === 'ALL' ? leaves : leaves.filter(l => l.status === filter)
  const pendingCount = leaves.filter(l => l.status === 'PENDING').length

  const handleApprove = async (id) => {
    try {
      setActionLoading(true)
      await dispatch(approveLeave({ id })).unwrap()
      toast.success('Leave approved')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to approve')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectSubmit = async () => {
    if (!rejectModal) return
    try {
      setActionLoading(true)
      await dispatch(rejectLeave({ id: rejectModal.id, note: rejectNote })).unwrap()
      toast.success('Leave rejected')
      setRejectModal(null)
      setRejectNote('')
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Failed to reject')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Layout>
      <PageHeader
        title="Team Leave Requests"
        subtitle={pendingCount > 0
          ? `${pendingCount} pending request${pendingCount !== 1 ? 's' : ''} need action`
          : `${leaves.length} total requests`}
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {f}
            {f === 'PENDING' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-400 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card p-0 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users size={40} className="text-muted-foreground/30 mb-3" />
              <p className="font-semibold text-foreground">No {filter !== 'ALL' ? filter.toLowerCase() : ''} leave requests</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Employee</th>
                    <th className="table-header">Dates</th>
                    <th className="table-header">Days</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Reason</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((leave) => (
                    <tr key={leave.id} className="hover:bg-muted/30 transition-colors">
                      <td className="table-cell">
                        <p className="font-semibold text-foreground text-sm">{leave.employeeName}</p>
                        {leave.employeeDepartment && (
                          <p className="text-xs text-muted-foreground">{leave.employeeDepartment}</p>
                        )}
                      </td>
                      <td className="table-cell text-sm text-foreground">
                        {format(new Date(leave.startDate), 'MMM d')} &ndash; {format(new Date(leave.endDate), 'MMM d, yyyy')}
                      </td>
                      <td className="table-cell text-sm text-muted-foreground">{leave.totalDays}d</td>
                      <td className="table-cell">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${leaveTypeBadge[leave.leaveType] || ''}`}>
                          {leave.leaveType}
                        </span>
                      </td>
                      <td className="table-cell text-sm text-muted-foreground max-w-[160px] truncate">
                        {leave.reason || <span className="text-muted-foreground/40 italic">-</span>}
                      </td>
                      <td className="table-cell">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor[leave.status] || ''}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        {leave.status === 'PENDING' && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleApprove(leave.id)}
                              disabled={actionLoading}
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => { setRejectModal(leave); setRejectNote('') }}
                              className="text-xs font-semibold text-red-500 hover:text-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {leave.status === 'APPROVED' && (
                          <span className="text-xs text-muted-foreground">By {leave.approvedByName || 'Manager'}</span>
                        )}
                        {leave.status === 'REJECTED' && leave.rejectionReason && (
                          <p className="text-xs text-red-400 max-w-[120px] truncate">{leave.rejectionReason}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Leave Request">
        {rejectModal && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 text-sm">
              <p className="font-semibold text-foreground">{rejectModal.employeeName}</p>
              <p className="text-muted-foreground mt-0.5">
                {format(new Date(rejectModal.startDate), 'MMM d')} &ndash; {format(new Date(rejectModal.endDate), 'MMM d, yyyy')} &middot; {rejectModal.leaveType}
              </p>
            </div>
            <div>
              <label className="label">Rejection Reason <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea className="input min-h-[80px] resize-none" value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Provide a reason..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-secondary flex-1" onClick={() => setRejectModal(null)} disabled={actionLoading}>Cancel</button>
              <button className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700" onClick={handleRejectSubmit} disabled={actionLoading}>
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
