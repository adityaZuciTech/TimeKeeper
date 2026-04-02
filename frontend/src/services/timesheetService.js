import apiClient from './apiClient'

export const timesheetService = {
  getMyTimesheets: () => apiClient.get('/timesheets/my'),
  getAllTimesheets: (page = 0, size = 10) => apiClient.get('/timesheets/my/all', { params: { page, size } }),
  create: (data) => apiClient.post('/timesheets', data),
  getById: (id) => apiClient.get(`/timesheets/${id}`),
  getByWeek: (weekStartDate) => apiClient.get('/timesheets', { params: { weekStartDate } }),
  submit: (id) => apiClient.post(`/timesheets/${id}/submit`),

  // Approval workflow (MANAGER/ADMIN)
  approve: (id) => apiClient.post(`/timesheets/${id}/approve`),
  reject: (id, reason) => apiClient.post(`/timesheets/${id}/reject`, reason ? { reason } : {}),

  // Entries — each returns the full updated TimesheetResponse (eliminates second GET)
  addEntry: (timesheetId, data) => apiClient.post(`/timesheets/${timesheetId}/entries`, data),
  getEntries: (timesheetId) => apiClient.get(`/timesheets/${timesheetId}/entries`),
  updateEntry: (entryId, data) => apiClient.put(`/timesheets/entries/${entryId}`, data),
  deleteEntry: (entryId) => apiClient.delete(`/timesheets/entries/${entryId}`),

  // Copy previous week WORK entries into the current DRAFT timesheet (MERGE strategy)
  copyLastWeek: (timesheetId) => apiClient.post(`/timesheets/${timesheetId}/copy-last-week`),

  // Dry-run: returns what would be copied/skipped without persisting anything
  previewCopyLastWeek: (timesheetId) => apiClient.post(`/timesheets/${timesheetId}/copy-last-week`, null, { params: { dryRun: true } }),

  // Save (or clear) an overtime comment for a specific day
  saveOvertimeComment: (timesheetId, data) => apiClient.patch(`/timesheets/${timesheetId}/overtime-comment`, data),
}
