import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { projectService } from '../../services/projectService'

export const fetchProjects = createAsyncThunk('projects/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const response = await projectService.getAll(params)
    return response.data.data.projects
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch projects')
  }
})

export const createProject = createAsyncThunk('projects/create', async (data, { rejectWithValue }) => {
  try {
    const response = await projectService.create(data)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create project')
  }
})

export const updateProject = createAsyncThunk('projects/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await projectService.update(id, data)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update project')
  }
})

export const updateProjectStatus = createAsyncThunk('projects/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    const response = await projectService.updateStatus(id, status)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update status')
  }
})

const projectSlice = createSlice({
  name: 'projects',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => { state.loading = true })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.list = [...state.list, action.payload]
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.list = state.list.map(p => p.id === action.payload.id ? action.payload : p)
      })
      .addCase(updateProjectStatus.fulfilled, (state, action) => {
        state.list = state.list.map(p => p.id === action.payload.id ? action.payload : p)
      })
  },
})

export const { clearError } = projectSlice.actions
export default projectSlice.reducer

export const selectProjects = (state) => state.projects.list
export const selectProjectsLoading = (state) => state.projects.loading
export const selectActiveProjects = (state) =>
  state.projects.list.filter(p => p.status === 'ACTIVE')
