# TimeKeeper — Billing & Invoicing

---

## Status: Future Scope

Billing and invoicing functionality is **not implemented** in the current version of TimeKeeper. This document outlines the intended design for future implementation.

---

## Motivation

TimeKeeper tracks hours logged against projects. A natural extension is to convert those hours into client-billable invoices, enabling the platform to serve consulting and agency teams end-to-end.

---

## Planned Features

### Client Management
- Client profiles linked to projects
- Billing rate per client (hourly)
- Contact details, billing address, payment terms

### Billable Hours Tracking
- Mark `TimeEntry` records as billable or non-billable
- Per-project billing rate override
- Billing status: Unbilled / Billed / Paid

### Invoice Generation
- Auto-generate invoices from approved timesheets
- Group by project, employee, or billing period
- PDF invoice export (reuses PDF export infrastructure)
- Invoice numbering (e.g., INV-2026-0001)
- Line items: Employee name, hours, rate, subtotal

### Invoice Workflow
- Draft → Sent → Paid / Overdue
- Manual status updates by Admin
- Email delivery to client contact

### Reporting
- Revenue by client / project / month
- Outstanding invoices (Accounts Receivable)
- Utilization vs billable hours comparison

---

## Dependent Features (Already Implemented)

| Feature | Status |
|---|---|
| Time entries per project | ✅ Implemented |
| PDF export pipeline | ✅ Implemented (OpenHTMLtoPDF) |
| Email delivery | ✅ Implemented (Spring Mail) |
| Project management (client_name field) | ✅ Partially (client name stored on Project entity) |
| Admin role access control | ✅ Implemented |

---

## Schema Changes Required

```sql
-- Future tables
CREATE TABLE billing_rates (
  id VARCHAR(50) PRIMARY KEY,
  project_id VARCHAR(50),           -- FK → projects.id
  hourly_rate DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'USD',
  effective_from DATE
);

CREATE TABLE invoices (
  id VARCHAR(50) PRIMARY KEY,       -- inv_ prefix
  client_name VARCHAR(150),
  project_id VARCHAR(50),
  billing_period_start DATE,
  billing_period_end DATE,
  total_hours DECIMAL(8,2),
  total_amount DECIMAL(12,2),
  status VARCHAR(20),               -- DRAFT / SENT / PAID / OVERDUE
  issued_date DATE,
  due_date DATE,
  created_at TIMESTAMP
);

ALTER TABLE time_entries
  ADD billable BOOLEAN DEFAULT true,
  ADD invoice_id VARCHAR(50);       -- FK → invoices.id (nullable until billed)
```

---

## Next Steps to Implement

1. Add `billable` flag to `TimeEntry` entity and migration
2. Add `billingRate` to `Project` entity (or separate `BillingRate` table)
3. Create `Invoice` entity + `InvoiceRepository`
4. Create `InvoiceService` with `generateFromTimesheets(projectId, periodStart, periodEnd)`
5. Create `InvoiceController` at `/api/v1/invoices`
6. Extend PDF export template to support invoice layout
7. Add Invoices page to frontend (Admin-only)
8. Add billing reports to Organization dashboard
