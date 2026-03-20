# TimeKeeper — Feature List

> Comprehensive list of all implemented features in the current production build. ✅ = Implemented | ⚠️ = Partial | 🔮 = Future Scope

---

## Authentication & Security

| Feature | Status | Notes |
|---|:---:|---|
| Email + password login | ✅ | JWT issued on success |
| JWT stateless authentication | ✅ | 24h token, stored in localStorage |
| Auto-logout on 401 | ✅ | Axios interceptor clears token + redirects |
| Change password | ✅ | Current password verified before update |
| Role-based access control | ✅ | `@PreAuthorize` on all endpoints |
| Account deactivation (lock) | ✅ | INACTIVE employees cannot authenticate |
| Password reset / forgot password | 🔮 | Not implemented |
| OAuth / SSO | 🔮 | Not implemented |
| MFA | 🔮 | Not implemented |

---

## Timesheets

| Feature | Status | Notes |
|---|:---:|---|
| Create weekly timesheet (Mon–Fri) | ✅ | Auto-created or manually opened |
| View own timesheet list | ✅ | Shows last N weeks |
| View timesheet detail with days | ✅ | Daily breakdown with hours |
| Add time entry (project + time block) | ✅ | Start time, end time, project, description |
| Edit time entry | ✅ | Inline edit in timesheet detail |
| Delete time entry | ✅ | Removes from DRAFT timesheet |
| Overlap detection | ✅ | Server rejects overlapping entries for same day |
| Max hours validation | ✅ | Validates start < end time |
| Submit timesheet | ✅ | Locks timesheet (SUBMITTED = read-only) |
| Holiday auto-block | ✅ | Days matching Holiday records are non-editable |
| Leave auto-block | ✅ | Days with APPROVED leave are non-editable |
| Manager views team timesheets | ✅ | Via `/employees/{id}/timesheets` |
| Timesheet approval by manager | 🔮 | Not implemented (submit-only flow) |

---

## Leave Management

| Feature | Status | Notes |
|---|:---:|---|
| Apply for leave (date range) | ✅ | SICK, CASUAL, VACATION types |
| View own leave history | ✅ | With status badges and dates |
| Leave balance tracking | ✅ | Client-side: Sick 10d, Casual 12d, Vacation 15d |
| Leave approval by manager/admin | ✅ | Optional note on approval |
| Leave rejection by manager/admin | ✅ | Optional rejection reason |
| Team leave view for managers | ✅ | All pending/approved/rejected leaves |
| Leave affects timesheet days | ✅ | Approved leaves mark days as LEAVE |
| Overlap with holidays validation | ✅ | Checked server-side |
| Leave cancellation by employee | 🔮 | Not implemented |
| Custom leave policies per department | 🔮 | Not implemented |

---

## Holiday Calendar

| Feature | Status | Notes |
|---|:---:|---|
| View all holidays | ✅ | All roles, sorted by date |
| Create holiday | ✅ | Admin only, unique date constraint |
| Delete holiday | ✅ | Admin only |
| Holiday blocks timesheet day | ✅ | Checked when building timesheet day responses |
| Holiday type classification | ✅ | Frontend infers type from name (National/Religious/etc.) |
| Recurring holidays | 🔮 | Must recreate each year |
| Holiday import (bulk) | 🔮 | Not implemented |

---

## Employee Management (Admin)

| Feature | Status | Notes |
|---|:---:|---|
| Create employee | ✅ | With role, department, manager assignment |
| List all employees | ✅ | Filter by department, status |
| View employee details | ✅ | All roles can view own; Admin can view all |
| Update employee (name, email, role, dept, manager) | ✅ | Admin only |
| Deactivate / reactivate employee | ✅ | ACTIVE / INACTIVE toggle |
| View team (manager-scoped) | ✅ | Returns employees where `manager_id = managerId` |
| View employee timesheets | ✅ | Manager/Admin can list any employee's timesheets |
| Employee avatar / photo | 🔮 | Not implemented |
| Bulk import employees | 🔮 | Not implemented |

---

## Department Management (Admin)

| Feature | Status | Notes |
|---|:---:|---|
| Create department | ✅ | Name + description |
| Update department | ✅ | Admin only |
| List all departments | ✅ | With employee count from response |
| Delete department | ⚠️ | API may exist; not prominently surfaced in frontend |
| Department-level permissions | 🔮 | Not implemented |

---

## Project Management (Admin)

| Feature | Status | Notes |
|---|:---:|---|
| Create project | ✅ | Name, client, department, dates, status |
| Update project | ✅ | All fields editable by Admin |
| Change project status | ✅ | ACTIVE → ON_HOLD → COMPLETED |
| List all projects | ✅ | With status badges |
| Delete project | ✅ | Admin only |
| COMPLETED projects block new entries | ✅ | Enforced server-side |
| Project budget tracking | 🔮 | Not implemented |
| Project member assignment | 🔮 | Projects linked to department, not individuals |

---

## Organization Analytics (Admin)

| Feature | Status | Notes |
|---|:---:|---|
| Stat cards (depts, employees, hours, utilization) | ✅ | Live from API |
| Weekly hours trend chart (6-week area chart) | ✅ | Recharts AreaChart |
| Department distribution donut chart | ✅ | Recharts PieChart |
| Department utilization table | ✅ | Sortable by name, hours, employees, utilization |
| Utilization badges (High/Moderate/Low) | ✅ | Color-coded |
| Week selector (this week/last week/2-3 weeks ago) | ✅ | Dynamic date filter |
| Key Insights panel | ✅ | Auto-generated text insights |
| CSV export | ✅ | Department utilization data |
| PDF export | ✅ | 4-page professional report |
| Hourly trend (↑/↓ vs last week) | ✅ | Percentage delta shown |

---

## Reporting & Export

| Feature | Status | Notes |
|---|:---:|---|
| Team utilization report | ✅ | Manager/Admin |
| Employee timesheet report | ✅ | Manager/Admin |
| Project effort report | ✅ | Manager/Admin |
| Department utilization report | ✅ | Admin |
| CSV download | ✅ | Department data |
| PDF download (org report) | ✅ | 4-page: stats, trend chart, pie chart, dept table |
| Scheduled report emails | 🔮 | Not implemented |

---

## Notifications & Email

| Feature | Status | Notes |
|---|:---:|---|
| Manual timesheet reminder trigger (Admin) | ✅ | Sends to all active employees with unsubmitted timesheets |
| Scheduled weekly reminders | ✅ | Spring `@Scheduled` job |
| Email HTML templates | ✅ | Custom styled via EmailService |
| Leave approval/rejection email | ⚠️ | EmailService exists; not confirmed wired to leave actions |
| Welcome email on account creation | 🔮 | Not implemented |
| In-app notifications (bell) | ⚠️ | Bell icon in header UI exists (Layout.jsx); no live notification data |

---

## Profile

| Feature | Status | Notes |
|---|:---:|---|
| View own profile | ✅ | Name, email, role, department, manager |
| Change password | ✅ | Current + new password |
| Edit profile details | 🔮 | API exists for update but profile page is read-only except password |
| Upload avatar | 🔮 | Not implemented |
