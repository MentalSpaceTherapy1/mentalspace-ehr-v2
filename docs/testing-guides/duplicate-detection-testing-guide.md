# Duplicate Detection System - Testing Guide

## Overview
This guide provides comprehensive testing procedures for the Duplicate Detection System implemented in Module 2.

---

## Prerequisites

### 1. Database Setup
```bash
# Navigate to database package
cd packages/database

# Run migration
npm run migrate:dev -- --name add_duplicate_detection

# Verify migration
npm run studio
# Check that 'potential_duplicates' table exists
```

### 2. Install Dependencies
```bash
# Navigate to backend
cd packages/backend

# Install new dependencies
npm install

# Verify packages installed
npm list soundex-code fast-levenshtein
```

### 3. Start Backend Server
```bash
cd packages/backend
npm run dev
```

---

## Manual API Testing

### Test 1: Check for Exact Match

**Create First Client** (via existing client endpoint)
```bash
POST http://localhost:3001/api/v1/clients
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "dateOfBirth": "1990-01-15",
  "primaryPhone": "555-123-4567",
  "email": "john.smith@email.com",
  "addressStreet1": "123 Main St",
  "addressCity": "Springfield",
  "addressState": "IL",
  "addressZipCode": "62701",
  "gender": "MALE",
  "primaryTherapistId": "<therapist-id>"
}
```

**Check for Duplicates**
```bash
POST http://localhost:3001/api/v1/clients/check-duplicates
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "dateOfBirth": "1990-01-15",
  "primaryPhone": "555-123-4567",
  "addressStreet1": "123 Main St",
  "addressZipCode": "62701"
}
```

**Expected Response**
```json
{
  "foundDuplicates": true,
  "count": 1,
  "matches": [
    {
      "clientId": "uuid-of-existing-client",
      "matchType": "EXACT",
      "confidenceScore": 1.0,
      "matchFields": ["firstName", "lastName", "dateOfBirth", "primaryPhone"],
      "client": {
        "id": "uuid",
        "firstName": "John",
        "lastName": "Smith",
        "dateOfBirth": "1990-01-15T00:00:00.000Z",
        "primaryPhone": "555-123-4567",
        "medicalRecordNumber": "MRN-001"
      }
    }
  ]
}
```

---

### Test 2: Check for Phonetic Match

**Create First Client**
```bash
# Client: "John Smith"
POST http://localhost:3001/api/v1/clients
{ "firstName": "John", "lastName": "Smith", "dateOfBirth": "1985-06-20", ... }
```

**Check for Phonetic Duplicate**
```bash
POST http://localhost:3001/api/v1/clients/check-duplicates
{
  "firstName": "Jon",
  "lastName": "Smyth",
  "dateOfBirth": "1985-06-20",
  "primaryPhone": "555-999-8888"
}
```

**Expected Result**
- Match found with `matchType: "PHONETIC"`
- Confidence score: 0.85
- Match fields: ["firstName", "lastName", "dateOfBirth"]

---

### Test 3: Check for Fuzzy Match

**Create First Client**
```bash
# Client: "Katherine Johnson"
POST http://localhost:3001/api/v1/clients
{ "firstName": "Katherine", "lastName": "Johnson", ... }
```

**Check for Fuzzy Match**
```bash
POST http://localhost:3001/api/v1/clients/check-duplicates
{
  "firstName": "Katharine",  # One letter different
  "lastName": "Johnson",
  "dateOfBirth": "1992-03-10",
  "primaryPhone": "555-444-3333"
}
```

**Expected Result**
- Match found with `matchType: "FUZZY"`
- Confidence score: 0.7-0.9 (depending on similarity)
- Match fields: ["firstName", "lastName", "dateOfBirth"]

---

### Test 4: Check for Partial DOB Match

**Create First Client**
```bash
# DOB: 1988-07-25
POST http://localhost:3001/api/v1/clients
```

**Check with Wrong Day**
```bash
POST http://localhost:3001/api/v1/clients/check-duplicates
{
  "firstName": "Michael",
  "lastName": "Williams",
  "dateOfBirth": "1988-07-15",  # Same year and month, different day
  "primaryPhone": "555-777-6666"
}
```

**Expected Result**
- Match found with `matchType: "PARTIAL_DOB"`
- Confidence score: 0.65
- Match fields: ["firstName", "lastName", "year", "month"]

---

### Test 5: Save Potential Duplicates

**After detecting duplicates**
```bash
POST http://localhost:3001/api/v1/clients/{newClientId}/save-duplicates
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "matches": [
    {
      "clientId": "existing-client-id",
      "matchType": "PHONETIC",
      "confidenceScore": 0.85,
      "matchFields": ["firstName", "lastName", "dateOfBirth"],
      "matchedClient": { ... }
    }
  ]
}
```

**Expected Response**
```json
{
  "success": true,
  "message": "Saved 1 potential duplicate(s) for review"
}
```

**Verify in Database**
```bash
# Check potential_duplicates table
SELECT * FROM potential_duplicates WHERE status = 'PENDING';
```

---

### Test 6: Get Pending Duplicates

```bash
GET http://localhost:3001/api/v1/duplicates/pending
Authorization: Bearer <your-token>
```

**Expected Response**
```json
{
  "count": 2,
  "duplicates": [
    {
      "id": "duplicate-id-1",
      "client1": { "id": "...", "firstName": "...", ... },
      "client2": { "id": "...", "firstName": "...", ... },
      "matchType": "EXACT",
      "confidenceScore": 1.0,
      "matchFields": ["firstName", "lastName", "dateOfBirth", "primaryPhone"],
      "createdAt": "2025-11-02T..."
    },
    ...
  ]
}
```

---

### Test 7: Get Duplicate Statistics

```bash
GET http://localhost:3001/api/v1/duplicates/stats
Authorization: Bearer <your-token>
```

**Expected Response**
```json
{
  "total": 10,
  "pending": 3,
  "dismissed": 5,
  "merged": 2,
  "byMatchType": [
    { "matchType": "EXACT", "_count": 1 },
    { "matchType": "PHONETIC", "_count": 1 },
    { "matchType": "FUZZY", "_count": 1 }
  ]
}
```

---

### Test 8: Merge Duplicate Clients

**Setup**
1. Create two clients (Client A and Client B)
2. Add appointments, notes, and charges to Client A
3. Create a potential duplicate record

**Execute Merge**
```bash
POST http://localhost:3001/api/v1/duplicates/{duplicateId}/merge
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "sourceClientId": "client-a-id",
  "targetClientId": "client-b-id",
  "resolutionNotes": "Same person, data entry error"
}
```

**Expected Response**
```json
{
  "success": true,
  "message": "Clients merged successfully",
  "sourceClientId": "client-a-id",
  "targetClientId": "client-b-id"
}
```

**Verify Results**
```sql
-- Client A should be marked as merged
SELECT id, first_name, last_name, is_merged, merged_into_id
FROM clients WHERE id = 'client-a-id';
-- Expected: is_merged = true, merged_into_id = 'client-b-id'

-- All relationships should point to Client B
SELECT COUNT(*) FROM appointments WHERE client_id = 'client-b-id';
-- Should include appointments from both clients

-- Duplicate record should be marked as MERGED
SELECT status, reviewed_by, reviewed_at
FROM potential_duplicates WHERE id = '{duplicateId}';
-- Expected: status = 'MERGED', reviewed_by populated
```

---

### Test 9: Dismiss Duplicate

```bash
POST http://localhost:3001/api/v1/duplicates/{duplicateId}/dismiss
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "resolutionNotes": "Not the same person, just similar names"
}
```

**Expected Response**
```json
{
  "success": true,
  "message": "Duplicate dismissed successfully"
}
```

**Verify**
```sql
SELECT status, reviewed_by, resolution_notes
FROM potential_duplicates WHERE id = '{duplicateId}';
-- Expected: status = 'DISMISSED'
```

---

## Automated Testing

### Unit Tests

**Create file**: `packages/backend/src/services/__tests__/duplicateDetection.service.test.ts`

```typescript
import {
  checkForDuplicates,
  savePotentialDuplicates,
  mergeClients,
  dismissDuplicate
} from '../duplicateDetection.service';
import { PrismaClient } from '@mentalspace/database';

describe('Duplicate Detection Service', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('checkForDuplicates', () => {
    it('should detect exact match', async () => {
      // Create test client
      const client = await prisma.client.create({
        data: {
          firstName: 'John',
          lastName: 'Smith',
          dateOfBirth: new Date('1990-01-15'),
          primaryPhone: '5551234567',
          // ... other required fields
        }
      });

      // Check for duplicate
      const matches = await checkForDuplicates({
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: new Date('1990-01-15'),
        primaryPhone: '5551234567'
      });

      expect(matches).toHaveLength(1);
      expect(matches[0].matchType).toBe('EXACT');
      expect(matches[0].confidenceScore).toBe(1.0);
    });

    it('should detect phonetic match', async () => {
      // Create client with "Smith"
      const client = await prisma.client.create({
        data: {
          firstName: 'John',
          lastName: 'Smith',
          dateOfBirth: new Date('1990-01-15'),
          primaryPhone: '5551234567',
        }
      });

      // Check with "Smyth"
      const matches = await checkForDuplicates({
        firstName: 'Jon',
        lastName: 'Smyth',
        dateOfBirth: new Date('1990-01-15'),
        primaryPhone: '5559999999'
      });

      expect(matches).toHaveLength(1);
      expect(matches[0].matchType).toBe('PHONETIC');
      expect(matches[0].confidenceScore).toBe(0.85);
    });

    // Add more test cases for fuzzy, partial DOB, and address matching
  });

  describe('mergeClients', () => {
    it('should transfer all relationships to target client', async () => {
      // Setup: Create two clients with appointments
      const client1 = await prisma.client.create({ ... });
      const client2 = await prisma.client.create({ ... });

      const appointment = await prisma.appointment.create({
        data: { clientId: client1.id, ... }
      });

      // Merge
      await mergeClients({
        sourceClientId: client1.id,
        targetClientId: client2.id,
        reviewedBy: 'test-user-id'
      });

      // Verify appointment transferred
      const updatedAppointment = await prisma.appointment.findUnique({
        where: { id: appointment.id }
      });
      expect(updatedAppointment.clientId).toBe(client2.id);

      // Verify source client marked as merged
      const mergedClient = await prisma.client.findUnique({
        where: { id: client1.id }
      });
      expect(mergedClient.isMerged).toBe(true);
      expect(mergedClient.mergedIntoId).toBe(client2.id);
    });
  });
});
```

### Integration Tests

**Create file**: `packages/backend/src/controllers/__tests__/duplicateDetection.controller.test.ts`

```typescript
import request from 'supertest';
import app from '../../app';

describe('Duplicate Detection API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Login to get auth token
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = response.body.token;
  });

  describe('POST /clients/check-duplicates', () => {
    it('should return 400 if required fields missing', async () => {
      const response = await request(app)
        .post('/api/v1/clients/check-duplicates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'John' }); // Missing other fields

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should find exact match', async () => {
      // Create client first
      await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ /* client data */ });

      // Check for duplicate
      const response = await request(app)
        .post('/api/v1/clients/check-duplicates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'John',
          lastName: 'Smith',
          dateOfBirth: '1990-01-15',
          primaryPhone: '5551234567'
        });

      expect(response.status).toBe(200);
      expect(response.body.foundDuplicates).toBe(true);
      expect(response.body.matches[0].matchType).toBe('EXACT');
    });
  });

  describe('GET /duplicates/pending', () => {
    it('should return pending duplicates', async () => {
      const response = await request(app)
        .get('/api/v1/duplicates/pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('duplicates');
      expect(Array.isArray(response.body.duplicates)).toBe(true);
    });
  });

  describe('POST /duplicates/:id/merge', () => {
    it('should merge two clients successfully', async () => {
      // Create duplicate record first
      // ...

      const response = await request(app)
        .post(`/api/v1/duplicates/${duplicateId}/merge`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceClientId: 'client-1-id',
          targetClientId: 'client-2-id',
          resolutionNotes: 'Test merge'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent merging client with itself', async () => {
      const response = await request(app)
        .post(`/api/v1/duplicates/${duplicateId}/merge`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceClientId: 'same-id',
          targetClientId: 'same-id'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot merge a client with itself');
    });
  });
});
```

---

## Performance Testing

### Load Test: Duplicate Detection

**Test Scenario**: Check 1000 duplicates sequentially
```bash
# Using Apache Bench
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" \
  -p duplicate-check.json -T application/json \
  http://localhost:3001/api/v1/clients/check-duplicates
```

**Expected Results**:
- Average response time < 500ms
- 99th percentile < 1000ms
- Zero errors

### Database Performance

**Test Query Performance**
```sql
-- Test index on status
EXPLAIN ANALYZE
SELECT * FROM potential_duplicates WHERE status = 'PENDING';

-- Test index on confidence_score
EXPLAIN ANALYZE
SELECT * FROM potential_duplicates
WHERE confidence_score > 0.8
ORDER BY confidence_score DESC;

-- Test unique constraint on client pairs
EXPLAIN ANALYZE
SELECT * FROM potential_duplicates
WHERE client1_id = 'uuid' AND client2_id = 'uuid';
```

**Expected**: All queries should use indexes (no sequential scans)

---

## Edge Cases & Error Scenarios

### Test Edge Cases

1. **Empty strings**
```bash
POST /clients/check-duplicates
{ "firstName": "", "lastName": "", ... }
# Expected: Validation error
```

2. **Special characters**
```bash
POST /clients/check-duplicates
{ "firstName": "O'Brien", "lastName": "Smith-Jones", ... }
# Expected: Successful match handling
```

3. **Very long names**
```bash
POST /clients/check-duplicates
{ "firstName": "Verylongnamethatexceedsnormallength...", ... }
# Expected: Handled gracefully
```

4. **Invalid date formats**
```bash
POST /clients/check-duplicates
{ "dateOfBirth": "invalid-date", ... }
# Expected: 400 error with clear message
```

5. **Missing optional fields**
```bash
POST /clients/check-duplicates
{ "firstName": "John", "lastName": "Smith",
  "dateOfBirth": "1990-01-15", "primaryPhone": "555-1234" }
# (No address fields)
# Expected: Successful, just skip address matching
```

---

## Regression Testing Checklist

After implementing duplicate detection, verify:

- [ ] Existing client creation still works
- [ ] Client updates don't break
- [ ] Appointments can still be scheduled
- [ ] Clinical notes can be created
- [ ] Billing charges work correctly
- [ ] Portal access unaffected
- [ ] User management unchanged
- [ ] Reports still generate

---

## Troubleshooting

### Issue: "Cannot find module 'soundex-code'"
**Solution**: Run `npm install` in packages/backend

### Issue: "Table 'potential_duplicates' doesn't exist"
**Solution**: Run Prisma migration: `npm run migrate:dev`

### Issue: Duplicate not detected when expected
**Debug Steps**:
1. Check normalization (case, whitespace)
2. Verify phone number formatting
3. Check date comparison (timezone issues)
4. Log algorithm results individually

### Issue: Merge fails with foreign key constraint error
**Possible Causes**:
1. Source client doesn't exist
2. Target client already merged
3. Duplicate record references wrong clients

**Solution**: Verify IDs before merge, check client status

---

## Success Criteria

The duplicate detection system is working correctly when:

1. ✅ All 5 detection algorithms find their respective match types
2. ✅ Confidence scores are accurate and consistent
3. ✅ Merge operation transfers ALL relationships
4. ✅ No data loss during merge
5. ✅ Dismissed duplicates stay dismissed
6. ✅ API responses match documented format
7. ✅ Performance meets requirements (<500ms response time)
8. ✅ All edge cases handled gracefully
9. ✅ Existing functionality unaffected
10. ✅ Database constraints prevent invalid states

---

## Next Steps After Testing

1. **Fix any bugs found during testing**
2. **Implement frontend UI**
   - Duplicate warning modal
   - Pending duplicates review page
   - Side-by-side comparison view
   - Merge/dismiss buttons

3. **Add monitoring**
   - Log detection events
   - Track merge/dismiss rates
   - Monitor API performance
   - Alert on high duplicate rates

4. **Documentation**
   - User guide for staff
   - Admin procedures
   - API documentation

5. **Training**
   - Train staff on duplicate review process
   - Document best practices for merging
   - Create decision tree for dismiss vs merge
