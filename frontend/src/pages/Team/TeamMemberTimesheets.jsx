import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { employeeService } from '../../services/employeeService'
import Layout from '../../components/Layout'
import { StatusBadge, LoadingSpinner } from '../../components/ui'
import { format } from 'date-fns'

export default function TeamMemberTimesheets() {
  const { employeeId } = useParams()
  const navigate = useNavigate()
  const [timesheets, setTimesheets] = useState([])
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <Layout>
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-sm mb-3 block">← Back to Team</button>
        <h1 className="text-2xl font-bold text-gray-900">
          {employee ? `${employee.name}'s Timesheets` : 'Timesheets'}
        </h1>
        {employee && (
          <p className="text-sm text-gray-500 mt-1">{employee.role} · {employee.departmentName}</p>
        )}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          {timesheets.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No timesheets found</p>
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
                  {timesheets.map(ts => (
                    <tr key={ts.id} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">
                        {format(new Date(ts.weekStartDate), 'MMM d')} – {format(new Date(ts.weekEndDate), 'MMM d, yyyy')}
                      </td>
                      <td className="table-cell">{Number(ts.totalHours || 0).toFixed(1)} hrs</td>
                      <td className="table-cell"><StatusBadge status={ts.status} /></td>
                      <td className="table-cell">
                        <button
                          onClick={() => navigate(`/timesheets/${ts.id}`)}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          View
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
