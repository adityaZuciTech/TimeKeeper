import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { createTimesheet } from '../../features/timesheets/timesheetSlice'
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import toast from 'react-hot-toast'
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Layout from '../../components/Layout'
import { PageTransition } from '../../components/ui'

function getMonday(date) {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export default function NewTimesheet() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [selectedWeek, setSelectedWeek] = useState(getMonday(new Date()))
  const [loading, setLoading] = useState(false)

  const currentWeekMonday = getMonday(new Date())
  const isCurrentWeek = format(selectedWeek, 'yyyy-MM-dd') === format(currentWeekMonday, 'yyyy-MM-dd')

  const weekLabel = `${format(selectedWeek, 'MMM d')} - ${format(new Date(selectedWeek.getTime() + 4 * 86400000), 'MMM d, yyyy')}`

  const goBack    = () => setSelectedWeek(prev => subWeeks(prev, 1))
  const goForward = () => {
    const next = addWeeks(selectedWeek, 1)
    if (next <= currentWeekMonday) setSelectedWeek(next)
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      const weekStartDate = format(selectedWeek, 'yyyy-MM-dd')
      const ts = await dispatch(createTimesheet({ weekStartDate })).unwrap()
      navigate(`/timesheets/${ts.id}`, { replace: true })
    } catch (err) {
      toast.error(err || 'Could not create timesheet')
      setLoading(false)
    }
  }

  return (
    <Layout>
      <PageTransition>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-card border border-border rounded-2xl shadow-sm p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Calendar size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">New Timesheet</h2>
              <p className="text-sm text-muted-foreground">Select a week to log time</p>
            </div>
          </div>

          {/* Week selector */}
          <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3 mb-6">
            <button
              onClick={goBack}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{weekLabel}</p>
              {isCurrentWeek && (
                <span className="text-[11px] text-primary font-medium">Current week</span>
              )}
            </div>
            <button
              onClick={goForward}
              disabled={isCurrentWeek}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/timesheets')}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading}
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {loading ? 'Creating…' : 'Create Timesheet'}
            </button>
          </div>
        </div>
      </div>
      </PageTransition>
    </Layout>
  )
}
