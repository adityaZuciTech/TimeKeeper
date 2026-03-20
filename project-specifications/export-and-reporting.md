# TimeKeeper — Export & Reporting

---

## Overview

TimeKeeper supports two export formats from the Organization analytics dashboard:

| Format | Trigger | Backend | Output |
|---|---|---|---|
| CSV | Client-side | None | `.csv` download from browser memory |
| PDF | Server-side | POST `/api/v1/reports/export-pdf` | 4-page `.pdf` download |

---

## CSV Export

### Implementation

CSV export is a **purely client-side operation** — no API calls are made.

The Organization component constructs the CSV string from its local `departmentData` state and triggers a browser download via a Blob URL.

**Logic (Organization.jsx `handleExportCSV`):**
```js
const csvRows = [
  ['Department', 'Employees', 'Total Hours', 'Avg Hrs/Employee', 'Utilization %'],
  ...departmentData.map(d => [
    d.name, d.employees, d.hours, d.avgHoursPerEmployee, d.utilization
  ])
];
const csvString = csvRows.map(r => r.join(',')).join('\n');
const blob = new Blob([csvString], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
// triggers <a download> then revokes URL
```

### File Naming
`timekeeper-report-<YYYY-MM-DD>.csv` (today's date).

---

## PDF Export

### End-to-End Flow

```
User clicks "Export PDF"
  → captureChartImage() × 2 (SVG → Canvas → base64)
  → POST /api/v1/reports/export-pdf (JSON body, responseType: 'blob')
  → PdfReportService: Thymeleaf renders HTML
  → OpenHTMLtoPDF converts HTML → PDF bytes
  → Response: application/pdf blob
  → Browser creates <a download> and triggers save dialog
```

---

### Chart Image Capture

Before the POST request is made, the frontend captures the two chart SVGs (Recharts renders as `<svg>`) as base64-encoded PNG images.

**`captureChartImage(selector)` in Organization.jsx:**
```js
const svg = document.querySelector(selector);   // e.g. '.recharts-wrapper svg'
const svgData = new XMLSerializer().serializeToString(svg);
const img = new Image();
img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
// draws to offscreen <canvas>, returns canvas.toDataURL('image/png')
```

Two captures are made:
- **Trend chart** → `.recharts-wrapper:first-of-type svg`
- **Donut chart** → `.recharts-wrapper:last-of-type svg`

Both base64 strings are included in the POST body.

---

### API Request

**`POST /api/v1/reports/export-pdf`**  
**Auth:** ADMIN  
**Content-Type:** `application/json`  
**Response Content-Type:** `application/pdf`

**Request Body (`PdfReportRequest`):**
```json
{
  "stats": {
    "departmentsCount": 4,
    "employeesCount": 24,
    "totalHours": 892.5,
    "avgUtilization": 74.2,
    "hoursTrend": 12.5
  },
  "departmentData": [
    {
      "name": "Engineering",
      "employees": 8,
      "hours": 280.0,
      "avgHoursPerEmployee": 35.0,
      "utilization": 87.5,
      "percentage": 31.4
    }
  ],
  "trendChartImage": "data:image/png;base64,iVBORw0KGgo...",
  "pieChartImage":   "data:image/png;base64,iVBORw0KGgo...",
  "weekLabel": "Week of Mar 16, 2026"
}
```

**DTO Nesting:**
```
PdfReportRequest
├── Stats (inner static class)
│   ├── departmentsCount: int
│   ├── employeesCount: int
│   ├── totalHours: double
│   ├── avgUtilization: double
│   └── hoursTrend: double
├── DepartmentItem (List, inner static class)
│   ├── name: String
│   ├── employees: int
│   ├── hours: double
│   ├── avgHoursPerEmployee: double
│   ├── utilization: double
│   └── percentage: double
├── trendChartImage: String (base64)
├── pieChartImage: String (base64)
└── weekLabel: String
```

---

### Backend — PdfReportService

**Location:** `com.timekeeper.service.PdfReportService`  
**Dependencies:** `TemplateEngine` (Thymeleaf), `PdfRendererBuilder` (OpenHTMLtoPDF)

**Implementation:**
1. Creates a Thymeleaf `Context` and populates variables from `PdfReportRequest`
2. Calls `templateEngine.process("report-template", context)` → produces HTML string
3. Calls `PdfRendererBuilder.withHtmlContent(html, "/")` with base URI `"/"`
4. Writes to `ByteArrayOutputStream`
5. Returns `byte[]` to controller

**Controller response headers:**
```java
return ResponseEntity.ok()
    .header(HttpHeaders.CONTENT_DISPOSITION,
            "attachment; filename=\"timekeeper-report.pdf\"")
    .contentType(MediaType.APPLICATION_PDF)
    .body(pdfBytes);
```

---

### PDF Template (`report-template.html`)

**Location:** `src/main/resources/templates/report-template.html`  
**Engine:** Thymeleaf 3 + HTML5  
**Renderer:** OpenHTMLtoPDF 1.0.10

#### Page Structure (4 pages)

| Page | Content |
|---|---|
| 1 | Cover / Stat cards (Departments, Employees, Total Hours, Avg Utilization, Trend %) + Key Insights |
| 2 | Weekly Hours Trend (embedded chart image from base64) |
| 3 | Department Distribution (embedded donut chart image from base64) |
| 4 | Department Utilization Table (name, employees, hours, avg, utilization bar) |

Page breaks are handled with CSS: `page-break-before: always` or `break-before: page`.

#### Critical Implementation Notes

**1. CDATA wrap for CSS containing `&` characters**

OpenHTMLtoPDF parses the template as XML/XHTML. Any `&` in the `<style>` block (e.g., `&amp;`, `border: 1px solid #ccc`) causes a `SAXParseException`. Wrap all inline CSS in CDATA:

```html
<style>
/*<![CDATA[*/
  body { font-family: Arial, sans-serif; }
  /* Any & characters are safe here */
/*]]>*/
</style>
```

**2. No `position: fixed` — use `@page` for headers/footers**

OpenHTMLtoPDF does not support `position: fixed` for page headers/footers. Use CSS margin boxes:

```css
@page {
  margin: 20mm 15mm 25mm 15mm;
  @bottom-left { content: "TimeKeeper Report — Confidential"; font-size: 8pt; }
  @bottom-right { content: "Page " counter(page) " of " counter(pages); font-size: 8pt; }
}
```

**3. Thymeleaf ternary instead of SpEL `T(java.lang.Math).min()`**

`T(java.lang.Math).min()` is not supported in Thymeleaf `th:style` context. Use inline ternary:

```html
<!-- WRONG -->
<div th:style="'width: ' + ${T(java.lang.Math).min(dept.utilization, 100)} + '%'"></div>

<!-- CORRECT -->
<div th:style="'width: ' + ${dept.utilization > 100 ? 100 : dept.utilization} + '%'"></div>
```

**4. Base64 images use `<img>` `src` directly**

```html
<img th:src="${trendChartImage}" style="width:100%; max-height:300px;" />
```

Thymeleaf outputs the `data:image/png;base64,...` string verbatim into the `src` attribute, which OpenHTMLtoPDF handles correctly.

---

### Maven Dependencies

```xml
<!-- OpenHTMLtoPDF Core -->
<dependency>
  <groupId>com.openhtmltopdf</groupId>
  <artifactId>openhtmltopdf-core</artifactId>
  <version>1.0.10</version>
</dependency>

<!-- PDFBOX renderer -->
<dependency>
  <groupId>com.openhtmltopdf</groupId>
  <artifactId>openhtmltopdf-pdfbox</artifactId>
  <version>1.0.10</version>
</dependency>

<!-- Thymeleaf (included via spring-boot-starter-thymeleaf) -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-thymeleaf</artifactId>
</dependency>
```

---

## Error Handling

| Error | Cause | Behavior |
|---|---|---|
| 400 Bad Request | Missing required DTO fields | Spring validation error returned |
| 401 Unauthorized | Non-admin user | Spring Security rejects request |
| 500 Internal Server Error | PDF rendering failure | Generic error returned; check server logs |
| Client-side: "Could not capture chart" | SVG not found in DOM | Logged to console; export proceeds without chart image |

---

## Security Notes

- PDF export requires `ADMIN` role enforced via `@PreAuthorize("hasRole('ADMIN')")`
- Base64 image strings are validated to ensure they originate from the trusted frontend (same-origin CORS policy)
- The PDF file is generated server-side and never stored to disk — returned as `byte[]` in-memory only
- No user PII beyond names and hours is included in the exported document

---

## Future Scope

- Configurable report date ranges (beyond single-week snapshots)
- Excel (XLSX) export
- Scheduled automatic PDF email delivery to admin
- Persisted generated reports (history / audit log)
- Per-department drill-down PDF pages
