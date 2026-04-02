import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { timesheetService } from '../../services/timesheetService'

export const fetchMyTimesheets = createAsyncThunk('timesheets/fetchMy', async (_, { rejectWithValue }) => {
  try {
    const response = await timesheetService.getMyTimesheets()
    return response.data.data.timesheets
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch timesheets')
  }
})

export const fetchAllTimesheets = createAsyncThunk('timesheets/fetchAll', async ({ page = 0, size = 10 } = {}, { rejectWithValue }) => {
  try {
    const response = await timesheetService.getAllTimesheets(page, size)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch timesheets')
  }
})

export const fetchTimesheetById = createAsyncThunk('timesheets/fetchById', async (id, { rejectWithValue }) => {
  try {
    const response = await timesheetService.getById(id)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch timesheet')
  }
})

export const createTimesheet = createAsyncThunk('timesheets/create', async (data, { rejectWithValue }) => {
  try {
    const response = await timesheetService.create(data)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create timesheet')
  }
})

export const submitTimesheet = createAsyncThunk('timesheets/submit', async (id, { rejectWithValue }) => {
  try {
    const response = await timesheetService.submit(id)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to submit timesheet')
  }
})

export const addEntry = createAsyncThunk('timesheets/addEntry', async ({ timesheetId, data }, { rejectWithValue }) => {
  try {
    // Backend returns the full updated TimesheetResponse — no second GET needed
    const response = await timesheetService.addEntry(timesheetId, data)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add entry')
  }
})

export const updateEntry = createAsyncThunk('timesheets/updateEntry', async ({ timesheetId, entryId, data }, { rejectWithValue }) => {
  try {
    const response = await timesheetService.updateEntry(entryId, data)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update entry')
  }
})

export const deleteEntry = createAsyncThunk('timesheets/deleteEntry', async ({ timesheetId, entryId }, { rejectWithValue }) => {
  try {
    const response = await timesheetService.deleteEntry(entryId)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete entry')
  }
})

export const approveTimesheet = createAsyncThunk('timesheets/approve', async (id, { rejectWithValue }) => {
  try {
    const response = await timesheetService.approve(id)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve timesheet')
  }
})

export const rejectTimesheet = createAsyncThunk('timesheets/reject', async ({ id, reason }, { rejectWithValue }) => {
  try {
    const response = await timesheetService.reject(id, reason)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject timesheet')
  }
})

export const copyLastWeek = createAsyncThunk('timesheets/copyLastWeek', async (timesheetId, { rejectWithValue }) => {
  try {
    const response = await timesheetService.copyLastWeek(timesheetId)
    return response.data.data // { timesheet, copySummary }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to copy entries')
  }
})

export const previewCopyLastWeek = createAsyncThunk('timesheets/previewCopyLastWeek', async (timesheetId, { rejectWithValue }) => {
  try {
    const response = await timesheetService.previewCopyLastWeek(timesheetId)
    return response.data.data // { timesheet: null, copySummary }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to preview copy')
  }
})

export const saveOvertimeComment = createAsyncThunk('timesheets/saveOvertimeComment', async ({ timesheetId, day, comment }, { rejectWithValue }) => {
  try {
    const response = await timesheetService.saveOvertimeComment(timesheetId, { day, comment })
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save comment')
  }
})

const timesheetSlice = createSlice({
  name: 'timesheets',
  initialState: {
    myTimesheets: [],
    allTimesheets: [],
    allTimesheetsMeta: { page: 0, totalPages: 0, totalElements: 0 },
    currentTimesheet: null,
    // Ephemeral copy summary — cleared on re-fetch, re-copy, and submit.
    // Not persisted. Shown in CopySummaryPanel only when skippedCount > 0.
    copySummary: null,
    copyPreview: null,
    loading: false,
    copyLoading: false,
    copyPreviewLoading: false,
    entriesLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
    clearCurrentTimesheet: (state) => { state.currentTimesheet = null },
    clearCopySummary: (state) => { state.copySummary = null },
    clearCopyPreview: (state) => { state.copyPreview = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyTimesheets.pending, (state) => { state.loading = true })
      .addCase(fetchMyTimesheets.fulfilled, (state, action) => {
        state.loading = false
        state.myTimesheets = action.payload
      })
      .addCase(fetchMyTimesheets.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchAllTimesheets.pending, (state) => { state.loading = true })
      .addCase(fetchAllTimesheets.fulfilled, (state, action) => {
        state.loading = false
        state.allTimesheets = action.payload.timesheets
        state.allTimesheetsMeta = {
          page: action.payload.page,
          totalPages: action.payload.totalPages,
          totalElements: action.payload.totalElements,
        }
      })
      .addCase(fetchAllTimesheets.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchTimesheetById.pending, (state) => { state.loading = true })
      .addCase(fetchTimesheetById.fulfilled, (state, action) => {
        state.loading = false
        state.currentTimesheet = action.payload
        state.copySummary = null  // clear stale summary when navigating to a timesheet
        state.copyPreview = null  // clear stale preview when navigating
      })
      .addCase(fetchTimesheetById.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createTimesheet.fulfilled, (state, action) => {
        state.currentTimesheet = action.payload
      })
      .addCase(submitTimesheet.fulfilled, (state, action) => {
        state.currentTimesheet = action.payload
        state.copySummary = null // clear summary on submit
        state.myTimesheets = state.myTimesheets.map(ts =>
          ts.id === action.payload.id ? { ...ts, status: action.payload.status } : ts
        )
      })
      .addCase(approveTimesheet.pending, (state) => { state.loading = true })
      .addCase(approveTimesheet.fulfilled, (state, action) => {
        state.loading = false
        state.currentTimesheet = action.payload
        state.myTimesheets = state.myTimesheets.map(ts =>
          ts.id === action.payload.id ? { ...ts, status: action.payload.status } : ts
        )
        state.allTimesheets = state.allTimesheets.map(ts =>
          ts.id === action.payload.id ? { ...ts, status: action.payload.status } : ts
        )
      })
      .addCase(approveTimesheet.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(rejectTimesheet.pending, (state) => { state.loading = true })
      .addCase(rejectTimesheet.fulfilled, (state, action) => {
        state.loading = false
        state.currentTimesheet = action.payload
        state.myTimesheets = state.myTimesheets.map(ts =>
          ts.id === action.payload.id ? { ...ts, status: action.payload.status } : ts
        )
        state.allTimesheets = state.allTimesheets.map(ts =>
          ts.id === action.payload.id ? { ...ts, status: action.payload.status } : ts
        )
      })
      .addCase(rejectTimesheet.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(addEntry.pending, (state) => { state.entriesLoading = true })
      .addCase(addEntry.fulfilled, (state, action) => {
        state.entriesLoading = false
        state.currentTimesheet = action.payload
      })
      .addCase(addEntry.rejected, (state, action) => {
        state.entriesLoading = false
        state.error = action.payload
      })
      .addCase(updateEntry.pending, (state) => { state.entriesLoading = true })
      .addCase(updateEntry.fulfilled, (state, action) => {
        state.entriesLoading = false
        state.currentTimesheet = action.payload
      })
      .addCase(updateEntry.rejected, (state, action) => {
        state.entriesLoading = false
        state.error = action.payload
      })
      .addCase(deleteEntry.fulfilled, (state, action) => {
        state.currentTimesheet = action.payload
      })
      .addCase(copyLastWeek.pending, (state) => { state.copyLoading = true; state.error = null })
      .addCase(copyLastWeek.fulfilled, (state, action) => {
        state.copyLoading = false
        state.copyPreview = null
        state.currentTimesheet = action.payload.timesheet
        state.copySummary = action.payload.copySummary
      })
      .addCase(copyLastWeek.rejected, (state, action) => {
        state.copyLoading = false
        state.error = action.payload
      })
      .addCase(previewCopyLastWeek.pending, (state) => { state.copyPreviewLoading = true; state.error = null })
      .addCase(previewCopyLastWeek.fulfilled, (state, action) => {
        state.copyPreviewLoading = false
        state.copyPreview = action.payload.copySummary
      })
      .addCase(previewCopyLastWeek.rejected, (state, action) => {
        state.copyPreviewLoading = false
        state.error = action.payload
      })
      .addCase(saveOvertimeComment.fulfilled, (state, action) => {
        state.currentTimesheet = action.payload
      })
  },
})

export const { clearError, clearCurrentTimesheet, clearCopySummary, clearCopyPreview } = timesheetSlice.actions
export default timesheetSlice.reducer

export const selectMyTimesheets = (state) => state.timesheets.myTimesheets
export const selectAllTimesheets = (state) => state.timesheets.allTimesheets
export const selectAllTimesheetsMeta = (state) => state.timesheets.allTimesheetsMeta
export const selectCurrentTimesheet = (state) => state.timesheets.currentTimesheet
export const selectCopySummary = (state) => state.timesheets.copySummary
export const selectCopyPreview = (state) => state.timesheets.copyPreview
export const selectCopyLoading = (state) => state.timesheets.copyLoading
export const selectCopyPreviewLoading = (state) => state.timesheets.copyPreviewLoading
export const selectTimesheetsLoading = (state) => state.timesheets.loading
export const selectEntriesLoading = (state) => state.timesheets.entriesLoading
export const selectTimesheetError = (state) => state.timesheets.error
