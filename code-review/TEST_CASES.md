# TimeKeeper — Test Cases
**Date:** 2026-03-24  
**Scope:** All application domains — unit, integration, E2E, security

---

## 1. Authentication

### 1.1 Login
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| AUTH-01 | ✅ Positive | Valid credentials | 200 + JWT token returned | Covered (Integration) |
| AUTH-02 | ✅ Positive | Login redirects to /dashboard | User lands on dashboard | Covered (E2E) |
| AUTH-03 | ❌ Negative | Wrong password | 401 `Invalid email or password` | Covered (Integration + E2E) |
| AUTH-04 | ❌ Negative | Unknown email | 401 | Covered (Integration) |
| AUTH-05 | ❌ Negative | Missing email field | 400 validation error | Covered (Integration) |
| AUTH-06 | 🔐 Security | 6th failed attempt in 60s | 429 Too Many Requests | Covered (Integration) |
| AUTH-07 | 🔐 Security | Login as inactive employee | 401 (account locked) | Gap — not yet covered |
| AUTH-08 | 🔐 Security | Empty body POST to /login | 400 validation error | Covered (Integration) |

### 1.2 Logout
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| AUTH-09 | ✅ Positive | Logout revokes token | Token added to blacklist | Covered (Integration) |
| AUTH-10 | ✅ Positive | Logout clears UI session | Redirects to /login | Covered (E2E) |
| AUTH-11 | 🔐 Security | Use token after logout | 401 Token revoked | Covered (Integration) |
| AUTH-12 | 🔐 Security | POST to protected endpoint without token | 401 | Covered (Integration) |

### 1.3 Change Password
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| AUTH-13 | ✅ Positive | Correct current password, valid new password | 200 password updated | Covered (Unit) |
| AUTH-14 | ❌ Negative | Wrong current password | 400 "Current password is incorrect" | Covered (Unit + E2E) |
| AUTH-15 | ❌ Negative | New password < 8 chars | 400 validation error | Unit covered; E2E gap |
| AUTH-16 | ❌ Negative | New passwords don't match (frontend) | Frontend validation error | Covered (E2E) |
| AUTH-17 | 🔐 Security | Call change-password without auth | 401 | Covered (E2E) |
| AUTH-18 | 🔐 Security | Change password for another employee | Blocked (employee can only change own) | Gap — not explicitly tested |

---

## 2. Timesheets

### 2.1 Create Timesheet
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| TS-01 | ✅ Positive | Create timesheet for current week | 201 DRAFT timesheet created | Covered (Unit) |
| TS-02 | ✅ Positive | Create again for same week | Returns existing (idempotent) | Covered (Unit) |
| TS-03 | ❌ Negative | Create for a future week | 400 "Cannot create a timesheet for a future week" | Covered (Unit) |
| TS-04 | ✅ Positive | Create for a past week | 201 allowed | Gap — not explicitly tested |
| TS-05 | ❌ Negative | Invalid week start date format | 400 | Gap |

### 2.2 Add Time Entries
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| TS-06 | ✅ Positive | Add WORK entry (valid project, valid time range) | Entry saved, timesheet returned | Covered (Unit) |
| TS-07 | ❌ Negative | Add entry on future date | 400 "Cannot log time for a future date" | Covered (Unit) |
| TS-08 | ❌ Negative | Add entry exceeding 8h/day | 400 "Total daily hours cannot exceed 8" | Covered (Unit implied) |
| TS-09 | ❌ Negative | Overlapping time blocks same day | 400 "Time blocks cannot overlap" | Covered (Unit implied) |
| TS-10 | ❌ Negative | Add entry on company holiday | 400 "Cannot log time on a company holiday" | Gap — not unit tested |
| TS-11 | ❌ Negative | Add entry on approved leave day | 400 "Cannot log time on an approved leave day" | Gap |
| TS-12 | ❌ Negative | Add entry to completed project | 400 "Cannot log time to a completed project" | Covered (Unit) |
| TS-13 | ❌ Negative | Add entry to SUBMITTED timesheet | 400 "Cannot modify a submitted or approved timesheet" | Gap |
| TS-14 | ❌ Negative | WORK entry missing projectId | 400 validation | Covered (DTO `@AssertTrue`) |
| TS-15 | ❌ Negative | Start time after end time | 400 | Covered (DTO `@AssertTrue`) |
| TS-16 | 🔐 Security | Employee adds entry to another employee's timesheet | 403 Access denied | Gap |

### 2.3 Submit Timesheet
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| TS-17 | ✅ Positive | Submit timesheet with at least one WORK entry | 200 SUBMITTED, manager notified | Covered (Unit) |
| TS-18 | ❌ Negative | Submit empty timesheet (no WORK entries) | 400 "Cannot submit an empty timesheet" | Covered (Unit) |
| TS-19 | ❌ Negative | Submit already-SUBMITTED timesheet | 400 "already submitted or approved" | Covered (Unit) |
| TS-20 | 🔐 Security | Employee submits another employee's timesheet | 403 | Covered (Unit) |
| TS-21 | ✅ Positive | Submit triggers notification to manager | Notification in TEAM section | Covered (Unit) |

### 2.4 Approve Timesheet
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| TS-22 | ✅ Positive | Manager approves direct report's SUBMITTED timesheet | 200 APPROVED, employee notified | Covered (Integration implied) |
| TS-23 | ❌ Negative | Manager approves non-direct-report's timesheet | 403 | Gap |
| TS-24 | ❌ Negative | Manager approves own timesheet | 403 "You cannot approve your own timesheet" | Gap |
| TS-25 | ❌ Negative | Approve a DRAFT timesheet | 400 "Only SUBMITTED timesheets can be approved" | Gap |
| TS-26 | ✅ Positive | Approval notification sent to employee | Notification in TIMESHEET section | Covered by code logic |

### 2.5 Reject Timesheet
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| TS-27 | ✅ Positive | Manager rejects with reason | 200 REJECTED, rejection reason stored | Gap |
| TS-28 | ❌ Negative | Manager rejects without reason | 400 "A rejection reason is required" | Gap |
| TS-29 | ❌ Negative | Manager rejects own timesheet | 403 | Gap |
| TS-30 | ✅ Positive | Rejection notification shows reason (non-null) | Message contains reason text, no "null" | Gap |
| TS-31 | ❌ Negative | Reject already-approved timesheet | 400 | Gap |

### 2.6 Update / Delete Entries
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| TS-32 | ✅ Positive | Update WORK entry time range | New hours computed correctly | Gap |
| TS-33 | ❌ Negative | Update entry on submitted timesheet | 400 | Gap |
| TS-34 | ✅ Positive | Delete entry | Entry removed, timesheet returned | Gap |
| TS-35 | ❌ Negative | Delete entry on submitted timesheet | 400 | Gap |

---

## 3. Leave Management

### 3.1 Apply Leave
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| LV-01 | ✅ Positive | Apply for future leave | 201 PENDING, manager notified in LEAVE section | Covered (Unit) |
| LV-02 | ✅ Positive | Apply for past leave (sick) | 201 PENDING (past dates allowed) | Covered (Unit) |
| LV-03 | ❌ Negative | End date before start date | 400 "End date must be on or after start date" | Covered (Unit) |
| LV-04 | ❌ Negative | Overlapping leaves | 400 "already have a leave request overlapping" | Covered (Unit) |
| LV-05 | ❌ Negative | Missing leave type | 400 validation error | Covered (DTO validation) |
| LV-06 | ❌ Negative | Missing start date | 400 | Covered (DTO validation) |
| LV-07 | ✅ Positive | Leave spanning a holiday (informational only) | 201 allowed, logs info | Covered by code logic |

### 3.2 Approve/Reject Leave
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| LV-08 | ✅ Positive | Manager approves direct report's leave | 200 APPROVED, employee notified | Covered (Unit) |
| LV-09 | ❌ Negative | Manager approves already-approved leave | 400 "Only PENDING leaves can be approved" | Covered (Unit) |
| LV-10 | ❌ Negative | Manager approves non-direct-report leave | 403 | Covered (Unit logic) |
| LV-11 | ✅ Positive | Manager rejects leave with note | 200 REJECTED, rejectionReason stored | Covered (Unit logic) |
| LV-12 | ❌ Negative | Manager rejects non-direct-report leave | 403 | Covered (Unit logic) |
| LV-13 | ✅ Positive | Approve/reject notification uses LEAVE section | Badge on `/leaves/team` and `/leaves/my` | Covered by code logic |

---

## 4. Employees

### 4.1 Create Employee
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| EMP-01 | ✅ Positive | Create employee with all valid fields | 201 active employee | Gap |
| EMP-02 | ❌ Negative | Duplicate email | 400 "Email already registered" | Gap |
| EMP-03 | ❌ Negative | Manager from different department | 400 "Manager must belong to the same department" | Gap |
| EMP-04 | ❌ Negative | Password < 8 chars | 400 validation | Fixed (P2 — added @Size(min=8)) |
| EMP-05 | ❌ Negative | Missing name | 400 | Gap |
| EMP-06 | 🔐 Security | Non-admin creating employee | 403 | Gap |

### 4.2 Update Employee Status
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| EMP-07 | ✅ Positive | Deactivate active employee | 200 INACTIVE | Gap |
| EMP-08 | ✅ Positive | Reactivate inactive employee | 200 ACTIVE | Gap |
| EMP-09 | ❌ Negative | Missing status field in body | 400 "'status' field is required" | Fixed (P1 — NPE guard added) |
| EMP-10 | ❌ Negative | Invalid status value (not ACTIVE/INACTIVE) | 400 "Invalid status value" | Fixed (P1 — IllegalArgumentException caught) |

---

## 5. Notifications

### 5.1 Badge Routing
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| NOTIF-01 | ✅ Positive | Employee submits timesheet | Manager's TEAM badge increments | Covered by service logic |
| NOTIF-02 | ✅ Positive | Employee applies leave | Manager's LEAVE/leaves badge increments (not TEAM) | Fixed (F3) |
| NOTIF-03 | ✅ Positive | Timesheet approved | Employee's TIMESHEET badge increments | Covered |
| NOTIF-04 | ✅ Positive | Timesheet rejected (with reason) | Employee's TIMESHEET badge; message has reason text | Fixed (F4, F5) |
| NOTIF-05 | ✅ Positive | Leave approved | Employee's LEAVE badge increments | Covered |
| NOTIF-06 | ✅ Positive | Leave rejected | Employee's LEAVE badge; message has reason text | Covered |

### 5.2 Mark as Read
| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| NOTIF-07 | ✅ Positive | Mark single notification read | 200, badge decrements | Covered |
| NOTIF-08 | ✅ Positive | Mark all read | 200, all unread cleared | Covered |
| NOTIF-09 | 🔐 Security | Mark another user's notification read | 403 | Covered by service logic |
| NOTIF-10 | ✅ Positive | Mark section notifications read | 200, section badge goes to 0 | Covered |

---

## 6. Reports

| ID | Type | Scenario | Expected | Status |
|---|---|---|---|---|
| RPT-01 | ✅ Positive | Admin gets team utilization for a week | 200 with member hours | Covered (E2E) |
| RPT-02 | ✅ Positive | Manager gets own team's utilization | 200 | Gap |
| RPT-03 | 🔐 Security | Employee accesses reports | 403 | Gap |
| RPT-04 | ✅ Positive | PDF export generates file | Content-Type: application/pdf | Gap |
| RPT-05 | ❌ Negative | Manager requests employee report for non-direct-report | 403 | Covered by code logic |

---

## 7. Security Test Cases

| ID | Scenario | Expected | Status |
|---|---|---|---|
| SEC-01 | Access /employees without auth | 401 | Covered (E2E) |
| SEC-02 | Access /dashboard with expired token | 401 → redirect to /login | Covered (apiClient interceptor) |
| SEC-03 | Employee accesses /employees (admin route) | 403 | Gap |
| SEC-04 | Employee accesses another employee's timesheet by ID | 403 | Covered by controller logic |
| SEC-05 | Manager self-approves timesheet | 403 | Covered by service logic |
| SEC-06 | Manager approves non-direct-report's timesheet | 403 | Covered by service logic |
| SEC-07 | SQL injection in query params | Parameterized → safe | Covered by JPA architecture |
| SEC-08 | Brute force login > 5 attempts | 429 rate limited | Covered (Integration) |
| SEC-09 | Use revoked token after logout | 401 | Covered (Integration) |
| SEC-10 | PATCH /employees/{id}/status with null status | 400 clean error | Fixed (F1) |

---

## 8. Edge Cases

| ID | Scenario | Expected |
|---|---|---|
| EDGE-01 | Create timesheet for week with no work days (all holidays) | 201 created; all days show HOLIDAY status |
| EDGE-02 | Apply leave that spans 1 day | 201; duration calculated as 1 day |
| EDGE-03 | Manager with no direct reports views team | Empty team list, not error |
| EDGE-04 | Submit timesheet with only LEAVE/HOLIDAY entries (no WORK) | 400 "Cannot submit an empty timesheet" |
| EDGE-05 | Add two entries on same day totaling exactly 8h | 200 accepted |
| EDGE-06 | Add entry at exactly 8h boundary when existing = 0h | 200 accepted |
| EDGE-07 | Add entry that would push day total to 8.01h | 400 "Total daily hours cannot exceed 8" |
| EDGE-08 | Employee with no manager submits timesheet | 200; no notification sent (safe null check) |
| EDGE-09 | JWT expiry during active session | 401 handled by apiClient, redirect to /login |
| EDGE-10 | Pagination: request page beyond totalPages | Empty list, not error |
