import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  fetchTeamLeaves, approveLeave, rejectLeave,
  selectTeamLeaves, selectLeavesLoading,
} from '../../features/leaves/leaveSlice'
import { markSectionRead } from '../../features/notifications/notificationSlice'
import Layout from '../../components/Layout'
import { EmptyState, PageHeader, SkeletonRows } from '../../components/ui'
import Modal from '../../components/Modal'
import PaginationBar from '../../components/PaginationBar'
import SortableHeader from '../../components/SortableHeader'
import { Users, CheckCircle2, XCircle } from 'lucide-react'
import { format } from 'date-fns'

const LEAVE_TYPE_BADGE = {
  SICK:     'bg-red-50 text-red-700 border border-red-200/80',
  CASUAL:   'bg-blue-50 text-blue-700 border border-blue-200/80',
  VACATION: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
}

const STATUS_BADGE = {
  PENDING:  'bg-amber-50 text-amber-700 border border-amber-200/80',
  APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200/80',
}

export default function TeamLeaves() {
  const dispatch = useDispatch()
  const leaves   = useSelector(selectTeamLeaves)
  const loading  = useSelector(selectLeavesLoading)

  const [filter,       setFilter]       = useState('ALL')
  const [rejectModal,  setRejectModal]  = useState(null)
  const [rejectNote,   setRejectNote]   = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Sorting
  const [sortBy,  setSortBy]  = useState('startDate')
  const [sortDir, setSortDir] = useState('desc')

  // Pagination
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => { dispatch(fetchTeamLeaves()) }, [dispatch])
  // '/leaves/team' badge is keyed to 'team_leaves' (TEAM_LEAVE channel — manager receives leave requests)
  useEffect(() => { dispatch(markSectionRead('TEAM_LEAVE')) }, [dispatch])

  const filtered = filter === 'ALL' ? leaves : leaves.filter(l => l.status === filter)
  const pendingCount = leaves.filter(l => l.status === 'PENDING').length

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av, bv
      if      (sortBy === 'employee')  { av = a.employeeName?.toLowerCase(); bv = b.employeeName?.toLowerCase() }
      else if (sortBy === 'startDate') { av = a.startDate; bv = b.startDate }
      else if (sortBy === 'days')      { av = a.totalDays; bv = b.totalDays }
      else if (sortBy === 'type')      { av = a.leaveType; bv = b.leaveType }
      else if (sortBy === 'status')    { av = a.status;    bv = b.status    }
      else                             { av = a.startDate; bv = b.startDate }
      if (av === bv) return 0
      const cmp = av > bv ? 1 : -1
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortBy, sortDir])

  const totalItems = sorted.length
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize)

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
    setPage(1)
  }

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
          ? `${pendingCount} pending request${pendingCount !== 1 ? 's' : ''} need${pendingCount === 1 ? 's' : ''} action`
          : `${leaves.length} total request${leaves.length !== 1 ? 's' : ''}`}
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
              filter === f
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
            {f === 'PENDING' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-400 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? <SkeletonRows rows={6} cols={5} /> : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          {totalItems === 0 ? (
            <EmptyState
              icon={Users}
              title={`No ${filter !== 'ALL' ? filter.toLowerCase() + ' ' : ''}leave requests`}
              description={filter === 'ALL' ? 'Leave requests from your team will appear here.' : `No ${filter.toLowerCase()} leave requests at this time.`}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/70">
                      <th className="table-header"><SortableHeader col="employee" label="Employee" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                      <th className="table-header"><SortableHeader col="startDate" label="Dates" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                      <th className="table-header"><SortableHeader col="days" label="Days" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                      <th className="table-header"><SortableHeader col="type" label="Type" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                      <th className="table-header hidden lg:table-cell">Reason</th>
                      <th className="table-header"><SortableHeader col="status" label="Status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((leave, idx) => (
                      <tr key={leave.id} className={`hover:bg-accent/30 transition-colors duration-100 ${idx < paginated.length - 1 ? 'border-b border-border/50' : ''}`}>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-foreground text-[13.5px] leading-tight">{leave.employeeName}</p>
                          {leave.employeeDepartment && (
                            <p className="text-[12px] text-muted-foreground mt-0.5">{leave.employeeDepartment}</p>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-foreground whitespace-nowrap">
                          {format(new Date(leave.startDate), 'MMM d')} &ndash; {format(new Date(leave.endDate), 'MMM d, yyyy')}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-muted-foreground tabular-nums">{leave.totalDays}d</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${LEAVE_TYPE_BADGE[leave.leaveType] || 'bg-muted text-muted-foreground border border-border'}`}>
                            {leave.leaveType.charAt(0) + leave.leaveType.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-muted-foreground max-w-[180px] truncate hidden lg:table-cell">
                          {leave.reason || <span className="text-muted-foreground/40 italic text-xs">No reason</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[leave.status] || ''}`}>
                            {leave.status.charAt(0) + leave.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {leave.status === 'PENDING' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleApprove(leave.id)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 size={11} /> Approve
                              </button>
                              <button
                                onClick={() => { setRejectModal(leave); setRejectNote('') }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200/80 hover:bg-red-100 transition-colors"
                              >
                                <XCircle size={11} /> Reject
                              </button>
                            </div>
                          )}
                          {leave.status === 'APPROVED' && (
                            <span className="text-[12px] text-muted-foreground">By {leave.approvedByName || 'Manager'}</span>
                          )}
                          {leave.status === 'REJECTED' && leave.rejectionReason && (
                            <p className="text-[12px] text-red-400 max-w-[130px] truncate">{leave.rejectionReason}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationBar
                page={page}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSize={(s) => { setPageSize(s); setPage(1) }}
              />
            </>
          )}
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Leave Request">
        {rejectModal && (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/60 border border-border p-4 text-sm">
              <p className="font-semibold text-foreground">{rejectModal.employeeName}</p>
              <p className="text-muted-foreground mt-0.5">
                {format(new Date(rejectModal.startDate), 'MMM d')} &ndash; {format(new Date(rejectModal.endDate), 'MMM d, yyyy')}
                &nbsp;&middot;&nbsp;{rejectModal.leaveType.charAt(0) + rejectModal.leaveType.slice(1).toLowerCase()} leave
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
              <button className="btn-danger flex-1" onClick={handleRejectSubmit} disabled={actionLoading}>
                {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
