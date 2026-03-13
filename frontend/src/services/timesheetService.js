import apiClient from './apiClient'

export const timesheetService = {
  getMyTimesheets: () => apiClient.get('/timesheets/my'),
  create: (data) => apiClient.post('/timesheets', data),
  getById: (id) => apiClient.get(`/timesheets/${id}`),
  getByWeek: (weekStartDate) => apiClient.get('/timesheets', { params: { weekStartDate } }),
  submit: (id) => apiClient.post(`/timesheets/${id}/submit`),

  // Entries
  addEntry: (timesheetId, data) => apiClient.post(`/timesheets/${timesheetId}/entries`, data),
  getEntries: (timesheetId) => apiClient.get(`/timesheets/${timesheetId}/entries`),
  updateEntry: (entryId, data) => apiClient.put(`/timesheets/entries/${entryId}`, data),
  deleteEntry: (entryId) => apiClient.delete(`/timesheets/entries/${entryId}`),
}
