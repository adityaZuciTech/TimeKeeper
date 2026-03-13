import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { createTimesheet } from '../../features/timesheets/timesheetSlice'
import { format, startOfWeek } from 'date-fns'
import toast from 'react-hot-toast'

export default function NewTimesheet() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekStartDate = format(monday, 'yyyy-MM-dd')

    dispatch(createTimesheet({ weekStartDate }))
      .unwrap()
      .then((ts) => {
        navigate(`/timesheets/${ts.id}`, { replace: true })
      })
      .catch((err) => {
        toast.error(err || 'Could not create timesheet')
        navigate('/timesheets', { replace: true })
      })
  }, [dispatch, navigate])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-gray-600">Creating timesheet…</p>
      </div>
    </div>
  )
}
