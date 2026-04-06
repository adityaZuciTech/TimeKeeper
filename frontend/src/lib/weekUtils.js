import { format } from 'date-fns'

export const DATE_OPTIONS = [
  { label: 'This Week',   value: 'this_week',    weeksAgo: 0 },
  { label: 'Last Week',   value: 'last_week',    weeksAgo: 1 },
  { label: '2 Weeks Ago', value: 'two_weeks',    weeksAgo: 2 },
  { label: '3 Weeks Ago', value: 'three_weeks',  weeksAgo: 3 },
]

export function getMonday(weeksAgo = 0) {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today)
  monday.setDate(diff - weeksAgo * 7)
  return monday
}

export function getMondayStr(weeksAgo = 0) {
  return format(getMonday(weeksAgo), 'yyyy-MM-dd')
}

/** Returns a formatted range string e.g. "Mar 30 – Apr 3, 2026". */
export function formatWeekRange(weeksAgo = 0) {
  const monday = getMonday(weeksAgo)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return `${format(monday, 'MMM d')} – ${format(friday, 'MMM d, yyyy')}`
}
