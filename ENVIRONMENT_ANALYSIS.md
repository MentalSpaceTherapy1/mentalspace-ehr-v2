# MentalSpace EHR Environment Analysis

## Summary
**You are correct!** We've been deploying to a PRODUCTION environment that has minimal/old data. There's a separate DEVELOPMENT environment with your test data.

---

## Database Comparison

### PRODUCTION DATABASE
- **Endpoint**: `mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com`
- **Created**: Oct 20, 2025
- **Data**:
  - Clients: **3**
  - Users: **2**
  - Appointments: **4**
  - Therapists/Clinicians: **1**
- **Status**: Nearly EMPTY - this appears to be the older/wrong database

### DEVELOPMENT DATABASE
- **Endpoint**: `mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com`
- **Created**: Oct 13, 2025 (OLDER than prod!)
- **Data**:
  - Clients: **14**
  - Users: **7**
  - Appointments: **30**
  - Therapists/Clinicians: **2**
- **Status**: Has your TEST DATA - this is the active development database

---

## Infrastructure Layout

### ECS Clusters & Services

**Production Cluster**: `mentalspace-ehr-prod`
- Service: `mentalspace-backend`
- Database: `mentalspace-ehr-prod` (nearly empty)
- Load Balancer: `mentalspace-alb` → `mentalspace-alb-614724140.us-east-1.elb.amazonaws.com`

**Development Cluster**: `mentalspace-ehr-dev`
- Service: `mentalspace-backend-dev`
- Database: `mentalspace-db-dev` (with test data)
- Load Balancer: `mentalspace-ehr-dev` → `mentalspace-ehr-dev-881286108.us-east-1.elb.amazonaws.com`

### Frontend

**Production Frontend**:
- S3 Bucket: `mentalspaceehr-frontend`
- CloudFront Distribution: `E3AL81URAGOXL4`
- Domain: `www.mentalspaceehr.com`
- API Endpoint: `https://api.mentalspaceehr.com/api/v1`
- **Points to**: Production backend (empty database)

**Development Frontend**:
- S3 Buckets: `mentalspace-ehr-frontend-dev`, `mentalspace-frontend-dev`, `mentalspace-portal-dev`
- **Likely points to**: Development backend (with test data)

---

## What Happened

1. **The DEVELOPMENT database** (`mentalspace-db-dev`) was created FIRST (Oct 13, 2025)
   - This is where you've been adding test clients, users, appointments
   - This has 14 clients, 7 users, 30 appointments

2. **The PRODUCTION database** (`mentalspace-ehr-prod`) was created LATER (Oct 20, 2025)
   - This was likely meant to be the "clean" production database
   - It only has 3 clients, 2 users, 4 appointments
   - This is what `www.mentalspaceehr.com` is currently using

3. **All our recent deployments** went to:
   - ✅ Frontend: `mentalspaceehr-frontend` S3 bucket (production)
   - ✅ Backend: `mentalspace-ehr-prod` ECS cluster (production)
   - ✅ Database: `mentalspace-ehr-prod` RDS (production - EMPTY!)

---

## Current Production Status

**www.mentalspaceehr.com** (what users see):
```
Frontend (CloudFront/S3)
    ↓
API (api.mentalspaceehr.com)
    ↓
Production Backend (ECS: mentalspace-backend)
    ↓
Production Database (mentalspace-ehr-prod)
    └─ 3 clients, 2 users, 4 appointments ❌ MINIMAL DATA
```

**Development Environment** (where your test data lives):
```
Dev Frontend (unknown URL)
    ↓
Dev API (unknown URL)
    ↓
Dev Backend (ECS: mentalspace-backend-dev)
    ↓
Dev Database (mentalspace-db-dev)
    └─ 14 clients, 7 users, 30 appointments ✅ TEST DATA
```

---

## Recommendations

### Option 1: Migrate Dev Data to Production
Copy the dev database content to production database:
```bash
# Dump dev database
pg_dump -h mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com \\
  -U mentalspace_admin -d mentalspace_ehr > dev_backup.sql

# Restore to production
psql -h mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com \\
  -U mentalspace_admin -d mentalspace_ehr < dev_backup.sql
```

### Option 2: Point Production to Dev Database
Update the production backend to use the dev database (temporary):
- Update ECS task definition for `mentalspace-backend`
- Change `DATABASE_URL` to point to `mentalspace-db-dev`
- Deploy updated task definition

### Option 3: Find Dev Frontend URL
- Locate where the development frontend is hosted
- Use that as the primary testing environment
- Keep production as is for real client data

---

## Files Created for Analysis
- `check-db-data.js` - Script to compare database contents
- Can be deleted after investigation complete

---

## Next Steps

**Which option do you prefer?**
1. Migrate dev data to production (recommended if dev has the correct data)
2. Point production backend to dev database (quick fix)
3. Keep them separate and find dev frontend URL
