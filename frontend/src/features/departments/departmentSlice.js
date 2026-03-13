import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { departmentService } from '../../services/departmentService'

export const fetchDepartments = createAsyncThunk('departments/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const response = await departmentService.getAll()
    return response.data.data.departments
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch departments')
  }
})

export const createDepartment = createAsyncThunk('departments/create', async (data, { rejectWithValue }) => {
  try {
    const response = await departmentService.create(data)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create department')
  }
})

export const updateDepartment = createAsyncThunk('departments/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await departmentService.update(id, data)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update department')
  }
})

export const updateDepartmentStatus = createAsyncThunk('departments/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    const response = await departmentService.updateStatus(id, status)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update status')
  }
})

const departmentSlice = createSlice({
  name: 'departments',
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
      .addCase(fetchDepartments.pending, (state) => { state.loading = true })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.list = [...state.list, action.payload]
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        state.list = state.list.map(d => d.id === action.payload.id ? action.payload : d)
      })
      .addCase(updateDepartmentStatus.fulfilled, (state, action) => {
        state.list = state.list.map(d => d.id === action.payload.id ? action.payload : d)
      })
  },
})

export const { clearError } = departmentSlice.actions
export default departmentSlice.reducer

export const selectDepartments = (state) => state.departments.list
export const selectDepartmentsLoading = (state) => state.departments.loading
