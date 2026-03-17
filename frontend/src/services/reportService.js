import apiClient from './apiClient'

export const reportService = {
  getTeamUtilization: (weekStartDate) =>
    apiClient.get('/reports/team-utilization', { params: { weekStartDate } }),
  getEmployeeTimesheet: (employeeId, weekStartDate) =>
    apiClient.get('/reports/employee-timesheet', { params: { employeeId, weekStartDate } }),
  getProjectEffort: (projectId) =>
    apiClient.get('/reports/project-effort', { params: { projectId } }),
  getDepartmentUtilization: (weekStartDate) =>
    apiClient.get('/reports/department-utilization', { params: { weekStartDate } }),
  triggerTimesheetReminders: () =>
    apiClient.post('/admin/reminders/timesheets'),
}
