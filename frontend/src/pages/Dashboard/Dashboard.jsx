import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link } from 'react-router-dom'
import { fetchMyTimesheets, selectMyTimesheets, selectTimesheetsLoading } from '../../features/timesheets/timesheetSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner, PageHeader, StatCard, EmptyState } from '../../components/ui'
import { format } from 'date-fns'
import { FileText, CheckCircle2, Clock, TrendingUp, Plus, ArrowRight } from 'lucide-react'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectCurrentUser)
  const timesheets = useSelector(selectMyTimesheets)
  const loading = useSelector(selectTimesheetsLoading)

  useEffect(() => { dispatch(fetchMyTimesheets()) }, [dispatch])

  const handleAction = (ts) => navigate(`/timesheets/${ts.id}`)
  const handleNewTimesheet = () => navigate('/timesheets/new')
  const weekLabel = (ts) =>
    `${format(new Date(ts.weekStartDate), 'MMM d')} - ${format(new Date(ts.weekEndDate), 'MMM d')}`

  const submitted  = timesheets.filter((t) => t.status === 'SUBMITTED').length
  const drafts     = timesheets.filter((t) => t.status === 'DRAFT').length
  const totalHours = timesheets.reduce((s, t) => s + Number(t.totalHours || 0), 0)
  const recent     = timesheets.slice(0, 5)

  return (
    <Layout>
      <PageHeader
        title={`${greeting()}, ${user?.name?.split(' ')[0]}`}
        subtitle="Here's your timesheet activity at a glance"
        action={
          <button className="btn-primary" onClick={handleNewTimesheet}>
            <Plus size={16} />
            New Timesheet
          </button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total"     value={timesheets.length}   icon={<FileText size={20} />}     color="blue" />
        <StatCard title="Submitted" value={submitted}           icon={<CheckCircle2 size={20} />} color="green" />
        <StatCard title="Drafts"    value={drafts}              icon={<FileText size={20} />}     color="amber" />
        <StatCard title="All Hours" value={`${totalHours.toFixed(0)}h`} icon={<Clock size={20} />} color="violet" />
      </div>

      {/* Recent timesheets */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-heading font-semibold text-foreground">Recent Timesheets</h2>
          <Link to="/timesheets" className="flex items-center gap-1 text-xs font-heading font-medium text-primary hover:text-primary/80 transition-colors">
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? <LoadingSpinner /> : recent.length === 0 ? (
          <EmptyState
            message="No timesheets yet"
            action={<button className="btn-primary" onClick={handleNewTimesheet}>Create your first timesheet</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="table-header">Week</th>
                  <th className="table-header">Hours</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recent.map((ts) => (
                  <tr key={ts.id} className="hover:bg-muted/30 transition-colors">
                    <td className="table-cell font-body font-medium">{weekLabel(ts)}</td>
                    <td className="table-cell text-muted-foreground">{Number(ts.totalHours || 0).toFixed(1)} hrs</td>
                    <td className="table-cell"><StatusBadge status={ts.status} /></td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleAction(ts)}
                        className="text-xs font-heading font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        {ts.status === 'SUBMITTED' ? 'View' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
