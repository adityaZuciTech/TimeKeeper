import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { leaveService } from '../../services/leaveService'

export const applyLeave = createAsyncThunk('leaves/apply', async (data, { rejectWithValue }) => {
  try {
    const response = await leaveService.applyLeave(data)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to apply leave')
  }
})

export const fetchMyLeaves = createAsyncThunk('leaves/fetchMy', async (_, { rejectWithValue }) => {
  try {
    const response = await leaveService.getMyLeaves()
    return response.data.data.leaves
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch leaves')
  }
})

export const fetchTeamLeaves = createAsyncThunk('leaves/fetchTeam', async (_, { rejectWithValue }) => {
  try {
    const response = await leaveService.getTeamLeaves()
    return response.data.data.leaves
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch team leaves')
  }
})

export const approveLeave = createAsyncThunk('leaves/approve', async ({ id, note }, { rejectWithValue }) => {
  try {
    const response = await leaveService.approveLeave(id, note)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve leave')
  }
})

export const rejectLeave = createAsyncThunk('leaves/reject', async ({ id, note }, { rejectWithValue }) => {
  try {
    const response = await leaveService.rejectLeave(id, note)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject leave')
  }
})

const leaveSlice = createSlice({
  name: 'leaves',
  initialState: {
    myLeaves: [],
    teamLeaves: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearLeaveError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      // Apply
      .addCase(applyLeave.pending, (state) => { state.loading = true; state.error = null })
      .addCase(applyLeave.fulfilled, (state, action) => {
        state.loading = false
        state.myLeaves = [action.payload, ...state.myLeaves]
      })
      .addCase(applyLeave.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // My leaves
      .addCase(fetchMyLeaves.pending, (state) => { state.loading = true })
      .addCase(fetchMyLeaves.fulfilled, (state, action) => {
        state.loading = false
        state.myLeaves = action.payload
      })
      .addCase(fetchMyLeaves.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Team leaves
      .addCase(fetchTeamLeaves.pending, (state) => { state.loading = true })
      .addCase(fetchTeamLeaves.fulfilled, (state, action) => {
        state.loading = false
        state.teamLeaves = action.payload
      })
      .addCase(fetchTeamLeaves.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      // Approve
      .addCase(approveLeave.fulfilled, (state, action) => {
        state.teamLeaves = state.teamLeaves.map(l => l.id === action.payload.id ? action.payload : l)
        state.myLeaves   = state.myLeaves.map(l => l.id === action.payload.id ? action.payload : l)
      })
      // Reject
      .addCase(rejectLeave.fulfilled, (state, action) => {
        state.teamLeaves = state.teamLeaves.map(l => l.id === action.payload.id ? action.payload : l)
        state.myLeaves   = state.myLeaves.map(l => l.id === action.payload.id ? action.payload : l)
      })
  },
})

export const { clearLeaveError } = leaveSlice.actions

export const selectMyLeaves    = (state) => state.leaves.myLeaves
export const selectTeamLeaves  = (state) => state.leaves.teamLeaves
export const selectLeavesLoading = (state) => state.leaves.loading

export default leaveSlice.reducer
