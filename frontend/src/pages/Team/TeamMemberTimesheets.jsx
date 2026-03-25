import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { employeeService } from '../../services/employeeService'
import Layout from '../../components/Layout'
import { StatusBadge, SkeletonRows, EmptyState } from '../../components/ui'
import PaginationBar from '../../components/PaginationBar'
import SortableHeader from '../../components/SortableHeader'
import { FileText, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

export default function TeamMemberTimesheets() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const [timesheets, setTimesheets] = useState([])
  const [employee,  setEmployee]  = useState(null)
  const [loading,   setLoading]   = useState(true)

  const [sortBy,  setSortBy]  = useState('weekStartDate')
  const [sortDir, setSortDir] = useState('desc')
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [empRes, tsRes] = await Promise.all([
          employeeService.getById(employeeId),
          employeeService.getTimesheets(employeeId),
        ])
        setEmployee(empRes.data.data)
        setTimesheets(tsRes.data.data.timesheets || [])
      } catch (e) { /* */ }
      setLoading(false)
    }
    load()
  }, [employeeId])

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
    setPage(1)
  }

  const sorted = useMemo(() => {
    return [...timesheets].sort((a, b) => {
      let av, bv
      if      (sortBy === 'weekStartDate') { av = a.weekStartDate; bv = b.weekStartDate }
      else if (sortBy === 'totalHours')    { av = Number(a.totalHours || 0); bv = Number(b.totalHours || 0) }
      else if (sortBy === 'status')        { av = a.status; bv = b.status }
      else                                 { av = a.weekStartDate; bv = b.weekStartDate }
      if (av === bv) return 0
      const cmp = av > bv ? 1 : -1
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [timesheets, sortBy, sortDir])

  const totalItems = sorted.length
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize)

  return (
    <Layout>
      <div className="mb-7">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft size={15} /> Back to Team
        </button>
        <h1 className="text-page-title">
          {employee ? `${employee.name}'s Timesheets` : 'Timesheets'}
        </h1>
        {employee && (
          <p className="text-[13px] text-muted-foreground mt-1.5 leading-5">{employee.role} &middot; {employee.departmentName}</p>
        )}
      </div>

      {loading ? <SkeletonRows rows={6} cols={4} /> : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          {totalItems === 0 ? (
            <EmptyState icon={FileText} title="No timesheets found" description="This team member has not submitted any timesheets yet." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/70">
                      <th className="table-header"><SortableHeader col="weekStartDate" label="Week" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                      <th className="table-header"><SortableHeader col="totalHours" label="Total Hours" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                      <th className="table-header"><SortableHeader col="status" label="Status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                      <th className="table-header">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((ts, idx) => (
                      <tr key={ts.id} className={`hover:bg-accent/30 transition-colors duration-100 ${idx < paginated.length - 1 ? 'border-b border-border/50' : ''}`}>
                        <td className="px-5 py-3.5 font-medium text-[13.5px] text-foreground whitespace-nowrap">
                          {format(new Date(ts.weekStartDate), 'MMM d')} &ndash; {format(new Date(ts.weekEndDate), 'MMM d, yyyy')}
                        </td>
                        <td className="px-5 py-3.5 text-[13px] text-muted-foreground tabular-nums">
                          {Number(ts.totalHours || 0).toFixed(1)} hrs
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={ts.status} /></td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => navigate(`/timesheets/${ts.id}`)}
                            className="text-primary hover:text-primary/80 text-[13px] font-semibold transition-colors"
                          >
                            View
                          </button>
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
    </Layout>
  )
}
