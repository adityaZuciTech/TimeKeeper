# TimeKeeper — Product Overview

> A modern, web-based Time Tracking SaaS built for organizations that need clear visibility into how employee hours are allocated across projects and departments.

---

## 1. What is TimeKeeper?

TimeKeeper is a full-stack workforce analytics and time tracking platform. It enables employees to log their weekly working hours per project, gives managers insight into team utilization, and provides admins with organization-wide productivity dashboards and PDF/CSV export capabilities.

The application is role-driven: every feature, API endpoint, and UI element is governed by one of three roles — **Employee**, **Manager**, or **Admin**.

---

## 2. Core Value Propositions

| Value | Description |
|---|---|
| **Accurate Time Tracking** | Employees log time blocks per project per day with conflict and overlap detection |
| **Leave Management** | Full leave application, approval, and balance tracking system |
| **Manager Visibility** | Team timesheets, hours breakdown, and per-employee utilization view |
| **Organization Analytics** | Admin dashboard with weekly trends, department distribution charts, and insights |
| **PDF Reports** | One-click PDF export of the full organization report (charts + tables + stats) |
| **Automated Notifications** | Scheduled and manual email reminders for unsubmitted timesheets |
| **Holiday Calendar** | System-wide holiday tracking that auto-blocks days in employee timesheets |

---

## 3. Tech Stack

### Backend
| Component | Technology |
|---|---|
| Framework | Spring Boot 3.2.3 |
| Language | Java 21 |
| Database | MySQL 8 (via Hibernate / Spring Data JPA) |
| Security | Spring Security + JWT (stateless) |
| PDF Engine | OpenHTMLtoPDF 1.0.10 |
| Template Engine | Thymeleaf |
| Email | Spring Mail (Gmail SMTP) |
| Build | Maven |

### Frontend
| Component | Technology |
|---|---|
| Framework | React 18 |
| Build Tool | Vite 5 |
| State | Redux Toolkit |
| HTTP | Axios |
| Charts | Recharts |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Routing | React Router DOM v6 |

---

## 4. User Roles

| Role | Access Level |
|---|---|
| **Employee** | Own timesheets, leaves, holidays, profile |
| **Manager** | All Employee access + team timesheets + team leave approvals |
| **Admin** | All Manager access + employee/dept/project management + org dashboard + reminders |

> Roles are stored in the `employees` table as `EMPLOYEE`, `MANAGER`, `ADMIN`.

---

## 5. Navigation Map

### Employee
```
Dashboard → My Timesheets → [Timesheet Detail] → My Leaves → Holidays → Profile
```

### Manager
```
Dashboard → My Timesheets → Team → Team Leaves → Holidays → Profile
```

### Admin
```
Dashboard → Employees → Departments → Projects → Organization Overview → Holidays → Profile
```

---

## 6. System Boundaries

### In Scope (Implemented)
- JWT authentication (login, logout, change password)
- Full timesheet lifecycle (create → draft → submit)
- Time entry management (add, update, delete) with overlap validation
- Leave management (apply → pending → approve/reject)
- Holiday calendar (create, list, delete)
- Project management (create, update, status change)
- Department management (create, update, list)
- Employee management (create, update, deactivate)
- Organization analytics dashboard with live charts
- PDF report export (4-page professional report)
- CSV export of department utilization
- Automated weekly timesheet reminder emails (scheduled + manual trigger)
- Email notifications for reminders

### Out of Scope (Future)
- Client-facing billing/invoicing (time → invoice)
- Payroll integration
- Mobile app
- Multi-tenancy (single-org for now)
- Time approval workflow (timesheets are submit-only, no manager approval)
- Advanced RBAC (custom permissions per user)

---

## 7. Key Constraints

- Timesheets are **Monday–Friday only** (weekends excluded)
- Max **one timesheet per employee per week** (enforced by unique constraint)
- Once **SUBMITTED**, a timesheet is read-only
- **COMPLETED** projects reject new time entries
- **INACTIVE** employees cannot log in (locked out via Spring Security)
- JWT tokens expire after **24 hours** (86400000ms)
- Leave types: `SICK`, `CASUAL`, `VACATION` — balances tracked client-side only
