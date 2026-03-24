# TimeKeeper

A full-stack **Workforce Time Tracking SaaS Application** built with Spring Boot and React. TimeKeeper enables organizations to track employee hours across projects, manage leave, monitor team utilization, and export detailed analytics reports.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 3.2.3, Spring Security 6, JWT (jjwt 0.12.x) |
| Database | MySQL 8 (`timekeeper_db`) |
| ORM | Spring Data JPA + Hibernate (DDL auto=update) |
| PDF Export | OpenHTMLtoPDF 1.0.10 + Thymeleaf |
| Email | Spring Mail (Gmail SMTP / STARTTLS) |
| Frontend | React 18, Vite 5, Redux Toolkit, Tailwind CSS 3, Recharts |
| HTTP Client | Axios (JWT interceptor + global 401 handler) |
| Build | Maven (backend), npm (frontend) |

---

## Features

- **Timesheets** — Create, edit, and submit weekly timesheets with daily time entries per project
- **Leave Management** — Apply for leave (Sick / Casual / Vacation), manager approval/rejection workflow
- **Team Management** — Managers view team members and their timesheets
- **Holidays** — Admin-managed holiday calendar integrated with leave date validation
- **Organization Dashboard** — Admin analytics with 6-week trend chart, department utilization, and insights (Recharts)
- **Export Reports** — CSV (client-side) and 4-page PDF (server-rendered via OpenHTMLtoPDF)
- **Email Notifications** — Automated weekly timesheet reminder emails (Friday 18:00 + Monday 09:00 cron), plus admin manual trigger
- **Role-Based Access** — Three roles: Employee, Manager, Admin with `@PreAuthorize` enforcement

---

## Prerequisites

- **Java 21+** — [Download](https://adoptium.net/)
- **Maven 3.8+** — [Download](https://maven.apache.org/download.cgi)
- **Node.js 18+** and **npm** — [Download](https://nodejs.org/)
- **MySQL 8** — [Download](https://dev.mysql.com/downloads/)
- **Git** — [Download](https://git-scm.com/)

Verify installations:
```bash
java -version    # 21.x or higher
mvn -version
node -version    # v18 or higher
mysql --version
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/adityaZuciTech/TimeKeeper.git
cd TimeKeeper
```

---

### 2. Set Up the Database

Create the MySQL database:
```sql
CREATE DATABASE timekeeper_db;
```

---

### 3. Configure Environment Variables

Set the following environment variables (or update `backend/src/main/resources/application.properties` directly for local dev):

| Variable | Description |
|---|---|
| `DB_USERNAME` | MySQL username (e.g. `root`) |
| `DB_PASSWORD` | MySQL password |
| `JWT_SECRET` | Secret key for signing JWTs (min 32 chars) |
| `MAIL_USERNAME` | Gmail address for sending reminder emails |
| `MAIL_PASSWORD` | Gmail App Password (not account password) |

PowerShell example:
```powershell
$env:DB_USERNAME="root"
$env:DB_PASSWORD="yourpassword"
$env:JWT_SECRET="your-secret-key-minimum-32-characters"
$env:MAIL_USERNAME="your@gmail.com"
$env:MAIL_PASSWORD="your-app-password"
```

---

### 4. Run the Backend

```bash
cd backend
mvn spring-boot:run
```

- API server starts on **http://localhost:8080**
- Hibernate creates all tables automatically on first run (`ddl-auto=update`)
- `DataInitializer` seeds demo departments, employees, and projects on first startup

---

### 5. Run the Frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

- App starts on **http://localhost:5173** (Vite auto-selects next free port if taken)
- All `/api` requests are proxied to `http://localhost:8080` by Vite

---

## Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@timekeeper.app` | `Admin123!` |
| Manager | `manager@timekeeper.app` | `Manager123!` |
| Employee | `john@timekeeper.app` | `Employee123!` |

---

## Project Structure

```
TimeKeeper/
├── backend/                        # Spring Boot application
│   ├── src/main/java/com/timekeeper/
│   │   ├── config/                 # SecurityConfig, DataInitializer
│   │   ├── controller/             # REST controllers (Auth, Employee, Timesheet,
│   │   │                           #   Leave, Holiday, Department, Project,
│   │   │                           #   Report, AdminReminder)
│   │   ├── dto/
│   │   │   ├── request/            # Incoming request DTOs
│   │   │   └── response/           # Outgoing response DTOs
│   │   ├── entity/                 # JPA entities (Employee, Timesheet, TimeEntry,
│   │   │                           #   Leave, Holiday, Department, Project)
│   │   ├── exception/              # Custom exceptions + GlobalExceptionHandler
│   │   ├── repository/             # Spring Data JPA interfaces
│   │   ├── scheduler/              # TimesheetReminderScheduler (cron jobs)
│   │   ├── security/               # JwtUtil, JwtAuthFilter, UserDetailsService
│   │   └── service/                # Business logic + PdfReportService, EmailService
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── templates/
│   │       └── report-template.html  # Thymeleaf PDF template (4-page)
│   └── pom.xml
│
├── frontend/                       # React + Vite SPA
│   ├── src/
│   │   ├── app/store.js            # Redux store (7 slices)
│   │   ├── components/             # Layout, Sidebar, Modal, ProtectedRoute, ui
│   │   ├── features/               # Redux slices: auth, employees, departments,
│   │   │                           #   projects, timesheets, leaves, holidays
│   │   ├── pages/                  # Dashboard, Timesheets, Employees, Organization,
│   │   │                           #   Departments, Projects, Team, MyLeaves,
│   │   │                           #   Holidays, Profile, Login
│   │   └── services/               # Axios wrappers: apiClient, authService,
│   │                               #   employeeService, timesheetService,
│   │                               #   leaveService, holidayService,
│   │                               #   departmentService, projectService, reportService
│   ├── package.json
│   └── vite.config.js
│
└── project-specifications/         # Full production-grade documentation
    ├── product-overview.md
    ├── feature-list.md
    ├── user-roles-and-permissions.md
    ├── architecture.md
    ├── api-specification.md
    ├── database-schema.md
    ├── state-management.md
    ├── timesheets.md
    ├── leaves.md
    ├── team-management.md
    ├── holidays.md
    ├── reports-and-analytics.md
    ├── export-and-reporting.md
    ├── notifications.md
    ├── billing-and-invoicing.md
    └── API/                        # Legacy per-endpoint API docs
```

---

## API Overview

All endpoints are under `/api/v1/`. Base URL: `http://localhost:8080/api/v1`

| Controller | Base Path | Min Role |
|---|---|---|
| Auth | `/auth` | Public (login), Authenticated (others) |
| Employees | `/employees` | ADMIN (write), all roles (own profile) |
| Departments | `/departments` | ADMIN (write), all roles (read) |
| Projects | `/projects` | ADMIN (write), all roles (read) |
| Timesheets | `/timesheets` | All roles |
| Leaves | `/leaves` | All roles (apply/view), MANAGER+ (approve/reject) |
| Holidays | `/holidays` | All roles (read), ADMIN (write) |
| Reports | `/reports` | MANAGER+ (most), ADMIN (dept-util, PDF export) |
| Admin Reminders | `/admin/reminders` | ADMIN |

See [project-specifications/api-specification.md](project-specifications/api-specification.md) for the full API reference.

---

## Common Issues

**Backend fails to start — datasource error**
- Ensure MySQL is running and `timekeeper_db` database exists
- Check `DB_USERNAME` and `DB_PASSWORD` environment variables are set

**Port 8080 already in use (Windows)**
```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | Select-Object OwningProcess
Stop-Process -Id <PID> -Force
```

**`npm install` fails**
- Ensure Node.js 18+: `node -version`
- Delete `node_modules` and `package-lock.json`, then re-run `npm install`

**Login fails / 401 after page refresh**
- JWT is stored in `localStorage` as `tk_token` — clear it and log in again if it becomes invalid
- Ensure `JWT_SECRET` is set and consistent across restarts

**CORS error in browser console**
- The frontend must run on port `5173`, `5174`, or `3000`
- If using a different port, add it to `cors.allowed-origins` in `application.properties` and restart the backend

**PDF export fails**
- Check backend logs for `SAXParseException` — ensure the Thymeleaf template has CDATA-wrapped CSS
- OpenHTMLtoPDF requires `MAIL_USERNAME` env var only for email features — PDF itself has no mail dependency

---

## Available Scripts

### Backend
```bash
mvn spring-boot:run          # Start dev server (port 8080)
mvn clean package            # Build production JAR
java -jar target/timekeeper-backend-1.0.0.jar  # Run built JAR
```

### Frontend
```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Build for production (output: dist/)
npm run preview  # Preview production build locally
```

---

## Documentation

Full production-grade documentation is in [`project-specifications/`](project-specifications/):

| Document | Description |
|---|---|
| [product-overview.md](project-specifications/product-overview.md) | Tech stack, navigation map, in/out scope |
| [architecture.md](project-specifications/architecture.md) | System diagram, request lifecycle, auth flow |
| [api-specification.md](project-specifications/api-specification.md) | Complete REST API reference |
| [database-schema.md](project-specifications/database-schema.md) | All tables, columns, constraints, ER diagram |
| [state-management.md](project-specifications/state-management.md) | Redux slices, localStorage, Axios client |
| [feature-list.md](project-specifications/feature-list.md) | Full feature inventory with implementation status |
| [user-roles-and-permissions.md](project-specifications/user-roles-and-permissions.md) | Role matrix and security model |
| [timesheets.md](project-specifications/timesheets.md) | Timesheet module — flows, rules, edge cases |
| [leaves.md](project-specifications/leaves.md) | Leave management module |
| [team-management.md](project-specifications/team-management.md) | Team and employee management |
| [holidays.md](project-specifications/holidays.md) | Holiday calendar and timesheet integration |
| [reports-and-analytics.md](project-specifications/reports-and-analytics.md) | Organization dashboard and report types |
| [export-and-reporting.md](project-specifications/export-and-reporting.md) | CSV and PDF export pipeline |
| [notifications.md](project-specifications/notifications.md) | Email reminders and notification system |

---

## Testing

### Backend Tests
```bash
cd backend
mvn test
```
- **24 tests** across unit (JUnit 5 + Mockito) and integration (`@SpringBootTest` + MockMvc)
- Covers: `AuthService`, `TimesheetService`, `LeaveService`, `AuthController` integration

### Frontend E2E Tests (Playwright)
```bash
cd frontend
npx playwright test
```
- **53 E2E tests** across authentication, timesheets, employees, leaves, reports, general navigation
- Requires both backend and frontend servers to be running

---

## Code Review & Audit

Full audit artifacts are in [`code-review/`](code-review/):

| Document | Description |
|---|---|
| [FINAL_AUDIT_REPORT.md](code-review/FINAL_AUDIT_REPORT.md) | System quality summary, issues found, fixes, readiness rating |
| [CODE_REVIEW.md](code-review/CODE_REVIEW.md) | Detailed security, performance, architecture findings |
| [TEST_CASES.md](code-review/TEST_CASES.md) | Complete test scenario inventory (positive, negative, edge, security) |
| [IMPROVEMENT_LOG.md](code-review/IMPROVEMENT_LOG.md) | Session-by-session history of all improvements made |

**Audit Result: 9.0 / 10 — Production-Ready (Demo Scope)**