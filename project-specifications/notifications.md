# TimeKeeper — Notifications

---

## Overview

TimeKeeper's notification system is entirely **email-based**. Push notifications and in-app real-time alerts are not currently implemented (the UI notification bell is a visual placeholder only).

---

## Email Infrastructure

### Technology Stack

| Component | Value |
|---|---|
| Library | Spring Mail (`spring-boot-starter-mail`) |
| SMTP Provider | Gmail (smtp.gmail.com:587) |
| Auth | App password (App Password, not account password) |
| Transport | STARTTLS |
| Message Format | HTML (`MimeMessage` via `MimeMessageHelper`) |

### `application.properties` Configuration

```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=${MAIL_USERNAME}
spring.mail.password=${MAIL_PASSWORD}
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

The mail credentials are injected via environment variables (`MAIL_USERNAME`, `MAIL_PASSWORD`).

---

## Email Service

**Class:** `com.timekeeper.service.EmailService`  
**Scope:** `@Service`, `@Singleton`

### Key Methods

| Method | Description |
|---|---|
| `sendHtmlEmail(to, subject, htmlBody)` | Core method — sends an HTML email to one recipient |
| `sendTimesheetReminderEmail(employee)` | Constructs and dispatches the weekly reminder message |

### HTML Email Structure

All emails sent by TimeKeeper are HTML-formatted with:
- TimeKeeper branding in the header
- Clear call-to-action (link to app)
- Plain-English description of the action required
- Professional footer with "Do not reply" note

---

## Timesheet Reminder Notifications

### Purpose

Reminds employees who have **not submitted a timesheet** for the current week to log their hours before the deadline.

### Trigger Options

#### 1. Scheduled (Automatic)

**Class:** `com.timekeeper.service.TimesheetReminderService`

The service contains a `@Scheduled` method that runs on a configurable cron schedule. By default, it fires every week (e.g., Friday afternoon).

**Logic:**
1. Fetch all employees with `EmployeeStatus.ACTIVE`
2. For each employee, check if a `SUBMITTED` timesheet exists for the current week
3. If no submitted timesheet is found → send reminder email

```java
// Concept
@Scheduled(cron = "0 0 14 * * FRI")  // Every Friday at 2pm
public void sendWeeklyTimesheetReminders() {
    List<Employee> activeEmployees = employeeRepository.findByStatus(ACTIVE);
    String weekStart = getCurrentMondayDate();
    for (Employee emp : activeEmployees) {
        boolean submitted = timesheetRepository
            .existsByEmployeeIdAndWeekStartDateAndStatus(emp.getId(), weekStart, SUBMITTED);
        if (!submitted) {
            emailService.sendTimesheetReminderEmail(emp);
        }
    }
}
```

#### 2. Manual (Admin-triggered)

**Endpoint:** `POST /api/v1/admin/reminders/timesheets`  
**Auth:** ADMIN  
**Description:** Immediately sends timesheet reminder emails to all active employees without a submitted timesheet for the current week. Useful for ad-hoc nudges mid-week.

**Controller:** `AdminReminderController`  
**Response:**
```json
{
  "message": "Timesheet reminders sent successfully",
  "data": null
}
```

**Frontend Integration:**  
`reportService.triggerTimesheetReminders()` — called from the Organization dashboard (Admin view) via a "Send Reminders" button or equivalent control.

```js
// services/reportService.js
export const triggerTimesheetReminders = () =>
  apiClient.post('/admin/reminders/timesheets');
```

---

## Notification Bell (UI Placeholder)

The `Layout.jsx` header contains a bell icon (Lucide `Bell` component) with a notification dot indicator.

**Current state:**
- Static UI only — no WebSocket or polling for real-time events
- No read/unread state persisted to backend
- The dot is always shown (hardcoded visual state)

**Planned future capability:**
- Count of unread notifications fetched via `GET /api/v1/notifications`
- Mark-as-read support
- Notification types: leave approval/rejection, timesheet deadline, assignment to project

---

## Notification Matrix

| Event | Channel | Triggered By | Recipients |
|---|---|---|---|
| Weekly timesheet not submitted | Email | Scheduled cron (Friday) | All ACTIVE employees without SUBMITTED timesheet |
| Manual reminder | Email | Admin via dashboard | Same as above |
| *(Future)* Leave approved | Email | Manager action | Requesting employee |
| *(Future)* Leave rejected | Email | Manager action | Requesting employee |
| *(Future)* New project assigned | In-app | Admin action | Assigned employees |

---

## Security Notes

- `POST /admin/reminders/timesheets` is protected by `@PreAuthorize("hasRole('ADMIN')")` — only Admins can trigger bulk email sends
- Mail credentials are **never** committed to source control — they are loaded from environment variables at runtime
- The "from" address shown to recipients is the configured `MAIL_USERNAME` — use a team/no-reply address in production
- Email content is HTML; all dynamic content (employee names) is inserted server-side — no user-supplied HTML is rendered

---

## Future Scope

- Real-time in-app notifications (WebSocket / SSE)
- Leave status change email notifications
- Project assignment notifications
- Digest emails (weekly summary for managers)
- Per-user notification preferences (opt-in/opt-out per category)
- Notification history page in the UI
