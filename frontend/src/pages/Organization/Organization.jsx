import { useEffect, useState } from 'react'
import { reportService } from '../../services/reportService'
import Layout from '../../components/Layout'
import { LoadingSpinner, PageHeader } from '../../components/ui'
import { format } from 'date-fns'

function getCurrentMonday() {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(today.setDate(diff))
}

export default function Organization() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const weekStart = format(getCurrentMonday(), 'yyyy-MM-dd')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await reportService.getDepartmentUtilization(weekStart)
        setDepartments(res.data.data || [])
      } catch (e) { /* */ }
      setLoading(false)
    }
    load()
  }, [])

  const totalHours = departments.reduce((acc, d) => acc + Number(d.totalHours || 0), 0)
  const totalEmployees = departments.reduce((acc, d) => acc + (d.employeeCount || 0), 0)

  return (
    <Layout>
      <PageHeader
        title="Organization Overview"
        subtitle={`Week of ${format(getCurrentMonday(), 'MMM d, yyyy')}`}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">{departments.length}</p>
          <p className="text-sm text-gray-500 mt-1">Departments</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">{totalEmployees}</p>
          <p className="text-sm text-gray-500 mt-1">Total Employees</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">{totalHours.toFixed(0)}</p>
          <p className="text-sm text-gray-500 mt-1">Total Hours This Week</p>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Utilization</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="table-header">Department</th>
                  <th className="table-header">Employees</th>
                  <th className="table-header">Hours This Week</th>
                  <th className="table-header">Avg Hours / Employee</th>
                  <th className="table-header">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {departments.map(dept => {
                  const avg = dept.employeeCount > 0
                    ? (Number(dept.totalHours) / dept.employeeCount).toFixed(1)
                    : '0.0'
                  const utilPct = dept.employeeCount > 0
                    ? Math.min(100, (Number(dept.totalHours) / (dept.employeeCount * 40) * 100)).toFixed(0)
                    : 0

                  return (
                    <tr key={dept.departmentId} className="hover:bg-gray-50">
                      <td className="table-cell font-medium">{dept.departmentName}</td>
                      <td className="table-cell">{dept.employeeCount}</td>
                      <td className="table-cell font-medium">{Number(dept.totalHours || 0).toFixed(0)} hrs</td>
                      <td className="table-cell text-gray-500">{avg} hrs</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-primary-500 h-2 rounded-full"
                              style={{ width: `${utilPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-10">{utilPct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  )
}
