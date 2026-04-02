# TimeKeeper — Complete Technical Documentation

> **Audience:** New developers, hiring managers, tech leads, and architects who need to understand this system end-to-end.
> **Purpose:** Full knowledge-transfer manual. Every decision is explained. Every annotation is defined. No assumed knowledge.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Backend — Spring Boot](#2-backend--spring-boot)
   - [2.1 Architecture & Layered Pattern](#21-architecture--layered-pattern)
   - [2.2 Core Annotations Reference](#22-core-annotations-reference)
   - [2.3 Authentication & Security](#23-authentication--security)
   - [2.4 Database Schema](#24-database-schema)
   - [2.5 API Design](#25-api-design)
   - [2.6 Business Logic Deep Dive](#26-business-logic-deep-dive)
   - [2.7 Design Patterns Used](#27-design-patterns-used)
   - [2.8 Performance Considerations](#28-performance-considerations)
   - [2.9 Future Improvements](#29-future-improvements)
3. [Frontend — React](#3-frontend--react)
   - [3.1 Architecture & Folder Structure](#31-architecture--folder-structure)
   - [3.2 State Management — Redux Toolkit](#32-state-management--redux-toolkit)
   - [3.3 API Integration — Axios](#33-api-integration--axios)
   - [3.4 Routing & Protected Routes](#34-routing--protected-routes)
   - [3.5 UI/UX Design Decisions](#35-uiux-design-decisions)
   - [3.6 Optimizations](#36-optimizations)
   - [3.7 Frontend Improvements](#37-frontend-improvements)
4. [End-to-End Flows](#4-end-to-end-flows)
   - [4.1 Login Flow](#41-login-flow)
   - [4.2 Timesheet Flow](#42-timesheet-flow)
   - [4.3 Leave Flow](#43-leave-flow)
   - [4.4 Report Flow](#44-report-flow)
5. [Trade-off Analysis](#5-trade-off-analysis)
6. [Scalability & Future Architecture](#6-scalability--future-architecture)
7. [Interview Preparation](#7-interview-preparation)

---

## 1. System Overview

### What Is TimeKeeper?

TimeKeeper is an internal workforce time-tracking SaaS application. Employees log their weekly work hours against projects, apply for leaves, and submit timesheets for managerial review. Managers approve or reject timesheets and leave requests. Administrators manage the entire workforce — creating employees, departments, and projects, generating reports, and configuring company holidays.

### Who Uses It?

| Role | Primary Actions |
|---|---|
| **Employee** | Create timesheet, log work hours, submit for approval, apply for leave |
| **Manager** | Review team timesheets, approve/reject leaves, view team activity |
| **Admin** | Manage employees, departments, projects, holidays; view all reports |

---

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                         │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │               React 18 + Vite (Port 5173)               │   │
│   │                                                         │   │
│   │  Redux Toolkit ──── React Router v6 ──── Tailwind CSS   │   │
│   │       │                    │                            │   │
│   │  Global State       Protected Routes                    │   │
│   │       │                    │                            │   │
│   │  Feature Slices      Role-based UI                      │   │
│   └────────────────────┬────────────────────────────────────┘   │
│                        │  HTTP/JSON via Axios                   │
│                        │  Authorization: Bearer <JWT>           │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                  (localhost:8080 in dev)
                  (same domain in production via reverse proxy)
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│                Spring Boot 3.2.3   (Port 8080)                   │
│                                                                  │
│  HTTP Request                                                    │
│       │                                                          │
│       ▼                                                          │
│  JwtAuthenticationFilter  ←──── OncePerRequestFilter            │
│       │  (validates JWT, populates SecurityContext)              │
│       ▼                                                          │
│  Spring Security Filter Chain                                    │
│       │  (@PreAuthorize role checks)                             │
│       ▼                                                          │
│  Controller Layer  (@RestController)                             │
│       │  (parses HTTP request, calls service)                    │
│       ▼                                                          │
│  Service Layer  (@Service, @Transactional)                       │
│       │  (all business logic lives here)                         │
│       ▼                                                          │
│  Repository Layer  (JpaRepository)                               │
│       │  (data access — SQL/JPQL)                                │
│       ▼                                                          │
│  JPA / Hibernate  (ORM — maps Java objects to tables)            │
│       │                                                          │
└───────┼──────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────┐     ┌──────────────────────┐
│     MySQL Database    │     │  SMTP Mail Server     │
│  (timekeeper_db)      │     │  (Gmail in dev)       │
│  - employees          │     │  JavaMailSender        │
│  - timesheets         │     └──────────────────────┘
│  - time_entries       │
│  - leaves             │     ┌──────────────────────┐
│  - notifications      │     │  H2 In-Memory (Tests)│
│  - departments        │     │  (no MySQL needed)   │
│  - projects           │     └──────────────────────┘
│  - holidays           │
└───────────────────────┘
```

---

### Request–Response Lifecycle (Step by Step)

When a user does anything in the browser, here is exactly what happens:

```
1. User action (click button, submit form)
         │
2. React component calls a Redux Thunk (createAsyncThunk)
         │
3. Thunk calls service function (e.g., timesheetService.createTimesheet())
         │
4. Service function calls apiClient.post('/timesheets', data)
         │
5. Axios Request Interceptor runs:
   - Reads JWT from localStorage
   - Adds 'Authorization: Bearer <token>' header
         │
6. HTTP request crosses the network to Spring Boot (port 8080)
         │
7. JwtAuthenticationFilter intercepts EVERY request:
   - Reads 'Authorization' header
   - Extracts and validates the JWT
   - Looks up the user from DB
   - Populates Spring's SecurityContext with the user identity
         │
8. Spring Security checks @PreAuthorize("hasRole('ADMIN')")
   - If role doesn't match → 403 response (never reaches controller)
         │
9. Controller method runs:
   - Reads @RequestBody, @PathVariable, @RequestParam
   - Calls service method
   - Wraps result in ApiResponse<T>
   - Returns ResponseEntity with HTTP status code
         │
10. Service method runs:
    - Performs business logic
    - Throws BusinessException or AccessDeniedException if rules violated
    - Calls Repository for data
    - Builds and returns DTO
         │
11. Repository performs SQL/JPQL query via Hibernate
    - Returns JPA Entity
         │
12. GlobalExceptionHandler catches any exception:
    - Maps BusinessException → 400
    - Maps AccessDeniedException → 403
    - Maps ResourceNotFoundException → 404
    - Returns consistent ApiResponse<Void> error format
         │
13. JSON response leaves Spring Boot
         │
14. Axios Response Interceptor runs:
    - If 401 (and not login endpoint) → clear storage, redirect to /login
         │
15. Redux Thunk resolves/rejects:
    - fulfilled → update Redux state
    - rejected → set error message in state
         │
16. React component re-renders because Redux state changed
    - Shows success state / error message / new data
```

---

### Why This Architecture? (Monolith Decision)

**Decision made: Monolith (single deployable unit)**

| Criterion | Monolith (Chosen) | Microservices (Rejected for now) |
|---|---|---|
| Team size | 1–5 developers | Needs 20+ for full benefit |
| Deployment | 1 JAR file | Kubernetes, service mesh, distributed tracing |
| DB transactions | Single ACID transaction | Distributed sagas, eventual consistency |
| Debugging | One log stream | Need distributed tracing (Jaeger, Zipkin) |
| Inter-module calls | In-process Java method calls (nanoseconds) | HTTP/gRPC (~5–50ms + failure risk) |
| Time to first feature | Days | Weeks |
| Operational complexity | Low | Very high |

**Key principle applied:** "Modularize first, distribute later." The codebase is structured with clean feature packages, clear service boundaries, and no inter-feature coupling. This means if the system grows to a point where microservices make sense, the extraction path is clear. We don't pay the operational cost of microservices until we get their benefits.

---

## 2. Backend — Spring Boot

### 2.1 Architecture & Layered Pattern

The backend follows the classic **four-layer architecture**:

```
┌─────────────────────────────────────┐
│  CONTROLLER LAYER                   │
│  Class: @RestController             │
│  Job: HTTP in → HTTP out            │
│  Knows about: HTTP verbs, status    │
│               codes, request DTOs  │
│  Does NOT know about: SQL, business │
│               rules                 │
└─────────────────┬───────────────────┘
                  │ delegates to
                  ▼
┌─────────────────────────────────────┐
│  SERVICE LAYER                      │
│  Class: @Service                    │
│  Job: ALL business logic            │
│  Knows about: Business rules,       │
│               validations,          │
│               cross-entity ops      │
│  Does NOT know about: HTTP, SQL     │
└─────────────────┬───────────────────┘
                  │ queries via
                  ▼
┌─────────────────────────────────────┐
│  REPOSITORY LAYER                   │
│  Interface: JpaRepository           │
│  Job: Data access only              │
│  Knows about: SQL/JPQL, tables      │
│  Does NOT know about: HTTP, rules   │
└─────────────────┬───────────────────┘
                  │ maps to/from
                  ▼
┌─────────────────────────────────────┐
│  ENTITY / DOMAIN LAYER              │
│  Class: @Entity                     │
│  Job: Represent DB table structure  │
│  Knows about: column names, types,  │
│               relationships         │
└─────────────────────────────────────┘
```

#### Why This Pattern?

1. **Single Responsibility Principle:** Each layer has exactly one reason to change.
   - API contract changes? Only controller changes.
   - Business rule changes? Only service changes.
   - Database schema changes? Only entity and repository change.

2. **Independent Testability:**
   - Service tests use Mockito — no database needed. Fast (< 1s per test).
   - Integration tests test the full stack with H2 in-memory DB. Thorough but slower.
   - If everything were in one class, you couldn't test business logic without starting a database.

3. **Team Parallelism:** Different developers can work on the API design and the business logic simultaneously without merge conflicts.

---

### 2.2 Core Annotations Reference

This section explains every annotation you'll see in the codebase — what it does, how Spring handles it internally, and *why* it's used.

#### Application Bootstrap

```java
@SpringBootApplication
public class TimekeeperApplication { ... }
```

`@SpringBootApplication` is a **meta-annotation** that combines three annotations:
- `@Configuration` — marks this class as a Spring bean definition source
- `@EnableAutoConfiguration` — tells Spring Boot to auto-configure beans based on the classpath (e.g., if H2 is on classpath in test, configure H2 DataSource)
- `@ComponentScan` — tells Spring to scan this package and all sub-packages for annotated classes (`@Service`, `@Repository`, etc.)

Without this, you'd have to manually register every bean. Spring Boot's auto-configuration is why `pom.xml` dependencies just work.

---

#### Controller Layer

```java
@RestController
@RequestMapping("/api/v1/leaves")
@RequiredArgsConstructor
public class LeaveController { ... }
```

**`@RestController`** = `@Controller` + `@ResponseBody`
- `@Controller` registers this class as a Spring MVC controller (request handler)
- `@ResponseBody` tells Spring to serialize return values to JSON automatically (using Jackson ObjectMapper)
- Without `@ResponseBody`, Spring would try to resolve a "view" (like a Thymeleaf template) — not what we want for a REST API

**`@RequestMapping("/api/v1/leaves")`**
Defines the URL prefix for all methods in this controller. Every method inside inherits this prefix. This avoids repeating `/api/v1/leaves` on every method.

**`@RequiredArgsConstructor`** (Lombok)
Auto-generates a constructor with all `final` fields as parameters. This enables **constructor injection** (the recommended Spring injection style) without boilerplate.

**Why constructor injection over `@Autowired` field injection?**
```java
// Field injection (NOT recommended)
@Autowired
private LeaveService leaveService; // Spring injects this via reflection

// Constructor injection (RECOMMENDED — what we use)
private final LeaveService leaveService; // Lombok generates constructor
```
Constructor injection is preferred because:
- The class cannot be instantiated without its dependencies (fail-fast)
- Dependencies are immutable (`final`)
- Easier to test (just pass mock in constructor)
- No Spring magic needed in unit tests

---

```java
@GetMapping("/my")
@PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")
public ResponseEntity<ApiResponse<Map<String, List<LeaveResponse>>>> getMyLeaves(
        @AuthenticationPrincipal Employee currentUser) { ... }
```

**`@GetMapping("/my")`** = `@RequestMapping(method = GET, path = "/my")`
Maps HTTP GET requests at `/api/v1/leaves/my` to this method.

**`@PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")`**
Spring Security evaluates this expression before the method runs. If the current user's role doesn't match, it throws `AccessDeniedException` → GlobalExceptionHandler → 403 response. This is **declarative security** — you express the rule, Spring enforces it.

The string expression uses Spring Security's **SpEL (Spring Expression Language)**:
- `hasRole('ADMIN')` — user must have exactly this role
- `hasAnyRole(...)` — user must have any of these roles
- `@userService.isOwner(#id)` — you can even call Spring beans for complex checks

**`@AuthenticationPrincipal Employee currentUser`**
Injects the currently authenticated user (previously set in SecurityContext by `JwtAuthenticationFilter`) directly as a method parameter. This avoids a database lookup inside the method — the user object is already loaded from the JWT filter.

**`ResponseEntity<ApiResponse<T>>`**
`ResponseEntity` is a Spring class that wraps a response body AND lets you set the HTTP status code explicitly. `ApiResponse<T>` is our custom wrapper (explained in section 2.5).

---

```java
@PostMapping("/{leaveId}/approve")
public ResponseEntity<ApiResponse<LeaveResponse>> approveLeave(
        @PathVariable String leaveId,
        @AuthenticationPrincipal Employee currentUser,
        @RequestBody(required = false) LeaveActionRequest request) { ... }
```

**`@PathVariable String leaveId`**
Extracts the `{leaveId}` segment from the URL. Example: `/api/v1/leaves/lv_abc123/approve` → `leaveId = "lv_abc123"`.

**`@RequestBody(required = false) LeaveActionRequest request`**
Deserializes the HTTP request body (JSON) into a Java object using Jackson. `required = false` means the request body is optional — the client can call this endpoint with no body if they have no note to add.

---

#### Service Layer

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class TimesheetService { ... }
```

**`@Service`**
Marks this class as a Spring service bean. Spring registers it in the application context. Functionally similar to `@Component` but communicates semantic intent: "this is a business service class."

**`@Slf4j`** (Lombok)
Auto-generates a static `log` field: `private static final Logger log = LoggerFactory.getLogger(TimesheetService.class)`. Use `log.info()`, `log.warn()`, `log.error()` throughout. No manual logger setup needed.

---

```java
@Transactional
public TimesheetResponse submit(String timesheetId, String employeeId) { ... }
```

**`@Transactional`**
This annotation wraps the method in a database transaction. What that means:
1. When the method starts, a DB transaction begins
2. All DB operations inside the method participate in the same transaction
3. If the method completes normally → `COMMIT` (changes persist)
4. If the method throws a `RuntimeException` → `ROLLBACK` (all changes undone)

**Why it matters:** In `submit()`, we update the timesheet status AND create a notification. If the notification creation fails, without `@Transactional` the timesheet would still be marked as SUBMITTED with no notification sent. With `@Transactional`, both operations are atomic — either both succeed or neither does.

```java
@Transactional(readOnly = true)
public List<TimesheetResponse> getMyTimesheets(String employeeId) { ... }
```

**`readOnly = true`**
Tells Hibernate this transaction will only read data, not write. This enables optimizations:
- Hibernate skips **dirty checking** (comparing entity state to detect changes)
- Database driver may route to a read replica if configured
- Slightly faster execution

Rule of thumb: **all `get*` methods should have `readOnly = true`**.

---

#### Entity Layer

```java
@Entity
@Table(name = "timesheets", uniqueConstraints = 
    @UniqueConstraint(columnNames = {"employee_id", "week_start_date"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Timesheet { ... }
```

**`@Entity`**
Marks this Java class as a JPA entity — it maps to a database table. Hibernate manages the lifecycle of objects of this class (insert, update, delete, query).

**`@Table(name = "timesheets")`**
Explicitly names the database table. Without this, JPA would use the class name (`Timesheet` → table `timesheet` or `TIMESHEET` depending on dialect). Explicit naming prevents naming convention surprises.

**`uniqueConstraints = @UniqueConstraint(columnNames = {"employee_id", "week_start_date"})`**
Creates a database-level composite unique constraint. This **guarantees** at the database level that no employee has two timesheets for the same week start date. This is the foundation of idempotency in timesheet creation.

**`@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`** (Lombok)
Auto-generates:
- `@Getter` → `getId()`, `getName()`, etc.
- `@Setter` → `setId()`, `setName()`, etc.
- `@NoArgsConstructor` → zero-arg constructor (required by JPA for proxy creation)
- `@AllArgsConstructor` → constructor with all fields
- `@Builder` → `Timesheet.builder().employee(e).weekStartDate(d).build()` pattern

---

```java
@Id
@Column(length = 50)
private String id;

@PrePersist
protected void onCreate() {
    if (id == null) id = "ts_" + UUID.randomUUID().toString().substring(0, 8);
}
```

**`@Id`**
Marks this field as the primary key of the entity.

**Why `String` primary key instead of `Long @GeneratedValue`?**  
Most systems use auto-increment `Long` IDs. We use human-readable string IDs (e.g., `ts_3fa8c1b2`). Reasons:
1. **Portability** — works across MySQL, PostgreSQL, H2 without DB-specific auto-increment behavior
2. **Predictability in tests** — you can set specific IDs without sequences
3. **API-friendly** — `ts_3fa8c1b2` in a URL is more readable than `4827`
4. **No sequence contention** — in distributed systems, DB sequences become bottlenecks; UUID-based IDs work without coordination

The `@PrePersist` hook runs automatically before the first `save()` to generate the ID if not already set.

---

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "employee_id", referencedColumnName = "id", nullable = false)
private Employee employee;
```

**`@ManyToOne`**
Defines a many-to-one relationship: many `Timesheet` records belong to one `Employee`.

**`fetch = FetchType.LAZY`**
Critical performance decision. `LAZY` means: do **not** load the `Employee` object automatically when a `Timesheet` is loaded. Only load it if code explicitly accesses `timesheet.getEmployee()`.

Compare to `EAGER` (the problematic alternative):
```sql
-- LAZY: only timesheets loaded when you call getMyTimesheets()
SELECT * FROM timesheets WHERE employee_id = ?

-- EAGER: employee also loaded automatically
SELECT * FROM timesheets WHERE employee_id = ?
SELECT * FROM employees WHERE id = ?  -- triggered automatically for each timesheet
```

If you have 20 timesheets, `EAGER` fires 21 queries (1 + 20 employee lookups). `LAZY` fires 1 query. This is the **N+1 problem** — LAZY loading prevents it.

**`@JoinColumn(name = "employee_id", referencedColumnName = "id")`**
Specifies the foreign key column name (`employee_id`) and which column it references in the other table (`id` of `employees`).

**`nullable = false`**
Creates a `NOT NULL` constraint on the `employee_id` column in MySQL. A timesheet without an employee is invalid.

---

```java
@OneToMany(mappedBy = "timesheet", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
private List<TimeEntry> entries;
```

**`@OneToMany`**
One `Timesheet` has many `TimeEntry` records.

**`mappedBy = "timesheet"`**
Tells JPA that the foreign key is on the `TimeEntry` side (the `timesheet` field in `TimeEntry`). **Only one side of a relationship owns the foreign key.** Without `mappedBy`, JPA would create a join table.

**`cascade = CascadeType.ALL`**
When you save/delete a `Timesheet`, automatically save/delete all its `TimeEntry` records too. If you delete a timesheet, you don't need to manually delete all its time entries.

---

```java
@Column(name = "status", nullable = false, length = 20)
@Enumerated(EnumType.STRING)
private TimesheetStatus status;
```

**`@Enumerated(EnumType.STRING)`**
Store the enum as its string name in the DB (e.g., `"DRAFT"`, `"SUBMITTED"`), **not** as its ordinal integer (0, 1, 2).

**Why `STRING` over `ORDINAL`?**  
`ORDINAL` stores `0`, `1`, `2`. If you ever reorder the enum values (even accidentally), all existing data is corrupted. `STRING` stores `"DRAFT"` — immune to reordering.

---

#### Validation Annotations

```java
@Data
public class LoginRequest {
    @NotBlank @Email
    private String email;
    @NotBlank
    private String password;
}
```

**`@NotBlank`**
Validates that the field is not null, not empty, and not just whitespace. More strict than `@NotNull` (which only checks null).

**`@Email`**
Validates that the field matches a valid email format using a regex pattern. Spring Boot (via Hibernate Validator) handles this at the HTTP layer before the controller even runs.

**`@NotNull`**
Validates that the field is present in the JSON body. If missing, Spring returns a 400 with the field name and message.

**`@Size(min = 8, ...)`**
Validates string length. `min = 8` on password ensures passwords meet a minimum complexity basis.

These annotations are processed by **Bean Validation (JSR-380)** when `@Valid` is placed on the `@RequestBody` parameter. If any constraint fails, Spring throws `MethodArgumentNotValidException` → GlobalExceptionHandler catches it → 400 response with field-level error details.

---

### 2.3 Authentication & Security

#### The Complete JWT Flow

**Step 1: Login**

```
POST /api/v1/auth/login
Body: { "email": "alice@company.com", "password": "mypassword" }

                    │
                    ▼
         LoginRateLimiter.isRateLimited("alice@company.com:192.168.1.1")
         └── Composite key: email + ":" + IP address
         └── If rate limited: return 429 Too Many Requests
                    │
                    ▼
         AuthenticationManager.authenticate(
             new UsernamePasswordAuthenticationToken(email, password)
         )
         │
         ├── UserDetailsService.loadUserByUsername(email)
         │   └── employeeRepository.findByEmail(email)
         │   └── If not found: UsernameNotFoundException → 401
         │
         ├── BCryptPasswordEncoder.matches(rawPassword, hashedPassword)
         │   └── If no match: BadCredentialsException → 401
         │
         └── employee.isAccountNonLocked() → status == ACTIVE
             └── If inactive: DisabledException → 401
                    │
                    ▼
         JwtService.generateToken(employee)
         └── Build JWT:
             Header:  { "alg": "HS256", "typ": "JWT" }
             Payload: { "sub": "alice@company.com",
                        "iat": 1711123456,         ← issued at (Unix timestamp)
                        "exp": 1711127056 }         ← expires at (iat + 3600s = 1 hour)
             Signature: HMAC-SHA256(base64(header) + "." + base64(payload), SECRET_KEY)
                    │
                    ▼
         Response: 200 OK
         { "success": true, "data": {
             "token": "eyJhbGci...",
             "id": "usr_3fa8c1b2",
             "name": "Alice Smith",
             "email": "alice@company.com",
             "role": "EMPLOYEE"
         }}
```

**Step 2: Authenticated Request**

```
GET /api/v1/timesheets/my
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

                    │
                    ▼
         JwtAuthenticationFilter.doFilterInternal()
         [Runs before EVERY request except login/logout/swagger]
                    │
         ├── Extract "Bearer " prefix → jwt = "eyJhbGci..."
         ├── JwtService.extractUsername(jwt) → "alice@company.com"
         ├── SecurityContext.getAuthentication() == null?
         │   └── (Yes, not yet authenticated this request)
         ├── employeeRepository.findByEmail("alice@company.com") → Employee object
         ├── JwtService.isTokenValid(jwt, employee)
         │   ├── tokenBlacklist.isBlacklisted(jwt) → false (not logged out)
         │   ├── extractUsername(jwt) == employee.getEmail() → true
         │   └── extractExpiration(jwt).after(new Date()) → true (not expired)
         │
         └── SecurityContextHolder.setAuthentication(
                 new UsernamePasswordAuthenticationToken(
                     employee,              ← Principal (the user object)
                     null,                  ← Credentials (null — JWT is the credential)
                     employee.getAuthorities()  ← ["ROLE_EMPLOYEE"]
                 )
             )
                    │
                    ▼
         @PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')") → PASSES
                    │
                    ▼
         Controller method runs, receives
         @AuthenticationPrincipal Employee currentUser  ← the Alice object
```

**Step 3: Logout**

```
POST /api/v1/auth/logout
Authorization: Bearer eyJhbGci...

JwtService.revokeToken(jwt)
└── Extract expiration date from token
└── TokenBlacklist.blacklist(token, expiryMs)
    └── Stored in ConcurrentHashMap<String, Long>
    └── Background cleanup removes expired entries

Next request with the same token:
JwtService.isTokenValid(jwt, userDetails)
└── tokenBlacklist.isBlacklisted(jwt) → TRUE
└── Returns false → request rejected with 401
```

#### Why JWT Over Sessions?

| | Session-based Auth | JWT (Chosen) |
|---|---|---|
| State | Stored on server (memory/Redis) | Stateless — all state in token |
| Scalability | All servers need shared session store | Any server validates any token independently |
| SPA/Mobile | Cookie-based (CORS complexity) | `Authorization` header — clean for SPAs |
| Logout | Delete session → immediate | Must blacklist + has expiry window |
| Token inspection | Server DB lookup required | Decode token to get user info (no DB) |
| Standard | Proprietary | RFC 7519 industry standard |

**The JWT blacklist trade-off:** JWT is stateless by design — this is its main advantage. But logout requires invalidation, which reintroduces state. Our in-memory blacklist is a deliberate simplification. Production fix: move to Redis with TTL = token expiry time. Keys are removed automatically when the token would have expired anyway.

#### Rate Limiting (LoginRateLimiter)

```java
// Composite key prevents two attack vectors:
String key = request.getEmail() + ":" + ip;

// Pure IP key risk: If 10 users share a NAT/VPN, 
// one user failing 5 times locks out all 10 users
// → Denial of Service against legitimate users

// Pure email key risk: Attacker knows target's email,
// sends 5 requests from any IP → locks out victim
// → Targeted DoS attack

// Composite key: only the same person from the same IP 
// can trigger their own rate limit
```

The `X-Forwarded-For` header is only trusted when the direct connection comes from `127.0.0.1` or `::1` (local proxy). This prevents **IP spoofing** where an attacker sends `X-Forwarded-For: 8.8.8.8` to get a fresh counter.

Window: 5 failed attempts within 60 seconds → locked out. `getRetryAfterSeconds()` returns the exact seconds remaining, which is sent in the `Retry-After` header and displayed as a countdown timer in the frontend.

---

### 2.4 Database Schema

#### Entity Relationship Diagram

```
┌─────────────────┐          ┌─────────────────┐
│   departments   │          │    employees     │
│─────────────────│          │─────────────────│
│ id (PK)         │◄────────┤ department_id FK │
│ name (UNIQUE)   │          │ id (PK)          │
│ description     │          │ name             │
│ status          │          │ email (UNIQUE)   │
└─────────────────┘          │ password         │
                             │ role             │
┌─────────────────┐          │ manager_id       │──┐ self-ref
│    projects     │          │ status           │  │
│─────────────────│          │ created_at       │◄─┘
│ id (PK)         │          └────────┬─────────┘
│ name            │                   │ 1
│ client_name     │                   │
│ department_id FK│◄──────┐           │ N
│ status          │       │   ┌───────▼──────────┐
│ start_date      │       │   │    timesheets     │
│ end_date        │       │   │──────────────────│
└────────┬────────┘       │   │ id (PK)           │
         │                │   │ employee_id FK    │
         │ N              │   │ week_start_date   │
         │                │   │ week_end_date     │
┌────────▼──────────────┐ │   │ status            │
│     time_entries      │ │   │ approved_by       │
│───────────────────────│ │   │ rejection_reason  │
│ id (PK)               │ │   └────────┬──────────┘
│ timesheet_id FK       ├─┼────────────┘
│ project_id FK         ├─┘            │ 1
│ day_of_week           │              │
│ entry_type            │              │ N
│ start_time            │   UNIQUE(employee_id, week_start_date)
│ end_time              │
│ hours_logged          │   ┌────────────────────┐
│ description           │   │      leaves        │
└───────────────────────┘   │──────────────────  │
                            │ id (PK)             │
┌─────────────────┐         │ employee_id FK      │
│    holidays     │         │ start_date          │
│─────────────────│         │ end_date            │
│ id (PK)         │         │ leave_type          │
│ name            │         │ status              │
│ date (UNIQUE)   │         │ reason              │
│ description     │         │ approved_by         │
└─────────────────┘         │ rejection_reason    │
                            └────────────────────┘
┌──────────────────────────────┐
│         notifications        │
│──────────────────────────────│
│ id (PK)                      │
│ user_id (NOT a FK — soft ref)│
│ title                        │
│ message                      │
│ type (ENUM)                  │
│ is_read                      │
│ target_section (VARCHAR 20)  │
│ created_at                   │
└──────────────────────────────┘
```

---

#### Entity: Employee

```sql
CREATE TABLE employees (
    id          VARCHAR(50)  PRIMARY KEY,    -- "usr_" + UUID[0:8]
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,       -- BCrypt hash (always 60 chars)
    role        ENUM('EMPLOYEE','MANAGER','ADMIN') NOT NULL,
    department_id VARCHAR(50) REFERENCES departments(id),  -- NULLABLE
    manager_id  VARCHAR(50),                -- Soft FK to employees.id
    status      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at  DATETIME
);
```

**Design Decisions:**

1. **`manager_id` is a soft FK (no database constraint).**  
   If we used a hard FK, deleting a manager would require first reassigning all their reports (or using CASCADE DELETE, which would destroy records). Soft FK means we handle this in application logic — when a manager is INACTIVE, employees still reference them historically.

2. **`Employee implements UserDetails`**  
   Spring Security's authentication pipeline expects a `UserDetails` object. By implementing it on the `Employee` entity itself, we eliminate a separate `EmployeeUserDetails` wrapper class. The trade-off: mixing infrastructure concerns (security) into a domain object. At large scale, a separate wrapper is cleaner, but for this project the simplicity wins.

3. **`isAccountNonLocked()` returns `status == ACTIVE`**  
   When an employee is deactivated, their JWT-based login automatically fails because Spring Security calls this method during authentication. No separate "disabled account" logic needed.

4. **Password stored as BCrypt hash:**  
   BCrypt is a one-way, salted hashing algorithm. You cannot reverse it. `passwordEncoder.matches(raw, hash)` is the only way to verify. The hash includes the salt, so two users with the same password have different hashes.

---

#### Entity: Department

```sql
CREATE TABLE departments (
    id          VARCHAR(50)  PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    status      ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE'
);
```

**Design Decision: Soft delete via status.**  
Never delete departments — employees and historical data reference them. INACTIVE departments are hidden from "create employee" dropdowns but still visible in reports. This maintains referential integrity across historical data.

---

#### Entity: Project

```sql
CREATE TABLE projects (
    id            VARCHAR(50) PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    client_name   VARCHAR(150),
    department_id VARCHAR(50) REFERENCES departments(id),
    start_date    DATE,
    end_date      DATE,
    status        ENUM('ACTIVE','ON_HOLD','COMPLETED') DEFAULT 'ACTIVE'
);
```

**Design Decision: `status = COMPLETED` blocks new time entries.**  
The business rule "you can't log hours to a completed project" is enforced in `TimesheetService.addEntry()`:
```java
if (project.getStatus() == Project.ProjectStatus.COMPLETED) {
    throw new BusinessException("Cannot log time to a completed project");
}
```
Why not enforce at DB level? DB CHECK constraints can't call across tables. Service layer is the right place for multi-entity business rules.

---

#### Entity: Timesheet

```sql
CREATE TABLE timesheets (
    id               VARCHAR(50) PRIMARY KEY,    -- "ts_" + UUID[0:8]
    employee_id      VARCHAR(50) NOT NULL REFERENCES employees(id),
    week_start_date  DATE NOT NULL,
    week_end_date    DATE NOT NULL,              -- always weekStart + 4 (Friday)
    status           ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED') DEFAULT 'DRAFT',
    approved_by      VARCHAR(50),               -- Soft FK to employees.id
    rejection_reason VARCHAR(500),
    created_at       DATETIME,
    UNIQUE(employee_id, week_start_date)         -- Key constraint!
);
```

**Why `week_end_date` always = Monday + 4 days (Friday)?**  
TimeKeeper tracks Mon–Fri working weeks only. The system normalizes any submitted date to the Monday of that week (`normalizeToMonday()`) and always sets end date to Friday. This prevents partial-week timesheets.

**The `UNIQUE(employee_id, week_start_date)` constraint is the most important schema decision.**  
It guarantees idempotency: `POST /timesheets` with the same week returns the existing record. If you click "New Timesheet" twice, you don't get two timesheets. The service code explicitly handles this:
```java
Optional<Timesheet> existing = timesheetRepository.findByEmployeeIdAndWeekStartDate(employeeId, weekStart);
if (existing.isPresent()) {
    return toDetailResponse(existing.get());  // return existing — do nothing
}
```

**Timesheet State Machine:**
```
    ┌──────────────────────────────┐
    │                              │
    ▼                              │
  DRAFT ──── submit() ───▶ SUBMITTED ──── approve() ───▶ APPROVED
                               │
                               └─── reject() ───▶ REJECTED
                                                       │
                                              (employee can edit again)
```

---

#### Entity: TimeEntry

```sql
CREATE TABLE time_entries (
    id           VARCHAR(50) PRIMARY KEY,       -- "te_" + UUID[0:8]
    timesheet_id VARCHAR(50) NOT NULL REFERENCES timesheets(id),
    project_id   VARCHAR(50) REFERENCES projects(id),  -- NULL for LEAVE/HOLIDAY
    day_of_week  ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY') NOT NULL,
    entry_type   ENUM('WORK','LEAVE','HOLIDAY') NOT NULL,
    start_time   TIME,                          -- NULL for LEAVE/HOLIDAY
    end_time     TIME,                          -- NULL for LEAVE/HOLIDAY
    hours_logged DECIMAL(4,2),                  -- e.g., 8.00, 3.50
    description  TEXT
);
```

**Why `day_of_week` is an ENUM, not a DATE?**  
The timesheet already carries `week_start_date`. Storing `MONDAY` instead of `2026-03-23` means:
- No date arithmetic bugs ("which Monday was this relative to?")
- Clean data model — day is a relative concept within the week
- The actual calendar date is computed on demand: `weekStartDate + DAY_OFFSET[MONDAY]`

**Why `hours_logged` is separate from `start_time`/`end_time`?**  
For WORK entries, `hours_logged` is computed from `end_time - start_time`. For LEAVE and HOLIDAY entries, there is no start/end time, so `hours_logged = 0`. Having a dedicated column simplifies aggregation: `SUM(hours_logged)` works for all entry types.

**Business Rules Enforced:**
- Max 8 hours/day: checked via `SUM(hours_logged)` query before insertion
- No overlapping time blocks: `findByTimesheetIdAndDay()` checks all existing entries
- No work on holidays: `holidayRepository.findByDateBetween(dayDate, dayDate)`
- No work on approved leaves: `leaveRepository.findApprovedLeavesForWeek()`

---

#### Entity: Leave

```sql
CREATE TABLE leaves (
    id               VARCHAR(50) PRIMARY KEY,    -- "lv_" + UUID[0:8]
    employee_id      VARCHAR(50) NOT NULL REFERENCES employees(id),
    start_date       DATE NOT NULL,
    end_date         DATE NOT NULL,
    leave_type       ENUM('SICK','CASUAL','VACATION') NOT NULL,
    status           ENUM('PENDING','APPROVED','REJECTED') DEFAULT 'PENDING',
    reason           TEXT,
    approved_by      VARCHAR(50),               -- Soft FK to employees
    rejection_reason TEXT,
    created_at       DATETIME
);
```

**Design Decision: Approved leaves block timesheet entries.**  
The leave–timesheet interaction is bidirectional:
1. Employee with approved leave for June 16–18 → cannot log work hours on those days
2. Approved leave is shown as a "LEAVE" day in the timesheet view automatically

This is enforced in `TimesheetService.addEntry()`:
```java
List<Leave> leavesOnDay = leaveRepository.findApprovedLeavesForWeek(employeeId, dayDate, dayDate);
if (!leavesOnDay.isEmpty()) {
    throw new BusinessException("Cannot log time on an approved leave day");
}
```

---

#### Entity: Notification

```sql
CREATE TABLE notifications (
    id             VARCHAR(50) PRIMARY KEY,
    user_id        VARCHAR(50) NOT NULL,         -- Soft FK to employees
    title          VARCHAR(200) NOT NULL,
    message        VARCHAR(500) NOT NULL,
    type           ENUM('TIMESHEET_SUBMITTED','TIMESHEET_APPROVED','TIMESHEET_REJECTED',
                        'LEAVE_APPLIED','LEAVE_APPROVED','LEAVE_REJECTED') NOT NULL,
    is_read        BOOLEAN DEFAULT FALSE,
    target_section VARCHAR(20),                  -- 'TIMESHEET','TEAM_TIMESHEET','LEAVE','TEAM_LEAVE'
    created_at     DATETIME,
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_created_at (created_at)
);
```

**Why `target_section` is `VARCHAR(20)` not a DB ENUM?**  
Originally it was a DB ENUM, but when a new enum value (`TEAM_LEAVE`) was added in Java without a corresponding MySQL `ALTER TABLE` statement, MySQL threw error 1265 (Data truncated). `VARCHAR(20)` is immune to this — adding new values in Java requires no DB schema change.

**Why `user_id` has no DB FK constraint?**  
Notifications are append-only history. If an employee is deactivated, their historical notifications should still exist. A hard FK would complicate deactivation.

**Notification Routing Table:**

| Event | Section | Recipient |
|---|---|---|
| Timesheet submitted | `TEAM_TIMESHEET` | Manager |
| Timesheet approved | `TIMESHEET` | Employee |
| Timesheet rejected | `TIMESHEET` | Employee |
| Leave applied | `TEAM_LEAVE` | Manager |
| Leave approved | `LEAVE` | Employee |
| Leave rejected | `LEAVE` | Employee |

This routing ensures sidebar badge counts on the frontend reflect exactly which section has unread items — a notification about a team leave application increments the `/leaves/team` badge, not the employee's personal `/leaves/my` badge.

---

### 2.5 API Design

#### REST URL Structure

```
Base path: /api/v1/

Auth:          /auth/login          POST   (public)
               /auth/logout         POST   (public)
               /auth/change-password POST  (authenticated)

Employees:     /employees           GET    (ADMIN)
               /employees           POST   (ADMIN)
               /employees/{id}      GET    (ADMIN, MANAGER, own EMPLOYEE)
               /employees/{id}      PUT    (ADMIN)
               /employees/{id}/status PATCH (ADMIN)
               /employees/{id}/team GET   (ADMIN, MANAGER)

Timesheets:    /timesheets          POST   (all auth)
               /timesheets/my       GET    (all auth)
               /timesheets/my/all   GET    (all auth — paginated)
               /timesheets/{id}     GET    (all auth — ownership checked)
               /timesheets/{id}/submit      POST   (all auth)
               /timesheets/{id}/approve     POST   (MANAGER, ADMIN)
               /timesheets/{id}/reject      POST   (MANAGER, ADMIN)
               /timesheets/{id}/entries     POST   (all auth)
               /timesheets/{id}/entries     GET    (all auth)
               /timesheets/entries/{id}     PUT    (all auth)
               /timesheets/entries/{id}     DELETE (all auth)

Leaves:        /leaves              POST   (all auth)
               /leaves/my           GET    (all auth)
               /leaves/team         GET    (MANAGER, ADMIN)
               /leaves/{id}/approve PATCH  (MANAGER, ADMIN)
               /leaves/{id}/reject  PATCH  (MANAGER, ADMIN)

Notifications: /notifications/my                  GET   (all auth)
               /notifications/{id}/read            PATCH (all auth)
               /notifications/read-all             PATCH (all auth)
               /notifications/section/{s}/read-all PATCH (all auth)

Departments:   /departments         GET/POST/PUT/DELETE (ADMIN)
Projects:      /projects            GET/POST/PUT/DELETE (ADMIN, MANAGER)
Holidays:      /holidays            GET (all auth), POST/DELETE (ADMIN)
Reports:       /reports/...         GET (ADMIN, MANAGER)
```

**Why `/api/v1/` prefix?**  
Versioning (the `v1` part) allows deploying `v2` alongside `v1` without breaking existing clients. This is critical for APIs with external consumers or mobile apps you can't force-update. The `api` prefix disambiguates from frontend routes in case both are served from the same domain (e.g., via an nginx reverse proxy).

**Why `POST /{id}/approve` instead of `PATCH /{id}` with `{"status":"APPROVED"}`?**  
An endpoint like `PATCH /timesheets/{id}` with `{"status":"APPROVED"}` would allow clients to attempt setting any arbitrary status (e.g., `{"status":"DRAFT"}` on an approved timesheet). Using action-specific endpoints (`/approve`, `/reject`, `/submit`) encodes the allowed state transitions into the API contract, making invalid transitions impossible by design.

#### ApiResponse Wrapper

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;

    // Success responses
    public static <T> ApiResponse<T> success(T data) { ... }
    public static <T> ApiResponse<T> success(String message, T data) { ... }

    // Error responses
    public static <T> ApiResponse<T> error(String message) { ... }
}
```

Every API response — success or error — has this shape:
```json
{
  "success": true,
  "message": "Leave approved",
  "data": { "id": "lv_abc123", "status": "APPROVED", ... }
}
```
```json
{
  "success": false,
  "message": "Cannot submit an empty timesheet",
  "data": null
}
```

**Why a wrapper?** Without it:
- Some endpoints return `{ "error": "..." }` on failure, others return `{ "message": "..." }`, others return raw 4xx bodies
- The frontend Axios interceptor needs different handling for each pattern
- With the wrapper, `response.data.success` is always present — the frontend has one consistent check

---

### 2.6 Business Logic Deep Dive

#### Timesheet Lifecycle

The most complex workflow in the system. Every method name and validation is explained here.

```
createOrGetForWeek(employeeId, request)
│
├── normalizeToMonday(request.weekStartDate)
│   └── Ensures date is always a Monday, regardless of what day was submitted
│       Why: Users might submit "March 25" (Tuesday) expecting the week containing it
│            normalizeToMonday() returns March 23 (the Monday of that week)
│
├── Check: weekStart.isAfter(currentWeekStart)?
│   └── Prevent future-week timesheets
│       Why: You can't log hours for time that hasn't happened
│
├── timesheetRepository.findByEmployeeIdAndWeekStartDate(employeeId, weekStart)
│   └── If exists: return existing (idempotency — no duplicate creation)
│   └── If not: create new DRAFT timesheet
│
└── Return toDetailResponse(timesheet)
    └── This builds the full timesheet with all days (Mon-Fri),
        overlaying holiday/leave status on each day

addEntry(timesheetId, employeeId, request)
│
├── Ownership check: timesheet.employee.id == employeeId
│   └── You cannot add entries to someone else's timesheet
│
├── Status check: timesheet.status is DRAFT?
│   └── SUBMITTED/APPROVED timesheets are locked — cannot be modified
│
├── Future date check: dayDate.isAfter(LocalDate.now())?
│   └── Cannot log time for tomorrow's date
│
├── Holiday check: holidayRepository.findByDateBetween(dayDate, dayDate)
│   └── Company holidays are locked — no work entries allowed
│       Error: "Cannot log time on a company holiday: Christmas"
│
├── Approved leave check: leaveRepository.findApprovedLeavesForWeek(...)
│   └── If you're on approved leave, you can't log work hours
│       Error: "Cannot log time on an approved leave day"
│
├── If WORK entry:
│   ├── Validation: projectId, startTime, endTime are required
│   ├── Validation: startTime < endTime
│   ├── Project status check: must be ACTIVE (COMPLETED and ON_HOLD blocked)
│   └── Overlap check: validateNoOverlapExcluding()
│       └── Loads existing entries for that day, checks time block intersections
│           Overlap condition (exclusive): newStart < existEnd AND newEnd > existStart
│           Back-to-back entries (e.g. 09:00–11:00 + 11:00–13:00) are allowed
│
└── Save entry, return toDetailResponse(timesheet)

submit(timesheetId, employeeId)
│
├── Ownership check
├── Status check: not already SUBMITTED or APPROVED
├── Work entry check: entries.stream().anyMatch(e -> type == WORK)
│   └── Cannot submit timesheet with no actual work hours logged
│
└── status = SUBMITTED
    └── Notify manager (if managerId != null)
        └── NotificationService.create(managerId, ..., TEAM_TIMESHEET section)
        └── If no manager: no notification — employee without manager can still submit

approveTimesheet(timesheetId, approverId, approverRole)
│
├── Status check: must be SUBMITTED (not DRAFT or APPROVED)
├── Self-approval check: approverId != employee.id
│   └── Cannot approve your own timesheet
├── Direct-report check (for MANAGER role only):
│   └── approverId == employee.managerId
│       └── Managers can only approve their own team's timesheets
│       └── ADMIN bypasses this check (can approve anyone's)
│
└── status = APPROVED, approvedBy = approverId
    └── Notify employee: TIMESHEET section

rejectTimesheet(timesheetId, approverId, approverRole, reason)
│
├── Same checks as approve
├── reason cannot be null or blank
│   └── Business rule: must always explain why a timesheet was rejected
│
└── status = REJECTED, rejectionReason = reason
    └── Notify employee: TIMESHEET section + reason included in message
```

```
copyFromPreviousWeek(timesheetId, employeeId)
│
├── Ownership check: timesheet.employee.id == employeeId
├── Status check: DRAFT or REJECTED only (SUBMITTED/APPROVED are locked)
├── Source lookup: weekStartDate - 7 days
│   └── No source timesheet → return message "No previous week timesheet found"
│   └── Source has no WORK entries → return message "Previous week has no work entries"
│
├── Pre-fetch (4 queries total, no N+1):
│   ├── holidayRepository.findByDateBetween(targetWeekStart, targetWeekEnd)
│   ├── leaveRepository.findApprovedLeavesForWeek(employeeId, ...)
│   ├── timeEntryRepository.findByTimesheetId(targetId) → virtualEntries
│   └── projectRepository.findAllById(srcProjectIds) → Map<String, Project>
│
├── For each source WORK entry (sorted: day asc, startTime asc):
│   ├── 0. FUTURE_DAY: targetDayDate.isAfter(LocalDate.now()) → skip
│   ├── a. HOLIDAY_DAY: targetDay ∈ holidayDates → skip
│   ├── b. LEAVE_DAY: employee on approved leave on targetDay → skip
│   ├── c. PROJECT_NOT_ACTIVE: project missing or status != ACTIVE → skip
│   ├── d. DUPLICATE_ENTRY: same (day, projectId, startTime, endTime) in virtualEntries → skip
│   ├── e. OVERLAP_STRICT: hasBoundaryOverlap() against virtualEntries
│   │   └── STRICT/inclusive: !newStart.isAfter(existEnd) && !newEnd.isBefore(existStart)
│   │       Boundary-touching (09:00–11:00 + 11:00–13:00) counts as conflict
│   └── f. Accept: add to toSave AND virtualEntries (prevents self-overlap in batch)
│
├── timeEntryRepository.saveAll(toSave)  — one batch insert
│
└── Return CopyLastWeekResponse:
    { timesheet, copySummary { copiedCount, skippedCount, message, skippedEntries[] } }```

#### Leave Lifecycle

```
applyLeave(employeeId, request)
│
├── Date validation: endDate >= startDate
├── Overlap check: findOverlappingLeaves(employeeId, start, end)
│   └── Cannot have two leaves covering the same dates
│
└── Save leave with status = PENDING
    └── Notify manager: TEAM_LEAVE section
    └── If no manager: leave applies, no notification sent

approveLeave(leaveId, approverId, request)
│
├── Leave status check: must be PENDING
├── Self-approval check: approverId != leave.employee.id
├── Direct-report check (for MANAGER role):
│   └── leave.employee.managerId == approverId
│
└── status = APPROVED, approvedBy = approverId
    └── Notify employee: LEAVE section

rejectLeave(leaveId, approverId, request)
│
├── Same checks
├── request.note stored as rejectionReason (optional — unlike timesheets)
│
└── status = REJECTED
    └── Notify employee: LEAVE section
```

---

### 2.7 Design Patterns Used

#### DTO Pattern (Data Transfer Object)

**Problem:** Database entities contain sensitive fields (`password`), have different shapes from what clients need, and change for database reasons unrelated to the API contract.

**Solution:** Separate DTO classes for requests and responses.

```
Entity (internal)              DTO (external API)
─────────────────────────      ──────────────────────────────
Employee {                     EmployeeResponse {
  id: String                     id: String
  name: String                   name: String
  email: String                  email: String
  password: String  ← HIDDEN     role: String
  role: Role                     departmentId: String
  department: Dept  ← FK OBJ    departmentName: String  ← FLAT
  managerId: String              managerId: String
  status: Status                 status: String
  createdAt: LocalDateTime ← HIDDEN
}                              }
```

**Benefits:**
1. `password` is never serialized to JSON — impossible to leak
2. `departmentName` is flattened from the `Department` object — client doesn't need to make a second API call
3. The entity can add new columns (e.g., `lastLoginAt`) without affecting the API contract

---

#### Service Layer Pattern

All business logic lives exclusively in service classes. Controllers are thin — they parse input, call exactly one service method, and return the result.

**Example of what NOT to do (logic in controller):**
```java
// BAD: Business rule in controller
@PostMapping("/{id}/approve")
public ResponseEntity<?> approve(@PathVariable String id, ...) {
    Timesheet ts = timesheetRepo.findById(id).get();
    if (ts.getStatus() != SUBMITTED) throw new Exception("...");
    if (approverId.equals(ts.getEmployee().getId())) throw new Exception("...");
    // ... more logic
}
```

**What we do (logic in service):**
```java
// Controller: thin
@PostMapping("/{timesheetId}/approve")
public ResponseEntity<ApiResponse<TimesheetResponse>> approveTimesheet(...) {
    TimesheetResponse response = timesheetService.approveTimesheet(
        timesheetId, currentUser.getId(), currentUser.getRole());
    return ResponseEntity.ok(ApiResponse.success("Timesheet approved", response));
}

// Service: all the logic
@Transactional
public TimesheetResponse approveTimesheet(String id, String approverId, Role role) {
    // ... all validation and business rules here
}
```

**Why this matters:** The service is independently testable with Mockito. No HTTP layer needed.

---

#### Repository Pattern

Spring Data JPA repositories are interfaces — no implementation class required. Spring generates the implementation at startup.

**Method name convention (magic queries):**
```java
// Spring parses this method name and generates the SQL:
List<Employee> findByManagerId(String managerId);
// → SELECT * FROM employees WHERE manager_id = ?

List<Employee> findByDepartmentIdAndStatus(String deptId, EmployeeStatus status);
// → SELECT * FROM employees WHERE department_id = ? AND status = ?
```

**Custom JPQL for complex queries:**
```java
@Query("SELECT SUM(e.hoursLogged) FROM TimeEntry e WHERE e.timesheet.id = :timesheetId")
BigDecimal sumHoursLoggedByTimesheetId(@Param("timesheetId") String timesheetId);
```

JPQL (Java Persistence Query Language) is like SQL but refers to **class names and field names**, not table/column names. Hibernate translates it to MySQL SQL at runtime.

---

#### Global Exception Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(...) {
        return ResponseEntity.status(404).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(...) {
        return ResponseEntity.status(400).body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(...) {
        return ResponseEntity.status(403).body(ApiResponse.error("Access denied"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(...) {
        return ResponseEntity.status(409).body(ApiResponse.error("Duplicate record"));
    }
}
```

`@RestControllerAdvice` registers this class as a global exception interceptor. When any exception is thrown anywhere in any controller, Spring searches this class for a matching `@ExceptionHandler`.

**Without this pattern:** Every controller method needs try/catch blocks. The same error-to-status-code mapping is repeated 50+ times. One change requires updating every controller.

**With this pattern:** Services throw domain exceptions. The handler maps them to HTTP responses. Consistent format everywhere. One place to change the mapping.

---

### 2.8 Performance Considerations

#### N+1 Query Problem

**The problem:** You load 20 timesheets. For each timesheet, you access `timesheet.getEmployee()`. With LAZY loading, this triggers 20 separate `SELECT * FROM employees WHERE id = ?` queries. 1 + 20 = 21 queries = N+1.

**How we avoid it in this codebase:**

```java
// getMyTimesheets() — returns list of timesheets
public List<TimesheetResponse> getMyTimesheets(String employeeId) {
    List<Timesheet> timesheets = timesheetRepository
            .findTop5ByEmployeeIdOrderByWeekStartDateDesc(employeeId, ...);
    return timesheets.stream().map(this::toSummaryResponse).collect(...);
}

// toSummaryResponse() — accesses only timesheet fields, NOT timesheet.getEmployee()
// (employee name is already on the timesheet entity since we called findByEmployeeId)
```

For the detail view (`toDetailResponse`), we pre-fetch all related data in **bulk queries**:
```java
// ONE query for all entries — bulk load
List<TimeEntry> allEntries = timeEntryRepository.findByTimesheetId(timesheet.getId());

// ONE query for all holidays — bulk load  
List<Holiday> weekHolidays = holidayRepository.findByDateBetweenOrderByDateAsc(weekStart, weekEnd);

// ONE query for all leaves — bulk load
List<Leave> weekLeaves = leaveRepository.findApprovedLeavesForWeek(employeeId, weekStart, weekEnd);
```

Then we use **in-memory operations** to join the data:
```java
Map<LocalDate, Holiday> holidayMap = weekHolidays.stream()
    .collect(Collectors.toMap(Holiday::getDate, h -> h));
```

Total: 3 queries instead of potentially 20+.

#### Indexes

The database has these performance indexes:
```sql
INDEX idx_notifications_user_id (user_id)       -- most notifications queries are per-user
INDEX idx_notifications_created_at (created_at)  -- ordered retrieval, recent first
UNIQUE(employee_id, week_start_date)             -- fast lookup for idempotency check
```

#### Pagination

`getMyTimesheets()` uses `PageRequest.of(0, 5)` — only the 5 most recent. `getAllTimesheetsPaged()` takes `page` and `size` parameters (capped at 50) to prevent loading thousands of records.

---

### 2.9 Future Improvements

| Area | Current | Improvement |
|---|---|---|
| JWT blacklist | In-memory `ConcurrentHashMap` (lost on restart) | Move to **Redis** with TTL = token expiry |
| Notifications | Synchronous — email failure delays API response | **Kafka/RabbitMQ** — async event-driven |
| Reports | Computed live on every request | **Redis cache** with configurable TTL |
| Session management | 1-hour token, no refresh | Add **refresh token rotation** (7-day refresh) |
| Audit log | No history of who changed what | Add **audit_log table** or Spring Data Envers |
| Caching | None | **@Cacheable** on department/project lists (rarely change) |
| DB scaling | Single MySQL instance | **Read replicas** for reports; **connection pooling** tuning |
| Microservices | Monolith | Extract **ReportService** first (read-only, compute-heavy) |
| Search | Not implemented | Elasticsearch for employee/project search |
| Observability | Logs only | Add **Micrometer + Prometheus + Grafana** for metrics |

---

## 3. Frontend — React

### 3.1 Architecture & Folder Structure

```
frontend/src/
│
├── app/
│   └── store.js                ← Redux store: registers all slice reducers
│
├── features/                   ← FEATURE-BASED organization (not type-based)
│   ├── auth/
│   │   └── authSlice.js        ← login/logout, JWT, user info, rate-limit state
│   ├── timesheets/
│   │   └── timesheetSlice.js   ← timesheet CRUD, async thunks, loading states
│   ├── leaves/
│   │   └── leaveSlice.js
│   ├── notifications/
│   │   └── notificationSlice.js ← notification polling, badge counts
│   ├── employees/
│   │   └── employeeSlice.js
│   ├── departments/
│   │   └── departmentSlice.js
│   ├── projects/
│   │   └── projectSlice.js
│   └── holidays/
│       └── holidaySlice.js
│
├── pages/                      ← One folder per route/feature
│   ├── Login/
│   │   └── Login.jsx
│   ├── Dashboard/
│   │   └── Dashboard.jsx
│   ├── Timesheets/
│   │   ├── Timesheets.jsx      ← List of timesheets
│   │   ├── TimesheetDetail.jsx ← Single timesheet with time entry grid
│   │   └── NewTimesheet.jsx    ← Week picker → create
│   ├── Leaves/
│   │   ├── MyLeaves.jsx        ← Employee: apply, view own leaves
│   │   └── TeamLeaves.jsx      ← Manager: view and action team leaves
│   ├── Team/
│   │   ├── Team.jsx            ← Manager: view team timesheets
│   │   └── TeamMemberTimesheets.jsx
│   ├── Employees/              ← Admin: manage employees
│   ├── Departments/            ← Admin: manage departments
│   ├── Projects/               ← Admin: manage projects
│   └── Profile/                ← All: view own profile, change password
│
├── components/
│   ├── Layout.jsx              ← App shell: Sidebar + header + main content area
│   ├── Sidebar.jsx             ← Navigation with role-based items + badge counts
│   ├── ProtectedRoute.jsx      ← Route guard: checks auth + optional role
│   ├── NotificationBell.jsx    ← Notification dropdown
│   ├── Modal.jsx               ← Reusable modal overlay
│   ├── PaginationBar.jsx       ← Reusable pagination component
│   ├── SortableHeader.jsx      ← Table column header with sort arrows
│   └── ui.jsx                  ← Base UI components (Button, Input, Badge, etc.)
│
└── services/                   ← HTTP service functions (one per domain)
    ├── apiClient.js            ← Axios instance with interceptors
    ├── authService.js          ← login(), logout(), changePassword()
    ├── timesheetService.js     ← createTimesheet(), addEntry(), submit(), etc.
    ├── leaveService.js
    ├── employeeService.js
    ├── notificationService.js
    ├── departmentService.js
    ├── projectService.js
    ├── holidayService.js
    └── reportService.js
```

**Feature-based vs Component-based structure:**  
A component-based structure groups by technical type:
```
components/
hooks/
utils/
```

A feature-based structure groups by business domain:
```
features/auth/
features/timesheets/
features/leaves/
```

Feature-based wins at scale because:
- When working on leaves, all leave-related code (slice, service, page) is in one folder
- Features can be developed independently without touching other features
- Adding a new feature means adding a new folder — existing code is untouched

---

### 3.2 State Management — Redux Toolkit

#### Why Redux?

Three pieces of state need to be shared across many unrelated components:

1. **Auth State** — needs to be accessible in: every protected route, every API call (for token injection via interceptors), the sidebar (to show role-appropriate menu items), and the profile page.

2. **Notification Badges** — need to be in: the sidebar (to show badge counts on menu items), the notification bell, and any page that triggers a notification-clearing action.

3. **Rate-Limit State** — the login countdown timer (`retryAfter`) needs to survive re-renders between the error response and the timer expiry.

Without Redux: prop-drilling (passing props through 4–5 component levels) or many independent `useEffect` API calls causing duplicated data fetches.

#### Redux Toolkit Concepts Used

**`createSlice`:** Defines state shape, reducers (synchronous state updates), and automatically generates action creators.

```javascript
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: JSON.parse(localStorage.getItem('tk_user')) || null,
    token: localStorage.getItem('tk_token') || null,
    loading: false,
    error: null,
    retryAfter: null,    // seconds until rate limit resets
  },
  reducers: {
    logout(state) {                          // Synchronous action
      state.user = null;
      state.token = null;
      localStorage.removeItem('tk_token');   // Side effect in reducer (acceptable here)
      localStorage.removeItem('tk_user');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem('tk_token', action.payload.token);
        localStorage.setItem('tk_user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message;
        state.retryAfter = action.payload?.retryAfter || null;
      });
  },
});
```

**`createAsyncThunk`:** Handles asynchronous operations (API calls) and dispatches lifecycle actions (`pending`, `fulfilled`, `rejected`).

```javascript
export const login = createAsyncThunk(
  'auth/login',                // action type prefix
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return { user: response.data.data, token: response.data.data.token };
    } catch (error) {
      // Error with Retry-After header → rate limiting
      const retryAfter = error.response?.headers['retry-after'];
      return rejectWithValue({
        message: error.response?.data?.message,
        retryAfter: retryAfter ? parseInt(retryAfter) : null,
      });
    }
  }
);
```

#### Notification Slice — Badge Computation

```javascript
// computeBadges derives counts from the notification list
// It is DERIVED STATE — not stored separately
const computeBadges = (notifications) => ({
  timesheets:      count(notifications, 'TIMESHEET'),
  team_timesheets: count(notifications, 'TEAM_TIMESHEET'),
  personal_leaves: count(notifications, 'LEAVE'),
  team_leaves:     count(notifications, 'TEAM_LEAVE'),
  team:            count(notifications, 'TEAM'),
});
```

**Why derived state?** Storing `badges` as a separate field in addition to the `notifications` array would create redundancy. If you mark a notification as read and only update the notification, the badge count stays wrong. Single source of truth: derive everything from the notification list.

The `Sidebar` component reads these badge counts and displays them next to the relevant navigation items.

---

### 3.3 API Integration — Axios

```javascript
// frontend/src/services/apiClient.js

const apiClient = axios.create({
  baseURL: '/api/v1',           // relative URL → works in dev + production
  headers: { 'Content-Type': 'application/json' },
})

// REQUEST INTERCEPTOR: runs before every Axios request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('tk_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // If no token: request goes through without Authorization header
  // Spring Security will return 401 if the endpoint requires auth
  return config
})

// RESPONSE INTERCEPTOR: runs after every Axios response
apiClient.interceptors.response.use(
  (response) => response,  // success — pass through
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      // 401 on non-login endpoint = session expired
      localStorage.removeItem('tk_token')
      localStorage.removeItem('tk_user')
      window.location.href = '/login'
    }
    // Always re-reject so individual thunks can handle the specific error
    return Promise.reject(error)
  }
)
```

**Why not redirect on 401 for login?**  
A 401 from `POST /auth/login` means wrong password. The Login component needs to show "Invalid email or password." A redirect to `/login` from the login page itself would cause an infinite redirect loop. The `isLoginRequest` check prevents this.

**Service layer pattern (per-domain service files):**

```javascript
// frontend/src/services/timesheetService.js
const timesheetService = {
  createTimesheet: (data) => apiClient.post('/timesheets', data),
  getMyTimesheets: () => apiClient.get('/timesheets/my'),
  getById: (id) => apiClient.get(`/timesheets/${id}`),
  submit: (id) => apiClient.post(`/timesheets/${id}/submit`),
  addEntry: (id, data) => apiClient.post(`/timesheets/${id}/entries`, data),
  approve: (id) => apiClient.post(`/timesheets/${id}/approve`),
  reject: (id, reason) => apiClient.post(`/timesheets/${id}/reject`, { reason }),
}
```

Each service file corresponds to a backend controller. This makes it trivial to find "how does the frontend call the approve endpoint?" — look in `timesheetService.js`.

---

### 3.4 Routing & Protected Routes

```jsx
// frontend/src/components/ProtectedRoute.jsx
export default function ProtectedRoute({ roles }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectCurrentUser);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
```

**How it works:**
- `<Outlet />` renders the nested child route if all checks pass
- `state={{ from: location }}` saves where the user was trying to go — after login, redirect them back there
- `replace` prevents the login page from appearing in browser history (back button won't go to login)

**Route structure in App.jsx:**
```jsx
{/* Public — no ProtectedRoute wrapper */}
<Route path="/login" element={<Login />} />

{/* All authenticated users */}
<Route element={<ProtectedRoute />}>
  <Route path="/dashboard" element={<Dashboard />} />
  <Route path="/timesheets" element={<Timesheets />} />
</Route>

{/* Manager + Admin only */}
<Route element={<ProtectedRoute roles={['MANAGER', 'ADMIN']} />}>
  <Route path="/team" element={<Team />} />
  <Route path="/leaves/team" element={<TeamLeaves />} />
</Route>

{/* Admin only */}
<Route element={<ProtectedRoute roles={['ADMIN']} />}>
  <Route path="/employees" element={<Employees />} />
</Route>
```

**Security note:** Client-side route protection is **UX only** — it prevents unauthorized users from seeing pages. The backend re-validates role on every API call, so even if someone bypasses client routing by manipulating localStorage, they'll get 403 responses from the API.

---

### 3.5 UI/UX Design Decisions

#### Sidebar Navigation

```jsx
// Role-based navigation items
const ALL_ITEMS = [
  { path: '/timesheets', label: 'My Timesheets', roles: null, badge: 'timesheets' },
  { path: '/leaves/my',  label: 'My Leaves',     roles: null, badge: 'personal_leaves' },
  { path: '/team',       label: 'Team',           roles: ['MANAGER', 'ADMIN'], badge: 'team_timesheets' },
  { path: '/leaves/team',label: 'Team Leaves',    roles: ['MANAGER', 'ADMIN'], badge: 'team_leaves' },
  { path: '/employees',  label: 'Employees',      roles: ['ADMIN'], badge: null },
];

// Filter based on current user's role
const visibleItems = ALL_ITEMS.filter(item =>
  !item.roles || item.roles.includes(user.role)
);
```

TEAM MANAGEMENT section starts collapsed (`useState({ 'TEAM MANAGEMENT': true })`). This is intentional — managers see this section often, but it shouldn't dominate the sidebar on first load.

Badge counts come from the Redux `notificationSlice`:
```jsx
const badges = useSelector(selectBadges); // { timesheets: 0, team_leaves: 2, ... }
// ...
{badge && badges[badge] > 0 && (
  <span className="badge">{badges[badge]}</span>
)}
```

#### Loading and Error States

Every async Redux thunk has three states handled:
```jsx
// Pattern used in every page component
const { items, loading, error } = useSelector(selectTimesheets);

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
return <TimesheetList timesheets={items} />;
```

This ensures users never see empty pages — they always know if data is loading, failed, or absent.

---

### 3.6 Optimizations

**`React.memo` / `useMemo`:** Used on expensive list renders where parent re-renders would otherwise re-render large tables unnecessarily.

**`useCallback`:** Event handlers passed as props to deeply nested components are wrapped in `useCallback` to prevent unnecessary child re-renders.

**Pagination:** The `/timesheets/my/all` endpoint returns paginated data. The `PaginationBar` component handles page navigation — no loading of all historical timesheets at once.

**API response caching via Redux:** Once data is in Redux store, the same data doesn't need a second API call until explicitly refreshed. For example, after loading the department list, navigating away and back doesn't trigger a second API call.

---

### 3.7 Frontend Improvements

| Area | Current | Improvement |
|---|---|---|
| Token storage | `localStorage` (XSS risk) | `httpOnly` cookies + CSRF protection |
| Real-time notifications | Manual refresh | **WebSocket or SSE** (Server-Sent Events) |
| Form validation | Mixed (bean validation + some inline) | Centralized with **React Hook Form + Zod** |
| Error boundaries | None | Add `ErrorBoundary` component to catch render errors |
| Accessibility | Basic | Add `aria-` attributes, keyboard navigation, screen reader support |
| Testing | Playwright E2E only | Add **React Testing Library** unit tests for components |
| Code splitting | None (all in one bundle) | `React.lazy()` + `Suspense` for route-based splitting |
| Offline support | None | **Service Worker** + IndexedDB for draft timesheet caching |

---

## 4. End-to-End Flows

### 4.1 Login Flow

```
Browser                        React/Redux                 Spring Boot
   │                               │                            │
   │  User fills email+password    │                            │
   │  clicks Login button          │                            │
   │──────────────────────────────▶│                            │
   │                               │ dispatch(login(credentials))
   │                               │ authSlice state: loading=true
   │                               │                            │
   │                               │ authService.login(credentials)
   │                               │ apiClient.post('/auth/login', body)
   │                               │─────────────────────────────▶
   │                               │            LoginRateLimiter.isRateLimited("email:ip")
   │                               │            AuthenticationManager.authenticate()
   │                               │              ├── findByEmail() → Employee
   │                               │              ├── BCrypt.matches()
   │                               │              └── isAccountNonLocked()
   │                               │            JwtService.generateToken(employee)
   │                               │◀─────────────────────────────
   │                               │  200 OK: { success: true, data: { token, user } }
   │                               │                            │
   │                               │ authSlice fulfilled:
   │                               │  - state.token = "eyJhbGci..."
   │                               │  - state.user = { id, name, role }
   │                               │  - localStorage.tk_token = token
   │                               │  - localStorage.tk_user = user JSON
   │                               │                            │
   │                               │ React Router: navigate('/dashboard')
   │  Dashboard renders            │                            │
   │◀──────────────────────────────│                            │
   │                               │                            │

If login fails (wrong password):
   │                               │◀────── 401 { success:false, message: "Invalid..." }
   │                               │ authSlice rejected: state.error = "Invalid email or password"
   │  Error message shown          │                            │
   │◀──────────────────────────────│                            │

If rate limited (5 failed attempts):
   │                               │◀────── 429 + Retry-After: 47 header
   │                               │ authSlice rejected: state.retryAfter = 47
   │  Countdown: "Try again in 47s"│                            │
   │◀──────────────────────────────│                            │
```

---

### 4.2 Timesheet Flow

```
STEP 1: Create Timesheet for this Week
──────────────────────────────────────
Employee opens /timesheets/new
→ React: dispatch(createTimesheet({ weekStartDate: '2026-03-23' }))
→ POST /api/v1/timesheets
  Backend:
  ├── normalizeToMonday(2026-03-23) → 2026-03-23 (already Monday)
  ├── Check: not a future week
  ├── findByEmployeeIdAndWeekStartDate → not found
  ├── Create new Timesheet (DRAFT)
  └── Return toDetailResponse (5-day grid: Mon-Fri, each day is WORK/HOLIDAY/LEAVE)
→ Redux state: timesheets.current = { id, status: DRAFT, days: [...] }
→ React navigates to /timesheets/{id}

STEP 2: Add a Work Entry
────────────────────────────────────────────
Employee: day=MONDAY, project=ProjectA, 09:00-17:00
→ React: dispatch(addEntry({ timesheetId, day, entryType: WORK, projectId, startTime, endTime }))
→ POST /api/v1/timesheets/{id}/entries
  Backend:
  ├── Ownership check: is this employee's timesheet?
  ├── Status check: DRAFT (not locked)
  ├── dayDate = weekStart + 0 days = 2026-03-23 (Monday)
  ├── Future date check: 2026-03-23 not after today → OK
  ├── Holiday check: no holidays on 2026-03-23 → OK
  ├── Approved leave check: no leaves for this employee on 2026-03-23 → OK
  ├── Project check: ProjectA is ACTIVE → OK
  ├── Hours check: 09:00-17:00 = 480 minutes = 8h; existing=0h, total=8h ≤ 8h → OK
  ├── Overlap check: no existing WORK entries on MONDAY → OK
  └── Save TimeEntry, return updated timesheet detail
→ Redux: timesheet day[MONDAY].entries = [{ 09:00-17:00, ProjectA, 8h }]
→ React: Day grid updates showing the entry

STEP 3: Submit Timesheet
────────────────────────────────────────────
Employee clicks Submit
→ React: dispatch(submitTimesheet(timesheetId))
→ POST /api/v1/timesheets/{id}/submit
  Backend:
  ├── Ownership check
  ├── Status check: DRAFT → can submit
  ├── hasWorkEntries: 1 WORK entry found → OK
  ├── timesheet.status = SUBMITTED
  └── If employee.managerId != null:
      NotificationService.create(managerId, "Timesheet Submitted",
        "Alice submitted for 2026-03-23 to 2026-03-27",
        TIMESHEET_SUBMITTED, TEAM_TIMESHEET)
→ Manager sees badge +1 on "/team" sidebar item

STEP 4: Manager Approval
────────────────────────────────────────────
Manager opens /team, sees Alice's submitted timesheet
Manager clicks Approve
→ React: dispatch(approveTimesheet(timesheetId))
→ POST /api/v1/timesheets/{id}/approve
  Backend:
  ├── Status check: SUBMITTED → OK
  ├── Self-approval check: manager ≠ Alice → OK
  ├── Direct report check (MANAGER role): Alice.managerId == manager.id → OK
  ├── timesheet.status = APPROVED, approvedBy = manager.id
  └── NotificationService.create(alice.id, "Timesheet Approved",
        "Your timesheet for 2026-03-23 to 2026-03-27 has been approved.",
        TIMESHEET_APPROVED, TIMESHEET)
→ Alice sees badge +1 on "/timesheets"
→ Alice's timesheet is now read-only (locked)
```

---

### 4.3 Leave Flow

```
STEP 1: Apply for Leave
────────────────────────────────────────────
Employee: Start=June 16, End=June 18, Type=SICK, Reason="Feeling ill"
→ POST /api/v1/leaves
  Backend (LeaveServiceImpl.applyLeave):
  ├── endDate >= startDate: June 18 >= June 16 → OK
  ├── Overlap check:
  │   findOverlappingLeaves(employeeId, June 16, June 18)
  │   → No existing leaves for these dates → OK
  ├── Create Leave (status=PENDING)
  └── employee.managerId != null?
      → NotificationService.create(managerId, "Leave Request",
          "Bob applied for SICK leave from June 16 to June 18",
          LEAVE_APPLIED, TEAM_LEAVE)
→ Manager's sidebar: /leaves/team badge +1

STEP 2: Manager Reviews
────────────────────────────────────────────
Manager opens /leaves/team, sees Bob's PENDING leave
Manager clicks Approve (optionally adds a note)
→ PATCH /api/v1/leaves/{id}/approve
  Backend:
  ├── Status check: PENDING → OK
  ├── Self-approval check: manager ≠ Bob → OK
  ├── Direct report check: Bob.managerId == manager.id → OK
  ├── leave.status = APPROVED, approvedBy = manager.id
  └── NotificationService.create(bob.id, "Leave Approved",
        "Your SICK leave from June 16 to June 18 has been approved",
        LEAVE_APPROVED, LEAVE)
→ Bob's sidebar: /leaves/my badge +1

STEP 3: Side Effect on Timesheets
────────────────────────────────────────────
Bob tries to add work entry for June 16 (week of June 16-20)
→ POST /api/v1/timesheets/{id}/entries
  Backend:
  ├── leaveRepository.findApprovedLeavesForWeek(bob.id, June 16, June 16)
  └── FOUND: Bob has approved SICK leave on June 16
  → throw BusinessException("Cannot log time on an approved leave day")
→ API returns 400: { "success": false, "message": "Cannot log time on an approved leave day" }

Separately, when Bob loads his June 16 timesheet:
  toDetailResponse() checks approved leaves per day
  → June 16, 17, 18 show as dayStatus="LEAVE" in the response
  → Frontend renders those days as non-editable LEAVE days automatically
```

---

### 4.4 Report Flow

```
Admin/Manager navigates to /reports

Frontend:
→ reportService.getSummary({ from: '2026-01-01', to: '2026-03-31' })
→ GET /api/v1/reports/summary?from=2026-01-01&to=2026-03-31

Backend (ReportController → ReportService):
├── Query timesheets for date range
│   SELECT t.*, SUM(te.hours_logged) FROM timesheets t
│   JOIN time_entries te ON te.timesheet_id = t.id
│   WHERE t.week_start_date BETWEEN ? AND ?
│   GROUP BY t.id
│
├── Query leave statistics
│   SELECT e.name, COUNT(l.id), SUM(DATEDIFF(l.end_date, l.start_date)+1)
│   FROM leaves l JOIN employees e ON ...
│   WHERE l.status = 'APPROVED' AND l.start_date BETWEEN ? AND ?
│
├── Aggregate per employee:
│   {
│       employeeId: "usr_abc",
│       totalHours: 142.5,
│       approvedTimesheets: 9,
│       rejectedTimesheets: 1,
│       leaveDaysTaken: 3
│   }
│
└── Return ReportResponse[]

Frontend:
└── Renders as summary cards + sortable table
    Admin: export to PDF → POST /api/v1/reports/pdf
```

---

## 5. Trade-off Analysis

| Decision | What Was Chosen | Alternatives Considered | Why This Was Chosen | Risk / When to Revisit |
|---|---|---|---|---|
| **Architecture** | Monolith | Microservices | Single team, low operational overhead, clear module boundaries for future extraction | When 3+ teams need to deploy independently |
| **Auth mechanism** | JWT (stateless) | Sessions (stateful), OAuth2 | SPA + multi-client; no shared session store needed; RFC standard | When SSO/social login needed → add OAuth2 |
| **JWT blacklist** | In-memory `ConcurrentHashMap` | Redis | Development simplicity; Redis swap is 10 lines | Multi-instance deployment breaks blacklist |
| **Token expiry** | 1 hour, no refresh | Shorter/longer + refresh tokens | Balances security (short exposure window) vs UX (not logging out too often) | When UX feedback indicates too short |
| **Primary keys** | `VARCHAR(50)` string UUIDs | Auto-increment `Long` | DB-portable, human-readable, no sequence contention | Slightly more storage; not an issue at this scale |
| **`manager_id`** | Soft FK (no DB constraint) | Hard DB FK | Allows deactivating managers without reassigning all reports | Possible orphan references; mitigated by INACTIVE pattern |
| **`target_section`** | `VARCHAR(20)` | DB ENUM | Adding new enum values requires no `ALTER TABLE` | No DB-level constraint on values |
| **Rate limiting** | In-memory | Redis-backed | Development simplicity | Lost on restart; use Redis in production |
| **Token storage** | `localStorage` | `httpOnly` cookies | No cookie CORS complexity for SPA | XSS vulnerability; use httpOnly + CSRF for public-facing |
| **`FetchType.LAZY`** | All relationships | EAGER | Prevents N+1 queries; explicit bulk queries in service | Risk: accessing lazy property outside transaction → LazyInitializationException |
| **State management** | Redux Toolkit | Context API, Zustand, Jotai | Works at scale; great DevTools; industry standard for complex state | Boilerplate; Context API sufficient for small apps |
| **Layered architecture** | Controller → Service → Repository | Active Record (Rails-style), CQRS | Familiar, testable, maintainable | At very large scale, service layer becomes a "God service" |

---

## 6. Scalability & Future Architecture

### Current Limits

| Resource | Current Capacity | Bottleneck |
|---|---|---|
| Users | ~50-100 concurrent | Single DB connection pool (10 connections default) |
| Auth | JWT blacklist in RAM | Lost on restart, single-instance only |
| Email | Inline synchronous | Email failure delays API response |
| Reports | Live computation | Slow for large datasets |
| Deployment | Single process | No horizontal scaling |

---

### Phase 1: Single-Instance Hardening (Up to 200 users)

```
Add these without changing architecture:

1. Redis for JWT blacklist:
   @Bean
   public RedisTemplate<String, Long> blacklistTemplate() { ... }
   // TokenBlacklist: buckets.put(token, expiry) → Redis SET with TTL

2. Connection pool tuning (HikariCP):
   spring.datasource.hikari.maximum-pool-size=20
   spring.datasource.hikari.minimum-idle=5

3. Database indexes (already in place for key queries)

4. Scheduled report caching:
   @Scheduled(cron = "0 0 * * * *")
   void cacheMonthlyReport() { ... }
   // Store result in Redis, serve from cache for 1 hour
```

---

### Phase 2: Multi-Instance Deployment (200–2000 users)

```
┌────────────────────────────────────────────────────────────┐
│                  Route 53 / Cloudflare DNS                 │
└──────────────────────────────┬─────────────────────────────┘
                               │
                 ┌─────────────▼──────────────┐
                 │    Application Load Balancer│
                 └──────┬──────────────┬───────┘
                        │              │
           ┌────────────▼────┐  ┌──────▼────────────┐
           │  Spring Boot    │  │  Spring Boot       │
           │  Instance 1     │  │  Instance 2        │
           │  (ECS Container)│  │  (ECS Container)   │
           └────────┬────────┘  └──────┬─────────────┘
                    │                  │
         ┌──────────▼──────────────────▼──────────┐
         │              Redis Cluster              │
         │  - JWT blacklist (TTL-based cleanup)    │
         │  - Session state (if added)             │
         │  - Report cache                         │
         └────────────────┬────────────────────────┘
                          │
         ┌────────────────▼────────────────────────┐
         │           RDS MySQL (Multi-AZ)           │
         │  Primary (writes) + Read Replica (reads) │
         └─────────────────────────────────────────┘
```

**Key change:** `TokenBlacklist` backed by Redis instead of `ConcurrentHashMap`. All instances share the same blacklist. A token revoked on Instance 1 is immediately invalid on Instance 2.

---

### Phase 3: Async Notifications (Event-Driven)

```
Current (synchronous):
TimesheetService.submit() → NotificationService.create() → DB write
                         → EmailService.sendEmail() → SMTP (could timeout)
Total: sequential, email failure rolls back timesheet submission

With message queue (Kafka/RabbitMQ):
TimesheetService.submit() → DB write → publish "TIMESHEET_SUBMITTED" event
                                                │
                                   ┌────────────▼────────────┐
                                   │    Event Consumers      │
                                   │  NotificationConsumer   │ ← DB write to notifications
                                   │  EmailConsumer          │ ← SMTP (retry on failure)
                                   └─────────────────────────┘
```

Benefits:
- Timesheet submission is now instant (< 5ms instead of 200ms for email SMTP)
- Email failures don't roll back the submission
- Consumers can retry independently
- New consumers (Slack notification, webhook) added without touching `TimesheetService`

---

### Production Deployment

```yaml
# CI/CD Pipeline (GitHub Actions):

on: push to main
jobs:
  test:
    - mvn test          (92 backend tests)
    - npm test          (playwright E2E)
  
  build:
    - mvn package       (timekeeper.jar)
    - docker build      (openjdk:21-jre-slim + jar)
    - docker push ECR   (Amazon Elastic Container Registry)
  
  deploy:
    - ecs update service --force-new-deployment
    - blue/green deployment (zero downtime)
    - health check: /actuator/health
    - rollback if health check fails after 2 minutes
```

```dockerfile
FROM openjdk:21-jre-slim
WORKDIR /app
COPY timekeeper-backend-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
```

---

### Security Hardening for Production

| Area | Current (Dev) | Production Hardening |
|---|---|---|
| Token storage | `localStorage` | `httpOnly` + `Secure` + `SameSite=Strict` cookies |
| HTTPS | Not enforced in Spring | Nginx terminates TLS; Spring behind proxy |
| CORS | `cors.allowed-origins` property | Restrict to exact production domain |
| Secrets | `application-dev.properties` (gitignored) | AWS Secrets Manager / Vault |
| JWT secret | Hex string in properties file | Rotatable secret from Secrets Manager |
| Rate limiting | In-memory | Redis-backed; also add WAF rate limiting at LB level |
| SQL injection | JPA/Hibernate (parameterized queries — immune) | Run SAST scanner on JPQL queries |
| XSS | Frontend doesn't use dangerouslySetInnerHTML | CSP headers via nginx |
| Logging | Console + file | Centralized (CloudWatch / ELK Stack) |

---

## 7. Interview Preparation

### "Why did you choose JWT over sessions?"

> "TimeKeeper is a React SPA that communicates with a Spring Boot REST backend. Sessions traditionally rely on cookies and server-side storage — you need a shared session store (like Redis) for every backend instance to recognize the session. JWT is stateless: the token carries the user identity and role, and any backend instance can validate it independently using the shared secret. This is essential for horizontal scaling.
>
> The trade-off is logout: a stateless JWT can't be invalidated before expiry. We solved this with a token blacklist — currently in-memory for simplicity, but designed to swap to Redis in one change for production. For a corporate internal app with 1-hour sessions, this is an acceptable trade-off.
>
> If we needed SSO with Google or Okta, we'd add OAuth2/OIDC on top, with JWT still as the internal token format."

---

### "Why layered architecture?"

> "The layered pattern — Controller, Service, Repository, Entity — gives us three key benefits:
>
> First, **single responsibility**: each layer changes for one reason only. If the database schema changes, only the entity and repository layers change; the business rules in the service layer are untouched.
>
> Second, **testability**: we have 56+ unit tests for the service layer that run with Mockito in under 2 seconds — no database, no Spring context. The business rules around timesheet validation (no work on holidays, no overlapping time blocks, copy-last-week skip rules) are complex enough that you need to test them in isolation. If business logic lived in controllers, you'd need to start the full HTTP stack to test a business rule.
>
> Third, **team parallelism**: the API contract (controller) and business logic (service) can be developed simultaneously by different developers without merge conflicts.
>
> The limitation: at very large scale, a flat service layer can become a 'God Service' with too many responsibilities. That's where DDD-style aggregates or CQRS would provide better boundaries — but that's over-engineering for this scale."

---

### "How would you scale this system?"

> "I'd scale in three phases:
>
> **Phase 1 (up to 200 users):** Move the JWT blacklist from in-memory `ConcurrentHashMap` to Redis with TTL matching token expiry. Add read replicas for the reports database queries. Tune HikariCP connection pool size. This handles multi-instance deployment without architectural changes.
>
> **Phase 2 (200–2000 users):** Deploy multiple Spring Boot instances behind an Application Load Balancer on ECS with auto-scaling. Since JWT validation is stateless and Redis stores the blacklist, any instance handles any request. Add Redis for notification badge caching — the `getMyNotifications()` endpoint is called on every page load.
>
> **Phase 3 (2000+ users):** Extract the Notification service as a standalone microservice using Kafka for event-driven communication. Timesheet Service publishes `TIMESHEET_SUBMITTED` events; Notification Service consumes them. This decouples the two boundary contexts and lets email failures not affect timesheet submission response times.
>
> Database: Add read replica and route all `@Transactional(readOnly = true)` queries there. Partition `time_entries` and `notifications` tables by `created_at` range when they exceed 10M rows."

---

### "What are the current limitations?"

> "I'm aware of four production limitations, all made as explicit trade-offs:
>
> **1. JWT blacklist is in-memory:** Lost on restart. A user who logged out will be re-authenticated if the server restarts within their token's 1-hour window. Fix: Redis blacklist. This is a 10-line code change.
>
> **2. Email is synchronous:** `NotificationService.create()` calls `EmailService.sendEmail()` in the same database transaction as the business operation. An SMTP timeout can delay the timesheet submission response. Fix: publish an event to Kafka, have a consumer send the email asynchronously.
>
> **3. Token storage in localStorage:** Vulnerable to XSS. For a corporate internal app on a trusted network, this is acceptable. For a public-facing SaaS: move to httpOnly cookies with CSRF protection.
>
> **4. No audit trail:** Who approved which timesheet when is stored in `approved_by`, but there's no append-only history of all status changes. For compliance-heavy industries, add an `audit_log` table or use Spring Data Envers."

---

### "What would you improve next?"

> "My top three, in priority order:
>
> **1. Refresh token rotation** — The 1-hour JWT forces users to re-login too frequently. Add a 7-day refresh token (stored in httpOnly cookie, rotated on every use) and a 15-minute access token. This improves both security (shorter access token window) and UX (users stay logged in all day).
>
> **2. Async notification pipeline** — Replace synchronous email sending with a message queue (RabbitMQ is lightweight for our scale). Email failure should never affect API response time.
>
> **3. Team capacity calendar view** — Managers need to see at a glance who's on leave which week before approving new leave requests. This is a read-only view combining approved leaves and timesheet status per team member. It's the highest-value feature based on how managers actually use the system."

---

### "Walk me through how the JWT authentication works in this codebase"

> "When a user logs in, `AuthController.login()` calls `AuthenticationManager.authenticate()` with the email and password. Spring Security's `DaoAuthenticationProvider` calls our `UserDetailsService` (which queries `EmployeeRepository.findByEmail()`), then uses `BCryptPasswordEncoder.matches()` to verify the password. If authentication succeeds, `JwtService.generateToken()` creates an HMAC-SHA256 signed token containing the email as subject and a 1-hour expiry.
>
> On subsequent requests, `JwtAuthenticationFilter` extends Spring's `OncePerRequestFilter` — it runs exactly once per request. It extracts the token from the `Authorization: Bearer` header, calls `JwtService.extractUsername()` to decode the email, loads the user from the database, and calls `JwtService.isTokenValid()`, which checks the blacklist, validates the signature, and checks the expiry. If valid, it sets a `UsernamePasswordAuthenticationToken` in Spring's `SecurityContextHolder` with the user as principal. From that point, `@AuthenticationPrincipal Employee currentUser` in any controller method gives direct access to the authenticated employee object with no additional database query."

---

*End of documentation.*

*This document covers the complete TimeKeeper system as of March 2026. The codebase is at commit `c7cbe18` on the `main` branch.*
