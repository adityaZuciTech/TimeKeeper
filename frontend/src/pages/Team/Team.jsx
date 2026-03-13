import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { fetchTeam, selectTeam } from '../../features/employees/employeeSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import { reportService } from '../../services/reportService'
import { employeeService } from '../../services/employeeService'
import Layout from '../../components/Layout'
import { LoadingSpinner, PageHeader } from '../../components/ui'
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
            <p className="text-center text-gray-400 py-8">No team members found</p>
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
                    <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{emp.name}</p>
                            <p className="text-xs text-gray-400">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-gray-600">{emp.role}</td>
                      <td className="table-cell text-gray-600">{emp.departmentName || '—'}</td>
                      <td className="table-cell">
                        <span className="font-medium">{getHours(emp.id)} hrs</span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => viewTimesheets(emp.id)}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
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
