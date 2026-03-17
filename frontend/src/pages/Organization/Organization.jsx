import { useEffect, useState } from 'react'
import { reportService } from '../../services/reportService'
import Layout from '../../components/Layout'
import { LoadingSpinner, PageHeader, StatCard } from '../../components/ui'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function getCurrentMonday() {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(today.setDate(diff))
}

export default function Organization() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [reminderSending, setReminderSending] = useState(false)
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

  const handleSendReminders = async () => {
    setReminderSending(true)
    try {
      await reportService.triggerTimesheetReminders()
      toast.success('Timesheet reminders sent to unsubmitted employees')
    } catch (e) {
      toast.error('Failed to send reminders')
    } finally {
      setReminderSending(false)
    }
  }

  const totalHours = departments.reduce((acc, d) => acc + Number(d.totalHours || 0), 0)
  const totalEmployees = departments.reduce((acc, d) => acc + (d.employeeCount || 0), 0)

  return (
    <Layout>
      <PageHeader
        title="Organization Overview"
        subtitle={`Week of ${format(getCurrentMonday(), 'MMM d, yyyy')}`}
        action={
          <button
            className="btn-primary"
            onClick={handleSendReminders}
            disabled={reminderSending}
          >
            {reminderSending ? 'Sending...' : 'Send Timesheet Reminders'}
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Departments"
          value={departments.length}
          color="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <StatCard
          title="Total Employees"
          value={totalEmployees}
          color="green"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          title="Hours This Week"
          value={totalHours.toFixed(0)}
          color="amber"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card">
          <h2 className="text-lg font-heading font-semibold text-foreground mb-4">Department Utilization</h2>
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
                    <tr key={dept.departmentId} className="hover:bg-muted/30 transition-colors">
                      <td className="table-cell font-heading font-medium text-foreground">{dept.departmentName}</td>
                      <td className="table-cell">{dept.employeeCount}</td>
                      <td className="table-cell font-heading font-medium text-foreground">{Number(dept.totalHours || 0).toFixed(0)} hrs</td>
                      <td className="table-cell text-muted-foreground">{avg} hrs</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-border/50 rounded-full h-1.5">
                            <div
                              className="bg-primary h-1.5 rounded-full"
                              style={{ width: `${utilPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-10">{utilPct}%</span>
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
