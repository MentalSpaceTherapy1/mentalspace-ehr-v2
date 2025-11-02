# MentalSpace EHR v2 - Claude Code Onboarding Package

**Last Updated:** October 31, 2025
**Project Repository:** https://github.com/MentalSpaceTherapy1/mentalspace-ehr-v2
**Latest Commit:** `bec75e8` - Phase 2.1 Payer Policy Engine Complete

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Development Status](#development-status)
5. [Completed Features by Phase](#completed-features-by-phase)
6. [Database Schema Overview](#database-schema-overview)
7. [Environment Setup](#environment-setup)
8. [Key Files & Directories](#key-files--directories)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Architecture](#deployment-architecture)
11. [Next Steps & Roadmap](#next-steps--roadmap)
12. [Important Notes](#important-notes)

---

## 🎯 Project Overview

**MentalSpace EHR** is a comprehensive Electronic Health Records system designed specifically for mental health practices. It's built for Community Health & Counseling (CHC) Therapy practice in Georgia and Florida.

### Business Context
- **Primary Users:** Licensed therapists (LMFT, LCSW, LPC), supervisors, administrators
- **Jurisdictions:** Georgia (GA) and Florida (FL)
- **Client:** Brenda Johnson-Byers (brendajb@chctherapy.com)
- **Production Domain:** mentalspaceehr.com
- **API Domain:** api.mentalspaceehr.com

### Core Objectives
1. HIPAA-compliant clinical documentation
2. Electronic signature and attestation system
3. Payer-specific billing rules engine
4. Telehealth integration
5. Client portal for secure communication
6. Comprehensive audit trails and compliance tracking

---

## 🛠 Technology Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **State Management:** React Context API
- **Styling:** Tailwind CSS
- **UI Components:** Custom components with Tailwind
- **HTTP Client:** Axios
- **Date Handling:** date-fns

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js + TypeScript
- **Database ORM:** Prisma
- **Authentication:** JWT (JSON Web Tokens)
- **Validation:** Zod schemas
- **API Architecture:** RESTful API

### Database
- **Primary Database:** PostgreSQL (AWS RDS)
- **Production Instance:** mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com
- **Schema Management:** Prisma Migrations

### Infrastructure (AWS)
- **Frontend Hosting:** S3 + CloudFront CDN
- **Backend Hosting:** ECS Fargate
- **Load Balancer:** Application Load Balancer (ALB)
- **Container Registry:** ECR
- **DNS:** Route 53
- **SSL/TLS:** ACM (AWS Certificate Manager)
- **Monitoring:** CloudWatch

### Development Tools
- **Version Control:** Git + GitHub
- **Package Manager:** npm (workspaces)
- **Monorepo Structure:** Yes (packages/frontend, packages/backend, packages/database)
- **CI/CD:** GitHub Actions (currently disabled due to workflow issues)

---

## 📁 Project Structure

```
mentalspace-ehr-v2/
├── packages/
│   ├── frontend/              # React frontend application
│   │   ├── src/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── pages/         # Page-level components
│   │   │   ├── services/      # API service layer
│   │   │   ├── context/       # React context providers
│   │   │   ├── utils/         # Utility functions
│   │   │   ├── App.tsx        # Main application component
│   │   │   └── main.tsx       # Application entry point
│   │   ├── public/            # Static assets
│   │   └── package.json
│   │
│   ├── backend/               # Express.js backend API
│   │   ├── src/
│   │   │   ├── controllers/   # Request handlers
│   │   │   ├── routes/        # API route definitions
│   │   │   ├── services/      # Business logic layer
│   │   │   ├── middleware/    # Express middleware
│   │   │   ├── types/         # TypeScript type definitions
│   │   │   └── index.ts       # Server entry point
│   │   └── package.json
│   │
│   └── database/              # Database schema & migrations
│       ├── prisma/
│       │   ├── schema.prisma  # Prisma schema definition
│       │   └── migrations/    # Database migrations
│       └── package.json
│
├── docs/                      # Documentation files
├── .github/                   # GitHub Actions workflows
├── .claude/                   # Claude Code configuration
├── PHASE-*.md                 # Phase completion documentation
├── package.json               # Root package.json (workspace)
└── README.md                  # Project README

```

---

## 🚀 Development Status

### Current Phase: **Phase 2.1 Complete ✅**

The project has been developed in phases, with each phase building upon the previous:

| Phase | Status | Completion Date |
|-------|--------|-----------------|
| Phase 1.0: Core Infrastructure | ✅ Complete | Oct 2025 |
| Phase 1.1: User Management | ✅ Complete | Oct 2025 |
| Phase 1.2: Client Management | ✅ Complete | Oct 2025 |
| Phase 1.3: Appointment System | ✅ Complete | Oct 2025 |
| Phase 1.4: Clinical Notes | ✅ Complete | Oct 2025 |
| Phase 1.5: Electronic Signatures | ✅ Complete | Oct 2025 |
| Phase 1.6: Amendment History | ✅ Complete | Oct 2025 |
| Phase 2.1: Payer Policy Engine | ✅ Complete | Oct 31, 2025 |
| Phase 2.2: Claims Management | 🔄 Planned | TBD |
| Phase 3.0: Advanced Features | 🔄 Planned | TBD |

---

## ✨ Completed Features by Phase

### Phase 1.0: Core Infrastructure
**Database Schema:** ✅
**API Foundation:** ✅
**Authentication System:** ✅

- PostgreSQL database setup on AWS RDS
- Prisma ORM integration
- RESTful API structure
- JWT-based authentication
- Role-based access control (RBAC)
- CORS configuration
- Error handling middleware

**Key Files:**
- `packages/database/prisma/schema.prisma`
- `packages/backend/src/middleware/auth.ts`
- `packages/backend/src/routes/index.ts`

---

### Phase 1.1: User Management
**User Registration:** ✅
**User Authentication:** ✅
**Profile Management:** ✅

- User registration with email verification
- Secure login/logout
- Password hashing (bcrypt)
- User roles: ADMIN, CLINICIAN, SUPERVISOR, SUPPORT_STAFF
- Credential management (LMFT, LCSW, LPC, LAMFT, LAPC, etc.)
- NPI (National Provider Identifier) tracking
- License number and expiration tracking
- User status management (ACTIVE, INACTIVE, SUSPENDED)

**Key Models:**
- `User` - Core user authentication and profile
- Roles: ADMIN, CLINICIAN, SUPERVISOR, SUPPORT_STAFF
- Credentials: LMFT, LCSW, LPC, LAMFT, LAPC, etc.

**Key Files:**
- `packages/backend/src/controllers/auth.controller.ts`
- `packages/backend/src/routes/auth.routes.ts`
- `packages/frontend/src/pages/Auth/`

---

### Phase 1.2: Client Management
**Client Registration:** ✅
**Client Profiles:** ✅
**Demographics & Insurance:** ✅

- Comprehensive client demographics
- Emergency contact information
- Insurance information (primary & secondary)
- Client status tracking (ACTIVE, INACTIVE, DISCHARGED)
- Client search and filtering
- Client consent management
- HIPAA-compliant data handling

**Key Models:**
- `Client` - Client demographics and core information
- `EmergencyContact` - Emergency contact details
- `Insurance` - Insurance policy information

**Key Files:**
- `packages/backend/src/controllers/client.controller.ts`
- `packages/backend/src/routes/client.routes.ts`
- `packages/frontend/src/pages/Clients/`

---

### Phase 1.3: Appointment System
**Appointment Scheduling:** ✅
**Appointment Management:** ✅
**Calendar Integration:** ✅

- Appointment booking and scheduling
- Appointment status tracking (SCHEDULED, COMPLETED, CANCELLED, NO_SHOW)
- Appointment types (INTAKE, INDIVIDUAL, FAMILY, GROUP, etc.)
- Recurring appointments
- Appointment reminders (planned)
- Clinician availability management
- Double-booking prevention

**Key Models:**
- `Appointment` - Appointment scheduling
- Appointment types: INTAKE, INDIVIDUAL, FAMILY, GROUP, COUPLES, CONSULTATION

**Key Files:**
- `packages/backend/src/controllers/appointment.controller.ts`
- `packages/backend/src/routes/appointment.routes.ts`
- `packages/frontend/src/pages/Appointments/`

---

### Phase 1.4: Clinical Notes
**Note Creation:** ✅
**Note Templates:** ✅
**Multi-Note Types:** ✅

Comprehensive clinical documentation system supporting 8 note types:

1. **Intake Assessment** - Initial client evaluation
2. **Treatment Plan** - Therapeutic goals and interventions
3. **Progress Note** - Session documentation
4. **Consultation Note** - Professional consultation records
5. **Contact Note** - Brief client contacts (phone, email)
6. **Cancellation Note** - Appointment cancellations
7. **Termination Note** - Treatment conclusion
8. **Miscellaneous Note** - Other clinical documentation

**Features:**
- Structured note templates with required fields
- Auto-save functionality
- Note validation before submission
- Diagnosis tracking (ICD-10 codes)
- CPT code assignment
- Time tracking (session duration)
- Clinical decision support
- Note search and filtering

**Key Models:**
- `ClinicalNote` - All note types with polymorphic data storage
- `Diagnosis` - ICD-10 diagnosis codes
- `Treatment` - Treatment interventions

**Key Files:**
- `packages/backend/src/controllers/clinicalNote.controller.ts`
- `packages/backend/src/routes/clinicalNote.routes.ts`
- `packages/frontend/src/pages/ClinicalNotes/`
- `packages/frontend/src/components/NoteSubmission/` (8 note type forms)

---

### Phase 1.5: Electronic Signatures & Attestations
**Electronic Signatures:** ✅
**Attestation System:** ✅
**Compliance Tracking:** ✅

HIPAA and state-compliant electronic signature system with jurisdiction-specific attestations.

**Features:**
- Multi-factor signature authentication (PIN, password, biometric)
- Jurisdiction-specific attestations (GA, FL, US default)
- Role-based attestations (CLINICIAN, SUPERVISOR)
- Signature event audit trail
- IP address and user agent tracking
- Signature revocation capability
- Co-signature workflow for supervised clinicians
- Time-stamped signature events
- Tamper-proof signature records

**Authentication Methods:**
- PIN (4-6 digits)
- Password (user account password)
- Biometric (planned for mobile)

**Signature Types:**
- CLINICIAN_SIGNATURE - Primary clinician signature
- SUPERVISOR_COSIGNATURE - Supervisor co-signature for incident-to billing

**Key Models:**
- `SignatureAttestation` - Attestation text templates
- `SignatureEvent` - Individual signature records
- `User.signaturePin` - PIN authentication
- `User.signaturePassword` - Password hash
- `User.signatureBiometric` - Biometric data (planned)

**Key Files:**
- `packages/backend/src/controllers/signature.controller.ts`
- `packages/backend/src/routes/signature.routes.ts`
- `packages/frontend/src/components/ElectronicSignature/`

**Compliance:**
- 21 CFR Part 11 compliant (FDA electronic signatures)
- HIPAA compliant audit trails
- State-specific attestation requirements (GA, FL)
- IP address and timestamp tracking
- Non-repudiation through authentication

---

### Phase 1.6: Amendment History System
**Note Amendments:** ✅
**Version Control:** ✅
**Audit Trail:** ✅

Comprehensive amendment tracking system for clinical notes, ensuring compliance with medical record regulations.

**Features:**
- Amendment creation with reason tracking
- Full version history for every note
- Amendment approval workflow
- Amendment status tracking (PENDING, APPROVED, REJECTED)
- Attestation for amendments
- Amendment author and approver tracking
- Amendment impact assessment
- View previous versions of notes
- Amendment audit trail

**Amendment Reasons:**
- ERROR_CORRECTION - Factual errors
- ADDENDUM - Additional information
- CLARIFICATION - Clarifying existing content
- ADMINISTRATIVE - Administrative updates
- CLIENT_REQUEST - Client-requested changes

**Amendment Status:**
- PENDING - Awaiting review
- APPROVED - Approved and applied
- REJECTED - Rejected with reason

**Key Models:**
- `NoteAmendment` - Amendment records
- `NoteVersion` - Note version snapshots

**Key Files:**
- `packages/backend/src/controllers/amendment.controller.ts`
- `packages/backend/src/routes/amendment.routes.ts`
- `packages/frontend/src/pages/ClinicalNotes/AmendmentHistory.tsx`

**Compliance:**
- 42 CFR Part 2 compliant (substance abuse records)
- HIPAA amendment requirements
- Medical record integrity maintenance
- Complete audit trail

---

### Phase 2.1: Payer Policy Engine & Billing Readiness ✅
**Payer Management:** ✅
**Billing Rules Engine:** ✅
**Billing Holds:** ✅

Intelligent payer-specific billing rules engine with automated billing readiness checking.

**Features:**
- Payer configuration and management
- Payer-specific billing rules
- Credential-based billing validation
- Place of service validation
- Supervision requirement tracking
- Co-signature requirement validation
- Incident-to billing rules
- Billing hold placement and tracking
- Billing readiness checker
- Payer rule import/export
- Comprehensive payer dashboard

**Payer Types:**
- COMMERCIAL - Commercial insurance
- MEDICAID - State Medicaid
- MEDICARE - Federal Medicare
- EAP - Employee Assistance Programs
- SELF_PAY - Self-pay clients

**Validation Rules:**
- Clinician credential requirements
- Place of service restrictions
- Service type validation
- Supervision requirements (LAMFT, LAPC)
- Co-signature timeframe requirements
- Note completion timeframe
- Diagnosis requirements
- Treatment plan requirements
- Medical necessity documentation
- Prior authorization requirements

**Billing Hold Reasons:**
- MISSING_COSIGN - Requires supervisor co-signature
- PAYER_RULE_VIOLATION - Violates payer-specific rule
- MISSING_DIAGNOSIS - Missing required diagnosis
- MISSING_TREATMENT_PLAN - No active treatment plan
- PROHIBITED_SCENARIO - Payer prohibits this scenario
- LATE_COMPLETION - Note completed outside timeframe
- MISSING_PRIOR_AUTH - Prior authorization required

**Key Models:**
- `Payer` - Payer configuration
- `PayerRule` - Payer-specific billing rules
- `BillingHold` - Billing hold tracking

**Key Files:**
- `packages/backend/src/controllers/payer.controller.ts`
- `packages/backend/src/controllers/payerRule.controller.ts`
- `packages/backend/src/controllers/billingHold.controller.ts`
- `packages/backend/src/services/billingReadiness.service.ts`
- `packages/frontend/src/pages/Billing/PayerDashboard.tsx`
- `packages/frontend/src/pages/Billing/BillingReadinessChecker.tsx`
- `packages/frontend/src/pages/Billing/BillingHoldsList.tsx`

**Business Logic:**
- Automatic billing hold placement when rules are violated
- Real-time billing readiness checking
- Payer rule conflict detection
- Supervision requirement enforcement
- Co-signature timeframe tracking

---

## 🗄 Database Schema Overview

### Core Models (36 Tables Total)

#### User & Authentication (3 tables)
- `users` - User accounts and authentication
- `sessions` - Active user sessions
- `audit_logs` - System-wide audit trail

#### Client Management (3 tables)
- `clients` - Client demographics
- `emergency_contacts` - Emergency contact information
- `insurance` - Insurance policy information

#### Scheduling (2 tables)
- `appointments` - Appointment scheduling
- `availability` - Clinician availability

#### Clinical Documentation (4 tables)
- `clinical_notes` - All note types
- `diagnoses` - ICD-10 diagnosis codes
- `treatments` - Treatment interventions
- `goals` - Treatment goals

#### Electronic Signatures (2 tables)
- `signature_attestations` - Attestation templates
- `signature_events` - Signature records

#### Amendment History (2 tables)
- `note_amendments` - Amendment tracking
- `note_versions` - Note version history

#### Payer Policy Engine (3 tables)
- `payers` - Payer configuration
- `payer_rules` - Billing rules
- `billing_holds` - Billing hold tracking

#### Additional Features (17 tables)
- Practice settings, telehealth, client portal, messaging, documents, tasks, billing, reporting, etc.

### Key Relationships

```
User (1) ----< (*) Appointment
User (1) ----< (*) ClinicalNote
User (1) ----< (*) SignatureEvent

Client (1) ----< (*) Appointment
Client (1) ----< (*) ClinicalNote
Client (1) ----< (*) Insurance

Appointment (1) ----< (0..8) ClinicalNote (one per note type)

ClinicalNote (1) ----< (*) SignatureEvent
ClinicalNote (1) ----< (*) NoteAmendment
ClinicalNote (1) ----< (*) NoteVersion
ClinicalNote (1) ----< (*) BillingHold

Payer (1) ----< (*) PayerRule
PayerRule (1) ----< (*) BillingHold
```

---

## ⚙️ Environment Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL access (AWS RDS in production)
- Git

### Environment Variables

#### Backend `.env` (packages/backend/.env)
```env
# Database
DATABASE_URL=postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr

# Server
PORT=3001
NODE_ENV=development

# JWT
JWT_SECRET=<your-jwt-secret>
JWT_EXPIRES_IN=24h

# CORS (for local development)
CORS_ORIGIN=http://localhost:5175

# Admin User (for initial setup)
ADMIN_EMAIL=brendajb@chctherapy.com
ADMIN_PASSWORD=<admin-password>
```

#### Frontend `.env` (packages/frontend/.env)
```env
# API URL (local development)
VITE_API_URL=http://localhost:3001/api/v1

# For production build, use:
# VITE_API_URL=https://api.mentalspaceehr.com/api/v1
```

### Installation Steps

```bash
# 1. Clone repository
git clone https://github.com/MentalSpaceTherapy1/mentalspace-ehr-v2.git
cd mentalspace-ehr-v2

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Copy .env files to packages/backend and packages/frontend

# 4. Run database migrations
cd packages/database
npx prisma migrate deploy
npx prisma generate

# 5. Start development servers
# Terminal 1 - Backend
cd packages/backend
npm run dev

# Terminal 2 - Frontend
cd packages/frontend
npm run dev
```

---

## 📂 Key Files & Directories

### Configuration Files
- `package.json` - Workspace configuration
- `packages/backend/tsconfig.json` - Backend TypeScript config
- `packages/frontend/tsconfig.json` - Frontend TypeScript config
- `packages/frontend/vite.config.ts` - Vite build configuration
- `.claude/settings.local.json` - Claude Code settings

### Database
- `packages/database/prisma/schema.prisma` - **PRIMARY SCHEMA** (single source of truth)
- `packages/database/prisma/migrations/` - All database migrations

### Backend Core
- `packages/backend/src/index.ts` - Server entry point
- `packages/backend/src/routes/index.ts` - API route registry
- `packages/backend/src/middleware/auth.ts` - Authentication middleware

### Frontend Core
- `packages/frontend/src/main.tsx` - React entry point
- `packages/frontend/src/App.tsx` - Application routes
- `packages/frontend/src/components/Layout.tsx` - Main layout with navigation

### Documentation
- `README.md` - Project overview
- `PHASE-*.md` - Phase completion documentation
- `TESTING-SESSION-SUMMARY.md` - Testing documentation

### Test Scripts
- `test-phase1-features.js` - Phase 1 API tests
- `test-phase2-1-api.js` - Phase 2.1 API tests
- `seed-phase2-1-payer-rules.js` - Seed payer rules

---

## 🧪 Testing Strategy

### Manual Testing
- UI testing through browser
- API testing via test scripts
- Database validation

### Test Scripts
```bash
# Test Phase 1 features
node test-phase1-features.js

# Test Phase 2.1 payer engine
node test-phase2-1-api.js

# Seed payer rules
node seed-phase2-1-payer-rules.js
```

### Test User Credentials
- **Email:** brendajb@chctherapy.com
- **Password:** 38MoreYears!
- **Role:** ADMIN

### API Testing
- Base URL: https://api.mentalspaceehr.com/api/v1
- Authentication: JWT Bearer tokens
- Test token caching in `.test-token-cache.json`

---

## 🚢 Deployment Architecture

### Production Infrastructure (AWS)

#### Frontend
- **S3 Bucket:** mentalspaceehr-frontend
- **CloudFront Distribution:** E3AL81URAGOXL4
- **Domain:** mentalspaceehr.com, www.mentalspaceehr.com
- **SSL:** ACM certificate (auto-renewed)

#### Backend
- **ECS Cluster:** mentalspace-ehr-prod
- **Service:** Fargate tasks
- **ECR Repository:** mentalspace-backend
- **ALB:** Application Load Balancer with HTTPS
- **Domain:** api.mentalspaceehr.com
- **SSL:** ACM certificate (auto-renewed)

#### Database
- **RDS Instance:** mentalspace-ehr-prod
- **Engine:** PostgreSQL
- **Region:** us-east-1
- **Endpoint:** mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432

#### DNS (Route 53)
- **Hosted Zone:** mentalspaceehr.com
- **Records:**
  - mentalspaceehr.com → CloudFront (frontend)
  - www.mentalspaceehr.com → CloudFront (frontend)
  - api.mentalspaceehr.com → ALB (backend)

#### Registrar
- **Domain Registrar:** GoDaddy
- **Nameservers:** Pointing to Route 53

### Deployment Process

#### Frontend Deployment
```bash
# Build production frontend
cd packages/frontend
VITE_API_URL=https://api.mentalspaceehr.com/api/v1 npm run build

# Deploy to S3
aws s3 sync dist/ s3://mentalspaceehr-frontend --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E3AL81URAGOXL4 --paths "/*"
```

#### Backend Deployment
```bash
# Build Docker image
docker build -t mentalspace-backend -f packages/backend/Dockerfile .

# Tag image
docker tag mentalspace-backend:latest 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:latest

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 706704660887.dkr.ecr.us-east-1.amazonaws.com
docker push 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:latest

# Update ECS service (triggers rolling update)
aws ecs update-service --cluster mentalspace-ehr-prod --service mentalspace-backend --force-new-deployment
```

#### Database Migrations
```bash
# Run migrations on production
cd packages/database
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### Important Notes
- **GitHub Actions are currently disabled** due to workflow issues
- Deployments are manual until CI/CD is fixed
- Always test locally before deploying to production
- Database backups are automated via AWS RDS

---

## 📅 Next Steps & Roadmap

### Immediate Priorities
1. **Fix GitHub Actions** - Restore automated deployments
2. **Phase 2.2: Claims Management** - Electronic claims submission (837 format)
3. **Testing Suite** - Implement automated testing (Jest, Playwright)

### Phase 2.2: Claims Management (Planned)
- Electronic claims generation (837 format)
- Claim submission to clearinghouse
- Claim status tracking
- ERA (Electronic Remittance Advice) processing
- Denial management
- Claim scrubbing and validation

### Phase 2.3: Payment Posting (Planned)
- Payment posting and reconciliation
- EOB (Explanation of Benefits) processing
- Patient responsibility calculation
- Payment allocation
- Adjustment tracking

### Phase 3.0: Advanced Features (Planned)
- Advanced reporting and analytics
- Telehealth enhancements (video quality improvements)
- Client portal enhancements (secure messaging)
- Mobile app (React Native)
- Outcome measurement tools
- Treatment plan automation
- AI-assisted documentation

### Technical Debt
- [ ] Implement comprehensive unit tests (Jest)
- [ ] Implement E2E tests (Playwright)
- [ ] Set up automated database backups verification
- [ ] Implement rate limiting for API
- [ ] Add request validation middleware (Zod)
- [ ] Optimize database queries (add indexes)
- [ ] Implement caching layer (Redis)
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Security audit and penetration testing
- [ ] Performance optimization and load testing

---

## ⚠️ Important Notes

### Security Considerations
1. **Never commit `.env` files** - They contain sensitive credentials
2. **Database credentials** - Stored in AWS Secrets Manager (recommended)
3. **JWT secrets** - Use strong, random secrets in production
4. **CORS configuration** - Restrict to production domains only
5. **SQL injection prevention** - Prisma provides parameterized queries
6. **XSS prevention** - React escapes by default, but validate user input

### Database Best Practices
1. **Always use migrations** - Never modify schema.prisma without creating a migration
2. **Backup before migrations** - AWS RDS automated backups enabled
3. **Test migrations locally** - Before running on production
4. **Version control migrations** - All migrations are in git

### Development Workflow
1. **Branch strategy** - Currently using `master` branch (consider `main` and feature branches)
2. **Commit messages** - Use conventional commits format
3. **Pull requests** - Recommended for team collaboration
4. **Code review** - Recommended before merging

### Known Issues
1. **GitHub Actions broken** - Workflows disabled, manual deployment required
2. **CRLF warnings** - Windows line ending warnings (cosmetic, not critical)
3. **No automated tests** - Testing is currently manual

### Access & Credentials
- **Production Admin:** brendajb@chctherapy.com
- **AWS Account:** 706704660887
- **Region:** us-east-1 (US East - N. Virginia)
- **Database Password:** MentalSpace2024!SecurePwd

### Support & Documentation
- **GitHub Issues:** https://github.com/MentalSpaceTherapy1/mentalspace-ehr-v2/issues
- **Production URL:** https://mentalspaceehr.com
- **API Base URL:** https://api.mentalspaceehr.com/api/v1

---

## 🎓 For Claude Code: Quick Start Context

When you (Claude Code) start working on this project on a new machine, here's what you need to know:

### Current State
- **Latest commit:** Phase 2.1 Payer Policy Engine complete
- **Working branch:** master
- **All code is committed and pushed**
- **Production is deployed and running**

### What's Been Built
You've helped build a comprehensive EHR system with:
- Full user authentication and authorization
- Client management system
- Appointment scheduling
- 8 types of clinical notes with structured templates
- Electronic signature system with jurisdiction-specific attestations
- Amendment history and version control for notes
- Payer policy engine with intelligent billing rules
- Billing hold tracking and readiness checking

### Architecture Patterns
- **Monorepo:** Using npm workspaces
- **API Pattern:** RESTful with Express controllers/services/routes
- **Frontend Pattern:** React components with context API for state
- **Database Pattern:** Prisma ORM with migrations
- **Auth Pattern:** JWT tokens with role-based access control

### Where Files Are Located
- **Database schema:** `packages/database/prisma/schema.prisma` (single source of truth)
- **API routes:** `packages/backend/src/routes/`
- **Controllers:** `packages/backend/src/controllers/`
- **Services:** `packages/backend/src/services/` (business logic here)
- **Frontend pages:** `packages/frontend/src/pages/`
- **Frontend components:** `packages/frontend/src/components/`

### Common Tasks
```bash
# Start dev servers
cd packages/backend && npm run dev  # Backend on :3001
cd packages/frontend && npm run dev  # Frontend on :5175

# Database operations
cd packages/database
npx prisma migrate dev --name <migration_name>  # Create migration
npx prisma migrate deploy  # Apply migrations
npx prisma generate  # Regenerate Prisma client
npx prisma studio  # Open database GUI

# Build for production
cd packages/frontend && npm run build  # Creates dist/
cd packages/backend && npm run build   # Compiles TypeScript
```

### What to Do Next
1. Review `PHASE-2.1-SESSION-SUMMARY.md` for recent work details
2. Check `PHASE-2.1-IMPLEMENTATION-PROGRESS.md` for implementation notes
3. Look at git log for recent changes: `git log --oneline -10`
4. Ask the user what they want to work on next

### Key Conventions
- **TypeScript:** Strict mode enabled, use types everywhere
- **Error handling:** Try/catch in controllers, services throw errors
- **API responses:** Consistent format `{ data, error, message }`
- **Validation:** Zod schemas in backend, client-side validation in frontend
- **Dates:** Store as ISO strings, display with date-fns
- **IDs:** UUIDs for all primary keys

---

## 📞 Contact & Support

**Project Owner:** Community Health & Counseling (CHC) Therapy
**Technical Contact:** Brenda Johnson-Byers (brendajb@chctherapy.com)
**Repository:** https://github.com/MentalSpaceTherapy1/mentalspace-ehr-v2

---

**End of Onboarding Package** ✅

*This document is maintained by Claude Code and should be updated as the project evolves.*
