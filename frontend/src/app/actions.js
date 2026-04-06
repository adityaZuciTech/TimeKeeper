import { createAction } from '@reduxjs/toolkit'

// Dispatching this action causes every slice to reset to its initial state.
// Used by logout and the 401 interceptor to prevent stale data leaking between sessions.
export const resetAllState = createAction('app/resetAll')
