import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchTeam, selectTeam } from '../../features/employees/employeeSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import { reportService } from '../../services/reportService'
import { employeeService } from '../../services/employeeService'
import Layout from '../../components/Layout'
import { LoadingSpinner, PageHeader, EmptyState } from '../../components/ui'

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]
function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length]
}
import { format, startOfWeek } from 'date-fns'
import toast from 'react-hot-toast'

function getCurrentMonday() {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(today.setDate(diff))
}

export default function Team() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectCurrentUser)
  const team = useSelector(selectTeam)
  const [utilization, setUtilization] = useState([])
  const [loading, setLoading] = useState(true)
  const weekStartDate = format(getCurrentMonday(), 'yyyy-MM-dd')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await dispatch(fetchTeam(user.id))
      try {
        const res = await reportService.getTeamUtilization(weekStartDate)
        setUtilization(res.data.data.team || [])
      } catch (e) {
        // not critical
      }
      setLoading(false)
    }
    load()
  }, [dispatch, user.id])

  const getHours = (empId) => {
    const found = utilization.find(u => u.employeeId === empId)
    return found ? Number(found.hoursLogged).toFixed(1) : '0.0'
  }

  const viewTimesheets = async (empId) => {
    navigate(`/team/${empId}/timesheets`)
  }

  return (
    <Layout>
      <PageHeader
        title="My Team"
        subtitle={`Week of ${format(getCurrentMonday(), 'MMM d, yyyy')}`}
      />

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          {team.length === 0 ? (
            <EmptyState message="No team members found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="table-header">Employee</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Department</th>
                    <th className="table-header">Hours This Week</th>
                    <th className="table-header">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {team.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${avatarColor(emp.name)}`}>
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-heading font-medium text-foreground">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-muted-foreground">{emp.role}</td>
                      <td className="table-cell text-muted-foreground">{emp.departmentName || '—'}</td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {getHours(emp.id)} hrs
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => viewTimesheets(emp.id)}
                          className="text-primary hover:text-primary/80 text-sm font-heading font-medium"
                        >
                          View Timesheets
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
