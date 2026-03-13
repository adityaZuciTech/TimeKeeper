import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { employeeService } from '../../services/employeeService'

export const fetchEmployees = createAsyncThunk('employees/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const response = await employeeService.getAll(params)
    return response.data.data.employees
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch employees')
  }
})

export const fetchTeam = createAsyncThunk('employees/fetchTeam', async (managerId, { rejectWithValue }) => {
  try {
    const response = await employeeService.getTeam(managerId)
    return response.data.data.team
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch team')
  }
})

export const createEmployee = createAsyncThunk('employees/create', async (data, { rejectWithValue }) => {
  try {
    const response = await employeeService.create(data)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create employee')
  }
})

export const updateEmployee = createAsyncThunk('employees/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await employeeService.update(id, data)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update employee')
  }
})

export const updateEmployeeStatus = createAsyncThunk('employees/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    const response = await employeeService.updateStatus(id, status)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update status')
  }
})

const employeeSlice = createSlice({
  name: 'employees',
  initialState: {
    list: [],
    team: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmployees.pending, (state) => { state.loading = true })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchTeam.fulfilled, (state, action) => {
        state.team = action.payload
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.list = [...state.list, action.payload]
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.list = state.list.map(e => e.id === action.payload.id ? action.payload : e)
      })
      .addCase(updateEmployeeStatus.fulfilled, (state, action) => {
        state.list = state.list.map(e => e.id === action.payload.id ? action.payload : e)
      })
  },
})

export const { clearError } = employeeSlice.actions
export default employeeSlice.reducer

export const selectEmployees = (state) => state.employees.list
export const selectTeam = (state) => state.employees.team
export const selectEmployeesLoading = (state) => state.employees.loading
