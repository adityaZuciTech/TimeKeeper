import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchMyTimesheets, selectMyTimesheets, selectTimesheetsLoading } from '../../features/timesheets/timesheetSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner, PageHeader } from '../../components/ui'
import { format, addDays, startOfWeek, nextMonday } from 'date-fns'

function getCurrentWeekStart() {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(today.setDate(diff))
}

export default function Dashboard() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectCurrentUser)
  const timesheets = useSelector(selectMyTimesheets)
  const loading = useSelector(selectTimesheetsLoading)

  useEffect(() => {
    dispatch(fetchMyTimesheets())
  }, [dispatch])

  const handleAction = (ts) => {
    if (ts.status === 'SUBMITTED') {
      navigate(`/timesheets/${ts.id}`)
    } else {
      navigate(`/timesheets/${ts.id}`)
    }
  }

  const handleNewTimesheet = () => {
    navigate('/timesheets/new')
  }

  const weekLabel = (ts) =>
    `${format(new Date(ts.weekStartDate), 'MMM d')} – ${format(new Date(ts.weekEndDate), 'MMM d')}`

  return (
    <Layout>
      <PageHeader
        title={`Good morning, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Here's your recent timesheet activity"
        action={
          <button className="btn-primary" onClick={handleNewTimesheet}>
            + New Timesheet
          </button>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Timesheets</h2>
          {timesheets.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 mb-4">No timesheets yet. Create your first timesheet!</p>
              <button className="btn-primary" onClick={handleNewTimesheet}>
                Fill Timesheet
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="table-header">Week</th>
                    <th className="table-header">Total Hours</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {timesheets.map((ts) => (
                    <tr key={ts.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell font-medium">{weekLabel(ts)}</td>
                      <td className="table-cell">{Number(ts.totalHours || 0).toFixed(1)} hrs</td>
                      <td className="table-cell">
                        <StatusBadge status={ts.status} />
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleAction(ts)}
                          className="text-primary-600 hover:text-primary-800 font-medium text-sm"
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
      )}
    </Layout>
  )
}
