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
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 mb-4 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Team
        </button>
        <h1 className="text-2xl font-heading font-bold text-foreground">
          {employee ? `${employee.name}'s Timesheets` : 'Timesheets'}
        </h1>
        {employee && (
          <p className="text-sm text-muted-foreground mt-1">{employee.role} · {employee.departmentName}</p>
        )}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          {timesheets.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No timesheets found</div>
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
                    <tr key={ts.id} className="hover:bg-muted/30 transition-colors">
                      <td className="table-cell font-body font-medium text-foreground">
                        {format(new Date(ts.weekStartDate), 'MMM d')} – {format(new Date(ts.weekEndDate), 'MMM d, yyyy')}
                      </td>
                      <td className="table-cell">{Number(ts.totalHours || 0).toFixed(1)} hrs</td>
                      <td className="table-cell"><StatusBadge status={ts.status} /></td>
                      <td className="table-cell">
                        <button
                          onClick={() => navigate(`/timesheets/${ts.id}`)}
                          className="text-primary hover:text-primary/80 text-sm font-heading font-medium"
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
