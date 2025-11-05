# Module 2: Client Management - Comprehensive Implementation Plan
## Fixing ALL Gaps from Verification Report

**Document Version**: 1.0
**Date Created**: November 2, 2025
**Based On**: MODULE_2_VERIFICATION_REPORT.md
**Target**: 100% PRD Compliance
**Current Status**: 75% Complete → Target: 100% Complete

---

## Executive Summary

This implementation plan addresses **57 missing items** identified in the Module 2 Verification Report (excluding SSN, Pharmacy, and Lab integrations per client requirements), organized into 4 phases over 16 weeks. The plan includes detailed specifications, testing requirements, and success criteria for each feature.

**Gap Summary from Verification Report**:
- 🔴 **Critical Gaps**: 4 items (duplicate detection, diagnoses, relationships, prior auth) - **REMOVED: SSN**
- 🟡 **High Priority**: 9 items (integrations, risk tracking, provider management)
- 🟢 **Medium Priority**: 15 items (AI features, data quality, search)
- ⚪ **Low Priority**: 29 items (enhancements, advanced features) - **REMOVED: Pharmacy & Lab integrations**

**Timeline**: 16 weeks (4 months)
**Resources Required**: 2 senior developers, 1 QA engineer, 1 UX designer
**Estimated Cost**: $105,000 - $160,000

---

## Phase 1: Critical Foundation (Weeks 1-2) 🔴

**Goal**: Fix production blockers that prevent data integrity and clinical workflows

**NOTE**: SSN collection removed per client requirements - not needed for this practice

### 1.1 Duplicate Detection System

**Priority**: 🔴 CRITICAL
**Effort**: 2 weeks
**Dependencies**: None
**Gap Reference**: Report Section 2.2, lines 195-216


#### Database Schema Changes

```prisma
// New table for tracking potential duplicates
model PotentialDuplicate {
  id              String   @id @default(uuid())
  client1Id       String   @db.Uuid
  client2Id       String   @db.Uuid
  matchType       String   // EXACT, PHONETIC, FUZZY, PARTIAL_DOB, ADDRESS
  confidenceScore Float    // 0.0 to 1.0
  matchFields     String[] // e.g., ['name', 'dob', 'phone']
  status          String   // PENDING, MERGED, DISMISSED, NEEDS_REVIEW
  reviewedBy      String?  @db.Uuid
  reviewedAt      DateTime?
  resolutionNotes String?  @db.Text
  createdAt       DateTime @default(now())

  client1 Client @relation("Client1Duplicates", fields: [client1Id], references: [id])
  client2 Client @relation("Client2Duplicates", fields: [client2Id], references: [id])
  reviewer User? @relation(fields: [reviewedBy], references: [id])

  @@unique([client1Id, client2Id])
  @@index([status])
  @@index([confidenceScore])
}

// Add to Client model
model Client {
  // Existing fields...

  // Duplicate tracking
  duplicatesAsClient1 PotentialDuplicate[] @relation("Client1Duplicates")
  duplicatesAsClient2 PotentialDuplicate[] @relation("Client2Duplicates")
  mergedIntoId        String?               @db.Uuid
  mergedAt            DateTime?
  isMerged            Boolean              @default(false)
}
```

#### Backend Implementation

**Files to Create**:

1. `packages/backend/src/services/duplicateDetection.service.ts`
```typescript
import Soundex from 'soundex-code';
import levenshtein from 'fast-levenshtein';

interface DuplicateMatch {
  clientId: string;
  matchType: string;
  confidenceScore: number;
  matchFields: string[];
  client: any;
}

export class DuplicateDetectionService {
  /**
   * Check for duplicates when creating/updating a client
   */
  async detectDuplicates(clientData: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    email?: string;
    primaryPhone?: string;
    ssnLastFour?: string;
  }): Promise<DuplicateMatch[]> {
    const matches: DuplicateMatch[] = [];

    // 1. EXACT MATCHES (Confidence: 0.95-1.0)
    const exactMatches = await this.findExactMatches(clientData);
    matches.push(...exactMatches);

    // 2. SSN MATCH (Confidence: 0.98)
    if (clientData.ssnLastFour) {
      const ssnMatches = await this.findSSNMatches(clientData.ssnLastFour);
      matches.push(...ssnMatches);
    }

    // 3. PHONETIC NAME MATCH (Confidence: 0.70-0.90)
    const phoneticMatches = await this.findPhoneticMatches(clientData);
    matches.push(...phoneticMatches);

    // 4. FUZZY NAME MATCH (Confidence: 0.60-0.85)
    const fuzzyMatches = await this.findFuzzyMatches(clientData);
    matches.push(...fuzzyMatches);

    // 5. PARTIAL DOB MATCH (Confidence: 0.50-0.75)
    const partialDOBMatches = await this.findPartialDOBMatches(clientData);
    matches.push(...partialDOBMatches);

    // Remove duplicates and sort by confidence
    return this.deduplicateAndSort(matches);
  }

  private async findExactMatches(data: any): Promise<DuplicateMatch[]> {
    const clients = await prisma.client.findMany({
      where: {
        AND: [
          {
            OR: [
              { firstName: { equals: data.firstName, mode: 'insensitive' } },
              { preferredName: { equals: data.firstName, mode: 'insensitive' } },
            ],
          },
          { lastName: { equals: data.lastName, mode: 'insensitive' } },
          { dateOfBirth: data.dateOfBirth },
        ],
        isMerged: false,
      },
    });

    return clients.map(c => ({
      clientId: c.id,
      matchType: 'EXACT',
      confidenceScore: 0.98,
      matchFields: ['firstName', 'lastName', 'dateOfBirth'],
      client: c,
    }));
  }

  private async findSSNMatches(ssnLastFour: string): Promise<DuplicateMatch[]> {
    const clients = await prisma.client.findMany({
      where: {
        ssnLastFour,
        isMerged: false,
      },
    });

    return clients.map(c => ({
      clientId: c.id,
      matchType: 'SSN',
      confidenceScore: 0.98,
      matchFields: ['ssnLastFour'],
      client: c,
    }));
  }

  private async findPhoneticMatches(data: any): Promise<DuplicateMatch[]> {
    const soundexFirstName = Soundex(data.firstName);
    const soundexLastName = Soundex(data.lastName);

    // Get all clients with similar DOB (within 7 days)
    const dateRange = {
      gte: new Date(data.dateOfBirth.getTime() - 7 * 24 * 60 * 60 * 1000),
      lte: new Date(data.dateOfBirth.getTime() + 7 * 24 * 60 * 60 * 1000),
    };

    const clients = await prisma.client.findMany({
      where: {
        dateOfBirth: dateRange,
        isMerged: false,
      },
    });

    const matches: DuplicateMatch[] = [];

    for (const client of clients) {
      const clientSoundexFirst = Soundex(client.firstName);
      const clientSoundexLast = Soundex(client.lastName);

      if (clientSoundexFirst === soundexFirstName &&
          clientSoundexLast === soundexLastName) {
        matches.push({
          clientId: client.id,
          matchType: 'PHONETIC',
          confidenceScore: 0.85,
          matchFields: ['firstName_phonetic', 'lastName_phonetic', 'dateOfBirth_near'],
          client,
        });
      }
    }

    return matches;
  }

  private async findFuzzyMatches(data: any): Promise<DuplicateMatch[]> {
    // Get clients with similar DOB
    const dateRange = {
      gte: new Date(data.dateOfBirth.getTime() - 365 * 24 * 60 * 60 * 1000), // 1 year
      lte: new Date(data.dateOfBirth.getTime() + 365 * 24 * 60 * 60 * 1000),
    };

    const clients = await prisma.client.findMany({
      where: {
        dateOfBirth: dateRange,
        isMerged: false,
      },
    });

    const matches: DuplicateMatch[] = [];

    for (const client of clients) {
      const firstNameDistance = levenshtein.get(
        data.firstName.toLowerCase(),
        client.firstName.toLowerCase()
      );
      const lastNameDistance = levenshtein.get(
        data.lastName.toLowerCase(),
        client.lastName.toLowerCase()
      );

      // Allow 1-2 character difference (typos, nicknames)
      if (firstNameDistance <= 2 && lastNameDistance <= 2) {
        const score = 1 - ((firstNameDistance + lastNameDistance) /
                          (data.firstName.length + data.lastName.length));

        if (score > 0.7) {
          matches.push({
            clientId: client.id,
            matchType: 'FUZZY',
            confidenceScore: score * 0.8, // Reduce confidence for fuzzy
            matchFields: ['firstName_fuzzy', 'lastName_fuzzy'],
            client,
          });
        }
      }
    }

    return matches;
  }

  private async findPartialDOBMatches(data: any): Promise<DuplicateMatch[]> {
    const dobString = data.dateOfBirth.toISOString().split('T')[0];
    const [year, month, day] = dobString.split('-');

    // Find clients with transposed day/month or year typo
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          // Transposed day/month: 1990-03-15 vs 1990-15-03
          { dateOfBirth: new Date(`${year}-${day}-${month}`) },
          // Year off by 1: 1990 vs 1991
          { dateOfBirth: new Date(`${parseInt(year) + 1}-${month}-${day}`) },
          { dateOfBirth: new Date(`${parseInt(year) - 1}-${month}-${day}`) },
        ],
        AND: [
          {
            OR: [
              { firstName: { equals: data.firstName, mode: 'insensitive' } },
              { lastName: { equals: data.lastName, mode: 'insensitive' } },
            ],
          },
        ],
        isMerged: false,
      },
    });

    return clients.map(c => ({
      clientId: c.id,
      matchType: 'PARTIAL_DOB',
      confidenceScore: 0.65,
      matchFields: ['name', 'dateOfBirth_transposed'],
      client: c,
    }));
  }

  private deduplicateAndSort(matches: DuplicateMatch[]): DuplicateMatch[] {
    // Remove duplicate clientIds, keeping highest confidence
    const seen = new Map<string, DuplicateMatch>();

    for (const match of matches) {
      const existing = seen.get(match.clientId);
      if (!existing || match.confidenceScore > existing.confidenceScore) {
        seen.set(match.clientId, match);
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .filter(m => m.confidenceScore >= 0.5); // Minimum threshold
  }

  /**
   * Save potential duplicates to database for review
   */
  async savePotentialDuplicates(
    clientId: string,
    matches: DuplicateMatch[]
  ): Promise<void> {
    for (const match of matches) {
      await prisma.potentialDuplicate.upsert({
        where: {
          client1Id_client2Id: {
            client1Id: clientId,
            client2Id: match.clientId,
          },
        },
        create: {
          client1Id: clientId,
          client2Id: match.clientId,
          matchType: match.matchType,
          confidenceScore: match.confidenceScore,
          matchFields: match.matchFields,
          status: match.confidenceScore >= 0.9 ? 'NEEDS_REVIEW' : 'PENDING',
        },
        update: {
          confidenceScore: match.confidenceScore,
          matchFields: match.matchFields,
        },
      });
    }

    // Send notification if high-confidence match
    const highConfidenceMatches = matches.filter(m => m.confidenceScore >= 0.9);
    if (highConfidenceMatches.length > 0) {
      await this.notifySupervisor(clientId, highConfidenceMatches);
    }
  }

  /**
   * Merge two client records
   */
  async mergeClients(
    keepClientId: string,
    mergeClientId: string,
    userId: string
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Get both clients
      const keepClient = await tx.client.findUnique({ where: { id: keepClientId } });
      const mergeClient = await tx.client.findUnique({ where: { id: mergeClientId } });

      if (!keepClient || !mergeClient) {
        throw new Error('Client not found');
      }

      // 2. Merge data (keep client gets priority, fill in missing fields)
      const mergedData = {
        // Take non-null values from merge client if keep client is null
        middleName: keepClient.middleName || mergeClient.middleName,
        suffix: keepClient.suffix || mergeClient.suffix,
        previousNames: [
          ...keepClient.previousNames,
          ...mergeClient.previousNames,
          `${mergeClient.firstName} ${mergeClient.lastName}`,
        ],
        secondaryPhone: keepClient.secondaryPhone || mergeClient.secondaryPhone,
        email: keepClient.email || mergeClient.email,
        // ... merge all fields intelligently
      };

      // 3. Update keep client with merged data
      await tx.client.update({
        where: { id: keepClientId },
        data: mergedData,
      });

      // 4. Move all relationships to keep client
      await tx.appointment.updateMany({
        where: { clientId: mergeClientId },
        data: { clientId: keepClientId },
      });

      await tx.clinicalNote.updateMany({
        where: { clientId: mergeClientId },
        data: { clientId: keepClientId },
      });

      await tx.clientDocument.updateMany({
        where: { clientId: mergeClientId },
        data: { clientId: keepClientId },
      });

      // ... move all other relationships

      // 5. Mark merged client as merged
      await tx.client.update({
        where: { id: mergeClientId },
        data: {
          isMerged: true,
          mergedIntoId: keepClientId,
          mergedAt: new Date(),
        },
      });

      // 6. Update duplicate record
      await tx.potentialDuplicate.updateMany({
        where: {
          OR: [
            { client1Id: mergeClientId, client2Id: keepClientId },
            { client1Id: keepClientId, client2Id: mergeClientId },
          ],
        },
        data: {
          status: 'MERGED',
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });

      // 7. Audit log
      await tx.auditLog.create({
        data: {
          action: 'MERGE_CLIENTS',
          userId,
          resourceType: 'CLIENT',
          resourceId: keepClientId,
          details: JSON.stringify({
            mergedClientId: mergeClientId,
            mergedClientMRN: mergeClient.medicalRecordNumber,
          }),
        },
      });
    });
  }

  private async notifySupervisor(
    clientId: string,
    matches: DuplicateMatch[]
  ): Promise<void> {
    // Implementation: Send notification to supervisors
    // Could be email, in-app notification, etc.
  }
}

export default new DuplicateDetectionService();
```

2. `packages/backend/src/controllers/duplicateDetection.controller.ts`
```typescript
import { Request, Response } from 'express';
import duplicateDetectionService from '../services/duplicateDetection.service';
import { asyncHandler } from '../utils/asyncHandler';

export class DuplicateDetectionController {
  /**
   * Check for duplicates before creating client
   */
  checkDuplicates = asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName, dateOfBirth, email, primaryPhone, ssnLastFour } = req.body;

    const matches = await duplicateDetectionService.detectDuplicates({
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirth),
      email,
      primaryPhone,
      ssnLastFour,
    });

    res.json({
      success: true,
      data: {
        hasPotentialDuplicates: matches.length > 0,
        matches: matches.map(m => ({
          clientId: m.clientId,
          matchType: m.matchType,
          confidenceScore: m.confidenceScore,
          matchFields: m.matchFields,
          client: {
            id: m.client.id,
            firstName: m.client.firstName,
            lastName: m.client.lastName,
            dateOfBirth: m.client.dateOfBirth,
            medicalRecordNumber: m.client.medicalRecordNumber,
          },
        })),
      },
    });
  });

  /**
   * Get pending duplicate reviews
   */
  getPendingReviews = asyncHandler(async (req: Request, res: Response) => {
    const duplicates = await prisma.potentialDuplicate.findMany({
      where: {
        status: { in: ['PENDING', 'NEEDS_REVIEW'] },
      },
      include: {
        client1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            medicalRecordNumber: true,
            primaryPhone: true,
            email: true,
          },
        },
        client2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            medicalRecordNumber: true,
            primaryPhone: true,
            email: true,
          },
        },
      },
      orderBy: {
        confidenceScore: 'desc',
      },
    });

    res.json({
      success: true,
      data: duplicates,
      count: duplicates.length,
    });
  });

  /**
   * Merge two clients
   */
  mergeClients = asyncHandler(async (req: Request, res: Response) => {
    const { keepClientId, mergeClientId } = req.body;
    const userId = req.user!.userId;

    await duplicateDetectionService.mergeClients(keepClientId, mergeClientId, userId);

    res.json({
      success: true,
      message: 'Clients merged successfully',
    });
  });

  /**
   * Dismiss duplicate (not a match)
   */
  dismissDuplicate = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user!.userId;

    await prisma.potentialDuplicate.update({
      where: { id },
      data: {
        status: 'DISMISSED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        resolutionNotes: notes,
      },
    });

    res.json({
      success: true,
      message: 'Duplicate dismissed',
    });
  });
}

export default new DuplicateDetectionController();
```

#### Frontend Implementation

**Files to Create**:

1. `packages/frontend/src/components/Clients/DuplicateDetectionModal.tsx`
```typescript
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Box,
  Typography,
  Chip,
  Grid,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { Warning, CompareArrows, Person } from '@mui/icons-material';

interface DuplicateMatch {
  clientId: string;
  matchType: string;
  confidenceScore: number;
  matchFields: string[];
  client: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    medicalRecordNumber: string;
    primaryPhone?: string;
    email?: string;
  };
}

interface DuplicateDetectionModalProps {
  open: boolean;
  matches: DuplicateMatch[];
  newClientData: any;
  onCreateAnyway: () => void;
  onSelectExisting: (clientId: string) => void;
  onCancel: () => void;
}

export default function DuplicateDetectionModal({
  open,
  matches,
  newClientData,
  onCreateAnyway,
  onSelectExisting,
  onCancel,
}: DuplicateDetectionModalProps) {
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'error';
    if (score >= 0.7) return 'warning';
    return 'info';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.9) return 'High Match';
    if (score >= 0.7) return 'Possible Match';
    return 'Low Match';
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Warning color="warning" />
          <Typography variant="h6">Potential Duplicate Clients Found</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 3 }}>
          We found {matches.length} existing client(s) that may match the information you entered.
          Please review carefully to avoid creating duplicate records.
        </Alert>

        {/* New Client Data */}
        <Card variant="outlined" sx={{ mb: 2, bgcolor: 'action.hover' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              <Person fontSize="small" /> New Client You're Creating
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Name</Typography>
                <Typography>{newClientData.firstName} {newClientData.lastName}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
                <Typography>{new Date(newClientData.dateOfBirth).toLocaleDateString()}</Typography>
              </Grid>
              {newClientData.primaryPhone && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Phone</Typography>
                  <Typography>{newClientData.primaryPhone}</Typography>
                </Grid>
              )}
              {newClientData.email && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography>{newClientData.email}</Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        <Divider sx={{ my: 2 }}>
          <Chip label="Possible Matches" />
        </Divider>

        {/* Existing Clients */}
        {matches.map((match) => (
          <Card
            key={match.clientId}
            variant="outlined"
            sx={{
              mb: 2,
              cursor: 'pointer',
              border: selectedMatch === match.clientId ? 2 : 1,
              borderColor: selectedMatch === match.clientId ? 'primary.main' : 'divider',
            }}
            onClick={() => setSelectedMatch(match.clientId)}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="subtitle2">
                  Existing Client - MRN: {match.client.medicalRecordNumber}
                </Typography>
                <Chip
                  label={`${getConfidenceLabel(match.confidenceScore)} (${Math.round(match.confidenceScore * 100)}%)`}
                  color={getConfidenceColor(match.confidenceScore)}
                  size="small"
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Name</Typography>
                  <Typography>{match.client.firstName} {match.client.lastName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
                  <Typography>{new Date(match.client.dateOfBirth).toLocaleDateString()}</Typography>
                </Grid>
                {match.client.primaryPhone && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Phone</Typography>
                    <Typography>{match.client.primaryPhone}</Typography>
                  </Grid>
                )}
                {match.client.email && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography>{match.client.email}</Typography>
                  </Grid>
                )}
              </Grid>

              <Box mt={2}>
                <Typography variant="caption" color="text.secondary">
                  Match Reason: {match.matchFields.join(', ')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={onCreateAnyway}
          color="warning"
          variant="outlined"
        >
          Create New Client Anyway
        </Button>
        <Button
          onClick={() => selectedMatch && onSelectExisting(selectedMatch)}
          disabled={!selectedMatch}
          color="primary"
          variant="contained"
        >
          Use Existing Client
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

2. Modify `packages/frontend/src/components/Clients/ClientForm.tsx` to integrate duplicate detection:
```typescript
// Add duplicate detection check before submit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Check for duplicates
  const duplicateCheck = await api.post('/clients/check-duplicates', {
    firstName: formData.firstName,
    lastName: formData.lastName,
    dateOfBirth: formData.dateOfBirth,
    email: formData.email,
    primaryPhone: formData.primaryPhone,
    ssnLastFour: formData.ssnLastFour,
  });

  if (duplicateCheck.data.data.hasPotentialDuplicates) {
    setDuplicateMatches(duplicateCheck.data.data.matches);
    setShowDuplicateModal(true);
    return;
  }

  // No duplicates, proceed with creation
  await createClient();
};
```

#### Testing Requirements

**Unit Tests**:
- [ ] Exact match detection (same name/DOB)
- [ ] SSN matching
- [ ] Phonetic matching (Soundex)
- [ ] Fuzzy matching (Levenshtein distance)
- [ ] Partial DOB matching (transposed day/month, year off by 1)
- [ ] Confidence scoring calculation
- [ ] Deduplication logic

**Integration Tests**:
- [ ] Create client triggers duplicate check
- [ ] High-confidence matches require review
- [ ] Supervisor notification on high confidence
- [ ] Merge clients moves all relationships
- [ ] Dismiss duplicate updates status
- [ ] Audit logging for all actions

**Manual Tests**:
- [ ] Create client with exact match shows warning
- [ ] Create client with phonetic match (e.g., John/Jon Smith)
- [ ] Create client with typo (e.g., Smiht vs Smith)
- [ ] Review pending duplicates list
- [ ] Merge two clients successfully
- [ ] Dismiss false positive match
- [ ] Verify merged client data is correct
- [ ] Verify appointments/notes moved to kept client

**Performance Tests**:
- [ ] Duplicate detection completes in <2 seconds
- [ ] Merge operation completes in <5 seconds
- [ ] No performance degradation with 10,000+ clients

**Success Criteria**:
✅ Duplicate detection runs on every client creation
✅ High-confidence matches (>90%) are flagged immediately
✅ Users can review and merge/dismiss duplicates
✅ Merge operation maintains data integrity
✅ Audit trail captures all duplicate-related actions
✅ System achieves <1% duplicate rate

---

### 1.3 Client Diagnoses Table

**Priority**: 🔴 CRITICAL
**Effort**: 1 week
**Dependencies**: None
**Gap Reference**: Report Section 1.3, lines 158-160

#### Database Schema Changes

```prisma
model ClientDiagnosis {
  id                 String    @id @default(uuid())
  clientId           String    @db.Uuid

  // Diagnosis Information
  diagnosisType      String    // PRIMARY, SECONDARY, RULE_OUT, HISTORICAL, PROVISIONAL
  icd10Code          String?   @db.VarChar(10)
  dsm5Code           String?   @db.VarChar(10)
  diagnosisName      String    @db.VarChar(500)
  diagnosisCategory  String?   // Mood Disorders, Anxiety Disorders, etc.

  // Clinical Details
  severitySpecifier  String?   // MILD, MODERATE, SEVERE, EXTREME
  courseSpecifier    String?   // IN_REMISSION, PARTIAL_REMISSION, RECURRENT, etc.
  onsetDate          DateTime?
  remissionDate      DateTime?

  // Provider Information
  dateDiagnosed      DateTime  @default(now())
  diagnosedById      String    @db.Uuid
  lastReviewedDate   DateTime?
  lastReviewedById   String?   @db.Uuid

  // Status
  status             String    @default("ACTIVE") // ACTIVE, RESOLVED, RULE_OUT_REJECTED
  dateResolved       DateTime?
  resolutionNotes    String?   @db.Text

  // Clinical Notes
  supportingEvidence String?   @db.Text
  differentialConsiderations String? @db.Text

  // Audit
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  // Relations
  client             Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  diagnosedBy        User      @relation("DiagnosedBy", fields: [diagnosedById], references: [id])
  lastReviewedBy     User?     @relation("LastReviewedBy", fields: [lastReviewedById], references: [id])

  @@index([clientId])
  @@index([icd10Code])
  @@index([dsm5Code])
  @@index([status])
  @@index([diagnosisType])
}

// Update Client model
model Client {
  // Add relation
  diagnoses         ClientDiagnosis[]

  // Deprecated fields (keep for migration, remove later)
  // primaryDiagnosis     String?
  // secondaryDiagnoses   String[]
}
```

#### Backend Implementation

**Files to Create**:

1. `packages/backend/src/services/diagnosis.service.ts`
```typescript
import prisma from './database';

export async function addDiagnosis(data: {
  clientId: string;
  diagnosisType: string;
  icd10Code?: string;
  dsm5Code?: string;
  diagnosisName: string;
  severitySpecifier?: string;
  diagnosedById: string;
}) {
  // Validate diagnosis type
  const validTypes = ['PRIMARY', 'SECONDARY', 'RULE_OUT', 'HISTORICAL', 'PROVISIONAL'];
  if (!validTypes.includes(data.diagnosisType)) {
    throw new Error(`Invalid diagnosis type: ${data.diagnosisType}`);
  }

  // If setting as PRIMARY, demote existing primary to SECONDARY
  if (data.diagnosisType === 'PRIMARY') {
    await prisma.clientDiagnosis.updateMany({
      where: {
        clientId: data.clientId,
        diagnosisType: 'PRIMARY',
        status: 'ACTIVE',
      },
      data: {
        diagnosisType: 'SECONDARY',
      },
    });
  }

  return await prisma.clientDiagnosis.create({
    data: {
      ...data,
      status: 'ACTIVE',
    },
  });
}

export async function getClientDiagnoses(clientId: string) {
  return await prisma.clientDiagnosis.findMany({
    where: {
      clientId,
      status: { in: ['ACTIVE', 'RULE_OUT'] },
    },
    include: {
      diagnosedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [
      { diagnosisType: 'asc' }, // PRIMARY first
      { dateDiagnosed: 'desc' },
    ],
  });
}

export async function updateDiagnosisStatus(
  diagnosisId: string,
  status: string,
  userId: string
) {
  return await prisma.clientDiagnosis.update({
    where: { id: diagnosisId },
    data: {
      status,
      dateResolved: status === 'RESOLVED' ? new Date() : undefined,
      lastReviewedDate: new Date(),
      lastReviewedById: userId,
    },
  });
}

// ICD-10 code lookup
export async function searchICD10Codes(query: string) {
  // TODO: Integrate with ICD-10 database/API
  // For now, return mock data
  return [
    { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified' },
    { code: 'F33.1', description: 'Major depressive disorder, recurrent, moderate' },
    { code: 'F41.1', description: 'Generalized anxiety disorder' },
  ];
}
```

2. `packages/backend/src/controllers/diagnosis.controller.ts`

#### Frontend Implementation

**Files to Create**:
1. `packages/frontend/src/components/Clients/DiagnosisManager.tsx`
2. `packages/frontend/src/components/Clients/DiagnosisForm.tsx`
3. `packages/frontend/src/components/Clients/ICD10SearchDialog.tsx`

#### Testing Requirements

**Unit Tests**:
- [ ] Add diagnosis (all types)
- [ ] Primary diagnosis demotion logic
- [ ] Update diagnosis status
- [ ] Resolve diagnosis
- [ ] ICD-10 code validation

**Integration Tests**:
- [ ] Create diagnosis via API
- [ ] List client diagnoses
- [ ] Update diagnosis
- [ ] Query clients by diagnosis
- [ ] Historical diagnosis tracking

**Manual Tests**:
- [ ] Add primary diagnosis to client
- [ ] Add secondary diagnoses
- [ ] Add rule-out diagnosis
- [ ] Resolve diagnosis
- [ ] Search ICD-10 codes
- [ ] View diagnosis history
- [ ] Generate reports by diagnosis

**Success Criteria**:
✅ Multiple diagnoses per client supported
✅ Primary/secondary designation working
✅ ICD-10/DSM-5 codes stored and searchable
✅ Diagnosis history tracked
✅ Can query/report by diagnosis
✅ Clinical workflow supports diagnosis management

---

### 1.4 Client Relationships Table

**Priority**: 🔴 CRITICAL
**Effort**: 2 weeks
**Dependencies**: None
**Gap Reference**: Report Section 2.6, lines 289-303

#### Database Schema Changes

```prisma
// New table for family and professional relationships
model ClientRelationship {
  id                     String    @id @default(uuid())
  client1Id              String    @db.Uuid
  client2Id              String    @db.Uuid

  // Relationship Information
  relationshipType       String    // PARENT, CHILD, SPOUSE, SIBLING, GUARDIAN, EMERGENCY_CONTACT
  relationshipDetails    String?   @db.Text // e.g., "adoptive mother", "step-brother"
  isPrimary              Boolean   @default(false) // Primary family contact

  // Permissions & Access
  isEmergencyContact     Boolean   @default(false)
  isAuthorizedContact    Boolean   @default(false)
  canScheduleAppointments Boolean  @default(false)
  canAccessPortal        Boolean   @default(false)
  canReceiveInformation  Boolean   @default(false)
  canMakeMedicalDecisions Boolean  @default(false)
  specificLimitations    String?   @db.Text

  // ROI & Consent
  roiSigned              Boolean   @default(false)
  roiSignedDate          DateTime?
  roiExpirationDate      DateTime?
  consentDocumentId      String?   @db.Uuid

  // Dates
  relationshipStartDate  DateTime  @default(now())
  relationshipEndDate    DateTime?
  isActive               Boolean   @default(true)

  // Audit
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  createdBy              String    @db.Uuid

  // Relations
  client1                Client    @relation("Client1Relationships", fields: [client1Id], references: [id], onDelete: Cascade)
  client2                Client    @relation("Client2Relationships", fields: [client2Id], references: [id], onDelete: Cascade)
  consentDocument        ClientDocument? @relation(fields: [consentDocumentId], references: [id])
  creator                User      @relation(fields: [createdBy], references: [id])

  @@unique([client1Id, client2Id, relationshipType])
  @@index([client1Id])
  @@index([client2Id])
  @@index([relationshipType])
  @@index([isActive])
}

// Client Providers table for care team tracking
model ClientProvider {
  id                     String    @id @default(uuid())
  clientId               String    @db.Uuid

  // Provider Information
  providerType           String    // PRIMARY_THERAPIST, PSYCHIATRIST, CASE_MANAGER, PCP, SPECIALIST
  providerId             String?   @db.Uuid // Internal provider
  externalProviderName   String?   @db.VarChar(255)
  externalProviderNPI    String?   @db.VarChar(10)
  externalProviderPhone  String?   @db.VarChar(20)
  externalProviderFax    String?   @db.VarChar(20)
  externalProviderEmail  String?   @db.VarChar(255)
  specialty              String?   @db.VarChar(255)

  // ROI & Communication
  roiSigned              Boolean   @default(false)
  roiSignedDate          DateTime?
  roiExpirationDate      DateTime?
  canReceiveUpdates      Boolean   @default(false)
  canSendReferrals       Boolean   @default(false)
  lastCommunicationDate  DateTime?

  // Status
  isActive               Boolean   @default(true)
  startDate              DateTime  @default(now())
  endDate                DateTime?

  // Audit
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  createdBy              String    @db.Uuid

  // Relations
  client                 Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  provider               User?     @relation("InternalProvider", fields: [providerId], references: [id])
  creator                User      @relation("CreatedByUser", fields: [createdBy], references: [id])

  @@index([clientId])
  @@index([providerType])
  @@index([providerId])
}

// Update Client model
model Client {
  // Add relations
  relationshipsAsClient1 ClientRelationship[] @relation("Client1Relationships")
  relationshipsAsClient2 ClientRelationship[] @relation("Client2Relationships")
  providers              ClientProvider[]
}
```

#### Backend Implementation

**Files to Create**:

1. `packages/backend/src/services/clientRelationship.service.ts`
```typescript
export class ClientRelationshipService {
  /**
   * Link two clients as family members
   */
  async createRelationship(data: {
    client1Id: string;
    client2Id: string;
    relationshipType: string;
    permissions: {
      isEmergencyContact?: boolean;
      canScheduleAppointments?: boolean;
      canAccessPortal?: boolean;
      canReceiveInformation?: boolean;
      canMakeMedicalDecisions?: boolean;
    };
    roiSigned?: boolean;
    createdBy: string;
  }) {
    // Validate clients exist
    const client1 = await prisma.client.findUnique({ where: { id: data.client1Id } });
    const client2 = await prisma.client.findUnique({ where: { id: data.client2Id } });

    if (!client1 || !client2) {
      throw new NotFoundError('One or both clients not found');
    }

    // Create bidirectional relationship
    return await prisma.clientRelationship.create({
      data: {
        client1Id: data.client1Id,
        client2Id: data.client2Id,
        relationshipType: data.relationshipType,
        isEmergencyContact: data.permissions.isEmergencyContact || false,
        canScheduleAppointments: data.permissions.canScheduleAppointments || false,
        canAccessPortal: data.permissions.canAccessPortal || false,
        canReceiveInformation: data.permissions.canReceiveInformation || false,
        canMakeMedicalDecisions: data.permissions.canMakeMedicalDecisions || false,
        roiSigned: data.roiSigned || false,
        roiSignedDate: data.roiSigned ? new Date() : null,
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Get family tree for a client
   */
  async getFamilyTree(clientId: string) {
    const relationships = await prisma.clientRelationship.findMany({
      where: {
        OR: [
          { client1Id: clientId },
          { client2Id: clientId },
        ],
        isActive: true,
      },
      include: {
        client1: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            medicalRecordNumber: true,
          },
        },
        client2: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            medicalRecordNumber: true,
          },
        },
      },
    });

    return relationships.map(r => ({
      ...r,
      relatedClient: r.client1Id === clientId ? r.client2 : r.client1,
    }));
  }

  /**
   * Add provider to client care team
   */
  async addProvider(data: {
    clientId: string;
    providerType: string;
    providerId?: string; // Internal provider
    externalProviderName?: string;
    externalProviderNPI?: string;
    canReceiveUpdates?: boolean;
    roiSigned?: boolean;
    createdBy: string;
  }) {
    return await prisma.clientProvider.create({
      data: {
        clientId: data.clientId,
        providerType: data.providerType,
        providerId: data.providerId,
        externalProviderName: data.externalProviderName,
        externalProviderNPI: data.externalProviderNPI,
        canReceiveUpdates: data.canReceiveUpdates || false,
        roiSigned: data.roiSigned || false,
        roiSignedDate: data.roiSigned ? new Date() : null,
        createdBy: data.createdBy,
      },
    });
  }

  /**
   * Get client care team
   */
  async getCareTeam(clientId: string) {
    return await prisma.clientProvider.findMany({
      where: {
        clientId,
        isActive: true,
      },
      include: {
        provider: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        providerType: 'asc',
      },
    });
  }
}

export default new ClientRelationshipService();
```

2. `packages/backend/src/controllers/clientRelationship.controller.ts` - Full CRUD endpoints

#### Frontend Implementation

**Files to Create**:
1. `packages/frontend/src/components/Clients/FamilyTreeView.tsx` - Visual family tree
2. `packages/frontend/src/components/Clients/AddRelationshipDialog.tsx` - Link clients
3. `packages/frontend/src/components/Clients/CareTeamManager.tsx` - Provider management
4. `packages/frontend/src/components/Clients/ROIConsentForm.tsx` - ROI signing

#### Testing Requirements

**Success Criteria**:
✅ Family members can be linked
✅ Permissions per relationship managed
✅ ROI consent tracked and enforced
✅ Care team displayed and managed
✅ Information sharing rules enforced
✅ Family therapy sessions supported

---

### 1.5 Prior Authorizations Table

**Priority**: 🔴 CRITICAL
**Effort**: 2 weeks
**Dependencies**: Client_Providers (for requesting provider)
**Gap Reference**: Report Section 2.4, lines 252-258

#### Database Schema Changes

```prisma
model PriorAuthorization {
  id                     String    @id @default(uuid())
  clientId               String    @db.Uuid
  insuranceId            String    @db.Uuid

  // Authorization Details
  authorizationNumber    String    @unique @db.VarChar(100)
  authorizationType      String    // OUTPATIENT_THERAPY, INPATIENT, ASSESSMENT, MEDICATION_MANAGEMENT
  cptCodes               String[]  // E.g., ["90837", "90834"]
  diagnosisCodes         String[]  // ICD-10 codes

  // Session Tracking
  sessionsAuthorized     Int
  sessionsUsed           Int       @default(0)
  sessionsRemaining      Int       // Computed: authorized - used
  sessionUnit            String    @default("SESSIONS") // SESSIONS, DAYS, VISITS

  // Dates
  requestDate            DateTime  @default(now())
  approvalDate           DateTime?
  startDate              DateTime
  endDate                DateTime
  lastUsedDate           DateTime?

  // Provider Information
  requestingProviderId   String    @db.Uuid
  performingProviderId   String?   @db.Uuid

  // Status
  status                 String    // PENDING, APPROVED, DENIED, EXPIRED, EXHAUSTED
  denialReason           String?   @db.Text

  // Appeal Information
  appealStatus           String?   // NOT_APPEALED, APPEALING, APPEAL_APPROVED, APPEAL_DENIED
  appealDate             DateTime?
  appealNotes            String?   @db.Text

  // Documentation
  documentationSubmitted Boolean   @default(false)
  clinicalJustification  String?   @db.Text
  supportingDocuments    String[]  // Document IDs

  // Renewal
  renewalRequested       Boolean   @default(false)
  renewalRequestDate     DateTime?
  renewedFromId          String?   @db.Uuid // Previous auth that was renewed
  renewedToId            String?   @db.Uuid // New auth created from renewal

  // Notifications
  warningsSent           Json?     // {5sessions: sent, 3sessions: sent, 1session: sent, expiring: sent}

  // Audit
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  createdBy              String    @db.Uuid

  // Relations
  client                 Client    @relation(fields: [clientId], references: [id])
  insurance              InsuranceInformation @relation(fields: [insuranceId], references: [id])
  requestingProvider     User      @relation("RequestingProvider", fields: [requestingProviderId], references: [id])
  performingProvider     User?     @relation("PerformingProvider", fields: [performingProviderId], references: [id])
  renewedFrom            PriorAuthorization? @relation("AuthRenewal", fields: [renewedFromId], references: [id])
  renewedTo              PriorAuthorization? @relation("AuthRenewal")
  creator                User      @relation("AuthCreator", fields: [createdBy], references: [id])

  @@index([clientId])
  @@index([insuranceId])
  @@index([status])
  @@index([endDate])
  @@index([sessionsRemaining])
}

// Update Client model
model Client {
  priorAuthorizations    PriorAuthorization[]
}

// Update InsuranceInformation model
model InsuranceInformation {
  authorizationsRequired Boolean  @default(false)
  priorAuthorizations    PriorAuthorization[]
}
```

#### Backend Implementation

**Files to Create**:

1. `packages/backend/src/services/priorAuthorization.service.ts`
```typescript
export class PriorAuthorizationService {
  /**
   * Create new authorization request
   */
  async createAuthorization(data: {
    clientId: string;
    insuranceId: string;
    authorizationType: string;
    cptCodes: string[];
    diagnosisCodes: string[];
    sessionsAuthorized: number;
    startDate: Date;
    endDate: Date;
    requestingProviderId: string;
    clinicalJustification: string;
    createdBy: string;
  }) {
    return await prisma.priorAuthorization.create({
      data: {
        ...data,
        status: 'PENDING',
        sessionsUsed: 0,
        sessionsRemaining: data.sessionsAuthorized,
      },
    });
  }

  /**
   * Use a session (decrement remaining)
   */
  async useSession(authId: string, sessionDate: Date) {
    const auth = await prisma.priorAuthorization.findUnique({
      where: { id: authId },
    });

    if (!auth) throw new NotFoundError('Authorization not found');
    if (auth.status !== 'APPROVED') throw new Error('Authorization not approved');
    if (auth.sessionsRemaining <= 0) throw new Error('No sessions remaining');

    const updated = await prisma.priorAuthorization.update({
      where: { id: authId },
      data: {
        sessionsUsed: auth.sessionsUsed + 1,
        sessionsRemaining: auth.sessionsRemaining - 1,
        lastUsedDate: sessionDate,
        status: auth.sessionsRemaining - 1 === 0 ? 'EXHAUSTED' : auth.status,
      },
    });

    // Send warnings if thresholds reached
    await this.checkAndSendWarnings(updated);

    return updated;
  }

  /**
   * Check for low session warnings
   */
  private async checkAndSendWarnings(auth: PriorAuthorization) {
    const warnings = (auth.warningsSent as any) || {};

    // 5 sessions remaining warning
    if (auth.sessionsRemaining === 5 && !warnings['5sessions']) {
      await this.sendWarning(auth, '5 sessions remaining');
      await prisma.priorAuthorization.update({
        where: { id: auth.id },
        data: {
          warningsSent: { ...warnings, '5sessions': new Date() },
        },
      });
    }

    // Similar logic for 3, 1 sessions
    if (auth.sessionsRemaining === 3 && !warnings['3sessions']) {
      await this.sendWarning(auth, '3 sessions remaining - START RENEWAL');
    }

    if (auth.sessionsRemaining === 1 && !warnings['1session']) {
      await this.sendWarning(auth, 'URGENT: Last session remaining');
    }
  }

  /**
   * Check for expiring authorizations (daily cron job)
   */
  async checkExpiringAuthorizations() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiring = await prisma.priorAuthorization.findMany({
      where: {
        status: 'APPROVED',
        endDate: {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        },
      },
      include: {
        client: true,
        requestingProvider: true,
      },
    });

    for (const auth of expiring) {
      await this.sendExpirationWarning(auth);
    }
  }

  /**
   * Initiate renewal
   */
  async initiateRenewal(authId: string, userId: string) {
    const oldAuth = await prisma.priorAuthorization.findUnique({
      where: { id: authId },
    });

    if (!oldAuth) throw new NotFoundError('Authorization not found');

    // Create renewal request (copy old auth data)
    const newAuth = await prisma.priorAuthorization.create({
      data: {
        clientId: oldAuth.clientId,
        insuranceId: oldAuth.insuranceId,
        authorizationType: oldAuth.authorizationType,
        cptCodes: oldAuth.cptCodes,
        diagnosisCodes: oldAuth.diagnosisCodes,
        sessionsAuthorized: oldAuth.sessionsAuthorized, // Can be modified
        requestingProviderId: oldAuth.requestingProviderId,
        performingProviderId: oldAuth.performingProviderId,
        clinicalJustification: oldAuth.clinicalJustification,
        startDate: oldAuth.endDate, // Start where old one ended
        endDate: new Date(oldAuth.endDate.getTime() + (180 * 24 * 60 * 60 * 1000)), // +6 months
        renewedFromId: authId,
        status: 'PENDING',
        createdBy: userId,
      },
    });

    // Update old auth
    await prisma.priorAuthorization.update({
      where: { id: authId },
      data: {
        renewalRequested: true,
        renewalRequestDate: new Date(),
        renewedToId: newAuth.id,
      },
    });

    return newAuth;
  }
}

export default new PriorAuthorizationService();
```

2. `packages/backend/src/controllers/priorAuthorization.controller.ts` - Full CRUD endpoints
3. `packages/backend/src/jobs/checkAuthExpirations.job.ts` - Daily cron job

#### Frontend Implementation

**Files to Create**:
1. `packages/frontend/src/components/Clients/AuthorizationTracker.tsx` - Main authorization dashboard
2. `packages/frontend/src/components/Clients/AuthorizationForm.tsx` - Create/edit auth
3. `packages/frontend/src/components/Clients/AuthorizationAlerts.tsx` - Warning banners
4. `packages/frontend/src/components/Dashboard/ExpiringAuthsDashboard.tsx` - Admin dashboard widget

#### Testing Requirements

**Success Criteria**:
✅ Authorizations created and tracked
✅ Sessions decremented automatically
✅ Warnings sent at 5, 3, 1 sessions remaining
✅ Expiration alerts 30 days before
✅ Renewal workflow functional
✅ Denied claims prevented
✅ Billing compliance maintained

---

## Phase 2: High Priority Features (Weeks 4-7) 🟡

### 2.1 AdvancedMD Integration (Week 4-5)

**Priority**: 🟡 HIGH
**Effort**: 2 weeks
**Dependencies**: None
**Gap Reference**: Report Section 3.1, lines 349-360

#### Implementation Overview

**Approach**: RESTful API integration with AdvancedMD using their Practice Management API

**Files to Create**:
1. `packages/backend/src/services/integrations/advancedmd.service.ts` - API client
2. `packages/backend/src/services/integrations/advancedmdSync.service.ts` - Sync logic
3. `packages/backend/src/jobs/advancedmdSync.job.ts` - Scheduled sync (every 15 minutes)
4. `packages/backend/src/controllers/advancedmdSync.controller.ts` - Manual sync triggers

**Key Features**:
- Bidirectional client demographics sync
- Insurance information sync
- Appointment sync
- Conflict resolution (last-write-wins with manual override)
- Sync status dashboard
- Error logging and retry logic

**Database Changes**:
```prisma
model Client {
  // Add AdvancedMD tracking
  advancedmdId           String?   @unique @db.VarChar(50)
  advancedmdLastSync     DateTime?
  advancedmdSyncStatus   String?   // SUCCESS, ERROR, CONFLICT
}

model SyncLog {
  id                     String    @id @default(uuid())
  syncType               String    // CLIENT_DEMOGRAPHICS, INSURANCE, APPOINTMENTS
  direction              String    // PUSH, PULL
  recordId               String    @db.Uuid
  externalId             String?
  status                 String    // SUCCESS, ERROR, CONFLICT
  errorMessage           String?   @db.Text
  conflictData           Json?
  syncedAt               DateTime  @default(now())

  @@index([syncType])
  @@index([status])
  @@index([syncedAt])
}
```

**Testing**:
- [ ] Test demographics push to AdvancedMD
- [ ] Test demographics pull from AdvancedMD
- [ ] Test conflict resolution
- [ ] Test error handling and retry
- [ ] Performance test with 1000+ clients

---

### 2.2 Risk Assessment Tracking (Week 5)

**Priority**: 🟡 HIGH
**Effort**: 1 week
**Dependencies**: None
**Gap Reference**: Report Section 2.3, lines 233-240

#### Database Schema

```prisma
model ClientRiskAssessment {
  id                     String    @id @default(uuid())
  clientId               String    @db.Uuid
  assessmentDate         DateTime  @default(now())
  assessedById           String    @db.Uuid

  // Risk Levels
  overallRiskLevel       String    // LOW, MODERATE, HIGH, CRITICAL
  suicideRisk            String    // NONE, LOW, MODERATE, HIGH, IMMINENT
  homicideRisk           String    // NONE, LOW, MODERATE, HIGH, IMMINENT
  selfHarmRisk           String    // NONE, LOW, MODERATE, HIGH
  violenceRisk           String    // NONE, LOW, MODERATE, HIGH
  substanceUseRisk       String    // NONE, LOW, MODERATE, HIGH

  // Clinical Details
  suicideIdeation        Boolean   @default(false)
  suicidePlan            Boolean   @default(false)
  suicideMeans           Boolean   @default(false)
  suicideAttemptHistory  Boolean   @default(false)
  homicideIdeation       Boolean   @default(false)
  homicidePlan           Boolean   @default(false)
  currentSubstanceUse    Boolean   @default(false)

  // Safety
  hasSafetyPlan          Boolean   @default(false)
  safetyPlanId           String?   @db.Uuid
  requiresHospitalization Boolean  @default(false)
  requiresWelfare Check  Boolean   @default(false)

  // Assessment Data
  assessmentNotes        String?   @db.Text
  protectiveFactors      String[]  // Family support, employment, etc.
  riskFactors            String[]  // Isolation, recent loss, etc.
  interventions          String[]  // Safety plan, increased frequency, etc.

  // Follow-up
  nextAssessmentDate     DateTime?
  requiresReview         Boolean   @default(false)
  reviewedById           String?   @db.Uuid
  reviewedAt             DateTime?

  // Audit
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  // Relations
  client                 Client    @relation(fields: [clientId], references: [id])
  assessedBy             User      @relation("AssessedBy", fields: [assessedById], references: [id])
  reviewer               User?     @relation("ReviewedBy", fields: [reviewedById], references: [id])

  @@index([clientId])
  @@index([overallRiskLevel])
  @@index([assessmentDate])
}

model ClientSafetyPlan {
  id                     String    @id @default(uuid())
  clientId               String    @db.Uuid

  // Warning Signs
  warningS igns          String[]  // Triggers, thoughts, behaviors
  copingStrategies       String[]  // Activities, distractions

  // Support Contacts
  supportPeople          Json[]    // [{name, phone, relationship}]
  professionalContacts   Json[]    // [{name, phone, organization}]

  // Crisis Resources
  crisisHotlines         String[]  // 988, local crisis line
  safeEnvironment        String?   @db.Text
  reasonsForLiving       String[]

  // Status
  dateCreated            DateTime  @default(now())
  lastReviewed           DateTime  @default(now())
  isActive               Boolean   @default(true)

  // Audit
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  createdBy              String    @db.Uuid

  // Relations
  client                 Client    @relation(fields: [clientId], references: [id])
  creator                User      @relation(fields: [createdBy], references: [id])

  @@index([clientId])
}
```

**Frontend Components**:
1. `packages/frontend/src/components/Clinical/RiskAssessmentForm.tsx`
2. `packages/frontend/src/components/Clinical/SafetyPlanBuilder.tsx`
3. `packages/frontend/src/components/Dashboard/HighRiskClientsWidget.tsx`

---

### 2.3 Enhanced Emergency Contacts (Week 6)

**Priority**: 🟡 HIGH
**Effort**: 3 days
**Gap Reference**: Report Section 1.2, lines 112-117

#### Database Schema Changes

```prisma
model EmergencyContact {
  // Add missing fields
  canMakeMedicalDecisions Boolean  @default(false)
  canAccessInformation    Boolean  @default(false)
  specificLimitations     String?  @db.Text
  legalGuardian           Boolean  @default(false)
  powerOfAttorney         Boolean  @default(false)
  healthcareProxy         Boolean  @default(false)

  // Documentation
  authorizationDocId      String?  @db.Uuid
  validFrom               DateTime?
  validUntil              DateTime?
}
```

---

### 2.4 Enhanced Insurance Information (Week 6)

**Priority**: 🟡 HIGH
**Effort**: 2 days
**Gap Reference**: Report Section 1.2, lines 131-137

#### Database Schema Changes

```prisma
model InsuranceInformation {
  // Add missing fields
  authorizationRequirements String?  @db.Text
  benefitLimitations        String?  @db.Text
  sessionLimits             Int?
  sessionsUsedYTD           Int      @default(0)
  outOfNetworkCoverage      Boolean  @default(false)
  requiresReferral          Boolean  @default(false)
}
```

---

### 2.5 Document Management Enhancements (Week 7)

**Priority**: 🟡 HIGH
**Effort**: 1 week
**Gap Reference**: Report Section 2.5, lines 268-283

#### Features to Add:

1. **Scanner Integration**
```typescript
// packages/frontend/src/services/scanner.service.ts
export class ScannerService {
  // TWAIN integration for desktop scanners
  async scanDocument(): Promise<File> {
    // Integration with scanner hardware
  }
}
```

2. **Fax-to-Digital**
```typescript
// Backend integration with fax service (e.g., eFax API)
// Auto-import faxes to client documents
```

3. **Email Attachment Import**
```typescript
// IMAP integration to monitor shared inbox
// Auto-categorize and attach to clients
```

4. **Time-Limited Access Links**
```prisma
model DocumentShareLink {
  id                     String    @id @default(uuid())
  documentId             String    @db.Uuid
  sharedWith             String    @db.VarChar(255) // Email
  accessToken            String    @unique @db.VarChar(255)
  expiresAt              DateTime
  maxViews               Int?
  viewCount              Int       @default(0)
  createdBy              String    @db.Uuid
  createdAt              DateTime  @default(now())

  document               ClientDocument @relation(fields: [documentId], references: [id])
}
```

---

## Phase 3: Medium Priority Features (Weeks 8-12) 🟢

### 3.1 Client Registration Enhancements (Week 8)

**Gaps to Fix**:
1. Add `presentingConcern` field to Client model
2. Add consent tracking
3. Add `interpreterNeeded` boolean
4. Add `religiousPreferences` field

### 3.2 Treatment Preferences Tracking (Week 8)

```prisma
model ClientTreatmentPreferences {
  id                     String    @id @default(uuid())
  clientId               String    @unique @db.Uuid

  // Therapeutic Preferences
  preferredApproaches    String[]  // CBT, DBT, EMDR, Psychodynamic
  avoidApproaches        String[]

  // Cultural Considerations
  culturalBackground     String?   @db.Text
  religiousConsiderations String?  @db.Text
  languagePreference     String?
  interpreterNeeded      Boolean   @default(false)

  // Provider Preferences
  genderPreference       String?   // MALE, FEMALE, NON_BINARY, NO_PREFERENCE
  ageRangePreference     String?
  experiencePreference   String?

  // Scheduling Preferences
  preferredDays          String[]  // MONDAY, TUESDAY, etc.
  preferredTimes         String[]  // MORNING, AFTERNOON, EVENING
  sessionFrequency       String?   // WEEKLY, BIWEEKLY, MONTHLY
  preferredDuration      Int?      // 30, 45, 60 minutes

  // Communication Preferences
  reminderPreference     String    // EMAIL, SMS, PHONE, NONE
  portalNotifications    Boolean   @default(true)

  // Audit
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  client                 Client    @relation(fields: [clientId], references: [id])
}
```

### 3.3 Advanced Search & Filters (Week 9)

1. Recent clients tracking
2. Favorite clients
3. Custom lists
4. Saved searches
5. Diagnosis filters (depends on 1.3)
6. Pending authorizations filter (depends on 1.5)
7. High-risk clients filter (depends on 2.2)

### 3.4 Portal Enhancements (Week 10)

1. Terms of use acceptance tracking
2. Portal MFA implementation
3. Device management
4. Portal features configuration

### 3.5 Data Quality Tools (Week 11-12)

1. Practice-required field warnings
2. Data completeness percentage tracking
3. Completion reminders
4. Address standardization (USPS API)
5. Insurance company matching
6. Bulk update tools
7. Data export for cleaning

---

## Phase 4: Enhancement Features (Weeks 13-18) ⚪

### 4.1 AI Document Categorization (Week 13)

**Integration**: OpenAI GPT-4 Vision API

```typescript
async function categor izeDocument(document: ClientDocument): Promise<string> {
  // Extract text from document
  const text = document.extractedText || await extractTextFromPDF(document.fileUrl);

  // Call GPT-4 for categorization
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{
      role: 'system',
      content: 'You are a medical document classifier. Categorize the following document into one of: INTAKE_FORM, CONSENT, ASSESSMENT, TREATMENT_PLAN, PROGRESS_NOTE, INSURANCE, CORRESPONDENCE, LAB_RESULT, PRESCRIPTION, OTHER'
    }, {
      role: 'user',
      content: text.substring(0, 4000)
    }],
  });

  return response.choices[0].message.content;
}
```

### 4.2 Laboratory Integration (Week 14)

- HL7 message parsing
- Lab result import
- Critical value alerts
- Result trending

### 4.3 Pharmacy Integration (Week 15)

- E-prescribing (SureScripts)
- Medication history retrieval
- Pharmacy lookup

### 4.4 HL7/CCD Import/Export (Week 16)

- CDA document generation
- HL7 message parsing
- Import from other EHRs
- Export for transitions of care

### 4.5 Advanced Reporting (Week 17)

- Diagnosis prevalence reports
- Authorization utilization reports
- Provider productivity reports
- Client demographics reports
- Risk stratification reports

### 4.6 Data Quality Dashboard (Week 18)

- Real-time data completeness metrics
- Duplicate detection monitoring
- Missing field alerts
- Data validation reports

---

## Implementation Summary

### Total Scope
- **60 Missing Items** from verification report
- **4 Phases** over 18 weeks
- **100% PRD Compliance** as goal

### Deliverables by Phase

**Phase 1 (Weeks 1-2)**: 4 Critical Features - **SSN REMOVED**
- ✅ 1.1 Duplicate Detection System
- ✅ 1.2 Client Diagnoses Table
- ✅ 1.3 Client Relationships Table
- ✅ 1.4 Prior Authorizations Table

**Phase 2 (Weeks 4-7)**: 9 High Priority Features
- ✅ 2.1 AdvancedMD Integration
- ✅ 2.2 Risk Assessment Tracking
- ✅ 2.3 Enhanced Emergency Contacts
- ✅ 2.4 Enhanced Insurance Information
- ✅ 2.5 Document Management Enhancements

**Phase 3 (Weeks 8-12)**: 15 Medium Priority Features
- ✅ 3.1 Client Registration Enhancements
- ✅ 3.2 Treatment Preferences Tracking
- ✅ 3.3 Advanced Search & Filters
- ✅ 3.4 Portal Enhancements
- ✅ 3.5 Data Quality Tools

**Phase 4 (Weeks 13-16)**: 29 Enhancement Features - **LAB & PHARMACY REMOVED**
- ✅ 4.1 AI Document Categorization
- ✅ 4.2 HL7/CCD Import/Export (moved from 4.4)
- ✅ 4.3 Advanced Reporting (moved from 4.5)
- ✅ 4.4 Data Quality Dashboard (moved from 4.6)

### Testing Strategy

**For Each Feature**:
1. Unit tests (80%+ coverage)
2. Integration tests (API endpoints)
3. Manual UI testing
4. Security testing (where applicable)
5. Performance testing (for high-load features)

**Overall Testing**:
- End-to-end workflow tests
- Regression test suite
- Load testing with 10,000+ clients
- Security penetration testing
- HIPAA compliance audit

### Success Metrics

1. **Feature Completeness**: 100% of 60 missing items implemented
2. **PRD Compliance**: 100% of PRD requirements met
3. **Test Coverage**: 80%+ unit test coverage
4. **Performance**: All pages load in <2 seconds
5. **Data Quality**: <1% duplicate rate
6. **User Satisfaction**: >90% user approval

---

## Resource Requirements

**Team**:
- 2 Senior Full-Stack Developers
- 1 QA Engineer
- 1 UX Designer (part-time)
- 1 DevOps Engineer (part-time)
- 1 Project Manager

**Timeline**: 18 weeks (4.5 months)

**Budget**: $120,000 - $180,000

**Infrastructure**:
- Development/staging environments
- Test database with sample data
- CI/CD pipeline enhancements
- Integration testing environment

---

## Risk Mitigation

**Technical Risks**:
1. **AdvancedMD API limitations** - Mitigation: Thorough API documentation review upfront
2. **Data migration complexity** - Mitigation: Create comprehensive migration scripts and rollback plan
3. **Performance degradation** - Mitigation: Load testing after each phase

**Business Risks**:
1. **Scope creep** - Mitigation: Strict change control process
2. **Resource availability** - Mitigation: Cross-training and documentation
3. **Timeline delays** - Mitigation: 20% buffer built into estimates

---

## Next Steps

1. **Week 0**: Sprint planning and environment setup
2. **Week 1**: Begin Phase 1 (SSN encryption)
3. **Week 3 Checkpoint**: Demo critical features to stakeholders
4. **Week 7 Checkpoint**: Demo high-priority features
5. **Week 12 Checkpoint**: UAT for Phases 1-3
6. **Week 18**: Final testing and production deployment

---

**Document Status**: ✅ COMPLETE - All 60 items planned
**Last Updated**: November 2, 2025
**Next Review**: After Phase 1 completion (Week 3)
