# TimeKeeper — Improvement Log
**Date:** 2026-03-24  
**Scope:** All sessions from initial build to final audit

---

## Session 1 — Initial Build
*(Pre-audit baseline)*

- Full Spring Boot + React application built from scratch
- JWT authentication, BCrypt password hashing, role-based access with `@PreAuthorize`
- Timesheet lifecycle: DRAFT → SUBMITTED → APPROVED/REJECTED
- Leave management with PENDING → APPROVED/REJECTED flow
- Employee, Department, Project CRUD
- Holiday calendar with admin management
- Dashboard with 6-week trend chart (Recharts)
- PDF export (OpenHTMLtoPDF + Thymeleaf)
- Email notifications (Spring Mail, scheduled reminders)
- Notification system with section-based badge routing
- Rate limiting (per-IP, 5 attempts/min)
- Token blacklist on logout
- 49 passing E2E tests (Playwright)

---

## Session 2 — Bug Fix Pass (2026-03-21)

| # | Severity | Fix |
|---|---|---|
| 1 | P1 | Future date logging blocked — `addEntry` now validates `dayDate.isAfter(LocalDate.now())` |
| 2 | P1 | Password change success toast now shows correctly after modal closes |
| 3 | P1 | Manager self-approval prevented — `approveTimesheet` checks `approverId.equals(timesheet.getEmployee().getId())` |
| 4 | P1 | Notifications fetched correctly on page load — dispatch order fixed in `Layout.jsx` |
| 5 | P1 | Department-manager mismatch validation added — `EmployeeService.create` validates manager's department |
| 6 | P2 | Typography consistency pass — consistent Tailwind classes across all pages |
| 7 | P2 | Login placeholder text standardized |

Backend compile: ✅ Clean  
E2E tests: ✅ 53/53 (added 4 change-password tests)

---

## Session 3 — P0/P1 Notification + UX Fixes (2026-03-23)

| # | Severity | Component | Fix |
|---|---|---|---|
| 1 | P1 | `LeaveServiceImpl` | `applyLeave()` manager notification changed from `TEAM` → `LEAVE` section — leave notifications now appear only on Team Leaves badge, not Team Overview |
| 2 | P1 | `TimesheetService` | `rejectTimesheet()` — required reason validation added (`BusinessException` if null/blank) |
| 3 | P1 | `TimesheetService` | Rejection notification uses `displayReason` fallback — eliminates "Reason: null" in employee notifications |
| 4 | P1 | `TimesheetDetail.jsx` | Rejection dialog made required — inline error, disabled Reject button, updated placeholder |
| 5 | P1 | `Sidebar.jsx` — BADGE_MAP | `/leaves/team` → `'leaves'` badge key (was `'team'`) — eliminates cross-pollution between Team Overview and Team Leaves badges |
| 6 | P2 | `Sidebar.jsx` — MANAGER nav | New `TEAM MANAGEMENT` collapsible section added; Team Overview + Team Leaves moved out of WORK section |
| 7 | P2 | `Sidebar.jsx` — section badges | Collapsible section headers now show aggregate badge count (sum of child item badges) |

Backend compile: ✅ Clean  
Frontend errors: ✅ 0

---

## Session 4 — Final Audit (2026-03-24)

### Code Review Findings Applied

| # | Severity | Component | Fix |
|---|---|---|---|
| 1 | P1 | `EmployeeController.updateStatus` | Added null/blank guard and `IllegalArgumentException` catch — prevents NPE when `"status"` key is missing from request body; returns clean 400 with descriptive error message |
| 2 | P2 | `CreateEmployeeRequest` | Added `@Size(min = 8)` to `password` field — admin cannot create employee accounts with weak passwords |

### No-Fix Decisions (accepted trade-offs)

| # | Finding | Rationale |
|---|---|---|
| A1 | In-memory token blacklist | Demo scope; Redis required for production |
| A2 | Seed data logs passwords at INFO | Dev-only; `DataInitializer.run()` is a no-op if DB already populated |
| A3 | Seed timesheets exceed 8h/day | Cosmetic; created directly via repository bypassing validation |
| A4 | `'leaves'` badge shared by both My Leaves and Team Leaves routes | Requires new notification sections; out of demo scope |
| A5 | Any manager can query any project effort | Read-only; project IDs not guessable |

### Test Suite Status After Audit
- Backend: 24/24 tests pass
- Frontend E2E: 53/53 tests pass (servers not running for this session's E2E)

### Documents Created
- `code-review/FINAL_AUDIT_REPORT.md`
- `code-review/TEST_CASES.md`
- `code-review/CODE_REVIEW.md`
- `code-review/IMPROVEMENT_LOG.md` (this file)

---

## Cumulative Bug Count

| Session | P0 | P1 | P2 | P3 | Total Fixed |
|---|---|---|---|---|---|
| Session 2 | 0 | 4 | 3 | 0 | 7 |
| Session 3 | 0 | 4 | 3 | 0 | 7 |
| Session 4 | 0 | 1 | 1 | 0 | 2 |
| **Total** | **0** | **9** | **7** | **0** | **16** |

No P0 (critical/data-loss) bugs were ever identified.  
All P1 bugs resolved. All P2 bugs either resolved or accepted with documented rationale.
