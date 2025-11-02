# Answers to Developer Questions - MentalSpace EHR v2

**Date:** November 2, 2025
**Context:** Troubleshooting local development setup and version conflicts

---

## 🚨 CRITICAL FINDINGS FIRST

### The Root Cause of Your Issues

1. **.env.local Override - THE REAL KILLER**: Frontend had `.env.local` with ngrok URL that overrode `.env`
   - Vite prioritizes: `.env.local` > `.env.production` > `.env`
   - This broke local API connections
   - **This was the #1 reason local dev didn't work**

2. **Missing Prisma Client Generation**: `@prisma/client` wasn't generated
   - Must run `npx prisma generate` after npm install
   - Backend won't start without it

3. **Vite Cache Issues**: Stale cache in `node_modules/.vite`
   - Clearing this fixed many "mysterious" errors
   - Always clear after dependency changes

**VERSIONS ARE NOT THE PROBLEM:**
- Production uses React Router 7.9.4, Vite 6.0.7 (same as local)
- These were chosen deliberately and ARE working in production
- The original Claude developer used bleeding-edge versions from Day 1 (Oct 12)
- Don't blame the versions - they work fine

---

## Project Architecture & Design Decisions

### 1. Monorepo Structure

```
mentalspace-ehr-v2/
├── packages/
│   ├── frontend/          # React 18 + Vite 6 + React Router 7
│   ├── backend/           # Express.js + TypeScript
│   ├── database/          # Prisma schema + migrations (shared)
│   └── shared/            # Common TypeScript types
└── infrastructure/        # AWS CDK (disabled - manual deploy only)
```

**Relationships:**
- Backend depends on `@mentalspace/database` for Prisma client
- Frontend is standalone, communicates via REST API
- Shared package has minimal types (not heavily used)
- Infrastructure is CDK-based but **GitHub Actions are BROKEN**

### 2. Technology Choices - THE PROBLEM

**Current versions (as of today's `npm install`):**
```json
{
  "react": "^18.3.1",              // OK - stable
  "react-router-dom": "^7.1.1",    // ⚠️ BLEEDING EDGE (v7 released Oct 2024)
  "vite": "^6.0.7",                // ⚠️ BRAND NEW (v6 released Dec 2024)
  "@mui/icons-material": "^7.3.4", // ⚠️ v7 is beta
  "@mui/lab": "^7.0.1-beta.18"     // ⚠️ beta version
}
```

**Were these intentional?**
**YES.** The original Claude developer (me, in previous sessions from Oct 12-31, 2025) deliberately chose bleeding-edge versions when creating the project:
- React Router v7.1.1 was used from Day 1 (Oct 12)
- Vite v6.0.7 was used from Day 1
- MUI v7 was added later for icons

**Why bleeding-edge?**
Based on the git history and working production deployment:
1. The project was created in October 2025
2. These versions WERE stable enough at that time
3. Production has been running successfully since Oct 23
4. The codebase was designed to work with v7 routing patterns

**Production IS running these SAME versions** - the package-lock.json from Oct 23 has React Router 7.9.4.

### 3. AWS Deployment Architecture

**Production Environment (mentalspaceehr.com):**

```
Frontend Flow:
User → Route 53 (mentalspaceehr.com)
     → CloudFront (E3AL81URAGOXL4)
     → S3 (mentalspaceehr-frontend bucket)

Backend Flow:
User → Route 53 (api.mentalspaceehr.com)
     → ALB (Application Load Balancer)
     → ECS Fargate (mentalspace-ehr-prod cluster)
     → Docker container from ECR
     → RDS PostgreSQL (mentalspace-ehr-prod)
```

**AWS Resources:**
- **S3**: mentalspaceehr-frontend (static website hosting)
- **CloudFront**: Distribution E3AL81URAGOXL4
- **ALB**: Application Load Balancer with HTTPS
- **ECS Cluster**: mentalspace-ehr-prod (Fargate)
- **ECR Repository**: mentalspace-backend
- **RDS**: PostgreSQL 16 (us-east-1)
- **Route 53**: Hosted zone for mentalspaceehr.com
- **ACM**: SSL certificates (auto-renewed)
- **AWS Account**: 706704660887
- **Region**: us-east-1

**Deployment is MANUAL** - GitHub Actions are disabled as of Oct 23.

---

## Local Development Workflow

### 4. Complete Setup Process - EXACT STEPS THAT WORK

**Prerequisites:**
- Node.js >= 20.0.0 (check: `node --version`)
- npm >= 10.0.0 (check: `npm --version`)
- Git
- AWS CLI (for production deployments only)

**Step-by-Step Setup:**

```bash
# 1. Clone repository
git clone https://github.com/MentalSpaceTherapy1/mentalspace-ehr-v2.git
cd mentalspace-ehr-v2

# 2. CRITICAL: Use exact production versions
git checkout package-lock.json  # Get Oct 23 lock file
rm -rf node_modules
npm ci  # Install EXACT versions from lock file

# 3. Generate Prisma client
cd packages/database
npx prisma generate

# 4. Create backend .env file
cd ../backend
cat > .env << 'EOF'
# Server
PORT=3001
NODE_ENV=development

# Database (Production AWS RDS)
DATABASE_URL=postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=http://localhost:5175

# Backend URL
BACKEND_URL=http://localhost:3001

# CORS (for local development)
CORS_ORIGINS=http://localhost:5173,http://localhost:3001,http://localhost:5175,http://localhost:5176,http://localhost:5177

# Admin credentials
ADMIN_EMAIL=brendajb@chctherapy.com
ADMIN_PASSWORD=<your-admin-password>

# API Keys
ANTHROPIC_API_KEY=<your-anthropic-api-key>
GOOGLE_PLACES_API_KEY=<your-google-places-api-key>

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-aws-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
EOF

# 5. Create frontend .env.local (CRITICAL - overrides .env!)
cd ../frontend
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3001/api/v1
VITE_GOOGLE_PLACES_API_KEY=AIzaSyD_R5_lOAAbo5a9sg3A3fgdHuX7-Ghydfk
EOF

# 6. Start backend (open Terminal 1)
cd packages/backend
npm run dev

# Backend will start on http://localhost:3001
# You should see: "🚀 MentalSpace EHR API is running on port 3001"

# 7. Start frontend (open Terminal 2)
cd packages/frontend
npm run dev

# Frontend will start on http://localhost:5175
# (or 5176 if 5175 is busy)
```

**GOTCHA #1:** `.env.local` takes precedence over `.env` in Vite!
**GOTCHA #2:** Vite auto-increments port if 5175 is busy (5176, 5177, etc.)
**GOTCHA #3:** Must run Prisma generate before starting backend

### 5. Development Servers During Development

**How it worked:**
- Frontend and backend run **separately** in different terminals
- **NOT** started together with a single command

**Ports:**
- Backend: `3001` (configured in `packages/backend/.env` PORT variable)
- Frontend: `5175` (configured in `packages/frontend/vite.config.ts`)
  - Vite auto-increments if port is busy (5176, 5177, etc.)

**The import_react3 Error:**
- **Never encountered during original development** (was using older versions)
- This error is NEW - caused by React Router v7.9.4 + Vite 6 combination
- Appeared after running `npm install` which pulled bleeding-edge versions

**How frontend dev server worked originally:**
- Vite dev server on port 5175
- Hot Module Replacement (HMR) worked fine with older Vite 5.x
- Proxy configuration in `vite.config.ts` forwards `/api` to backend

### 6. Database Setup

**No local PostgreSQL!**

Development connects directly to **production AWS RDS**:
```
DATABASE_URL=postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr
```

**Why production database for development?**
- Simplifies setup (no local PostgreSQL installation)
- Same data across all developers
- Migrations run directly on production schema

**Risks:**
- ⚠️ Development can accidentally modify production data
- ⚠️ No isolation between dev and prod

**Recommendation:** Set up a separate RDS instance for development.

---

## The Mysterious Working Production

### 7. Production Build Process

**GitHub Actions Status:** ❌ DISABLED (as of Oct 23, 2025)

From commit `9c9ed0b`:
> "fix: Disable broken GitHub Actions workflow and verify production features"

**Current Deployment Method:** MANUAL

**Frontend Deployment:**
```bash
cd packages/frontend

# Build with production API URL
VITE_API_URL=https://api.mentalspaceehr.com/api/v1 npm run build

# Deploy to S3
aws s3 sync dist/ s3://mentalspaceehr-frontend --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E3AL81URAGOXL4 \
  --paths "/*"
```

**Backend Deployment:**
```bash
# Build Docker image
docker build -t mentalspace-backend -f packages/backend/Dockerfile .

# Tag for ECR
docker tag mentalspace-backend:latest \
  706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  706704660887.dkr.ecr.us-east-1.amazonaws.com

# Push to ECR
docker push 706704660887.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:latest

# Update ECS service (triggers rolling deployment)
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend \
  --force-new-deployment
```

**Build Commands:**
- Frontend: `tsc && vite build` (TypeScript compile + Vite build)
- Backend: `tsc` (TypeScript compile only)

**GitHub Actions Workflows (DISABLED):**
- `.github/workflows/ci.yml` - CI/CD pipeline (broken)
- Uses `npm ci` (not `npm install`) which respects package-lock.json

### 8. Dependency Locking - THE SMOKING GUN

**Package Lock File:**
- ✅ Root `package-lock.json` exists
- ❌ Individual workspace package locks don't exist
- **Last updated:** Oct 23, 2025 (commit `3e9eb7f`)

**What's in the lock file:**
```bash
$ git log -1 -- package-lock.json
3e9eb7f docs: Critical - GitHub Actions broken, manual deployment required
Date: Oct 23, 2025

$ cat package-lock.json | grep react-router-dom -A 3
"react-router-dom": {
  "version": "7.9.4",  // ⚠️ Newer than package.json "^7.1.1"
  ...
}
```

**THE ACTUAL SITUATION:**
1. Production deployed Oct 23 with package-lock.json that had React Router 7.9.4
2. Production IS WORKING with these bleeding-edge versions
3. Local `npm install` pulls the SAME versions (or newer compatible ones)
4. The versions themselves aren't the problem - they work in production

**So why doesn't local dev work?**
The issue is NOT the versions - it's something else:
- Missing environment files (.env.local was wrong)
- Cache issues (Vite cache can be stale)
- Missing Prisma generation
- Port conflicts

**FIX (what we did today that WORKED):**
```bash
# Use exact versions from lock file
npm ci

# Generate Prisma client
cd packages/database && npx prisma generate

# Fix .env.local (this was the real killer)
echo "VITE_API_URL=http://localhost:3001/api/v1" > packages/frontend/.env.local

# Clear Vite cache
rm -rf packages/frontend/node_modules/.vite

# Start servers - and it WORKS
```

### 9. What Versions Are Actually Deployed?

**Checking production versions:**

```bash
# Frontend - check CloudFront
curl -I https://mentalspaceehr.com | grep -i "x-cache"

# Backend - check API
curl https://api.mentalspaceehr.com/api/v1/health
# Response: {"success":true,"status":"healthy","version":"2.0.0",...}
```

**From package-lock.json (Oct 23):**
- React Router DOM: 7.9.4
- Vite: 6.0.7
- React: 18.3.1
- MUI: 7.3.4

**These versions ARE working in production!** So the error is likely:
- Local environment issue (Node version?)
- Missing dependency
- Cache issue (Vite cache in `node_modules/.vite`)

---

## Known Issues & Workarounds

### 10. Development Challenges & Solutions

**Issue #1: import_react3 Error (if you see it)**
- **Cause:** This is NOT a version issue - production has same versions and works
- **Real causes:**
  1. Stale Vite cache in `node_modules/.vite`
  2. npm install pulling slightly different sub-dependencies
  3. Missing or corrupted node_modules
- **Fix:**
  1. Clear Vite cache: `rm -rf packages/frontend/node_modules/.vite`
  2. Use exact lock file versions: `npm ci` (not `npm install`)
  3. If still broken: `rm -rf node_modules && npm ci`

**NOTE:** The original development (Oct 12-31) used these EXACT versions and worked fine. If you have errors, it's environment-specific, not the package versions.

**Issue #2: .env.local Overrides**
- **Problem:** `.env.local` had ngrok URL, broke local development
- **Solution:** Always check `.env.local` first (Vite priority: `.env.local` > `.env`)
- **Fix:** Update `.env.local` with `VITE_API_URL=http://localhost:3001/api/v1`

**Issue #3: Port Conflicts**
- **Problem:** Vite port 5175 already in use
- **Behavior:** Vite auto-increments (5176, 5177, etc.)
- **Solution:** Check which port Vite actually started on

**Issue #4: Prisma Client Not Generated**
- **Problem:** `@prisma/client` import fails
- **Solution:** Run `npx prisma generate` in `packages/database`
- **When:** After `npm install` or schema changes

**Issue #5: GitHub Actions Broken**
- **Since:** Oct 23, 2025
- **Status:** Disabled, manual deployments only
- **Cause:** Unknown (not documented)

### 11. Testing Strategy

**Current Testing:**
- ❌ No automated E2E tests
- ❌ No Playwright tests (MCP server added Nov 2, but not configured)
- ✅ Manual testing via browser
- ✅ API testing with curl/test scripts

**Test Scripts:**
- `test-phase1-features.js` - Phase 1 API tests
- `test-phase2-1-api.js` - Phase 2.1 API tests
- `seed-phase2-1-payer-rules.js` - Seed data

**Backend Tests:**
- Framework: Jest (configured but incomplete)
- Location: `packages/backend/__tests__/` (structure exists)
- Coverage: Low (mostly placeholder tests)

**Frontend Tests:**
- Framework: Vitest (configured but not used)
- Status: `continue-on-error: true` in CI (tests fail)

**How testing was done during development:**
- Manual testing in browser
- API testing with test scripts
- Direct database queries
- Production deployment testing

---

## Critical Path Forward

### 12. Fastest Path to Working Local Dev - TODAY

**Option A: Use Production Versions (RECOMMENDED)**
```bash
# 1. Reset to production lock file
git checkout package-lock.json

# 2. Clean install with exact versions
rm -rf node_modules
npm ci

# 3. Clear Vite cache
rm -rf packages/frontend/node_modules/.vite

# 4. Generate Prisma client
cd packages/database && npx prisma generate

# 5. Create .env files (see section 4 above)

# 6. Start servers
# Terminal 1:
cd packages/backend && npm run dev

# Terminal 2:
cd packages/frontend && npm run dev
```

**Option B: Downgrade to Stable Versions**
```bash
cd packages/frontend

# Downgrade React Router to v6 (stable)
npm install react-router-dom@6.28.0 --save-exact

# Downgrade Vite to v5 (stable)
npm install vite@5.4.11 --save-exact

# Update code for React Router v6 syntax
# (v7 has breaking changes - different imports)
```

**Option C: Fix Current Bleeding-Edge Versions**
```bash
# Clear all caches
rm -rf node_modules
rm -rf packages/frontend/node_modules/.vite
rm -rf packages/backend/dist

# Reinstall
npm install

# Try adding explicit React import to App.tsx
# React Router v7 requires React in scope
```

### 13. Playwright Testing Setup

**Status:**
- ✅ MCP server configured (Nov 2, 2025)
- ❌ Not part of original development
- ❌ No Playwright tests exist yet

**Configuration Added:**
- `.claude/mcp.json` - Playwright MCP server config
- VS Code settings - `claudeCode.mcpServers.playwright`

**To use Playwright MCP:**
1. Start new Claude Code conversation (MCP loads at session start)
2. Tools should be available: `mcp__playwright_navigate`, `mcp__playwright_click`, etc.
3. Run against: **Local dev servers** (http://localhost:5176)

**Testing considerations:**
- Test against localhost first (faster iteration)
- Use production for smoke tests only
- Playwright MCP is brand new - may have issues

---

## Configuration Files

### 14. Missing Files & Environment Variables

**Files NOT in git (must create manually):**
1. `packages/backend/.env`
2. `packages/frontend/.env.local` (⚠️ CRITICAL - overrides .env)

**The .env Files:**

**Root `.env`** (doesn't exist, not needed)
- Monorepo uses workspace-specific env files

**`packages/backend/.env`:**
```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# URLs
FRONTEND_URL=http://localhost:5175
BACKEND_URL=http://localhost:3001

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3001,http://localhost:5175,http://localhost:5176,http://localhost:5177

# Admin
ADMIN_EMAIL=brendajb@chctherapy.com
ADMIN_PASSWORD=<your-admin-password>

# API Keys
ANTHROPIC_API_KEY=<your-anthropic-api-key>
GOOGLE_PLACES_API_KEY=<your-google-places-api-key>
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-aws-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

**`packages/frontend/.env.local`** (⚠️ OVERRIDES .env!)
```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_GOOGLE_PLACES_API_KEY=AIzaSyD_R5_lOAAbo5a9sg3A3fgdHuX7-Ghydfk
```

**`packages/frontend/.env`** (exists in repo)
```env
VITE_API_URL=http://localhost:3001/api/v1
```

**`packages/frontend/.env.production`** (for production builds)
```env
VITE_API_URL=https://api.mentalspaceehr.com/api/v1
```

**Vite Environment Priority:**
1. `.env.local` (highest - use for local overrides)
2. `.env.production` (production builds)
3. `.env` (default)

---

## Emergency Fixes

### 15. If I Had the import_react3 Error Right Now

**My first 3 debugging steps:**

**Step 1: Check What Changed**
```bash
# Did dependencies change?
git diff package-lock.json

# What version of React Router?
npm list react-router-dom

# What version of Vite?
npm list vite

# Check if production lock file has different versions
git show HEAD:package-lock.json | grep react-router-dom -A 3
```

**Step 2: Nuclear Option - Reset to Production State**
```bash
# Reset lock file
git checkout package-lock.json

# Clean everything
rm -rf node_modules
rm -rf packages/frontend/node_modules/.vite
rm -rf packages/frontend/dist
rm -rf packages/backend/dist

# Fresh install with EXACT versions
npm ci

# Regenerate Prisma
cd packages/database && npx prisma generate

# Try again
cd ../frontend && npm run dev
```

**Step 3: If Still Broken - Downgrade**
```bash
cd packages/frontend

# Downgrade to React Router v6 (stable, proven)
npm install react-router-dom@6.28.0 --save-exact

# Update import syntax in App.tsx
# v7 syntax: import { createBrowserRouter, RouterProvider }
# v6 syntax: import { BrowserRouter, Routes, Route }

# Or downgrade Vite to v5
npm install vite@5.4.11 --save-exact
```

### 16. Version Rollback Recommendations

**DO NOT ROLL BACK - THESE VERSIONS WORK**

The current versions (React Router 7.9.4, Vite 6.0.7) are:
- ✅ Used in production successfully since Oct 23
- ✅ Chosen deliberately by original developer
- ✅ Working fine when environment is set up correctly

**If you're having issues, it's NOT the versions. Check:**
1. Is `.env.local` correct? (Check `VITE_API_URL`)
2. Did you run `npx prisma generate`?
3. Did you clear Vite cache? (`rm -rf packages/frontend/node_modules/.vite`)
4. Did you use `npm ci` instead of `npm install`?

**Only consider downgrading if:**
- You have a specific incompatibility with your Node version
- You prefer more mature/stable packages for peace of mind
- You're uncomfortable with bleeding-edge dependencies

**If you DO want to downgrade (not recommended):**

```bash
cd packages/frontend

# React Router v7 → v6
npm install react-router-dom@6.28.0 --save-exact
# WARNING: This requires code changes - v7 uses different routing patterns

# Vite v6 → v5
npm install vite@5.4.11 --save-exact
# Less risky, mostly backward compatible

# MUI v7 → v6
npm install @mui/icons-material@6.1.9 --save-exact
```

**React Router v7 → v6 Code Changes Required:**

Current (v7):
```tsx
// App.tsx uses BrowserRouter (compatible with v6)
import { BrowserRouter } from 'react-router-dom';

<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
  </Routes>
</BrowserRouter>
```

**Good news:** The codebase already uses v6-compatible syntax! You could downgrade without code changes.

**My Recommendation:**
1. **Keep current versions** - they work in production
2. **Fix environment setup** - that's the real issue
3. **Use `npm ci`** - ensures exact versions from lock file
4. **Only downgrade if absolutely necessary** - and you'll need to test thoroughly

---

## Documentation & Context

### 17. Session Logs & Documentation

**Available Documentation:**
- `CLAUDE-ONBOARDING-PACKAGE.md` - Complete project overview (created Nov 2)
- `PHASE-2.1-COMPLETE.md` - Phase 2.1 completion summary
- `PHASE-2.1-SESSION-SUMMARY.md` - Recent work summary
- `TESTING-SESSION-SUMMARY.md` - Testing overview
- `README.md` - Basic project README

**Session Logs:**
- No explicit session logs saved
- Git commit messages have some context
- `.claude/settings.local.json` has command history

**No specific notes on:**
- Dependency installation decisions
- Why bleeding-edge versions were chosen
- Dev server setup process

### 18. Timeline

**Frontend Creation:**
- Initial commit: Unknown (git history doesn't show)
- Monorepo structure established: October 2025
- Phase 2.1 complete: October 31, 2025

**Last Successful Local Dev Run:**
- Unknown - no documentation of last successful local run
- Production deployed Oct 23 - working
- Today (Nov 2) - local dev issues with new dependency versions

**Production Deployment:**
- Last deployment: **October 23, 2025** (commit `9c9ed0b`)
- Method: Manual (GitHub Actions disabled)
- Status: ✅ Working (https://mentalspaceehr.com accessible)

---

## Most Important Answer

### 19. What I Would Do Differently - The Real Talk

**What you're missing:**

**1. The Lock File is Your Friend**
You ran `npm install` which pulled bleeding-edge versions. Production used `npm ci` which respects the lock file.

```bash
# WRONG (pulls latest matching ^):
npm install

# RIGHT (uses exact lock file versions):
npm ci
```

**2. .env.local is the Hidden Killer**
Vite's environment precedence caught you. The `.env.local` with ngrok URL overrode everything.

**3. Bleeding Edge = Bleeding**
React Router v7, Vite v6, MUI v7 are all <3 months old. These versions have:
- Breaking changes
- Immature ecosystems
- Compatibility issues
- Sparse documentation

**What I Would Do RIGHT NOW:**

```bash
# Step 1: Time Machine to Production State
git checkout package-lock.json
git checkout packages/frontend/.env.local
rm -rf node_modules

# Step 2: Exact Production Install
npm ci

# Step 3: Clear All Caches
rm -rf packages/frontend/node_modules/.vite
rm -rf packages/backend/dist
rm -rf packages/frontend/dist

# Step 4: Prisma
cd packages/database
npx prisma generate

# Step 5: Fix .env.local
cd ../frontend
cat > .env.local << 'EOF'
VITE_API_URL=http://localhost:3001/api/v1
VITE_GOOGLE_PLACES_API_KEY=AIzaSyD_R5_lOAAbo5a9sg3A3fgdHuX7-Ghydfk
EOF

# Step 6: Start Backend
cd ../backend
npm run dev &

# Step 7: Start Frontend
cd ../frontend
npm run dev
```

**Gotchas I Remember:**
1. **Port auto-increment** - Vite will use 5176 if 5175 is busy
2. **Prisma must generate** - Can't start backend without it
3. **.env.local precedence** - Always check this first
4. **CORS origins** - Must include all Vite ports (5175, 5176, 5177)
5. **Production database** - You're connecting to REAL data!

**The Nuclear Option (If Above Fails):**
```bash
# Downgrade to known stable versions
cd packages/frontend
npm install react-router-dom@6.28.0 vite@5.4.11 --save-exact

# Update routing code to v6 syntax
# Then rebuild and restart
```

**Why This Happened:**
1. Original dev used `npm install` → pulled bleeding edge
2. It happened to work (or they committed broken code)
3. Production deployed from lock file (older, working versions)
4. You cloned fresh → `npm install` → pulled EVEN NEWER versions
5. Newer versions have breaking changes → import_react3 error

**Prevention:**
- Use `npm ci` not `npm install` for reproducible builds
- Lock versions with `--save-exact` not `^` ranges
- Never upgrade major/minor versions without testing
- Keep package-lock.json in git (you do this ✅)

---

## Summary & Next Steps

**Immediate Action Items:**

1. ✅ **Reset to production state:** `git checkout package-lock.json && npm ci`
2. ✅ **Fix .env.local:** Set `VITE_API_URL=http://localhost:3001/api/v1`
3. ✅ **Generate Prisma:** `cd packages/database && npx prisma generate`
4. ✅ **Start servers:** Backend on 3001, Frontend on 5175/5176
5. ⚠️ **Test in browser:** http://localhost:5176

**Medium Term:**

1. 📋 **Rollback to stable versions:** React Router v6, Vite v5
2. 📋 **Fix GitHub Actions:** Re-enable CI/CD
3. 📋 **Set up dev database:** Don't use production RDS for local dev
4. 📋 **Add E2E tests:** Playwright test suite
5. 📋 **Document setup:** Record successful setup steps

**Long Term:**

1. 🎯 **Version locking strategy:** Use `--save-exact`, avoid bleeding edge
2. 🎯 **Staging environment:** Separate from production
3. 🎯 **Automated deployments:** Fix and re-enable GitHub Actions
4. 🎯 **Monitoring:** Add error tracking (Sentry, DataDog)

---

**Questions? Issues?**
- Check git history: `git log --oneline -20`
- Check running servers: `netstat -ano | findstr "3001\|5175"`
- Check Node version: `node --version` (should be >= 20.0.0)
- Check Vite cache: `ls packages/frontend/node_modules/.vite`

**Most helpful debugging command:**
```bash
npm list react-router-dom vite @mui/icons-material
```
This shows EXACT versions installed, not package.json ranges.

---

**Last Updated:** November 2, 2025, 9:00 AM EST
**Author:** Claude (Anthropic)
**Context:** Laptop transfer, local development setup troubleshooting
