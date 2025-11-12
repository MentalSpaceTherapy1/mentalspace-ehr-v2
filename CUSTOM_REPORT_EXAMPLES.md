# Custom Report Builder - Example Reports

This document contains example custom reports demonstrating the capabilities of the custom report builder system.

## Table of Contents
1. [Clinical Reports](#clinical-reports)
2. [Billing & Financial Reports](#billing--financial-reports)
3. [Administrative Reports](#administrative-reports)
4. [Operational Reports](#operational-reports)

---

## Clinical Reports

### 1. Client Caseload by Clinician

**Purpose**: Shows the number of active clients assigned to each clinician.

**Configuration**:
```json
{
  "name": "Client Caseload by Clinician",
  "description": "Active client count per clinician",
  "category": "CLINICAL",
  "queryConfig": {
    "dataSources": ["User", "Appointment", "Client"],
    "fields": [
      { "source": "User", "field": "firstName", "alias": "clinician_first" },
      { "source": "User", "field": "lastName", "alias": "clinician_last" }
    ],
    "filters": [
      { "field": "User.role", "operator": "EQUALS", "values": ["CLINICIAN"] },
      { "field": "Client.status", "operator": "EQUALS", "values": ["ACTIVE"] }
    ],
    "groupBy": ["User.id"],
    "aggregations": [
      { "field": "Client.id", "function": "COUNT", "alias": "active_clients" }
    ],
    "orderBy": [
      { "field": "active_clients", "direction": "DESC" }
    ]
  }
}
```

**Use Case**: Workload balancing, capacity planning, supervision

---

### 2. Clients Without Recent Appointments

**Purpose**: Identifies clients who haven't had an appointment in the last 30 days.

**Configuration**:
```json
{
  "name": "Clients Without Recent Appointments",
  "description": "Clients with no appointments in last 30 days",
  "category": "CLINICAL",
  "queryConfig": {
    "dataSources": ["Client", "Appointment"],
    "fields": [
      { "source": "Client", "field": "firstName" },
      { "source": "Client", "field": "lastName" },
      { "source": "Client", "field": "email" },
      { "source": "Client", "field": "phone" }
    ],
    "filters": [
      { "field": "Client.status", "operator": "EQUALS", "values": ["ACTIVE"] },
      { "field": "Appointment.appointmentDate", "operator": "LT", "values": ["2025-10-10"] }
    ],
    "groupBy": ["Client.id"],
    "aggregations": [
      { "field": "Appointment.appointmentDate", "function": "MAX", "alias": "last_appointment" }
    ],
    "orderBy": [
      { "field": "last_appointment", "direction": "ASC" }
    ]
  }
}
```

**Use Case**: Client retention, outreach campaigns, care gaps

---

### 3. Clinical Note Completion Rate

**Purpose**: Tracks note completion status by clinician.

**Configuration**:
```json
{
  "name": "Clinical Note Completion Rate",
  "description": "Signed vs unsigned notes by clinician",
  "category": "CLINICAL",
  "queryConfig": {
    "dataSources": ["ClinicalNote", "User"],
    "fields": [
      { "source": "User", "field": "firstName", "alias": "clinician_first" },
      { "source": "User", "field": "lastName", "alias": "clinician_last" }
    ],
    "filters": [
      { "field": "ClinicalNote.noteDate", "operator": "GTE", "values": ["2025-01-01"] }
    ],
    "groupBy": ["User.id"],
    "aggregations": [
      { "field": "ClinicalNote.id", "function": "COUNT", "alias": "total_notes" },
      { "field": "ClinicalNote.isSigned", "function": "COUNT", "alias": "signed_notes" }
    ],
    "orderBy": [
      { "field": "total_notes", "direction": "DESC" }
    ]
  }
}
```

**Use Case**: Compliance monitoring, clinician performance, billing readiness

---

## Billing & Financial Reports

### 4. Revenue by Service Code

**Purpose**: Shows total revenue and transaction count per service code.

**Configuration**:
```json
{
  "name": "Revenue by Service Code",
  "description": "Revenue analysis by CPT code",
  "category": "BILLING",
  "queryConfig": {
    "dataSources": ["Charge", "ServiceCode"],
    "fields": [
      { "source": "ServiceCode", "field": "code", "alias": "cpt_code" },
      { "source": "ServiceCode", "field": "description", "alias": "service_name" }
    ],
    "filters": [
      { "field": "Charge.billingStatus", "operator": "IN", "values": ["PAID", "SUBMITTED"] },
      { "field": "Charge.serviceDate", "operator": "BETWEEN", "values": ["2025-01-01", "2025-12-31"] }
    ],
    "groupBy": ["ServiceCode.id"],
    "aggregations": [
      { "field": "Charge.chargeAmount", "function": "SUM", "alias": "total_revenue" },
      { "field": "Charge.paidAmount", "function": "SUM", "alias": "total_paid" },
      { "field": "Charge.id", "function": "COUNT", "alias": "transaction_count" }
    ],
    "orderBy": [
      { "field": "total_revenue", "direction": "DESC" }
    ]
  }
}
```

**Use Case**: Financial planning, service profitability, contract negotiations

---

### 5. Payer Mix Analysis

**Purpose**: Distribution of clients and revenue by payer type.

**Configuration**:
```json
{
  "name": "Payer Mix Analysis",
  "description": "Revenue and client distribution by payer",
  "category": "BILLING",
  "queryConfig": {
    "dataSources": ["Payer", "Insurance", "Charge"],
    "fields": [
      { "source": "Payer", "field": "name", "alias": "payer_name" },
      { "source": "Payer", "field": "type", "alias": "payer_type" }
    ],
    "filters": [
      { "field": "Insurance.isActive", "operator": "EQUALS", "values": [true] },
      { "field": "Charge.serviceDate", "operator": "GTE", "values": ["2025-01-01"] }
    ],
    "groupBy": ["Payer.id"],
    "aggregations": [
      { "field": "Charge.chargeAmount", "function": "SUM", "alias": "billed_amount" },
      { "field": "Charge.paidAmount", "function": "SUM", "alias": "paid_amount" },
      { "field": "Insurance.clientId", "function": "COUNT", "alias": "client_count" }
    ],
    "orderBy": [
      { "field": "billed_amount", "direction": "DESC" }
    ]
  }
}
```

**Use Case**: Contract negotiations, strategic planning, revenue optimization

---

### 6. Outstanding Claims Report

**Purpose**: Lists all unpaid charges submitted to insurance.

**Configuration**:
```json
{
  "name": "Outstanding Claims",
  "description": "Submitted but unpaid charges",
  "category": "BILLING",
  "queryConfig": {
    "dataSources": ["Charge", "Client", "ServiceCode"],
    "fields": [
      { "source": "Client", "field": "firstName" },
      { "source": "Client", "field": "lastName" },
      { "source": "ServiceCode", "field": "code" },
      { "source": "Charge", "field": "serviceDate" },
      { "source": "Charge", "field": "chargeAmount" },
      { "source": "Charge", "field": "submittedAt" }
    ],
    "filters": [
      { "field": "Charge.billingStatus", "operator": "EQUALS", "values": ["SUBMITTED"] },
      { "field": "Charge.submittedAt", "operator": "IS_NOT_NULL", "values": [] }
    ],
    "orderBy": [
      { "field": "submittedAt", "direction": "ASC" }
    ]
  }
}
```

**Use Case**: Collections management, cash flow analysis, follow-up prioritization

---

## Administrative Reports

### 7. New Client Enrollment Trend

**Purpose**: Tracks new client registrations over time.

**Configuration**:
```json
{
  "name": "New Client Enrollment",
  "description": "New clients by enrollment date",
  "category": "ADMINISTRATIVE",
  "queryConfig": {
    "dataSources": ["Client"],
    "fields": [
      { "source": "Client", "field": "createdAt", "alias": "enrollment_date" }
    ],
    "filters": [
      { "field": "createdAt", "operator": "GTE", "values": ["2025-01-01"] }
    ],
    "groupBy": ["enrollment_date"],
    "aggregations": [
      { "field": "id", "function": "COUNT", "alias": "new_clients" }
    ],
    "orderBy": [
      { "field": "enrollment_date", "direction": "DESC" }
    ]
  }
}
```

**Use Case**: Growth tracking, marketing ROI, capacity planning

---

### 8. Client Demographics Summary

**Purpose**: Distribution of clients by age group and gender.

**Configuration**:
```json
{
  "name": "Client Demographics",
  "description": "Age and gender distribution of clients",
  "category": "ADMINISTRATIVE",
  "queryConfig": {
    "dataSources": ["Client"],
    "fields": [
      { "source": "Client", "field": "dateOfBirth" }
    ],
    "filters": [
      { "field": "status", "operator": "EQUALS", "values": ["ACTIVE"] }
    ],
    "groupBy": ["dateOfBirth"],
    "aggregations": [
      { "field": "id", "function": "COUNT", "alias": "client_count" }
    ]
  }
}
```

**Use Case**: Program planning, service line development, grant applications

---

### 9. User Activity Report

**Purpose**: Tracks clinician login and activity patterns.

**Configuration**:
```json
{
  "name": "User Activity Report",
  "description": "Clinician activity and last login",
  "category": "ADMINISTRATIVE",
  "queryConfig": {
    "dataSources": ["User"],
    "fields": [
      { "source": "User", "field": "firstName" },
      { "source": "User", "field": "lastName" },
      { "source": "User", "field": "email" },
      { "source": "User", "field": "isActive" },
      { "source": "User", "field": "updatedAt", "alias": "last_activity" }
    ],
    "filters": [
      { "field": "role", "operator": "IN", "values": ["CLINICIAN", "ADMIN"] }
    ],
    "orderBy": [
      { "field": "last_activity", "direction": "DESC" }
    ]
  }
}
```

**Use Case**: Security audits, license management, system utilization

---

## Operational Reports

### 10. Appointment No-Show Rate

**Purpose**: Calculates no-show percentage by clinician.

**Configuration**:
```json
{
  "name": "No-Show Rate by Clinician",
  "description": "Appointment no-show percentages",
  "category": "ADMINISTRATIVE",
  "queryConfig": {
    "dataSources": ["Appointment", "User"],
    "fields": [
      { "source": "User", "field": "firstName" },
      { "source": "User", "field": "lastName" }
    ],
    "filters": [
      { "field": "Appointment.appointmentDate", "operator": "GTE", "values": ["2025-01-01"] },
      { "field": "Appointment.status", "operator": "IN", "values": ["COMPLETED", "NO_SHOW"] }
    ],
    "groupBy": ["User.id"],
    "aggregations": [
      { "field": "Appointment.id", "function": "COUNT", "alias": "total_appointments" }
    ],
    "orderBy": [
      { "field": "total_appointments", "direction": "DESC" }
    ]
  }
}
```

**Use Case**: Schedule optimization, reminder system evaluation, client engagement

---

### 11. Average Appointment Duration

**Purpose**: Shows average appointment length by type and clinician.

**Configuration**:
```json
{
  "name": "Average Appointment Duration",
  "description": "Average minutes per appointment type",
  "category": "ADMINISTRATIVE",
  "queryConfig": {
    "dataSources": ["Appointment"],
    "fields": [
      { "source": "Appointment", "field": "appointmentType" }
    ],
    "filters": [
      { "field": "status", "operator": "EQUALS", "values": ["COMPLETED"] },
      { "field": "appointmentDate", "operator": "GTE", "values": ["2025-01-01"] }
    ],
    "groupBy": ["appointmentType"],
    "aggregations": [
      { "field": "duration", "function": "AVG", "alias": "avg_duration" },
      { "field": "id", "function": "COUNT", "alias": "appointment_count" }
    ],
    "orderBy": [
      { "field": "avg_duration", "direction": "DESC" }
    ]
  }
}
```

**Use Case**: Scheduling optimization, capacity planning, efficiency analysis

---

### 12. Waitlist Conversion Rate

**Purpose**: Tracks how many waitlist entries convert to scheduled appointments.

**Configuration**:
```json
{
  "name": "Waitlist Conversion",
  "description": "Waitlist to appointment conversion rate",
  "category": "ADMINISTRATIVE",
  "queryConfig": {
    "dataSources": ["Client", "Appointment"],
    "fields": [
      { "source": "Client", "field": "firstName" },
      { "source": "Client", "field": "lastName" },
      { "source": "Client", "field": "createdAt", "alias": "waitlist_date" }
    ],
    "filters": [
      { "field": "Appointment.status", "operator": "IN", "values": ["SCHEDULED", "COMPLETED"] }
    ],
    "groupBy": ["Client.id"],
    "aggregations": [
      { "field": "Appointment.id", "function": "COUNT", "alias": "scheduled_count" }
    ],
    "orderBy": [
      { "field": "waitlist_date", "direction": "ASC" }
    ]
  }
}
```

**Use Case**: Waitlist management, access to care metrics, process improvement

---

## Advanced Multi-Table Reports

### 13. Comprehensive Client Revenue Report

**Purpose**: Shows total revenue, appointments, and notes per client.

**Configuration**:
```json
{
  "name": "Client Revenue Comprehensive",
  "description": "Full client activity and revenue analysis",
  "category": "FINANCIAL",
  "queryConfig": {
    "dataSources": ["Client", "Appointment", "Charge", "ClinicalNote"],
    "fields": [
      { "source": "Client", "field": "firstName" },
      { "source": "Client", "field": "lastName" },
      { "source": "Client", "field": "status" }
    ],
    "filters": [
      { "field": "Charge.serviceDate", "operator": "GTE", "values": ["2025-01-01"] }
    ],
    "groupBy": ["Client.id"],
    "aggregations": [
      { "field": "Charge.chargeAmount", "function": "SUM", "alias": "total_billed" },
      { "field": "Charge.paidAmount", "function": "SUM", "alias": "total_paid" },
      { "field": "Appointment.id", "function": "COUNT", "alias": "appointment_count" },
      { "field": "ClinicalNote.id", "function": "COUNT", "alias": "note_count" }
    ],
    "orderBy": [
      { "field": "total_billed", "direction": "DESC" }
    ]
  }
}
```

**Use Case**: VIP client identification, retention analysis, revenue forecasting

---

### 14. Clinician Productivity Scorecard

**Purpose**: Multi-metric clinician performance dashboard.

**Configuration**:
```json
{
  "name": "Clinician Productivity Scorecard",
  "description": "Comprehensive clinician performance metrics",
  "category": "ADMINISTRATIVE",
  "queryConfig": {
    "dataSources": ["User", "Appointment", "ClinicalNote", "Charge"],
    "fields": [
      { "source": "User", "field": "firstName" },
      { "source": "User", "field": "lastName" }
    ],
    "filters": [
      { "field": "User.role", "operator": "EQUALS", "values": ["CLINICIAN"] },
      { "field": "Appointment.appointmentDate", "operator": "GTE", "values": ["2025-01-01"] }
    ],
    "groupBy": ["User.id"],
    "aggregations": [
      { "field": "Appointment.id", "function": "COUNT", "alias": "completed_appointments" },
      { "field": "Appointment.duration", "function": "SUM", "alias": "total_clinical_hours" },
      { "field": "ClinicalNote.id", "function": "COUNT", "alias": "notes_completed" },
      { "field": "Charge.chargeAmount", "function": "SUM", "alias": "revenue_generated" }
    ],
    "orderBy": [
      { "field": "revenue_generated", "direction": "DESC" }
    ]
  }
}
```

**Use Case**: Performance reviews, bonus calculations, workload assessment

---

## Tips for Creating Effective Reports

### 1. Start Simple
- Begin with 1-2 data sources
- Add 3-5 essential fields
- Test with preview before adding complexity

### 2. Use Meaningful Aliases
- Bad: `Client_firstName`
- Good: `client_first_name` or `first_name`

### 3. Filter Early
- Add date range filters to improve performance
- Filter on indexed fields (status, dates, IDs)

### 4. Group Thoughtfully
- Group by dimensions (clinician, service type, date)
- Not by unique IDs (unless intentional)

### 5. Order Results
- Always add ORDER BY for consistent results
- Sort by aggregated values for rankings

### 6. Test with Preview
- Use 10-row preview before saving
- Verify data looks correct
- Check for null values

### 7. Document Your Reports
- Use clear names and descriptions
- Note the business purpose
- Document filter values and date ranges

---

## Common Report Patterns

### Pattern 1: Count by Category
```json
{
  "groupBy": ["categoryField"],
  "aggregations": [
    { "field": "id", "function": "COUNT", "alias": "count" }
  ]
}
```

### Pattern 2: Revenue Analysis
```json
{
  "aggregations": [
    { "field": "chargeAmount", "function": "SUM", "alias": "total_revenue" },
    { "field": "paidAmount", "function": "SUM", "alias": "total_collected" },
    { "field": "id", "function": "COUNT", "alias": "transaction_count" }
  ]
}
```

### Pattern 3: Performance Ranking
```json
{
  "groupBy": ["userId"],
  "aggregations": [
    { "field": "metric", "function": "SUM", "alias": "total" }
  ],
  "orderBy": [
    { "field": "total", "direction": "DESC" }
  ]
}
```

### Pattern 4: Time-based Trend
```json
{
  "groupBy": ["dateField"],
  "aggregations": [
    { "field": "id", "function": "COUNT", "alias": "daily_count" }
  ],
  "orderBy": [
    { "field": "dateField", "direction": "ASC" }
  ]
}
```

---

## Support Resources

- **Validation Endpoint**: `/api/v1/custom-reports/validate`
- **Preview Endpoint**: `/api/v1/custom-reports/preview`
- **Templates**: `/api/v1/custom-reports/templates`
- **Data Sources**: `/api/v1/custom-reports/data-sources`

**Need Help?** Check the implementation documentation or use preview mode to test your queries safely!
