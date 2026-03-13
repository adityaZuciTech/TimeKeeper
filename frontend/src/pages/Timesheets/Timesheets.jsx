import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchMyTimesheets, createTimesheet, selectMyTimesheets, selectTimesheetsLoading } from '../../features/timesheets/timesheetSlice'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner, PageHeader } from '../../components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function getMondayOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

function formatDate(d) {
  return format(new Date(d), 'yyyy-MM-dd')
}

export default function Timesheets() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const timesheets = useSelector(selectMyTimesheets)
  const loading = useSelector(selectTimesheetsLoading)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    dispatch(fetchMyTimesheets())
  }, [dispatch])

  const handleOpenTimesheet = (id) => navigate(`/timesheets/${id}`)

  const handleCreateNew = async () => {
    const monday = getMondayOfWeek(new Date())
    setCreating(true)
    try {
      const result = await dispatch(createTimesheet({ weekStartDate: formatDate(monday) })).unwrap()
      navigate(`/timesheets/${result.id}`)
    } catch (err) {
      toast.error(err || 'Failed to create timesheet')
    } finally {
      setCreating(false)
    }
  }

  const weekLabel = (ts) =>
    `${format(new Date(ts.weekStartDate), 'MMM d')} – ${format(new Date(ts.weekEndDate), 'MMM d, yyyy')}`

  return (
    <Layout>
      <PageHeader
        title="My Timesheets"
        subtitle="Manage your weekly time entries"
        action={
          <button className="btn-primary" onClick={handleCreateNew} disabled={creating}>
            {creating ? 'Creating...' : '+ Current Week'}
          </button>
        }
      />

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          {timesheets.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 mb-4">No timesheets found. Start by creating one for this week.</p>
              <button className="btn-primary" onClick={handleCreateNew}>
                Create Timesheet
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
                      <td className="table-cell"><StatusBadge status={ts.status} /></td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleOpenTimesheet(ts.id)}
                          className="text-primary-600 hover:text-primary-800 font-medium text-sm"
                        >
                          {ts.status === 'SUBMITTED' ? 'View' : 'Edit / Fill'}
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
