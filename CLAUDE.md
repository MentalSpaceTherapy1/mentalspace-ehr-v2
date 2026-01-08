# CLAUDE.md - MentalSpace EHR Project Context

This file provides essential context for AI assistants working on this codebase.

## Project Overview

**MentalSpace EHR** is a comprehensive HIPAA-compliant Electronic Health Records system for mental health practices. The platform serves 10,000+ users with features spanning clinical documentation, billing, telehealth, client portal, and practice management.

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript, Vite, TailwindCSS, React Query |
| **Backend** | Node.js + Express, TypeScript |
| **Database** | PostgreSQL via Prisma ORM |
| **Auth** | JWT (httpOnly cookies for staff, Bearer tokens for portal) |
| **Cloud** | AWS (ECS Fargate, RDS, S3, CloudWatch, ECR) |
| **Video** | Twilio Video/Amazon Chime |
| **AI** | Anthropic Claude API |
| **Email** | Resend |

### Monorepo Structure

```
mentalspace-ehr-v2/
├── packages/
│   ├── backend/          # Express API server (port 3001)
│   ├── frontend/         # React SPA (port 3000)
│   ├── database/         # Prisma schema & migrations
│   └── shared/           # Shared TypeScript types
├── infrastructure/       # AWS CDK stacks
└── docs/                 # Documentation
```

## Essential Commands

```bash
# Development
npm run dev                    # Start all packages concurrently
npm run dev:backend           # Backend only
npm run dev:frontend          # Frontend only

# Database
cd packages/database
npx prisma migrate dev        # Run migrations (development)
npx prisma db push            # Push schema changes directly
npx prisma generate           # Generate Prisma client
npx prisma studio             # Open database GUI

# Build & Deploy
npm run build                 # Build all packages
cd packages/backend && npm run build   # Build backend
cd packages/frontend && npm run build  # Build frontend

# Production Deployment (AWS)
docker build -t mentalspace-backend -f packages/backend/Dockerfile .
docker tag mentalspace-backend:latest 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:<tag>
docker push 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:<tag>
aws ecs update-service --cluster mentalspace-prod --service mentalspace-backend-service --force-new-deployment
```

## Architecture Patterns

### Backend Structure (packages/backend/src/)

```
src/
├── routes/           # Express route definitions (*.routes.ts)
├── controllers/      # Request handlers (*.controller.ts)
├── services/         # Business logic (*.service.ts)
├── middleware/       # Express middleware (auth, CSRF, PHI encryption)
├── utils/            # Helpers (logger, encryption, validation)
├── jobs/             # Cron jobs (hr-automation, retention)
├── integrations/     # Third-party integrations (AdvancedMD, Twilio)
└── socket/           # WebSocket handlers (messaging, telehealth)
```

### Request Flow
```
Route → Controller → Service → Prisma → Database
                  ↓
              Middleware (auth, audit, PHI encryption)
```

### Frontend Structure (packages/frontend/src/)

```
src/
├── pages/            # Route-level components
├── components/       # Reusable UI components
├── hooks/            # Custom React hooks
├── lib/              # API client, utilities
├── services/         # API service functions
└── contexts/         # React context providers
```

## Database Schema (Key Models)

### Core Models
- **User** - Staff members (clinicians, admin, billing)
- **Client** - Patients with demographics, insurance, PHI
- **Appointment** - Scheduling with status workflow
- **ClinicalNote** - SOAP notes, treatment plans (9 note types)
- **TelehealthSession** - Video sessions with Twilio/Chime

### Portal Models
- **PortalAccount** - Client login credentials (separate from User)
- **ProgressTracking** - Mood/sleep/exercise logs

### Billing Models
- **Charge** - Service charges with CPT/ICD codes
- **Claim** - Insurance claims
- **Payment** - Payment records

### HR Models
- **StaffCredential** - License/certification tracking
- **PerformanceReview** - Employee reviews
- **TimeEntry** / **PTORequest** - Attendance and leave

## Authentication Systems

### Staff Authentication (Cookie-based)
- Login: `POST /api/v1/auth/login`
- JWT stored in httpOnly cookie `accessToken`
- CSRF protection required for state-changing requests
- Middleware: `authenticate` from `auth.middleware.ts`

### Portal Authentication (Bearer Token)
- Login: `POST /api/v1/portal-auth/login`
- JWT returned in response body, stored in localStorage
- Bearer token in Authorization header
- Middleware: `portalAuthenticate` from `portalAuth.middleware.ts`
- **CSRF exempt** - uses Bearer tokens, not cookies

### CSRF Exemptions (app.ts lines 108-128)
Routes that don't require CSRF:
- `/webhooks/*` - Signature verification
- `/health/*` - Health checks
- `/portal/*` - Bearer token auth
- `/auth/login|register|refresh|forgot-password|reset-password|verify-email`
- `/portal-auth/login|register|activate|forgot-password|reset-password|verify-email`

## PHI Encryption (HIPAA Compliance)

### Location
`packages/backend/src/middleware/phiEncryption.ts`

### How It Works
Prisma middleware automatically encrypts/decrypts PHI fields on database operations.

### Encrypted Models
- **Client**: medicalRecordNumber, phone, email, address fields
- **InsuranceInformation**: memberId, SSN, phone numbers
- **EmergencyContact**: name, phone, email, address
- **User**: phone, license numbers, tax ID
- **ClinicalNote**: subjective, objective, assessment, plan

### NOT Encrypted (Important!)
- **PortalAccount**: `verificationToken`, `passwordResetToken` are NOT PHI
  - These must match URL tokens exactly
  - Encrypting breaks the token lookup flow

## API Patterns

### Response Format
```typescript
// Success
{ success: true, data: {...} }
{ success: true, data: [...], pagination: { page, limit, total } }

// Error
{ success: false, error: "message", code: "ERROR_CODE" }
```

### Route File Pattern
```typescript
// packages/backend/src/routes/example.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as controller from '../controllers/example.controller';

const router = Router();

router.get('/', authenticate, controller.getAll);
router.post('/', authenticate, authorize(['ADMIN']), controller.create);

export default router;
```

### Controller Pattern
```typescript
// packages/backend/src/controllers/example.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as service from '../services/example.service';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.getAll(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
```

## User Roles

```typescript
enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',       // Full system access
  ADMINISTRATOR = 'ADMINISTRATOR',   // Practice admin
  SUPERVISOR = 'SUPERVISOR',         // Clinical supervisor
  CLINICIAN = 'CLINICIAN',           // Therapist/provider
  BILLING_STAFF = 'BILLING_STAFF',   // Billing department
  FRONT_DESK = 'FRONT_DESK',         // Reception
  ASSOCIATE = 'ASSOCIATE'            // Supervised clinician
}
```

## Environment Variables

### Required for Backend
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PHI_ENCRYPTION_KEY=...
NODE_ENV=production|development
PORT=3001
CORS_ORIGINS=https://mentalspaceehr.com,...
FRONTEND_URL=https://mentalspaceehr.com
BACKEND_URL=https://api.mentalspaceehr.com
```

### Integrations
```
ANTHROPIC_API_KEY=sk-ant-...        # AI features
TWILIO_ACCOUNT_SID=AC...            # Telehealth
TWILIO_AUTH_TOKEN=...
TWILIO_API_KEY_SID=SK...
TWILIO_API_KEY_SECRET=...
RESEND_API_KEY=re_...               # Email
```

## Common Tasks

### Adding a New API Endpoint
1. Add route in `packages/backend/src/routes/<module>.routes.ts`
2. Create controller in `packages/backend/src/controllers/<module>.controller.ts`
3. Add business logic in `packages/backend/src/services/<module>.service.ts`
4. Register route in `packages/backend/src/routes/index.ts`

### Adding a New Database Field
1. Update schema in `packages/database/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <description>`
3. Run `npx prisma generate`
4. Update TypeScript types if needed

### Deploying to Production
1. Build Docker image: `docker build -t mentalspace-backend -f packages/backend/Dockerfile .`
2. Tag with version: `docker tag mentalspace-backend:latest 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:<tag>`
3. Push to ECR: `docker push ...`
4. Update ECS task definition with new image tag
5. Register task definition: `aws ecs register-task-definition --cli-input-json file://task-def.json`
6. Update service: `aws ecs update-service --cluster mentalspace-prod --service mentalspace-backend-service --force-new-deployment`

## Known Issues & Gotchas

### CSRF Protection
- Portal routes (`/portal/*`, `/portal-auth/*`) are CSRF exempt because they use Bearer tokens
- New auth endpoints must be added to exemption list in `app.ts`

### PHI Encryption
- Never add security tokens (verification, reset) to PHI_FIELDS_BY_MODEL
- Tokens must match URL parameters exactly - encryption breaks this

### Database Queries
- Always use Prisma's generated client for type safety
- PHI fields are automatically encrypted/decrypted by middleware
- Use `include` for relations, not raw SQL joins

### Frontend API Calls
- Staff routes: Use `api` client (includes cookies automatically)
- Portal routes: Use `portalApi` client (includes Bearer token)
- Both are configured in `packages/frontend/src/lib/api.ts`

### Date Handling
- All dates stored in UTC
- Frontend displays in user's local timezone
- Use dayjs for date manipulation

## Module Overview

| Module | Routes File | Key Features |
|--------|------------|--------------|
| Authentication | auth.routes.ts | Login, MFA, password reset |
| Client Management | client.routes.ts | Demographics, insurance, consent |
| Scheduling | appointment.routes.ts | Appointments, availability, waitlist |
| Clinical Notes | clinicalNote.routes.ts | 9 note types, signatures, amendments |
| Billing | billing.routes.ts | Charges, claims, payments |
| Telehealth | telehealth.routes.ts | Video sessions, recording, transcription |
| Client Portal | portal.routes.ts | Client self-service |
| Portal Auth | portalAuth.routes.ts | Client login, activation |
| Reporting | reports.routes.ts | 40+ reports, analytics |
| HR/Staff | staff-management.routes.ts | Directory, credentials, performance |
| Messaging | messaging.routes.ts | Internal communication |

## Important File Locations

### Configuration
- Backend config: `packages/backend/src/config/index.ts`
- Frontend config: `packages/frontend/src/config/`
- Prisma schema: `packages/database/prisma/schema.prisma`

### Security
- Auth middleware: `packages/backend/src/middleware/auth.middleware.ts`
- Portal auth: `packages/backend/src/middleware/portalAuth.middleware.ts`
- CSRF: `packages/backend/src/middleware/csrf.ts`
- PHI encryption: `packages/backend/src/middleware/phiEncryption.ts`

### AI Features
- Anthropic service: `packages/backend/src/services/ai/anthropic.service.ts`
- Field mappings: `packages/backend/src/services/ai/fieldMappings.service.ts`
- Note generation: `packages/backend/src/services/ai/clinicalNoteGeneration.service.ts`

### Integrations
- AdvancedMD: `packages/backend/src/integrations/advancedmd/`
- Twilio: Used directly in telehealth services

## Testing Production

### Check Backend Health
```bash
curl https://api.mentalspaceehr.com/api/v1/health
```

### Check ECS Service Status
```bash
aws ecs describe-services --cluster mentalspace-prod --services mentalspace-backend-service
```

### View Logs
```bash
aws logs get-log-events --log-group-name /ecs/mentalspace-backend-prod --log-stream-name <stream>
```

### Database Query (Production)
```bash
PGPASSWORD='<password>' psql -h mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com -U mentalspace_admin -d mentalspace_ehr -c "<query>"
```

## Recent Fixes Reference

### Portal Activation Flow (January 2026)
1. **CSRF 403 Error**: Added `/portal-auth/activate` to CSRF exemption list
2. **Token Encryption Issue**: Removed PortalAccount from PHI_FIELDS_BY_MODEL
   - `verificationToken` and `passwordResetToken` are NOT PHI
   - They must match URL tokens exactly

### Deployment Tags
- `csrf-fix-v1`: Added CSRF exemption for activate endpoint
- `token-fix-v1`: Fixed PHI encryption breaking portal tokens
