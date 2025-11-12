# Module 9 Reports & Integration API Documentation

## Overview

This document provides comprehensive API documentation for the Module 9 Reports & Integration system. Module 9 implements advanced reporting and cross-subsystem integration for:

- Credentialing Management
- Training & Development
- Policy Management
- Incident Tracking
- Performance Management
- Attendance Tracking
- Financial Management
- Vendor Management
- Practice Management Dashboard
- Audit Trail

## Table of Contents

1. [Authentication](#authentication)
2. [Report Endpoints](#report-endpoints)
3. [Integration Services](#integration-services)
4. [Export Formats](#export-formats)
5. [Error Handling](#error-handling)
6. [Performance Considerations](#performance-considerations)

---

## Authentication

All endpoints require authentication via Bearer token:

```http
Authorization: Bearer <your-auth-token>
```

---

## Report Endpoints

### Base URL

```
/api/reports/module9
```

All endpoints return data in the following format:

```json
{
  "success": true,
  "data": {
    "summary": { ... },
    "records": [ ... ],
    "period": {
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-11-11T00:00:00.000Z",
      "generatedAt": "2025-11-11T12:00:00.000Z"
    }
  }
}
```

---

## 1. Credentialing Report

### Endpoint

```http
GET /api/reports/module9/credentialing
```

### Description

Generates a comprehensive report on credential status, verifications, expirations, and OIG/SAM screening compliance.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date (ISO 8601) | No | Start date for filtering credentials |
| `endDate` | Date (ISO 8601) | No | End date for filtering credentials |
| `credentialType` | String | No | Filter by credential type (LICENSE, CERTIFICATION, etc.) |
| `verificationStatus` | String | No | Filter by status (VERIFIED, PENDING, REJECTED, EXPIRED) |
| `userId` | UUID | No | Filter by specific user |
| `includeExpiringSoon` | Boolean | No | Include credentials expiring soon (default: true) |
| `daysUntilExpiration` | Number | No | Days threshold for "expiring soon" (default: 90) |

### Response Structure

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalCredentials": 150,
      "activeCredentials": 140,
      "expiredCredentials": 10,
      "expiringCredentials": 15,
      "pendingVerification": 5,
      "screeningIssues": 2,
      "complianceRate": 93.33,
      "statusSummary": {
        "VERIFIED": 135,
        "PENDING": 5,
        "REJECTED": 2,
        "EXPIRED": 8
      },
      "credentialsByType": { ... }
    },
    "credentials": [
      {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "name": "John Doe",
          "email": "john@example.com",
          "department": "Clinical",
          "jobTitle": "Therapist"
        },
        "credentialType": "LICENSE",
        "credentialNumber": "PSY12345",
        "issuingAuthority": "State Board",
        "expirationDate": "2025-12-31",
        "verificationStatus": "VERIFIED",
        "daysUntilExpiration": 50,
        "isExpiringSoon": true
      }
    ],
    "expiringCredentials": [...],
    "expiredCredentials": [...],
    "pendingVerification": [...],
    "screeningIssues": [...]
  }
}
```

### Example Request

```bash
curl -X GET "http://localhost:3001/api/reports/module9/credentialing?includeExpiringSoon=true&daysUntilExpiration=90" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 2. Training Compliance Report

### Endpoint

```http
GET /api/reports/module9/training-compliance
```

### Description

Provides detailed analysis of training completion rates, mandatory training compliance, and CEU tracking.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date (ISO 8601) | No | Start date for filtering |
| `endDate` | Date (ISO 8601) | No | End date for filtering |
| `trainingType` | String | No | Filter by type (HIPAA, SAFETY, CLINICAL_COMPETENCY, etc.) |
| `category` | String | No | Filter by category (MANDATORY, RECOMMENDED, OPTIONAL) |
| `userId` | UUID | No | Filter by specific user |
| `department` | String | No | Filter by department |
| `includeExpired` | Boolean | No | Include expired training (default: true) |

### Response Structure

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTrainingRecords": 450,
      "completedTraining": 380,
      "inProgressTraining": 45,
      "notStartedTraining": 15,
      "expiredTraining": 10,
      "overdueTraining": 8,
      "overallCompletionRate": 84.44,
      "mandatoryComplianceRate": 95.5,
      "totalCEUEarned": 1250.5,
      "trainingByType": {
        "HIPAA": {
          "total": 100,
          "completed": 95,
          "averageScore": 92.5
        }
      },
      "trainingByDepartment": { ... }
    },
    "records": [
      {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "name": "Jane Smith",
          "department": "Clinical"
        },
        "trainingType": "HIPAA",
        "courseName": "HIPAA Compliance Training 2025",
        "category": "MANDATORY",
        "status": "COMPLETED",
        "completionDate": "2025-10-15",
        "creditsEarned": 4.0,
        "score": 95
      }
    ],
    "overdueTraining": [...],
    "expiredTraining": [...]
  }
}
```

---

## 3. Policy Compliance Report

### Endpoint

```http
GET /api/reports/module9/policy-compliance
```

### Description

Tracks policy acknowledgments, compliance rates, and identifies policies requiring review.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date (ISO 8601) | No | Start date for filtering |
| `endDate` | Date (ISO 8601) | No | End date for filtering |
| `category` | String | No | Filter by policy category |
| `status` | String | No | Filter by status (ACTIVE, DRAFT, ARCHIVED) |
| `department` | String | No | Filter by department |

### Response Structure

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPolicies": 50,
      "activePolicies": 45,
      "policiesNeedingReview": 5,
      "policiesRequiringAck": 40,
      "overallComplianceRate": 92.5,
      "totalAcknowledgments": 1800,
      "policiesByCategory": { ... }
    },
    "policies": [
      {
        "id": "uuid",
        "policyName": "HIPAA Privacy Policy",
        "policyNumber": "POL-001",
        "category": "COMPLIANCE",
        "requireAck": true,
        "requiredAcknowledgments": 50,
        "receivedAcknowledgments": 47,
        "complianceRate": 94.0,
        "needsReview": false,
        "pendingUsers": [
          {
            "id": "uuid",
            "name": "John Doe",
            "department": "Clinical"
          }
        ]
      }
    ]
  }
}
```

---

## 4. Incident Analysis Report

### Endpoint

```http
GET /api/reports/module9/incident-analysis
```

### Description

Analyzes incident patterns, severity trends, and resolution metrics.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date (ISO 8601) | No | Start date for filtering |
| `endDate` | Date (ISO 8601) | No | End date for filtering |
| `incidentType` | String | No | Filter by type (CLINICAL, SAFETY, SECURITY, etc.) |
| `severity` | String | No | Filter by severity (CRITICAL, HIGH, MEDIUM, LOW) |
| `investigationStatus` | String | No | Filter by status |
| `department` | String | No | Filter by department |

### Response Structure

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalIncidents": 25,
      "criticalIncidents": 2,
      "resolvedIncidents": 18,
      "pendingIncidents": 4,
      "averageResolutionDays": 5.2,
      "incidentsByType": {
        "CLINICAL": {
          "total": 10,
          "critical": 1,
          "resolved": 8,
          "averageResolutionDays": 4.5
        }
      },
      "incidentsBySeverity": { ... },
      "monthlyTrends": { ... }
    },
    "incidents": [
      {
        "id": "uuid",
        "incidentNumber": "INC-2025-001",
        "incidentDate": "2025-11-01",
        "incidentType": "CLINICAL",
        "severity": "MEDIUM",
        "reportedBy": {
          "id": "uuid",
          "name": "Jane Doe"
        },
        "investigationStatus": "RESOLVED",
        "resolutionDate": "2025-11-05",
        "resolutionDays": 4
      }
    ]
  }
}
```

---

## 5. Performance Report

### Endpoint

```http
GET /api/reports/module9/performance
```

### Description

Comprehensive performance metrics including productivity scores, goal achievement, and compliance ratings.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date (ISO 8601) | No | Start date (default: current year start) |
| `endDate` | Date (ISO 8601) | No | End date (default: now) |
| `userId` | UUID | No | Filter by specific user |
| `department` | String | No | Filter by department |
| `metricType` | String | No | Filter by metric type |

### Response Structure

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalUsers": 50,
      "totalSessions": 2500,
      "totalRevenue": 250000.00,
      "averageSessionsPerUser": 50.0,
      "totalGoals": 150,
      "completedGoals": 120,
      "totalAlerts": 15,
      "departmentPerformance": { ... }
    },
    "userPerformance": [
      {
        "user": {
          "id": "uuid",
          "name": "John Doe",
          "department": "Clinical"
        },
        "totalSessions": 65,
        "totalRevenue": 6500.00,
        "averageProductivity": 85.5,
        "complianceScore": 95,
        "goalsCompleted": 4,
        "goalsTotal": 5,
        "goalsCompletionRate": 80.0
      }
    ],
    "goals": [...],
    "alerts": [...]
  }
}
```

---

## 6. Attendance Report

### Endpoint

```http
GET /api/reports/module9/attendance
```

### Description

Tracks group therapy attendance patterns, rates, and individual client participation.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date (ISO 8601) | No | Start date (default: current month start) |
| `endDate` | Date (ISO 8601) | No | End date (default: now) |
| `groupId` | UUID | No | Filter by specific group |
| `clientId` | UUID | No | Filter by specific client |

### Response Structure

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalSessions": 200,
      "totalAttended": 170,
      "totalAbsent": 20,
      "totalExcused": 10,
      "overallAttendanceRate": 85.0,
      "uniqueGroups": 10,
      "uniqueClients": 45,
      "attendanceByGroup": [
        {
          "group": {
            "id": "uuid",
            "name": "Anxiety Support Group"
          },
          "totalSessions": 20,
          "totalAttended": 18,
          "attendanceRate": 90.0
        }
      ]
    },
    "records": [
      {
        "id": "uuid",
        "sessionDate": "2025-11-10",
        "group": {
          "id": "uuid",
          "name": "Anxiety Support Group"
        },
        "client": {
          "id": "uuid",
          "name": "Client Name"
        },
        "attendanceStatus": "PRESENT",
        "arrivedLate": false
      }
    ]
  }
}
```

---

## 7. Financial Report

### Endpoint

```http
GET /api/reports/module9/financial
```

### Description

Comprehensive financial reporting including budgets, expenses, and utilization rates.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date (ISO 8601) | No | Start date (default: fiscal year start) |
| `endDate` | Date (ISO 8601) | No | End date (default: now) |
| `department` | String | No | Filter by department |
| `category` | String | No | Filter by budget category |

### Response Structure

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalAllocated": 500000.00,
      "totalSpent": 350000.00,
      "totalCommitted": 75000.00,
      "totalRemaining": 75000.00,
      "overallUtilization": 85.0,
      "totalExpenses": 350000.00,
      "budgetByCategory": {
        "SALARIES": {
          "allocated": 300000.00,
          "spent": 250000.00,
          "utilizationRate": 83.33
        }
      },
      "purchaseOrders": {
        "total": 50,
        "totalValue": 100000.00
      }
    },
    "budgets": [...],
    "expenses": [...]
  }
}
```

---

## 8. Vendor Report

### Endpoint

```http
GET /api/reports/module9/vendor
```

### Description

Vendor performance, contract status, and spending analysis.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | String | No | Filter by vendor category |
| `isActive` | Boolean | No | Filter by active status |
| `includePerformance` | Boolean | No | Include performance metrics (default: true) |

### Response Structure

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalVendors": 25,
      "activeVendors": 20,
      "expiringContracts": 3,
      "expiringInsurance": 2,
      "vendorsByCategory": {
        "IT_SERVICES": {
          "total": 5,
          "active": 4,
          "totalSpend": 50000.00,
          "averagePerformance": 85.0
        }
      }
    },
    "vendors": [
      {
        "id": "uuid",
        "companyName": "Tech Solutions Inc",
        "category": "IT_SERVICES",
        "contractEnd": "2026-01-01",
        "contractExpiring": false,
        "performanceScore": 90,
        "totalExpenses": 25000.00,
        "isActive": true
      }
    ],
    "expiringContracts": [...],
    "expiringInsurance": [...]
  }
}
```

---

## 9. Practice Management Dashboard

### Endpoint

```http
GET /api/reports/module9/practice-management
```

### Description

High-level dashboard aggregating key metrics across all Module 9 subsystems.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date (ISO 8601) | No | Start date (default: current month start) |
| `endDate` | Date (ISO 8601) | No | End date (default: now) |

### Response Structure

```json
{
  "success": true,
  "data": {
    "overview": {
      "activeStaff": 50,
      "activeClients": 200,
      "appointments": {
        "total": 500,
        "completed": 450,
        "scheduled": 40
      }
    },
    "compliance": {
      "credentials": {
        "total": 150,
        "issues": 5
      },
      "training": {
        "totalMandatory": 100,
        "overdue": 3
      },
      "policiesNeedingReview": 2
    },
    "incidents": {
      "openIncidents": 5,
      "bySeverity": {
        "critical": 0,
        "high": 2
      }
    },
    "financial": {
      "totalBudget": 500000.00,
      "budgetUtilization": 85.0
    },
    "alerts": {
      "credentialsExpiringSoon": 10,
      "overdueTraining": 3,
      "criticalIncidents": 0
    }
  }
}
```

---

## 10. Audit Trail Report

### Endpoint

```http
GET /api/reports/module9/audit-trail
```

### Description

Comprehensive audit log analysis with security monitoring and suspicious activity detection.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | Date (ISO 8601) | No | Start date (default: 30 days ago) |
| `endDate` | Date (ISO 8601) | No | End date (default: now) |
| `userId` | UUID | No | Filter by specific user |
| `entityType` | String | No | Filter by entity type |
| `action` | String | No | Filter by action type |
| `ipAddress` | String | No | Filter by IP address |

### Response Structure

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalLogs": 5000,
      "uniqueUsers": 45,
      "actionStats": {
        "CREATE": 1200,
        "UPDATE": 2500,
        "DELETE": 100
      },
      "entityStats": {
        "User": 500,
        "Client": 800
      },
      "suspiciousActivity": 5
    },
    "logs": [
      {
        "id": "uuid",
        "timestamp": "2025-11-11T10:00:00.000Z",
        "user": {
          "id": "uuid",
          "name": "John Doe"
        },
        "action": "UPDATE",
        "entityType": "Client",
        "entityId": "uuid",
        "ipAddress": "192.168.1.1"
      }
    ],
    "suspiciousActivity": [...]
  }
}
```

---

## Integration Services

### Staff Onboarding Integration

Automatically handles cross-subsystem onboarding:

```typescript
POST /api/integration/module9/onboarding

{
  "userId": "uuid",
  "department": "Clinical",
  "jobTitle": "Therapist",
  "hireDate": "2025-11-01",
  "requiredTraining": ["HIPAA", "SAFETY"],
  "requiredPolicies": ["POL-001", "POL-002"]
}
```

### Compliance Dashboard

Aggregated compliance view across all subsystems:

```typescript
GET /api/integration/module9/compliance-dashboard?userId=uuid&department=Clinical
```

---

## Export Formats

All reports support multiple export formats:

### PDF Export

```http
GET /api/reports/module9/{report-type}/export/pdf?{query-params}
```

### Excel Export

```http
GET /api/reports/module9/{report-type}/export/excel?{query-params}
```

### CSV Export

```http
GET /api/reports/module9/{report-type}/export/csv?{query-params}
```

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error - Server-side error |

---

## Performance Considerations

### Caching

- Report results are not cached by default due to real-time requirements
- Consider client-side caching for static data

### Pagination

- Large reports automatically limit results to prevent overwhelming responses
- Audit trail report limited to 10,000 records
- Use date range parameters to narrow results

### Rate Limiting

- API requests are subject to rate limiting
- Recommended: Maximum 60 requests per minute per user

### Best Practices

1. **Use specific filters** - Narrow date ranges and apply filters to reduce data volume
2. **Schedule heavy reports** - Run comprehensive reports during off-peak hours
3. **Export large datasets** - Use export endpoints for large result sets
4. **Monitor performance** - Track report generation times

---

## Integration Matrix

| Subsystem | Related Reports | Integration Points |
|-----------|----------------|-------------------|
| Credentialing | Credentialing, Performance, Compliance Dashboard | Expiration alerts, Performance metrics |
| Training | Training Compliance, Performance, Compliance Dashboard | Completion tracking, CEU calculation |
| Policy Management | Policy Compliance, Compliance Dashboard | Acknowledgment tracking |
| Incidents | Incident Analysis, Performance | Trend analysis, Corrective training |
| Performance | Performance, Compliance Dashboard | Goal tracking, Productivity metrics |
| Attendance | Attendance | Group therapy tracking |
| Financial | Financial, Vendor | Budget tracking, Expense analysis |
| Vendor | Vendor, Financial | Contract management, Performance tracking |
| Audit | Audit Trail | Security monitoring, Compliance verification |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-11 | Initial Module 9 Reports implementation |

---

## Support

For issues or questions:
- Technical Support: support@mentalspace.com
- Documentation: https://docs.mentalspace.com
- API Status: https://status.mentalspace.com
