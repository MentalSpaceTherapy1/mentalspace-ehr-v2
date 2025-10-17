# Productivity Module - Implementation Plan

**Document Version:** 1.0
**Created:** October 13, 2025
**Project:** MentalSpace EHR V2
**Module:** Productivity Module (Phase 6)
**Timeline:** Weeks 18-22 (5 weeks)
**Status:** Planning Complete - Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Implementation Timeline](#implementation-timeline)
3. [Database Schema & Migration](#database-schema--migration)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Plan](#deployment-plan)
8. [Success Metrics](#success-metrics)

---

## Executive Summary

### Purpose

The Productivity Module provides comprehensive clinician performance tracking, team accountability dashboards, and Georgia-specific compliance automation. This module enables:

- **Clinicians** to track their own performance and stay compliant
- **Supervisors** to monitor team performance and provide coaching
- **Administrators** to optimize practice operations and revenue

### Key Features

1. **Metric Calculation Engine** - 13 categories, 35+ metrics calculated automatically
2. **Three Dashboard Views** - Clinician "My Practice", Supervisor "My Team", Administrator "Practice Overview"
3. **Alert & Nudge System** - Real-time notifications, daily digest emails, weekly performance reports
4. **Georgia Compliance Automation** - 7-day note rule, 90-day treatment plan review, consent management
5. **Data Quality Governance** - Automated validation and data quality checks

### Business Impact

- **Time Savings:** Eliminate manual productivity tracking (save 2 hours/week per supervisor)
- **Compliance:** Reduce Georgia compliance violations by 90% through automation
- **Revenue Optimization:** Identify underperforming clinicians and optimize scheduling (potential 10% revenue increase)
- **Client Retention:** Track rebook rates and proactively reach out to at-risk clients
- **Accountability:** Create culture of data-driven accountability

---

## Implementation Timeline

### Week 18: Backend Foundation (Oct 20-26, 2025)
- **Day 1-2:** Database schema & migration
- **Day 3-5:** Clinical Productivity metrics (KVR, No-Show Rate, Cancellation Rate, Rebook Rate, Sessions Per Day)
- **Day 6-7:** Documentation Compliance metrics (Same-Day Documentation Rate, Avg Documentation Time, Treatment Plan Currency, Unsigned Note Backlog)

### Week 19: Backend Metrics & APIs (Oct 27 - Nov 2, 2025)
- **Day 1-2:** Clinical Quality metrics (Client Retention, Crisis Intervention Rate, Safety Plan Compliance)
- **Day 3-4:** Billing & Revenue metrics (Charge Entry Lag, Billing Compliance Rate, Claim Acceptance Rate, Avg Reimbursement)
- **Day 5-6:** Remaining 9 metric categories (Schedule Optimization, Supervision Compliance, etc.)
- **Day 7:** Backend API endpoints (Dashboard, Metrics, Alerts, Goals)

### Week 20: Alert System & Compliance Automation (Nov 3-9, 2025)
- **Day 1-2:** Real-time in-app nudges & daily digest emails
- **Day 3:** Weekly performance report emails
- **Day 4:** Critical alert notifications (SMS + Email)
- **Day 5:** Escalation logic (Supervisor & Administrator)
- **Day 6-7:** Georgia compliance automation (7-day rule, 90-day treatment plan review, consent management, supervision hours, HIPAA training)

### Week 21: Frontend Dashboards - Part 1 (Nov 10-16, 2025)
- **Day 1-3:** Clinician "My Practice" Dashboard (5 cards: This Week Summary, Documentation Status, Client Engagement, Revenue Metrics, Alerts & Nudges)
- **Day 4-7:** Supervisor "My Team" Dashboard (Team Overview table, Team Metrics cards, Coaching Opportunities, Supervision Hours Compliance, Team Alerts)

### Week 22: Frontend Dashboards - Part 2 & Testing (Nov 17-23, 2025)
- **Day 1-3:** Administrator "Practice Overview" Dashboard (Practice Scorecard, Clinician Performance Matrix, Georgia Compliance Dashboard, Revenue Cycle Health, Capacity Planning, Alerts & Action Items)
- **Day 4:** Data Quality Governance implementation
- **Day 5-6:** Testing (unit, integration, E2E)
- **Day 7:** User Acceptance Testing (UAT) & documentation

---

## Database Schema & Migration

### New Prisma Models

#### 1. ProductivityMetric

```prisma
model ProductivityMetric {
  id            String   @id @default(uuid())
  clinicianId   String
  metricType    String   // 'KVR', 'NO_SHOW_RATE', 'DOCUMENTATION_RATE', etc.
  metricValue   Decimal  @db.Decimal(10, 2)
  periodStart   DateTime
  periodEnd     DateTime
  calculatedAt  DateTime @default(now())
  metadata      Json?    // Additional context (e.g., numerator, denominator)
  createdAt     DateTime @default(now())

  clinician     User     @relation(fields: [clinicianId], references: [id])

  @@index([clinicianId, metricType, periodStart])
  @@map("productivity_metrics")
}
```

**Purpose:** Store all calculated metrics with time-series data for trend analysis.

**Key Fields:**
- `metricType`: Enum-like string for metric identification (e.g., 'KVR', 'NO_SHOW_RATE')
- `metricValue`: The calculated value (e.g., 85.5 for 85.5% KVR)
- `periodStart/periodEnd`: Date range for the metric (e.g., week, month)
- `metadata`: JSON field for storing numerator/denominator or other context

---

#### 2. ComplianceAlert

```prisma
model ComplianceAlert {
  id            String   @id @default(uuid())
  alertType     String   // 'UNSIGNED_NOTE', 'TREATMENT_PLAN_OVERDUE', 'SUPERVISION_HOURS', etc.
  severity      String   // 'INFO', 'WARNING', 'CRITICAL'
  targetUserId  String   // Clinician or staff member
  supervisorId  String?  // Escalated to supervisor
  adminId       String?  // Escalated to admin
  message       String
  actionRequired String
  status        String   @default('OPEN') // 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'
  acknowledgedAt DateTime?
  resolvedAt    DateTime?
  metadata      Json?    // Additional context
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  targetUser    User     @relation(name: "AlertTarget", fields: [targetUserId], references: [id])
  supervisor    User?    @relation(name: "AlertSupervisor", fields: [supervisorId], references: [id])
  admin         User?    @relation(name: "AlertAdmin", fields: [adminId], references: [id])

  @@index([targetUserId, status])
  @@index([supervisorId, status])
  @@map("compliance_alerts")
}
```

**Purpose:** Track all alerts (performance, compliance, data quality) with escalation workflow.

**Key Fields:**
- `alertType`: Type of alert (e.g., 'UNSIGNED_NOTE', 'KVR_BELOW_THRESHOLD')
- `severity`: INFO (FYI), WARNING (needs attention), CRITICAL (urgent)
- `targetUserId`: User the alert is about
- `supervisorId/adminId`: Escalation path
- `status`: OPEN → ACKNOWLEDGED → RESOLVED workflow

---

#### 3. SupervisionSession

```prisma
model SupervisionSession {
  id              String   @id @default(uuid())
  superviseeId    String
  supervisorId    String
  sessionDate     DateTime
  durationHours   Decimal  @db.Decimal(4, 2)
  sessionType     String   // 'INDIVIDUAL', 'GROUP'
  topicsCovered   String[]
  notesSigned     Boolean  @default(false)
  signedAt        DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  supervisee      User     @relation(name: "Supervisee", fields: [superviseeId], references: [id])
  supervisor      User     @relation(name: "Supervisor", fields: [supervisorId], references: [id])

  @@index([superviseeId, sessionDate])
  @@map("supervision_sessions")
}
```

**Purpose:** Track supervision hours for licensure compliance (Georgia requires LPCs: 2 hrs/month, LMSWs: 4 hrs/month).

**Key Fields:**
- `durationHours`: Hours earned (e.g., 1.5)
- `sessionType`: INDIVIDUAL (1-on-1) or GROUP (multiple supervisees)
- `topicsCovered`: Array of topics discussed
- `notesSigned`: Supervisor must sign notes within 7 days

---

#### 4. GeorgiaComplianceRule

```prisma
model GeorgiaComplianceRule {
  id            String   @id @default(uuid())
  ruleType      String   // 'NOTE_SIGNATURE_DEADLINE', 'TREATMENT_PLAN_REVIEW', etc.
  ruleConfig    Json     // Configuration (e.g., { "deadlineDays": 7 })
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("georgia_compliance_rules")
}
```

**Purpose:** Configurable compliance rules for Georgia-specific requirements.

**Example Rules:**
```json
{
  "ruleType": "NOTE_SIGNATURE_DEADLINE",
  "ruleConfig": {
    "deadlineDays": 7,
    "reminderDays": 5,
    "supervisorAlertDays": 7,
    "billingHoldDays": 14
  }
}
```

---

#### 5. PerformanceGoal

```prisma
model PerformanceGoal {
  id          String   @id @default(uuid())
  userId      String
  metricType  String   // 'KVR', 'NO_SHOW_RATE', etc.
  targetValue Decimal  @db.Decimal(10, 2)
  startDate   DateTime
  endDate     DateTime
  status      String   @default('ACTIVE') // 'ACTIVE', 'ACHIEVED', 'MISSED'
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId, status])
  @@map("performance_goals")
}
```

**Purpose:** Set and track performance goals for clinicians (e.g., "Achieve 90% KVR by end of Q4").

---

### Migration Strategy

#### Step 1: Create Migration

```bash
cd packages/database
npx prisma migrate dev --name add_productivity_module
```

#### Step 2: Verify Migration

- Review generated SQL
- Test in dev environment
- Verify foreign keys and indexes

#### Step 3: Deploy to Staging

```bash
npx prisma migrate deploy
```

#### Step 4: Deploy to Production

```bash
DATABASE_URL="<production-url>" npx prisma migrate deploy
```

---

## Backend Implementation

### Metric Calculation Engine

#### Architecture

**Design Pattern:** Strategy Pattern

Each metric implements a common interface:

```typescript
interface MetricCalculator {
  metricType: string;
  calculate(userId: string, periodStart: Date, periodEnd: Date): Promise<MetricResult>;
}

interface MetricResult {
  value: number;
  metadata?: {
    numerator?: number;
    denominator?: number;
    [key: string]: any;
  };
}
```

---

### Metric Implementations

#### 1. Kept Visit Rate (KVR)

**File:** `packages/backend/src/services/metrics/kvr.ts`

```typescript
export class KVRCalculator implements MetricCalculator {
  metricType = 'KVR';

  async calculate(userId: string, periodStart: Date, periodEnd: Date): Promise<MetricResult> {
    // Get all scheduled appointments for clinician in period
    const scheduledAppointments = await prisma.appointment.count({
      where: {
        clinicianId: userId,
        appointmentDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: {
          notIn: ['CANCELLED', 'RESCHEDULED'], // Exclude cancelled
        },
      },
    });

    // Get completed appointments
    const completedAppointments = await prisma.appointment.count({
      where: {
        clinicianId: userId,
        appointmentDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: 'COMPLETED',
      },
    });

    if (scheduledAppointments === 0) {
      return { value: 0, metadata: { numerator: 0, denominator: 0 } };
    }

    const kvr = (completedAppointments / scheduledAppointments) * 100;

    return {
      value: parseFloat(kvr.toFixed(2)),
      metadata: {
        numerator: completedAppointments,
        denominator: scheduledAppointments,
      },
    };
  }
}
```

**Threshold Check:**

```typescript
const BENCHMARK = 85;
const ALERT_THRESHOLD = 80;

if (kvrResult.value < ALERT_THRESHOLD) {
  await createAlert({
    alertType: 'KVR_BELOW_THRESHOLD',
    severity: 'WARNING',
    targetUserId: userId,
    message: `Your KVR is ${kvrResult.value}% (target: ${BENCHMARK}%)`,
    actionRequired: 'Schedule more appointments or reduce no-shows',
  });
}
```

---

#### 2. Same-Day Documentation Rate

**File:** `packages/backend/src/services/metrics/sameDayDocumentation.ts`

```typescript
export class SameDayDocumentationCalculator implements MetricCalculator {
  metricType = 'SAME_DAY_DOCUMENTATION_RATE';

  async calculate(userId: string, periodStart: Date, periodEnd: Date): Promise<MetricResult> {
    // Get all completed sessions with notes
    const sessionsWithNotes = await prisma.clinicalNote.findMany({
      where: {
        clinicianId: userId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: {
          in: ['SIGNED', 'IN_REVIEW'],
        },
      },
      include: {
        appointment: true,
      },
    });

    let sameDayCount = 0;
    const totalCount = sessionsWithNotes.length;

    sessionsWithNotes.forEach((note) => {
      if (note.signedAt && note.appointment) {
        const sessionDate = new Date(note.appointment.appointmentDate).setHours(0, 0, 0, 0);
        const signedDate = new Date(note.signedAt).setHours(0, 0, 0, 0);

        if (sessionDate === signedDate) {
          sameDayCount++;
        }
      }
    });

    if (totalCount === 0) {
      return { value: 0, metadata: { numerator: 0, denominator: 0 } };
    }

    const rate = (sameDayCount / totalCount) * 100;

    return {
      value: parseFloat(rate.toFixed(2)),
      metadata: {
        numerator: sameDayCount,
        denominator: totalCount,
      },
    };
  }
}
```

---

### Metric Service

**File:** `packages/backend/src/services/metrics/metricService.ts`

```typescript
import { KVRCalculator } from './kvr';
import { SameDayDocumentationCalculator } from './sameDayDocumentation';
import { NoShowRateCalculator } from './noShowRate';
// ... import all 35+ calculators

class MetricService {
  private calculators: Map<string, MetricCalculator> = new Map();

  constructor() {
    // Register all calculators
    this.registerCalculator(new KVRCalculator());
    this.registerCalculator(new SameDayDocumentationCalculator());
    this.registerCalculator(new NoShowRateCalculator());
    // ... register all 35+ calculators
  }

  registerCalculator(calculator: MetricCalculator) {
    this.calculators.set(calculator.metricType, calculator);
  }

  async calculateMetric(
    metricType: string,
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MetricResult> {
    const calculator = this.calculators.get(metricType);

    if (!calculator) {
      throw new Error(`No calculator found for metric type: ${metricType}`);
    }

    return await calculator.calculate(userId, periodStart, periodEnd);
  }

  async calculateAllMetrics(userId: string, periodStart: Date, periodEnd: Date) {
    const results: Record<string, MetricResult> = {};

    for (const [metricType, calculator] of this.calculators.entries()) {
      try {
        results[metricType] = await calculator.calculate(userId, periodStart, periodEnd);
      } catch (error) {
        logger.error(`Error calculating ${metricType} for user ${userId}`, { error });
        results[metricType] = { value: 0, metadata: { error: error.message } };
      }
    }

    return results;
  }

  async saveMetrics(userId: string, periodStart: Date, periodEnd: Date, results: Record<string, MetricResult>) {
    const metricsToCreate = Object.entries(results).map(([metricType, result]) => ({
      clinicianId: userId,
      metricType,
      metricValue: result.value,
      periodStart,
      periodEnd,
      metadata: result.metadata,
    }));

    await prisma.productivityMetric.createMany({
      data: metricsToCreate,
    });
  }
}

export const metricService = new MetricService();
```

---

### Scheduled Jobs

**File:** `packages/backend/src/jobs/metricCalculation.ts`

```typescript
import cron from 'node-cron';
import { metricService } from '../services/metrics/metricService';
import { alertService } from '../services/alerts/alertService';

// Daily calculation (runs at midnight)
cron.schedule('0 0 * * *', async () => {
  logger.info('Starting daily metric calculation');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const periodStart = yesterday;
  const periodEnd = new Date(yesterday);
  periodEnd.setHours(23, 59, 59, 999);

  // Get all clinicians
  const clinicians = await prisma.user.findMany({
    where: { role: 'CLINICIAN' },
  });

  for (const clinician of clinicians) {
    try {
      const results = await metricService.calculateAllMetrics(
        clinician.id,
        periodStart,
        periodEnd
      );

      await metricService.saveMetrics(clinician.id, periodStart, periodEnd, results);

      // Generate alerts based on thresholds
      await alertService.checkThresholdsAndCreateAlerts(clinician.id, results);
    } catch (error) {
      logger.error(`Error calculating metrics for clinician ${clinician.id}`, { error });
    }
  }

  logger.info('Daily metric calculation complete');
});

// Weekly aggregation (runs Sunday at 11 PM)
cron.schedule('0 23 * * 0', async () => {
  logger.info('Starting weekly metric aggregation');

  const endOfWeek = new Date();
  endOfWeek.setHours(23, 59, 59, 999);

  const startOfWeek = new Date(endOfWeek);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  const clinicians = await prisma.user.findMany({
    where: { role: 'CLINICIAN' },
  });

  for (const clinician of clinicians) {
    try {
      const results = await metricService.calculateAllMetrics(
        clinician.id,
        startOfWeek,
        endOfWeek
      );

      await metricService.saveMetrics(clinician.id, startOfWeek, endOfWeek, results);

      // Send weekly performance report email
      await emailService.sendWeeklyPerformanceReport(clinician, results);
    } catch (error) {
      logger.error(`Error aggregating weekly metrics for clinician ${clinician.id}`, { error });
    }
  }

  logger.info('Weekly metric aggregation complete');
});

// Hourly alert generation
cron.schedule('0 * * * *', async () => {
  await alertService.processAllAlerts();
});
```

---

### Backend API Endpoints

**File:** `packages/backend/src/routes/productivity.routes.ts`

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import {
  getClinicianDashboard,
  getSupervisorDashboard,
  getAdministratorDashboard,
  getMetrics,
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} from '../controllers/productivity.controller';

const router = Router();

router.use(authMiddleware);

// Dashboard endpoints
router.get('/dashboard/clinician/:userId', getClinicianDashboard);
router.get('/dashboard/supervisor/:supervisorId', roleMiddleware(['SUPERVISOR', 'ADMIN']), getSupervisorDashboard);
router.get('/dashboard/administrator', roleMiddleware(['ADMIN']), getAdministratorDashboard);

// Metrics endpoints
router.get('/metrics/:userId', getMetrics);
router.get('/metrics/team/:supervisorId', roleMiddleware(['SUPERVISOR', 'ADMIN']), getTeamMetrics);
router.get('/metrics/practice', roleMiddleware(['ADMIN']), getPracticeMetrics);

// Alerts endpoints
router.get('/alerts/:userId', getAlerts);
router.post('/alerts/:alertId/acknowledge', acknowledgeAlert);
router.post('/alerts/:alertId/resolve', resolveAlert);

// Goals endpoints
router.get('/goals/:userId', getGoals);
router.post('/goals', createGoal);
router.put('/goals/:goalId', updateGoal);
router.delete('/goals/:goalId', deleteGoal);

export default router;
```

**Register in main routes:**

```typescript
// packages/backend/src/routes/index.ts
import productivityRoutes from './productivity.routes';

router.use('/productivity', productivityRoutes);
```

---

### Backend Controllers

**File:** `packages/backend/src/controllers/productivity.controller.ts`

```typescript
import { Request, Response } from 'express';
import { metricService } from '../services/metrics/metricService';
import { asyncHandler } from '../middleware/errorHandler';

export const getClinicianDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  // Get current week metrics
  const startOfWeek = getStartOfWeek();
  const endOfWeek = getEndOfWeek();

  const weeklyMetrics = await metricService.calculateAllMetrics(userId, startOfWeek, endOfWeek);

  // Get unsigned notes
  const unsignedNotes = await prisma.clinicalNote.findMany({
    where: {
      clinicianId: userId,
      status: 'DRAFT',
      createdAt: {
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Older than 7 days
      },
    },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });

  // Get active alerts
  const alerts = await prisma.complianceAlert.findMany({
    where: {
      targetUserId: userId,
      status: { in: ['OPEN', 'ACKNOWLEDGED'] },
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: 10,
  });

  // Get clients needing rebook
  const clientsNeedingRebook = await getClientsNeedingRebook(userId);

  res.json({
    success: true,
    data: {
      weeklyMetrics,
      unsignedNotes,
      alerts,
      clientsNeedingRebook,
    },
  });
});

export const getSupervisorDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { supervisorId } = req.params;

  // Get all supervisees
  const supervisees = await prisma.user.findMany({
    where: { supervisorId },
  });

  const teamData = [];

  for (const supervisee of supervisees) {
    const weeklyMetrics = await metricService.calculateAllMetrics(
      supervisee.id,
      getStartOfWeek(),
      getEndOfWeek()
    );

    const unsignedNotesCount = await prisma.clinicalNote.count({
      where: {
        clinicianId: supervisee.id,
        status: 'DRAFT',
      },
    });

    teamData.push({
      clinician: {
        id: supervisee.id,
        name: `${supervisee.firstName} ${supervisee.lastName}`,
      },
      kvr: weeklyMetrics.KVR?.value || 0,
      noShowRate: weeklyMetrics.NO_SHOW_RATE?.value || 0,
      unsignedNotes: unsignedNotesCount,
      sameDayDocRate: weeklyMetrics.SAME_DAY_DOCUMENTATION_RATE?.value || 0,
    });
  }

  res.json({
    success: true,
    data: {
      team: teamData,
      // ... more supervisor dashboard data
    },
  });
});
```

---

## Frontend Implementation

### Dashboard Components Architecture

```
packages/frontend/src/pages/Productivity/
├── ClinicianDashboard.tsx       # "My Practice" dashboard
├── SupervisorDashboard.tsx      # "My Team" dashboard
├── AdministratorDashboard.tsx   # "Practice Overview" dashboard
└── components/
    ├── MetricCard.tsx           # Reusable metric display card
    ├── AlertList.tsx            # Alert list component
    ├── PerformanceChart.tsx     # Chart component for trends
    └── TeamTable.tsx            # Supervisor team table
```

---

### Clinician Dashboard

**File:** `packages/frontend/src/pages/Productivity/ClinicianDashboard.tsx`

```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import MetricCard from './components/MetricCard';
import AlertList from './components/AlertList';

export default function ClinicianDashboard() {
  const userId = localStorage.getItem('userId');

  const { data, isLoading } = useQuery({
    queryKey: ['clinicianDashboard', userId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/v1/productivity/dashboard/clinician/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  const { weeklyMetrics, unsignedNotes, alerts, clientsNeedingRebook } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">My Practice</h1>
          <p className="text-gray-600">Your weekly performance dashboard</p>
        </div>

        {/* This Week Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="KVR"
            value={`${weeklyMetrics.KVR?.value}%`}
            benchmark={85}
            status={weeklyMetrics.KVR?.value >= 85 ? 'success' : weeklyMetrics.KVR?.value >= 80 ? 'warning' : 'danger'}
            subtitle={`${weeklyMetrics.KVR?.metadata?.numerator} of ${weeklyMetrics.KVR?.metadata?.denominator} sessions`}
          />
          <MetricCard
            title="No-Shows"
            value={`${weeklyMetrics.NO_SHOW_RATE?.value}%`}
            benchmark={10}
            status={weeklyMetrics.NO_SHOW_RATE?.value <= 10 ? 'success' : weeklyMetrics.NO_SHOW_RATE?.value <= 15 ? 'warning' : 'danger'}
            inverted
          />
          <MetricCard
            title="Cancellations"
            value={`${weeklyMetrics.CANCELLATION_RATE?.value}%`}
            benchmark={15}
            status={weeklyMetrics.CANCELLATION_RATE?.value <= 15 ? 'success' : 'warning'}
            inverted
          />
          <MetricCard
            title="Unsigned Notes"
            value={unsignedNotes.length}
            benchmark={0}
            status={unsignedNotes.length === 0 ? 'success' : unsignedNotes.length <= 5 ? 'warning' : 'danger'}
            subtitle={unsignedNotes.length > 0 ? `Oldest: ${getOldestNoteDays(unsignedNotes[0])} days` : 'All caught up!'}
            inverted
          />
        </div>

        {/* Documentation Status */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Documentation Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-gray-800">
                {weeklyMetrics.SAME_DAY_DOCUMENTATION_RATE?.value}%
              </div>
              <div className="text-sm text-gray-600">Same-Day Documentation Rate</div>
              <div className="text-xs text-gray-500 mt-1">Target: 90%</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-800">
                {weeklyMetrics.AVG_DOCUMENTATION_TIME?.value}hrs
              </div>
              <div className="text-sm text-gray-600">Average Documentation Time</div>
              <div className="text-xs text-gray-500 mt-1">Target: &lt;24 hours</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-800">{unsignedNotes.length}</div>
              <div className="text-sm text-gray-600">Notes Pending Signature</div>
              {unsignedNotes.length > 0 && (
                <button className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
                  View & Sign →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Alerts & Nudges */}
        <AlertList alerts={alerts} />

        {/* Clients Needing Rebook */}
        {clientsNeedingRebook.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Clients Needing Follow-Up</h2>
            <p className="text-gray-600 mb-4">
              {clientsNeedingRebook.length} clients haven't rebooked in 30+ days
            </p>
            <ul className="space-y-2">
              {clientsNeedingRebook.map((client) => (
                <li key={client.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-semibold">{client.name}</div>
                    <div className="text-sm text-gray-600">Last visit: {client.lastVisitDate}</div>
                  </div>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    Send Message
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

**File:** `packages/backend/src/services/metrics/__tests__/kvr.test.ts`

```typescript
import { KVRCalculator } from '../kvr';
import { prismaMock } from '../../../test/prismaMock';

describe('KVRCalculator', () => {
  let calculator: KVRCalculator;

  beforeEach(() => {
    calculator = new KVRCalculator();
  });

  it('should calculate KVR correctly with 100% completion', async () => {
    prismaMock.appointment.count
      .mockResolvedValueOnce(20) // scheduled appointments
      .mockResolvedValueOnce(20); // completed appointments

    const result = await calculator.calculate('user-1', new Date('2025-10-01'), new Date('2025-10-07'));

    expect(result.value).toBe(100);
    expect(result.metadata.numerator).toBe(20);
    expect(result.metadata.denominator).toBe(20);
  });

  it('should calculate KVR correctly with 85% completion', async () => {
    prismaMock.appointment.count
      .mockResolvedValueOnce(20) // scheduled appointments
      .mockResolvedValueOnce(17); // completed appointments

    const result = await calculator.calculate('user-1', new Date('2025-10-01'), new Date('2025-10-07'));

    expect(result.value).toBe(85);
    expect(result.metadata.numerator).toBe(17);
    expect(result.metadata.denominator).toBe(20);
  });

  it('should return 0 if no scheduled appointments', async () => {
    prismaMock.appointment.count
      .mockResolvedValueOnce(0) // scheduled appointments
      .mockResolvedValueOnce(0); // completed appointments

    const result = await calculator.calculate('user-1', new Date('2025-10-01'), new Date('2025-10-07'));

    expect(result.value).toBe(0);
  });
});
```

---

## Deployment Plan

### Phase 1: Database Migration (Day 1)

```bash
# 1. Backup database
pg_dump -h <db-host> -U <user> -d mentalspace_ehr > backup_$(date +%Y%m%d).sql

# 2. Test migration in dev
cd packages/database
npx prisma migrate dev --name add_productivity_module

# 3. Deploy to staging
DATABASE_URL="<staging-url>" npx prisma migrate deploy

# 4. Verify staging
npm run test:integration

# 5. Deploy to production (during maintenance window)
DATABASE_URL="<production-url>" npx prisma migrate deploy
```

### Phase 2: Backend Deployment (Week 18-20)

```bash
# Build backend
cd packages/backend
npm run build

# Deploy to staging
# (Deploy via CI/CD or manual)

# Smoke test
curl https://staging.mentalspaceehr.com/api/v1/productivity/dashboard/clinician/test-user-id

# Deploy to production
```

### Phase 3: Frontend Deployment (Week 21-22)

```bash
# Build frontend
cd packages/frontend
npm run build

# Deploy to S3/CloudFront
aws s3 sync dist/ s3://mentalspaceehr-frontend --delete
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

### Phase 4: Scheduled Jobs Activation (Week 22)

```bash
# Enable cron jobs (ensure node-cron is running)
# Verify scheduled jobs are executing:
# - Daily metric calculation (midnight)
# - Weekly aggregation (Sunday 11 PM)
# - Hourly alert generation
```

---

## Success Metrics

### Week 22 (End of Implementation)

- [ ] **100% Metric Coverage:** All 35+ metrics calculating correctly
- [ ] **3 Dashboards Live:** Clinician, Supervisor, Administrator dashboards functional
- [ ] **Alert System Active:** Alerts generating and notifications sending
- [ ] **Georgia Compliance:** 7-day rule, 90-day treatment plan review enforced
- [ ] **Test Coverage:** >85% unit test coverage, all integration tests passing
- [ ] **UAT Sign-Off:** 2 clinicians, 1 supervisor, 1 admin approve dashboards

### Month 1 (After Launch)

- [ ] **User Adoption:** >90% of clinicians view their dashboard at least once/week
- [ ] **Compliance Improvement:** Unsigned notes >7 days reduced by 70%
- [ ] **Alert Acknowledgment:** >80% of alerts acknowledged within 24 hours
- [ ] **Performance Trends:** Baseline KVR, No-Show Rate, Documentation Time established

### Month 3 (Steady State)

- [ ] **KVR Improvement:** Practice-wide KVR increases from baseline by 5%
- [ ] **Documentation Time:** Average documentation time reduced by 20%
- [ ] **Georgia Compliance:** Zero notes >7 days unsigned (100% compliance)
- [ ] **Supervisor Efficiency:** Supervisors save 2 hours/week on manual tracking
- [ ] **Revenue Impact:** 5% revenue increase from improved KVR and reduced no-shows

---

## Risk Mitigation

### Risk 1: Metric Calculation Performance

**Risk:** Calculating 35+ metrics for 50+ clinicians daily could cause performance issues.

**Mitigation:**
- Run calculations at midnight (low traffic)
- Implement caching for frequently accessed metrics
- Use database indexes on `clinicianId`, `metricType`, `periodStart`
- Consider moving to background job queue (Bull/Redis) if needed

---

### Risk 2: Alert Fatigue

**Risk:** Too many alerts could lead to users ignoring them.

**Mitigation:**
- Prioritize alerts by severity (CRITICAL > WARNING > INFO)
- Limit daily digest to top 5 action items
- Allow users to snooze non-critical alerts
- Track alert engagement and adjust thresholds

---

### Risk 3: Georgia Compliance Rule Changes

**Risk:** Georgia mental health regulations may change.

**Mitigation:**
- Use `GeorgiaComplianceRule` table for configurable rules
- Admin UI to update compliance rules without code changes
- Version control for rule changes
- Compliance officer review process

---

**End of Implementation Plan**

**Next Steps:**
1. Approve implementation plan
2. Begin Week 18 (Database migration & metric calculation engine)
3. Daily stand-ups to track progress
4. Weekly demo to stakeholders
