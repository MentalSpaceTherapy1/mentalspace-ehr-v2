# Client Diagnoses API Reference

**Module**: Module 2 - Client Management
**Base URL**: `/api/v1`
**Authentication**: Required for all endpoints
**Last Updated**: November 2, 2025

---

## Table of Contents

1. [Add Diagnosis](#add-diagnosis)
2. [Get Client Diagnoses](#get-client-diagnoses)
3. [Get Diagnosis Statistics](#get-diagnosis-statistics)
4. [Get Diagnosis by ID](#get-diagnosis-by-id)
5. [Update Diagnosis](#update-diagnosis)
6. [Update Diagnosis Status](#update-diagnosis-status)
7. [Delete Diagnosis](#delete-diagnosis)
8. [Search ICD-10 Codes](#search-icd-10-codes)

---

## Add Diagnosis

Add a new diagnosis for a client. Automatically demotes existing PRIMARY diagnosis to SECONDARY if a new PRIMARY is added.

### Endpoint
```http
POST /api/v1/clients/:clientId/diagnoses
```

### Authorization
- CLINICIAN
- SUPERVISOR
- ADMINISTRATOR

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| clientId | UUID | Client identifier |

### Request Body
```json
{
  "diagnosisType": "PRIMARY",
  "icd10Code": "F33.1",
  "dsm5Code": "296.32",
  "diagnosisName": "Major depressive disorder, recurrent, moderate",
  "diagnosisCategory": "Mood Disorders",
  "severitySpecifier": "MODERATE",
  "courseSpecifier": "RECURRENT",
  "onsetDate": "2024-01-15",
  "supportingEvidence": "Patient reports persistent sad mood, loss of interest...",
  "differentialConsiderations": "Rule out bipolar disorder, adjustment disorder"
}
```

### Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| diagnosisType | String | Yes | PRIMARY, SECONDARY, RULE_OUT, HISTORICAL, PROVISIONAL |
| diagnosisName | String | Yes | Full diagnosis description (max 500 chars) |
| icd10Code | String | No | ICD-10 diagnosis code (max 10 chars) |
| dsm5Code | String | No | DSM-5 diagnosis code (max 10 chars) |
| diagnosisCategory | String | No | Category (e.g., "Mood Disorders") |
| severitySpecifier | String | No | MILD, MODERATE, SEVERE, EXTREME |
| courseSpecifier | String | No | Course description (e.g., RECURRENT, IN_REMISSION) |
| onsetDate | ISO Date | No | Date diagnosis onset was identified |
| supportingEvidence | String | No | Clinical evidence supporting diagnosis |
| differentialConsiderations | String | No | Alternative diagnoses considered |

### Response
**Status**: `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clientId": "123e4567-e89b-12d3-a456-426614174000",
    "diagnosisType": "PRIMARY",
    "icd10Code": "F33.1",
    "dsm5Code": "296.32",
    "diagnosisName": "Major depressive disorder, recurrent, moderate",
    "diagnosisCategory": "Mood Disorders",
    "severitySpecifier": "MODERATE",
    "courseSpecifier": "RECURRENT",
    "onsetDate": "2024-01-15T00:00:00.000Z",
    "status": "ACTIVE",
    "dateDiagnosed": "2025-11-02T14:30:00.000Z",
    "supportingEvidence": "Patient reports persistent sad mood...",
    "differentialConsiderations": "Rule out bipolar disorder...",
    "createdAt": "2025-11-02T14:30:00.000Z",
    "updatedAt": "2025-11-02T14:30:00.000Z",
    "client": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "firstName": "John",
      "lastName": "Doe",
      "medicalRecordNumber": "MRN12345"
    },
    "diagnosedBy": {
      "id": "789e4567-e89b-12d3-a456-426614174999",
      "firstName": "Dr. Jane",
      "lastName": "Smith",
      "title": "PhD"
    }
  },
  "message": "Diagnosis added successfully"
}
```

### Error Responses

**400 Bad Request** - Missing required fields
```json
{
  "success": false,
  "error": "Missing required fields: diagnosisType, diagnosisName"
}
```

**404 Not Found** - Client not found
```json
{
  "success": false,
  "error": "Client not found"
}
```

---

## Get Client Diagnoses

Retrieve all diagnoses for a specific client with optional filtering.

### Endpoint
```http
GET /api/v1/clients/:clientId/diagnoses
```

### Authorization
- CLINICIAN
- SUPERVISOR
- ADMINISTRATOR
- BILLING_STAFF

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| clientId | UUID | Client identifier |

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| activeOnly | Boolean | Filter for active diagnoses only (default: false) |
| diagnosisType | String | Filter by type (PRIMARY, SECONDARY, etc.) |

### Example Request
```http
GET /api/v1/clients/123e4567-e89b-12d3-a456-426614174000/diagnoses?activeOnly=true
```

### Response
**Status**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "diagnosisType": "PRIMARY",
      "icd10Code": "F33.1",
      "diagnosisName": "Major depressive disorder, recurrent, moderate",
      "diagnosisCategory": "Mood Disorders",
      "status": "ACTIVE",
      "severitySpecifier": "MODERATE",
      "dateDiagnosed": "2025-11-02T14:30:00.000Z",
      "lastReviewedDate": null,
      "diagnosedBy": {
        "id": "789e4567-e89b-12d3-a456-426614174999",
        "firstName": "Dr. Jane",
        "lastName": "Smith",
        "title": "PhD"
      },
      "lastReviewedBy": null
    },
    {
      "id": "661f9511-f3ac-52e5-b827-557766551111",
      "diagnosisType": "SECONDARY",
      "icd10Code": "F41.1",
      "diagnosisName": "Generalized anxiety disorder",
      "diagnosisCategory": "Anxiety Disorders",
      "status": "ACTIVE",
      "severitySpecifier": "MODERATE",
      "dateDiagnosed": "2025-10-15T10:00:00.000Z",
      "diagnosedBy": {
        "id": "789e4567-e89b-12d3-a456-426614174999",
        "firstName": "Dr. Jane",
        "lastName": "Smith",
        "title": "PhD"
      }
    }
  ],
  "count": 2
}
```

---

## Get Diagnosis Statistics

Get statistical summary of diagnoses for a client.

### Endpoint
```http
GET /api/v1/clients/:clientId/diagnoses/stats
```

### Authorization
- CLINICIAN
- SUPERVISOR
- ADMINISTRATOR

### Response
**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "total": 5,
    "active": 3,
    "resolved": 1,
    "ruleOutRejected": 1,
    "byType": {
      "PRIMARY": 1,
      "SECONDARY": 2
    },
    "byCategory": {
      "Mood Disorders": 2,
      "Anxiety Disorders": 1
    }
  }
}
```

---

## Get Diagnosis by ID

Retrieve detailed information for a single diagnosis.

### Endpoint
```http
GET /api/v1/diagnoses/:id
```

### Authorization
- CLINICIAN
- SUPERVISOR
- ADMINISTRATOR
- BILLING_STAFF

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| id | UUID | Diagnosis identifier |

### Response
**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clientId": "123e4567-e89b-12d3-a456-426614174000",
    "diagnosisType": "PRIMARY",
    "icd10Code": "F33.1",
    "dsm5Code": "296.32",
    "diagnosisName": "Major depressive disorder, recurrent, moderate",
    "diagnosisCategory": "Mood Disorders",
    "severitySpecifier": "MODERATE",
    "courseSpecifier": "RECURRENT",
    "onsetDate": "2024-01-15T00:00:00.000Z",
    "remissionDate": null,
    "status": "ACTIVE",
    "dateDiagnosed": "2025-11-02T14:30:00.000Z",
    "dateResolved": null,
    "resolutionNotes": null,
    "supportingEvidence": "Patient reports persistent sad mood...",
    "differentialConsiderations": "Rule out bipolar disorder...",
    "lastReviewedDate": "2025-11-02T16:00:00.000Z",
    "createdAt": "2025-11-02T14:30:00.000Z",
    "updatedAt": "2025-11-02T16:00:00.000Z",
    "client": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "firstName": "John",
      "lastName": "Doe",
      "medicalRecordNumber": "MRN12345",
      "dateOfBirth": "1990-05-15T00:00:00.000Z"
    },
    "diagnosedBy": {
      "id": "789e4567-e89b-12d3-a456-426614174999",
      "firstName": "Dr. Jane",
      "lastName": "Smith",
      "title": "PhD"
    },
    "lastReviewedBy": {
      "id": "789e4567-e89b-12d3-a456-426614174999",
      "firstName": "Dr. Jane",
      "lastName": "Smith",
      "title": "PhD"
    }
  }
}
```

---

## Update Diagnosis

Update diagnosis information. Automatically demotes existing PRIMARY if changing to PRIMARY.

### Endpoint
```http
PATCH /api/v1/diagnoses/:id
```

### Authorization
- CLINICIAN
- SUPERVISOR
- ADMINISTRATOR

### Request Body
All fields are optional. Only include fields you want to update.

```json
{
  "diagnosisType": "PRIMARY",
  "icd10Code": "F33.2",
  "diagnosisName": "Major depressive disorder, recurrent severe without psychotic features",
  "severitySpecifier": "SEVERE",
  "courseSpecifier": "RECURRENT",
  "supportingEvidence": "Updated clinical presentation shows worsening symptoms..."
}
```

### Response
**Status**: `200 OK`

Returns the updated diagnosis object (same format as Get Diagnosis by ID).

---

## Update Diagnosis Status

Quick endpoint to update only the diagnosis status.

### Endpoint
```http
PATCH /api/v1/diagnoses/:id/status
```

### Authorization
- CLINICIAN
- SUPERVISOR
- ADMINISTRATOR

### Request Body
```json
{
  "status": "RESOLVED",
  "dateResolved": "2025-11-02",
  "resolutionNotes": "Symptoms resolved after 6 months of therapy and medication management"
}
```

### Request Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| status | String | Yes | ACTIVE, RESOLVED, RULE_OUT_REJECTED |
| dateResolved | ISO Date | No | Date diagnosis was resolved |
| resolutionNotes | String | No | Notes about resolution |

### Response
**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "RESOLVED",
    "dateResolved": "2025-11-02T00:00:00.000Z",
    "resolutionNotes": "Symptoms resolved after 6 months of therapy...",
    "lastReviewedDate": "2025-11-02T16:30:00.000Z",
    "lastReviewedBy": {
      "id": "789e4567-e89b-12d3-a456-426614174999",
      "firstName": "Dr. Jane",
      "lastName": "Smith",
      "title": "PhD"
    }
  },
  "message": "Diagnosis status updated successfully"
}
```

---

## Delete Diagnosis

Soft delete a diagnosis by setting status to RULE_OUT_REJECTED.

### Endpoint
```http
DELETE /api/v1/diagnoses/:id
```

### Authorization
- CLINICIAN
- SUPERVISOR
- ADMINISTRATOR

### Response
**Status**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "RULE_OUT_REJECTED",
    "dateResolved": "2025-11-02T16:45:00.000Z",
    "lastReviewedDate": "2025-11-02T16:45:00.000Z"
  },
  "message": "Diagnosis deleted successfully"
}
```

---

## Search ICD-10 Codes

Search for ICD-10 codes by code, description, or category. Returns mock data (80+ mental health codes).

### Endpoint
```http
GET /api/v1/diagnoses/icd10/search
```

### Authorization
- CLINICIAN
- SUPERVISOR
- ADMINISTRATOR
- BILLING_STAFF

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | String | Yes | Search query (code, description, or category) |

### Example Requests
```http
GET /api/v1/diagnoses/icd10/search?q=depression
GET /api/v1/diagnoses/icd10/search?q=F33
GET /api/v1/diagnoses/icd10/search?q=anxiety
GET /api/v1/diagnoses/icd10/search?q=mood
```

### Response
**Status**: `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "code": "F32.9",
      "description": "Major depressive disorder, single episode, unspecified",
      "category": "Mood Disorders"
    },
    {
      "code": "F32.0",
      "description": "Major depressive disorder, single episode, mild",
      "category": "Mood Disorders"
    },
    {
      "code": "F32.1",
      "description": "Major depressive disorder, single episode, moderate",
      "category": "Mood Disorders"
    },
    {
      "code": "F33.1",
      "description": "Major depressive disorder, recurrent, moderate",
      "category": "Mood Disorders"
    },
    {
      "code": "F34.1",
      "description": "Persistent depressive disorder (dysthymia)",
      "category": "Mood Disorders"
    }
  ],
  "count": 5,
  "query": "depression"
}
```

### Available Categories
- Mood Disorders
- Anxiety Disorders
- Trauma and Stressor-Related Disorders
- OCD and Related Disorders
- Eating Disorders
- Substance Use Disorders
- Personality Disorders
- Neurodevelopmental Disorders

### Search Features
- Case-insensitive matching
- Searches code, description, and category fields
- Returns maximum 20 results
- Partial matching supported

---

## Error Responses

### Common Error Codes

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required fields: diagnosisType, diagnosisName"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Diagnosis not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "An unexpected error occurred"
}
```

---

## Data Types & Enums

### Diagnosis Types
- `PRIMARY` - Main diagnosis for treatment
- `SECONDARY` - Additional diagnosis
- `RULE_OUT` - Diagnosis being considered/ruled out
- `HISTORICAL` - Past diagnosis (resolved)
- `PROVISIONAL` - Preliminary diagnosis pending confirmation

### Severity Specifiers
- `MILD` - Mild symptoms
- `MODERATE` - Moderate symptoms
- `SEVERE` - Severe symptoms
- `EXTREME` - Extreme/very severe symptoms

### Status Values
- `ACTIVE` - Currently active diagnosis
- `RESOLVED` - Diagnosis has been resolved
- `RULE_OUT_REJECTED` - Rule-out rejected or deleted

---

## Business Rules

### Automatic PRIMARY Demotion
When adding or updating a diagnosis to PRIMARY type:
1. System searches for existing ACTIVE PRIMARY diagnoses for the client
2. All found PRIMARY diagnoses are automatically changed to SECONDARY
3. New diagnosis is set as PRIMARY
4. Only one PRIMARY diagnosis exists per client at any time

### Soft Delete
Deleting a diagnosis doesn't remove it from the database:
1. Status is set to `RULE_OUT_REJECTED`
2. `dateResolved` is set to current timestamp
3. `lastReviewedDate` and `lastReviewedById` are updated
4. Diagnosis remains in database for audit trail

---

## Notes for Frontend Developers

### Autocomplete Implementation
Use the ICD-10 search endpoint with debouncing:
```javascript
// Debounce search requests
const searchICD10 = debounce(async (query) => {
  if (query.length >= 2) {
    const response = await fetch(
      `/api/v1/diagnoses/icd10/search?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    // Update autocomplete dropdown with data.data
  }
}, 300);
```

### Diagnosis Type Badges
Suggested color coding:
- PRIMARY: Blue (primary color)
- SECONDARY: Gray
- RULE_OUT: Yellow/Orange (warning)
- HISTORICAL: Light gray (muted)
- PROVISIONAL: Purple (informational)

### Status Badges
Suggested color coding:
- ACTIVE: Green
- RESOLVED: Blue
- RULE_OUT_REJECTED: Red

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-02 | Initial API implementation |

---

**Last Updated**: November 2, 2025
**Maintained By**: Development Team
**Questions**: Contact development team for API support
