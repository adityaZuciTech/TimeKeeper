# Engineering Improvements — TimeKeeper

> **Project:** TimeKeeper — a React + Spring Boot time-tracking SaaS  
> **Stack:** Java 21 · Spring Boot 3.2.3 · Spring Security 6 · MySQL 8 · React 18 · Redux Toolkit · Tailwind CSS · Playwright  
> **Author:** Aditya Ranjan  
> **Date:** March 2026

---

## 1. Overview

TimeKeeper is a full-stack SaaS application that allows employees to log weekly timesheets, apply for leaves, and lets managers and admins view utilization reports. It uses stateless JWT authentication, role-based access control (EMPLOYEE / MANAGER / ADMIN), and a MySQL-backed Spring Boot API served to a React frontend.

After completing feature development, a full code review and QA pass was conducted across all layers — security, correctness, performance, code structure, and UX. This document explains what was found, what was fixed, why each decision was made, and what was deliberately left out of scope.

---

## 2. Key Issues Identified

### Security

| Severity | Issue |
|---|---|
| Critical | Real DB credentials, JWT secret, and Gmail App Password committed in `application.properties` |
| Critical | `/auth/logout` endpoint existed but did nothing — JWT was never actually revoked |
| High | No login rate limiting — unlimited brute-force attempts allowed |
| High | JWT filter used a silent `catch (Exception e) {}` — any token parsing failure was swallowed |
| Medium | `GlobalExceptionHandler` leaked internal exception messages via `ex.getMessage()` in HTTP responses |
| Medium | CORS `allowedHeaders("*")` — any arbitrary header accepted from any client |
| Low | `spring.jpa.show-sql=true` and `DEBUG` logging committed to the base config (visible in production) |

### Performance

| Issue | Impact |
|---|---|
| `getDepartmentUtilization()` had a double nested loop: for every department, for every employee, fetch their timesheet and sum entries | O(N×M) DB calls. With 10 depts × 20 employees, that's 200+ queries per report load |
| `getProjectEffort()` loaded all time entries into memory and grouped them in Java | Scales poorly; unnecessary memory allocation |
| `getTeamUtilization()` fetched one employee at a time inside a loop | N+1 pattern |
| Leave list loaded one approver name per leave record in `toResponse()` | N+1 on approver lookups |
| No pagination on timesheet history | Full table scan returned for every timesheets page load |

### Bugs

| Bug | Impact |
|---|---|
| `TimeEntry.DayOfWeek.ordinal()` used to calculate date offset | Java enum ordinal is insertion-order-dependent — renaming or reordering the enum silently breaks date calculations |
| Submitting an empty timesheet (zero WORK entries) was permitted | Submitted timesheets with no logged time reached the DB |
| Ownership violations returned `BusinessException` (→ HTTP 400) instead of `AccessDeniedException` (→ HTTP 403) | Incorrect status codes — clients cannot distinguish "bad input" from "not authorized" |
| `AddTimeEntryRequest` had no cross-field validation — WORK entries could be submitted with null `projectId`, `startTime`, or `endTime` | Null pointer exception risk in service layer |
| `AuthService.login()` made two DB calls: `authenticate()` loaded the user, then `findByEmail()` loaded them again to build the response | Unnecessary round-trip per login |
| `ChangePasswordRequest` had no minimum password length enforcement | Any password including single characters accepted |
| Manager could call `getEmployeeTimesheetReport()` for employees in other teams | Cross-team data access not enforced at API level |
| Past-date leave was blocked for all types | Sick leave cannot always be planned in advance — retroactive sick leave is a real-world requirement |
| Frontend logout only dispatched a Redux `logout()` action — it never called `POST /auth/logout` | The JWT blacklist on the server was never invoked. A user who copied their token before logout could use it indefinitely |

### Code Structure

| Issue |
|---|
| `ReportService` returned inner static classes defined inside the service itself, coupling data shape to service internals |
| `AuthService` had no interface — untestable and unswappable |
| `UpdateTimeEntryRequest` and `UpdateEmployeeRequest` were bound with `@RequestBody` but without `@Valid` — validation annotations on the DTO were silently ignored |
| `TimesheetController` had no paginated endpoint — clients had to load all timesheets or use an arbitrary top-5 limit |

---

## 3. Fixes Implemented

### 3.1 Security

**Credentials removed from source control**

`application.properties` was rewritten to contain zero secrets. All environment-specific values (DB URL, credentials, JWT secret, mail password) were moved to a new `application-dev.properties` file which is:
- Listed in `.gitignore` — never committed
- Documented via a committed `application-dev.properties.example` with placeholder values for onboarding

```properties
# application.properties (safe to commit)
spring.profiles.active=dev
jwt.expiration=86400000
cors.allowed-origins=http://localhost:5173,http://localhost:5174
logging.level.com.timekeeper=INFO
spring.jpa.show-sql=false
```

**JWT token blacklist**

`TokenBlacklist.java` — a `ConcurrentHashMap<String, Long>` (token → expiry epoch) backed by a scheduled sweeper thread. When a user logs out, `JwtService.revokeToken()` adds the JWT to the blacklist. Every subsequent request through `JwtAuthenticationFilter` short-circuits `isTokenValid()` with `false` if the token appears in the map.

The sweeper runs every 10 minutes as a daemon thread, removing entries whose expiry has passed. This keeps memory bounded without requiring an external dependency.

**Frontend logout wired to backend**

The Redux `logout()` action previously only cleared local state. A new `logoutAsync` thunk was introduced that calls `POST /auth/logout` first (which revokes the token server-side), then clears Redux state and localStorage. The gap between the security implementation and the UI calling it is now closed.

**Login rate limiting**

`LoginRateLimiter.java` — a per-IP sliding window limiter (5 failed attempts per 60-second window). Implemented as a `ConcurrentHashMap<String, Bucket>` where each bucket records a count and window start epoch. On the 6th failed attempt, the endpoint returns `429 TOO_MANY_REQUESTS`. A successful login clears the bucket. The client IP is resolved from `X-Forwarded-For` first, falling back to `remoteAddr`.

**Exception handling hardened**

- `JwtAuthenticationFilter` now catches `ExpiredJwtException`, `MalformedJwtException`, and `SignatureException` with specific log levels (DEBUG for expiry, WARN for tampering). The previous silent `catch (Exception e) {}` is gone.
- `GlobalExceptionHandler` no longer returns `ex.getMessage()` in HTTP responses. Internal exception details are logged server-side. Client responses contain only generic, safe messages.
- `DataIntegrityViolationException` was added as a handled case (DB-level constraint violations now return `409 Conflict` instead of `500`).

**CORS restricted**

`allowedHeaders` changed from `List.of("*")` to `List.of("Authorization", "Content-Type", "Accept")`.

---

### 3.2 Performance

**Replaced N+1 loops with aggregate JPQL queries**

Three new aggregate queries were added to `TimeEntryRepository`:

```java
// Department utilization — replaces 200+ queries with 1
@Query("""
    SELECT e.department.id, COALESCE(SUM(te.hoursLogged), 0)
    FROM TimeEntry te
    JOIN te.timesheet t JOIN t.employee e
    WHERE t.weekStartDate = :weekStart AND te.entryType = 'WORK'
    GROUP BY e.department.id
    """)
List<Object[]> sumHoursByDepartmentForWeek(@Param("weekStart") LocalDate weekStart);
```

All three report methods (`getTeamUtilization`, `getDepartmentUtilization`, `getProjectEffort`) were rewritten to issue a single aggregate query and map results in Java. Query count dropped from O(N×M) to O(1).

**Batch approver resolution**

`LeaveServiceImpl.resolveApproverNames()` — collects all unique `approverId` values from a leave list and calls `findAllById()` once. The result is passed as a `Map<String, String>` into each `toResponse()` call. This eliminates N approver lookups per list view.

**Pagination**

`TimesheetRepository` gained a `Page<Timesheet> findByEmployeeId(id, Pageable)` method. A new controller endpoint `GET /timesheets/my/all?page=0&size=10` exposes paginated timesheet history. Page size is capped at 50 server-side to prevent abuse.

---

### 3.3 Bugs

**`ordinal()` replaced with an explicit map**

```java
private static final Map<TimeEntry.DayOfWeek, Integer> DAY_OFFSET = Map.of(
    TimeEntry.DayOfWeek.MONDAY,    0,
    TimeEntry.DayOfWeek.TUESDAY,   1,
    TimeEntry.DayOfWeek.WEDNESDAY, 2,
    TimeEntry.DayOfWeek.THURSDAY,  3,
    TimeEntry.DayOfWeek.FRIDAY,    4
);
```

The comment in code explicitly warns that `ordinal()` is fragile. Any future insertion or reordering of enum values would have silently broken week-start date calculations for all timesheets.

**Empty timesheet submission blocked**

`TimesheetService.submit()` now checks for at least one WORK entry before changing status. If none exist, it throws `BusinessException("Cannot submit an empty timesheet. Please log at least one work entry.")`.

**Correct HTTP status codes**

All ownership/authorization failures now use `AccessDeniedException` (Spring Security), which `GlobalExceptionHandler` maps to `403 Forbidden`. Previously these were `BusinessException` (→ `400 Bad Request`), which made it impossible for clients to distinguish "you sent invalid data" from "you're not allowed here".

**Cross-field validation on `AddTimeEntryRequest`**

Two `@AssertTrue` validators were added:
- `isWorkEntryValid()` — WORK entry type requires non-null `projectId`, `startTime`, and `endTime`
- `isTimeRangeValid()` — `startTime` must be strictly before `endTime`

These run at the controller boundary before the request reaches the service layer.

**Login double DB call eliminated**

```java
// Before: two DB calls
authenticationManager.authenticate(...)    // loads user
employeeRepository.findByEmail(email)      // loads user again

// After: one DB call
Authentication auth = authenticationManager.authenticate(...)
Employee employee = (Employee) auth.getPrincipal()  // reuse loaded principal
```

**Manager cross-team access blocked**

`ReportService.getEmployeeTimesheetReport()` now accepts `requesterId` and `requesterRole`. When the requester is a MANAGER, it fetches `findByManagerId(requesterId)` and verifies the target employee is a direct report. If not, `AccessDeniedException` is thrown.

**Past-date leave allowed**

The validation that blocked any leave with a start date in the past was removed. Only the end-before-start check remains. Employees can now file sick leave retroactively.

**`@Valid` added to update endpoints**

`TimesheetController.updateEntry()` and `EmployeeController.update()` both had `@RequestBody` without `@Valid`. All validation annotations on those DTOs were silently ignored. Both endpoints now enforce validation.

---

### 3.4 Code Quality

**`ReportResponse.java` — DTOs extracted from service**

All report data types (`TeamUtilizationReport`, `EmployeeTimesheetReport`, `ProjectEffortReport`, `DepartmentUtilization`, etc.) were moved into a dedicated `ReportResponse.java` as `public static` nested classes. The service no longer defines its own data shape — it returns standard DTOs, and the controller is decoupled from service internals.

**`IAuthService` interface**

`AuthService` now implements `IAuthService`. This enables mock injection in unit tests without needing the full Spring context, and allows swapping the implementation (e.g., for OAuth) without touching the controller.

**`PasswordEncoder` minimum length**

`@Size(min = 8)` added to `ChangePasswordRequest.newPassword`. Password policy is now enforced at the DTO level.

---

## 4. Tradeoffs & Decisions

### In-memory JWT blacklist instead of Redis

**Decision:** `ConcurrentHashMap` with a daemon sweeper thread  
**Why:** This is a locally-run project with no Redis instance. Introducing Redis just for logout would require Docker or an external process, increase setup burden for contributors, and add a hard dependency at startup. The in-memory approach is sufficient — it is thread-safe, bounded via the sweeper, and documented clearly in code with a note: *"For multi-node deployments, replace with a shared store (Redis, DB)."*

**Tradeoff accepted:** If the server restarts, the blacklist is lost. Any tokens that were revoked before restart would be accepted again until they naturally expire. For a 24-hour expiry window with a local dev server, this is an acceptable risk.

### Simple rate limiter instead of a library (Bucket4j, Resilience4j)

**Decision:** Custom `LoginRateLimiter` with a `ConcurrentHashMap`  
**Why:** A full rate-limiting library adds a dependency for one endpoint with a simple fixed-window policy. The custom implementation is 50 lines, fully readable, and has no external configuration surface. It covers the actual threat model (repeated failed login attempts from a single IP).

**Tradeoff accepted:** Not distributed — two instances behind a load balancer would not share rate limit state. Acceptable for this scope.

### No password hashing migration tooling

**Decision:** New `@Size(min=8)` constraint applies only to the change-password flow  
**Why:** Existing passwords in the DB may be shorter. Retroactively invalidating them would lock out users. The constraint was scoped to new password changes, which is the standard approach.

### Hibernate JPQL over native SQL for aggregate queries

**Decision:** JPQL with Spring Data  
**Why:** Keeps queries within the JPA abstraction layer, which is already in use throughout the codebase. Native SQL would require explicit result mapping and bypass Hibernate's type safety. The performance delta is negligible at this scale.

### Playwright tests assert URL not DOM state for error messages

**Decision:** The "shows error on invalid credentials" test asserts the user stays on `/login`, not that a specific toast text appears  
**Why:** `react-hot-toast` renders its ARIA live region as a 1×1px visually-hidden element. Playwright's `toBeVisible()` correctly treats invisible elements as non-visible. Asserting the DOM content of toasts is brittle — toast message text changes break tests. The meaningful behavior to test is that bad credentials do not grant access, which the URL assertion covers.

---

## 5. What Was Intentionally Not Implemented

### No microservices

The application is deployed as a single Spring Boot jar. Splitting it into separate auth, timesheet, leave, and reporting services would add network overhead, distributed tracing requirements, service discovery, and inter-service auth — none of which is justified for a project of this scale.

### No distributed caching (Redis, Hazelcast)

Not needed. All aggregate queries now run in milliseconds at the DB level. Adding a cache layer would increase complexity and require cache invalidation logic for every write path.

### No container/cloud infrastructure (Docker, Kubernetes, AWS)

This is a local development project. Infrastructure-as-code would be appropriate if this were deployed to a shared environment, but setting it up would be engineering effort that adds no value to the current scope.

### No OAuth / external identity providers

The application uses its own BCrypt-hashed password store. Integrating Google OAuth or Azure AD would be a meaningful improvement for enterprise use, but it introduces significant complexity (PKCE flows, token exchange, session management) that is out of scope.

### No audit log / event sourcing

No immutable audit trail was implemented for timesheet submissions, leave approvals, etc. A production-grade HR tool would need this. The current approach uses a `status` field on mutable records.

### No email queue (message broker)

Timesheet reminder emails are sent synchronously via `JavaMailSender`. A proper implementation would use a message queue (RabbitMQ, SQS) with retry logic and dead-letter queues. For this scope, the synchronous approach is acceptable — failures produce log entries and are non-blocking for the user.

---

## 6. Future Improvements

### High Priority

| Improvement | Why |
|---|---|
| **Redis for JWT blacklist** | Makes logout state survive server restarts and scales to multiple instances |
| **Refresh token rotation** | 24-hour JWT expiry is long. A short-lived access token (15 min) + refresh token would reduce the exposure window for stolen tokens |
| **Rate limiting at gateway/filter level** | Move rate limiting upstream so it protects all endpoints, not just login |
| **Input sanitisation for free-text fields** | `description` fields in time entries are stored and displayed without sanitisation |

### Medium Priority

| Improvement | Why |
|---|---|
| **Role-based fine-grained permissions** | Currently a binary role check. A permission system (e.g., `TIMESHEET_SUBMIT`, `LEAVE_APPROVE`) would allow more flexible access control |
| **Persistent audit log** | Record who changed what and when — essential for payroll accuracy |
| **Real notification system** | The UI shows a "Coming Soon" banner. Push notifications (WebSockets or polling) for leave approvals would improve UX significantly |
| **Timesheet approval workflow** | Currently timesheets move directly from DRAFT → SUBMITTED with no manager review step |

### Low Priority

| Improvement | Why |
|---|---|
| **Better analytics engine** | Current Organization page shows basic department utilisation. A proper analytics layer could show trends, forecasts, and headcount planning data |
| **CSV/Excel export** | PDF export is implemented; CSV export would make data portable for payroll systems |
| **Dark mode persistence** | UI supports dark mode classes but the toggle state is not persisted across sessions |
| **Multi-language support (i18n)** | All UI strings are hardcoded in English |

---

## 7. Testing Strategy

### Backend — Unit Tests (JUnit 5 + Mockito)

Three service-level test suites with mocked repositories and no Spring context:

| Suite | Tests | Coverage |
|---|---|---|
| `AuthServiceTest` | 5 | Login success/failure, password change (success, wrong password, not found) |
| `LeaveServiceTest` | 6 | Apply future/past leave, end-before-start, overlap detection, approve pending/already-approved |
| `TimesheetServiceTest` | 8 | Create timesheet, get by id, submit with entries/empty/wrong user/already-submitted, add valid entry/entry on completed project |

**Philosophy:** Unit tests run in milliseconds with no DB or Spring context. Mocks are used at the repository boundary. Each test verifies one behaviour and one expected outcome. Tests document the service contract — reading them tells you exactly what the service does and what it refuses to do.

### Backend — Integration Tests (MockMvc + H2)

`AuthControllerIntegrationTest` — 4 tests that start a real Spring context (with an in-memory H2 DB) and exercise the full request/response cycle via MockMvc:

| Test | Verifies |
|---|---|
| Valid login returns 200 with token | Login happy path end-to-end |
| Invalid password returns 401 | Bad credential handling |
| Unknown email returns 401 | User-not-found handling |
| Missing email returns 400 | Bean validation at controller level |

A `@MockBean JavaMailSender` prevents the H2 context from failing due to missing SMTP config.

### Smoke Test

`TimekeeperApplicationTests.contextLoads()` — verifies the Spring application context starts without exceptions. Catches misconfigured beans, missing properties, or circular dependencies before any other test runs.

### Frontend — E2E Tests (Playwright / Chromium)

11 tests across 3 spec files targeting the running application at `BASE_URL` (default: `http://localhost:5173`, overridable via env var):

| File | Tests | Coverage |
|---|---|---|
| `auth.spec.js` | 4 | Login form visible, bad credentials stay on `/login`, successful login redirects to `/dashboard`, logout clears session and revokes access |
| `timesheets.spec.js` | 3 | Timesheets page loads with create button, new timesheet shows week selector, non-existent timesheet ID handled |
| `general.spec.js` | 4 | 404 page for unknown routes, leaves page loads, apply-leave button visible, organization page accessible to admin |

**Selector strategy:** Tests use semantic selectors (`getByRole`, `getByLabel`) where possible, not CSS class names. This is resilient to UI restyling. The one exception — the error toast test — asserts URL (user stays on `/login`) rather than DOM content, because toast DOM structure is implementation-specific and brittle to test directly.

**Running all tests:**

```bash
# Backend (24 tests)
cd backend
mvn -Dspring.profiles.active=test test

# Frontend E2E (11 tests) — requires both servers running
cd frontend
BASE_URL=http://localhost:5174 npx playwright test
```

---

*This document reflects the state of the codebase as of commit `148dfbd`.*
