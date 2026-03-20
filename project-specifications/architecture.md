# TimeKeeper — System Architecture

---

## System Overview

TimeKeeper is a full-stack SaaS workforce management application. The frontend is a React SPA served by Vite. The backend is a Spring Boot REST API with a MySQL database. Both run on localhost in development; they communicate over HTTP with JWT authentication.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                 │
│                                                                 │
│   React 18 SPA (Vite :5173)                                     │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Pages  │  Redux Store  │  Axios Client  │  Recharts    │  │
│   └─────────────────────────────────────────────────────────┘  │
│                          │                                      │
│             HTTP + JWT Bearer Token                             │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                    proxy /api → :8080
                    (Vite dev server)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Spring Boot :8080                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               Spring Security Filter Chain              │   │
│  │   JwtAuthFilter → SecurityContextHolder → @PreAuthorize │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │                    REST Controllers                      │   │
│  │  Auth │ Employee │ Timesheet │ Leave │ Holiday │ Report  │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │                   Service Layer                         │   │
│  │  Business logic │ JWT generation │ PDF rendering        │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │               Spring Data JPA Repositories              │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│                  Hibernate ORM (DDL auto=update)                │
└──────────────────────────────────────────────────────────────────┘
                           │
                    JDBC (HikariCP)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  MySQL 8  (localhost:3306)                      │
│                  Database: timekeeper_db                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Technology

| Layer | Technology |
|---|---|
| Build tool | Vite 5 |
| UI framework | React 18 |
| State management | Redux Toolkit |
| Routing | React Router DOM v6 |
| HTTP client | Axios |
| Charts | Recharts |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |

### Folder Structure

```
frontend/src/
├── app/
│   └── store.js            Redux store configuration
├── components/
│   ├── Layout.jsx          App shell (sidebar + header + outlet)
│   ├── Sidebar.jsx         Navigation sidebar
│   ├── ProtectedRoute.jsx  Route guard (check token + role)
│   ├── Modal.jsx           Generic dialog wrapper
│   └── ui.jsx              Shared UI primitives
├── features/               Redux slices (one per domain)
│   ├── auth/authSlice.js
│   ├── employees/
│   ├── departments/
│   ├── projects/
│   ├── timesheets/
│   ├── leaves/
│   └── holidays/
├── pages/                  Route-level page components
│   ├── Dashboard/
│   ├── Timesheets/
│   ├── Employees/
│   ├── Organization/       Admin analytics + export
│   ├── Departments/
│   ├── Projects/
│   ├── Team/
│   ├── Login/
│   ├── Profile/
│   └── MyLeaves/
└── services/               Axios wrapper functions
    ├── apiClient.js        Base Axios instance + interceptors
    ├── authService.js
    ├── employeeService.js
    ├── timesheetService.js
    ├── leaveService.js
    ├── holidayService.js
    ├── departmentService.js
    ├── projectService.js
    └── reportService.js
```

### Vite Dev Proxy

All requests to `/api` are proxied to the Spring Boot backend:

```js
// vite.config.js
server: {
  proxy: {
    '/api': 'http://localhost:8080'
  }
}
```

This avoids CORS issues during development. In production, a reverse proxy (Nginx / API Gateway) serves the same role.

---

## Backend Architecture

### Technology

| Layer | Technology |
|---|---|
| Runtime | Java 21/23 |
| Framework | Spring Boot 3.2.3 |
| Security | Spring Security 6 + JWT (jjwt 0.12.x) |
| Persistence | Spring Data JPA + Hibernate |
| Database | MySQL 8 |
| Connection pool | HikariCP (default) |
| Email | Spring Mail (Gmail SMTP) |
| PDF | OpenHTMLtoPDF 1.0.10 + Thymeleaf |
| Scheduling | Spring `@Scheduled` |

### Package Structure

```
com.timekeeper/
├── TimekeeperApplication.java
├── config/
│   ├── SecurityConfig.java          Security filter chain, CORS, BCrypt
│   └── DataInitializer.java         Seed admin user on startup
├── controller/                      REST controllers (one per domain)
├── dto/
│   ├── request/                     Incoming request DTOs
│   └── response/                    Outgoing response DTOs
├── entity/                          JPA entities
├── exception/                       Custom exceptions + global handler
├── repository/                      Spring Data JPA interfaces
├── security/                        JwtUtil, JwtAuthFilter, UserDetailsService
└── service/                         Business logic implementations
```

### Request Lifecycle

```
HTTP Request
  → JwtAuthFilter (validate + parse JWT → set SecurityContext)
  → Spring Security authorization check
  → Controller (@RestController, @RequestMapping)
  → Service (@Service, @Transactional where needed)
  → Repository (JpaRepository)
  → Hibernate → MySQL
  ← Entity → DTO mapping
  ← ResponseEntity<ApiResponse<?>>
```

### API Response Wrapper

All endpoints return a consistent envelope:

```json
{
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2026-03-16T14:30:00Z"
}
```

Errors follow the same envelope with appropriate HTTP status codes (400, 401, 403, 404, 500).

---

## Authentication Flow

```
1. POST /api/v1/auth/login  { email, password }
        ↓
2. UserDetailsService loads Employee by email
        ↓
3. BCryptPasswordEncoder.matches(rawPwd, hashedPwd)
        ↓
4. JwtUtil.generateToken(userDetails) → signed JWT (24h expiry)
        ↓
5. Response: { token, userId, name, role, email }
        ↓
6. Frontend stores token → localStorage["tk_token"]
        ↓
7. All subsequent requests:
   Axios interceptor adds: Authorization: Bearer <token>
        ↓
8. JwtAuthFilter.doFilterInternal():
   - Extracts token from Authorization header
   - JwtUtil.validateToken() → verify signature + expiry
   - Loads UserDetails from DB
   - SecurityContextHolder.setAuthentication(...)
        ↓
9. Controller method executes with authenticated principal
        ↓
10. 401 Unauthorized (expired/invalid token)
    → Axios 401 interceptor: clear localStorage + redirect to /login
```

---

## PDF Rendering Pipeline

```
Admin clicks "Export PDF"
        ↓
captureChartImage('.recharts-wrapper:first-of-type svg')
  SVG element → XMLSerializer → btoa → dataURL (base64 PNG)
        ↓
captureChartImage('.recharts-wrapper:last-of-type svg')
  (donut chart)
        ↓
POST /api/v1/reports/export-pdf
  Body: { stats, departmentData, trendChartImage, pieChartImage, weekLabel }
        ↓
PdfReportService.generateReport(request):
  1. Thymeleaf Context ← request fields
  2. templateEngine.process("report-template", ctx) → HTML string
  3. try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
       PdfRendererBuilder builder = new PdfRendererBuilder();
       builder.withHtmlContent(html, "/");
       builder.toStream(os);
       builder.run();
     }
  4. return os.toByteArray()
        ↓
ResponseEntity<byte[]>
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="timekeeper-report.pdf"
        ↓
Frontend: new Blob([response.data], { type: 'application/pdf' })
  → URL.createObjectURL(blob) → <a download> click
  → PDF save dialog
```

---

## Security Architecture

| Concern | Implementation |
|---|---|
| Authentication | Stateless JWT (no sessions, no cookies) |
| Password storage | BCrypt (Spring Security default strength) |
| Authorization | Role-based: `@PreAuthorize("hasRole('...')")` on service/controller methods |
| CORS | Allowed origins: `http://localhost:5173`, `5174`, `3000` |
| Transport | HTTP in dev; HTTPS required in production |
| Token storage | `localStorage` (XSS risk — documented limitation; move to httpOnly cookie for production) |
| Token expiry | 24 hours (`jwt.expiration=86400000` ms) |

---

## Scheduling

Spring's `@EnableScheduling` is enabled on `TimekeeperApplication`. Scheduled jobs:

| Job | Class | Default Schedule |
|---|---|---|
| Weekly timesheet reminders | `TimesheetReminderService` | Friday 2pm (configurable via cron) |

---

## Environment Configuration

All sensitive values use environment variable placeholders:

```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/timekeeper_db
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

# JWT
jwt.secret=${JWT_SECRET}
jwt.expiration=86400000

# Mail
spring.mail.username=${MAIL_USERNAME}
spring.mail.password=${MAIL_PASSWORD}
```

---

## Ports & URLs

| Service | Port | URL |
|---|---|---|
| Spring Boot API | 8080 | `http://localhost:8080` |
| Vite Dev Server | 5173 | `http://localhost:5173` |
| MySQL | 3306 | `localhost:3306/timekeeper_db` |

---

## Scalability Considerations (Future)

- Stateless JWT design allows horizontal scaling of backend instances without session affinity
- HikariCP connection pooling supports higher concurrency with minimal config changes
- PDF generation is CPU-bound — consider a dedicated worker queue (e.g., Spring Batch) for large reports
- Frontend bundle should be built with `vite build` and served via CDN/Nginx in production
- Replace Gmail SMTP with a transactional email provider (SendGrid, AWS SES) for production reliability
