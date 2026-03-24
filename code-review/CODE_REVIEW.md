# TimeKeeper — Code Review
**Date:** 2026-03-24  
**Reviewer:** Senior Staff Engineer (GitHub Copilot)  
**Coverage:** Backend (Spring Boot) + Frontend (React + Redux) + Security + Architecture

---

## 1. Backend Architecture

### 1.1 Layering and Separation of Concerns

The backend follows a clean 3-tier architecture:

```
Controller → Service → Repository
```

**Positive observations:**
- Controllers are thin: input validation via `@Valid`, auth principal injection via `@AuthenticationPrincipal`, and delegation to service layer
- Service methods own all business logic; no business rules leak into controllers or repositories
- Most controller endpoints are ≤15 lines
- Custom exception types (`BusinessException`, `ResourceNotFoundException`) propagate cleanly to `GlobalExceptionHandler`

**Finding (P3):** `EmployeeController.getById` performs the access-control check (Employee can only see own profile) in the controller layer:
```java
if (currentUser.getRole() == Employee.Role.EMPLOYEE
        && !currentUser.getId().equals(employeeId)) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)...
}
```
All other access control is in the service layer. This is a minor inconsistency but not a bug.

### 1.2 Transaction Management

**Positive:**
- Read-only service methods annotated with `@Transactional(readOnly = true)` — enables Hibernate performance optimizations
- `NotificationService.create` uses `Propagation.REQUIRES_NEW` — notification failure never rolls back parent business transaction (excellent design choice)
- `@Transactional` applied at method granularity, not class-level

### 1.3 Exception Handling

`GlobalExceptionHandler` covers:
- `ResourceNotFoundException` → 404
- `BusinessException` → 400
- `BadCredentialsException` → 401
- `AccessDeniedException` → 403
- `DataIntegrityViolationException` → 409
- `MethodArgumentNotValidException` → 400 with field-level errors
- `Exception` (catch-all) → 500 with generic message

**Positive:** Stack traces never exposed to client. All responses use consistent `ApiResponse<T>` wrapper.

**Finding (P3):** `GlobalExceptionHandler` handles `AccessDeniedException`, but `SecurityConfig` also has a custom `accessDeniedHandler`. For pre-auth denial (unauthenticated), the `authenticationEntryPoint` returns JSON correctly. For post-auth denial, Spring's filter calls the `accessDeniedHandler` before the `GlobalExceptionHandler` can intercept it, so the 403 response is handled by `SecurityConfig.accessDeniedHandler`. This means the two handlers produce slightly different JSON structure. Currently both return `{"success":false,"message":"..."}` which is consistent, but worth documenting.

---

## 2. Backend Security Review

### 2.1 Authentication

```java
// JwtAuthenticationFilter — shouldNotFilter()
return path.equals("/api/v1/auth/login")
        || path.equals("/api/v1/auth/logout")
        || path.startsWith("/swagger-ui")
        || path.startsWith("/v3/api-docs");
```

**Positive:**
- Only exact login/logout paths bypass JWT filter — all other `/auth/*` routes (e.g., `/change-password`) require a valid token
- Expired, malformed, and revoked tokens are each handled with specific messages
- `sendUnauthorized` writes hardcoded strings to JSON response — not vulnerable to injection since no user input is reflected

**Finding (P3):** `TokenBlacklist` is in-memory (`ConcurrentHashMap`). Server restart clears the blacklist. Tokens issued before restart and not yet expired remain usable post-restart. This is documented in source with "suitable for single-node personal project" — acceptable.

### 2.2 Rate Limiting

```java
private static final int MAX_ATTEMPTS = 5;
private static final long WINDOW_MS = 60_000L;
```

**Positive:** Per-IP leaky-bucket limiter. Window-based: counter resets after 60s.  
**Finding (P2, accepted):** IP is extracted from `X-Forwarded-For` header which can be spoofed by clients not behind a trusted proxy. For demo scope this is an acceptable trade-off.

### 2.3 Authorization

All controller methods are guarded with `@PreAuthorize`. Roles: `ROLE_EMPLOYEE`, `ROLE_MANAGER`, `ROLE_ADMIN`.

**Positive patterns:**
- Self-approval prevention in both timesheet and leave approval paths
- Manager direct-report scoping enforced in both `TimesheetService` and `LeaveServiceImpl`
- EMPLOYEE can only submit/modify their own timesheets (checked via `!timesheet.getEmployee().getId().equals(employeeId)`)

**Finding (P1 — Fixed):** `EmployeeController.updateStatus` used `body.get("status").toUpperCase()` without null check → NPE → 500. Fixed with null/blank guard and `IllegalArgumentException` catch.

### 2.4 Input Validation

All request DTOs use Jakarta Validation annotations:
- `@NotNull`, `@NotBlank`, `@Email`, `@Size` used appropriately
- `AddTimeEntryRequest` uses `@AssertTrue` for cross-field validation (WORK entry requires projectId + times)

**Finding (P2 — Fixed):** `CreateEmployeeRequest.password` had only `@NotBlank`, no minimum length. Fixed with `@Size(min = 8)`.

---

## 3. Backend Performance Review

### 3.1 Potential N+1 Queries

| Location | Status | Notes |
|---|---|---|
| `LeaveServiceImpl.resolveApproverNames` | ✅ Fixed | Batch `findAllById` instead of per-leave lookup |
| `TimesheetService.toDetailResponse` | ✅ Fixed | Pre-fetches holidays and leaves for the week in one query each |
| `TimesheetService.resolveApproverName` | ⚠️ Minor | Called per `toDetailResponse` — 1 extra query per timesheet detail view. Acceptable for single-timesheet views; would be N+1 for list views if ever called in a loop |
| `ReportService.getTeamUtilization` | ✅ Fixed | Single aggregate JPQL query for all team hours |
| `EmployeeService.toResponse` | ✅ Clean | No sub-queries; `department` is lazy-loaded but accessed only if not null |

### 3.2 Query Design

All repositories use JPQL with named parameters — no detectable N+1 risk in repository layer.

```java
// LeaveRepository — correctly parameterized
@Query("SELECT l FROM Leave l WHERE l.employee.id = :employeeId " +
       "AND l.status IN ('PENDING', 'APPROVED') " +
       "AND l.startDate <= :endDate AND l.endDate >= :startDate")
```

**Finding (P3):** `TimesheetRepository.findTop5ByEmployeeIdOrderByWeekStartDateDesc` uses a `@Query` annotation but the method name implies derived query with built-in limit. Actual limit is enforced via `PageRequest.of(0, 5)` passed from `TimesheetService`. No runtime issue; name is slightly misleading.

---

## 4. Frontend Architecture Review

### 4.1 State Management

Redux Toolkit is used with feature-based slice organization:
- `authSlice` — JWT token, current user
- `timesheetSlice` — my timesheets, all timesheets, current timesheet
- `leaveSlice` — my leaves, team leaves
- `notificationSlice` — notifications, badges, unread count

**Positive:**
- `createAsyncThunk` pattern used consistently
- `rejectWithValue` used for error propagation
- `extraReducers` handle `pending/fulfilled/rejected` for all async operations

**Finding (P3):** `timesheetSlice` has both `myTimesheets` (top-5 for dashboard) and `allTimesheets` (paginated) in the same slice. Clearing one could inadvertently affect the other. Minor concern — currently they're populated by different thunks.

### 4.2 API Client

```javascript
// apiClient.js — global 401 handler
if (error.response?.status === 401 && !isLoginRequest) {
    localStorage.removeItem('tk_token')
    localStorage.removeItem('tk_user')
    window.location.href = '/login'
}
```

**Positive:** JWT token attached from `localStorage` on every request. 401 handling excludes the login endpoint (avoids redirect on wrong credentials during login).

**Finding (P3):** `window.location.href = '/login'` is a hard redirect that bypasses React Router's navigation history. This means the user cannot use the browser back button after a 401 redirect. Acceptable for auth-timeout scenarios.

### 4.3 Component Structure

```
features/
  auth/
  timesheets/
  leaves/
  notifications/
  ...
pages/
  Timesheets/
  Leaves/
  ...
components/
  Layout.jsx
  Sidebar.jsx
  Modal.jsx
  ProtectedRoute.jsx
  ui.jsx
```

**Positive:**
- Feature slices cleanly separate Redux state from page components
- `ProtectedRoute` checks auth before rendering — no flicker
- `Sidebar` uses `BADGE_MAP` (route → badge key) to decouple routing from notification architecture
- Collapsible sections with aggregate badge counts on section headers

### 4.4 Sidebar — BADGE_MAP Design

```javascript
const BADGE_MAP = {
  '/timesheets':   'timesheets',
  '/team':         'team',
  '/leaves/team':  'leaves',
  '/leaves/my':    'leaves',
}
```

**Finding (P2, accepted):** Both `/leaves/my` and `/leaves/team` map to the same `'leaves'` badge key. For a MANAGER with both routes, the same notification count appears on both items. The count correctly reflects unread leave-related notifications, but doesn't distinguish personal (leave approved/rejected) from managerial (leave requested). Per audit decision, this is accepted for demo scope.

### 4.5 TimesheetDetail.jsx — Rejection Dialog

**Fixed (F5):** Rejection reason is now required in the UI:
- Inline error message shown when textarea is empty
- Reject button disabled until `rejectReason.trim()` is non-empty
- Placeholder updated to "Reason for rejection (required)"
- Backend also validates — defense in depth

---

## 5. Code Quality Findings

| Finding | File | Severity | Notes |
|---|---|---|---|
| Dead code: null-safe `displayReason` fallback | `TimesheetService.java` | P3 | `reason` is validated non-null before this point; fallback `"No reason provided"` unreachable |
| `resolveApproverName` per-detail query | `TimesheetService.java` | P3 | 1 extra DB query per `toDetailResponse`; fine for single views |
| `getById` access check in controller | `EmployeeController.java` | P3 | Inconsistent with service-layer pattern used elsewhere |
| Method name vs implementation mismatch | `TimesheetRepository.java` | P3 | `findTop5...` relies on caller to pass `PageRequest.of(0,5)` — not self-documented |
| DataInitializer logs seed passwords | `DataInitializer.java` | P3 | `log.info("Admin: admin@timekeeper.app / Admin123!")` — fine for dev, inappropriate for prod |
| Seed data violates 8h daily limit | `DataInitializer.java` | P3 | Two entries have 9h; bypass service validation via direct repo save |

---

## 6. Documentation Review

| Document | Status | Notes |
|---|---|---|
| `README.md` | ✅ Good | Tech stack, setup instructions, credentials, features |
| Swagger/OpenAPI | ✅ Good | `@Tag` + `@Operation` annotations on controllers |
| Code comments | ✅ Good | Key design decisions documented inline (e.g., REQUIRES_NEW propagation rationale) |
| `project-specifications/` | ✅ Comprehensive | Feature list, API spec, DB schema, architecture |
| Test documentation | ⚠️ Gap | No dedicated `TEST_CASES.md` existed before this audit |

---

## 7. Summary Scorecard

| Category | Score | Notes |
|---|---|---|
| Architecture | 9/10 | Clean layering, good patterns, minor actor inconsistency |
| Security | 9/10 | Strong JWT/BCrypt/rate-limit design; two fixes applied |
| Validation | 9/10 | Comprehensive DTO validation; one missing @Size fixed |
| Performance | 8/10 | N+1 addressed; one minor unresolved in detail view |
| Test Coverage | 8/10 | 24 backend + 53 E2E; gaps in approve/reject paths |
| Frontend Quality | 9/10 | Clean Redux, good UX patterns, notification architecture sound |
| API Design | 9/10 | Consistent REST conventions, versioned, documented |
| Code Cleanliness | 9/10 | Small dead-code items, no significant smells |
| **Overall** | **9.0/10** | |
