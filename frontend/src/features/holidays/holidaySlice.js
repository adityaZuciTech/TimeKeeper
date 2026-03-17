import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { holidayService } from '../../services/holidayService'

export const fetchHolidays = createAsyncThunk('holidays/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const response = await holidayService.getAll()
    return response.data.data.holidays
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch holidays')
  }
})

export const createHoliday = createAsyncThunk('holidays/create', async (data, { rejectWithValue }) => {
  try {
    const response = await holidayService.create(data)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create holiday')
  }
})

export const deleteHoliday = createAsyncThunk('holidays/delete', async (id, { rejectWithValue }) => {
  try {
    await holidayService.delete(id)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete holiday')
  }
})

const holidaySlice = createSlice({
  name: 'holidays',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearHolidayError: (state) => { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHolidays.pending, (state) => { state.loading = true })
      .addCase(fetchHolidays.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchHolidays.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createHoliday.fulfilled, (state, action) => {
        state.list = [...state.list, action.payload].sort((a, b) =>
          new Date(a.date) - new Date(b.date)
        )
      })
      .addCase(createHoliday.rejected, (state, action) => {
        state.error = action.payload
      })
      .addCase(deleteHoliday.fulfilled, (state, action) => {
        state.list = state.list.filter(h => h.id !== action.payload)
      })
  },
})

export const { clearHolidayError } = holidaySlice.actions

export const selectHolidays        = (state) => state.holidays.list
export const selectHolidaysLoading = (state) => state.holidays.loading

export default holidaySlice.reducer
