import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectCurrentUser } from './features/auth/authSlice'
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import Timesheets from './pages/Timesheets/Timesheets'
import TimesheetDetail from './pages/Timesheets/TimesheetDetail'
import NewTimesheet from './pages/Timesheets/NewTimesheet'
import Team from './pages/Team/Team'
import TeamMemberTimesheets from './pages/Team/TeamMemberTimesheets'
import Employees from './pages/Employees/Employees'
import Departments from './pages/Departments/Departments'
import Projects from './pages/Projects/Projects'
import Organization from './pages/Organization/Organization'
import Profile from './pages/Profile/Profile'
import MyLeaves from './pages/Leaves/MyLeaves'
import TeamLeaves from './pages/Leaves/TeamLeaves'
import Holidays from './pages/Holidays/Holidays'
import NotFound from './pages/NotFound'

function RootRedirect() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Root */}
        <Route path="/" element={<RootRedirect />} />

        {/* All authenticated users */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/timesheets" element={<Timesheets />} />
          <Route path="/timesheets/new" element={<NewTimesheet />} />
          <Route path="/timesheets/:id" element={<TimesheetDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/leaves/my" element={<MyLeaves />} />
          <Route path="/holidays" element={<Holidays />} />
        </Route>

        {/* Manager + Admin */}
        <Route element={<ProtectedRoute roles={['MANAGER', 'ADMIN']} />}>
          <Route path="/team" element={<Team />} />
          <Route path="/team/:employeeId/timesheets" element={<TeamMemberTimesheets />} />
          <Route path="/leaves/team" element={<TeamLeaves />} />
        </Route>

        {/* Admin only */}
        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route path="/employees" element={<Employees />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/organization" element={<Organization />} />
        </Route>

        {/* 404 — explicit not-found page instead of silent redirect */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
