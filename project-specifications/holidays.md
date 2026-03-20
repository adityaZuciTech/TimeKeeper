# TimeKeeper — Holidays Module

---

## Overview

The Holidays module maintains a system-wide calendar of non-working days. All authenticated users can view holidays. Only Admins can create or delete them. When a holiday falls on a day within an employee's timesheet week, that day is automatically marked as non-editable with `dayStatus: HOLIDAY`.

---

## Holiday Types (Frontend Inference)

Holidays don't have a `type` field in the database. The frontend infers the type from the holiday name:

| Inferred Type | Name Contains | Badge Color |
|---|---|---|
| National | "day", "independence", "republic", "national", "liberation" | Blue |
| Religious | "eid", "diwali", "christmas", "puja", "holi", "navratri", "guru", "janmashtami", "buddha" | Purple |
| Regional | "onam", "pongal", "baisakhi", "bihu", "ugadi", "vishu", "makar" | Green |
| Other | anything else | Gray |

---

## User Flows

### All Users: View Holidays

```
1. Navigate to "Holidays"
2. See all holidays grouped by month
3. Each card shows: name, date, day-of-week, inferred type badge
4. A "Next Holiday" featured card shows upcoming holiday countdown
```

### Admin: Create Holiday

```
1. Navigate to "Holidays"
2. Click "Add Holiday"
3. Enter holiday name and date
4. Submit → holiday saved, visible to all users immediately
5. Any existing timesheets for that week mark the day as HOLIDAY
```

### Admin: Delete Holiday

```
1. Find the holiday card
2. Click the action menu (⋮)
3. Select "Delete" → confirm
4. Holiday removed; timesheet days revert to WORK on next load
```

---

## Holiday-Timesheet Integration

When the service builds a `TimesheetResponse`, for each day (MON–FRI):
1. Fetch all holidays within the week range
2. If any holiday date matches the day → set `dayStatus = HOLIDAY`, `editable = false`
3. Holidays take precedence over LEAVE for day status display

---

## Data Model

### `holidays` Table

| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR(50) | Format: `hol_` + 8-char UUID segment |
| `name` | VARCHAR(100) | Display name (e.g. "Republic Day") |
| `date` | DATE | Unique constraint — no two holidays on same date |
| `description` | TEXT | Optional notes (nullable) |

---

## API Endpoints

### `GET /api/v1/holidays`
Get all holidays.

**Auth:** All roles  
**Response:**
```json
{
  "data": {
    "holidays": [
      {
        "id": "hol_abc12345",
        "name": "Republic Day",
        "date": "2026-01-26",
        "description": "National holiday"
      },
      {
        "id": "hol_def67890",
        "name": "Independence Day",
        "date": "2026-08-15",
        "description": null
      }
    ]
  }
}
```

---

### `POST /api/v1/holidays`
Create a new holiday.

**Auth:** ADMIN only  
**Body:**
```json
{
  "name": "Diwali",
  "date": "2026-10-20",
  "description": "Festival of Lights"
}
```

**Error cases:**
- `409 Conflict` if a holiday already exists on that date (unique constraint)

---

### `DELETE /api/v1/holidays/{id}`
Delete a holiday.

**Auth:** ADMIN only  
**Response:** 200 with success message

---

## Frontend Components

| Component | File | Description |
|---|---|---|
| `Holidays` | `pages/Holidays/Holidays.jsx` | Monthly grouping, NextHolidayCard, TypeBadge, DateBadge, ActionMenu |
| `holidaySlice` | `features/holidays/holidaySlice.js` | Redux: holidays list, loading |
| `holidayService` | `services/holidayService.js` | getAll, create, delete |

### NextHolidayCard Logic
- Filters holidays to find the earliest date after today
- Shows name, date, day-of-week, countdown in days
- Displayed as a featured card at the top of the Holidays page

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Two holidays on same date | DB unique constraint rejects; 500 returned |
| Holiday on a weekend | Stored but has no effect on Mon–Fri timesheets |
| Holiday deleted after employees added time entries for that day | Day reverts to WORK status; existing entries remain |
| Holiday created mid-week | Existing DRAFT timesheets show the day as HOLIDAY on next load |

---

## Future Scope

- Holiday `type` field stored in DB rather than inferred from name
- Recurring annual holidays (auto-recreate each year)
- Bulk holiday import from CSV or government API
- Country/region-specific holiday sets for multi-location orgs
- Holiday calendar view (monthly calendar grid UI)
