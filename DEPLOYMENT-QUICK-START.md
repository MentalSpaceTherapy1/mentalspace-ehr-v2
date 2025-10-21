# MentalSpace EHR - Deployment Quick Start

**Get your first production deployment running in 10 minutes**

---

## ⚡ Quick Start (3 Steps)

### Step 1: Configure GitHub Secrets (2 minutes)

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

   **Secret 1:**
   - Name: `AWS_ACCESS_KEY_ID`
   - Value: Your AWS access key ID

   **Secret 2:**
   - Name: `AWS_SECRET_ACCESS_KEY`
   - Value: Your AWS secret access key

### Step 2: Make Scripts Executable (1 minute)

```bash
# In Git Bash or terminal
cd c:/Users/Elize/mentalspace-ehr-v2

# Make deployment scripts executable
chmod +x ops/release_backend.sh
chmod +x ops/smoke-tests.sh
```

### Step 3: Deploy! (Choose One)

**Option A: Automatic Deployment (Recommended)**

Just push your code to master:
```bash
git add .
git commit -m "feat: enable automated deployments"
git push origin master
```

GitHub Actions will automatically:
- Build Docker image with Git SHA
- Push to ECR
- Deploy to ECS
- Run smoke tests
- Report results

**Watch progress:**
1. Go to GitHub **Actions** tab
2. Click on the running workflow
3. Watch real-time deployment logs

---

**Option B: Manual Deployment**

Run the deployment script:
```bash
./ops/release_backend.sh
```

The script will:
- Check Git status
- Build and push Docker image
- Deploy to ECS
- Run smoke tests
- Generate deployment report

---

## ✅ Verify Deployment

After deployment completes (usually 5-10 minutes), verify it worked:

**1. Check Version Endpoint**
```bash
curl https://api.mentalspaceehr.com/api/v1/version
```

Expected output:
```json
{
  "gitSha": "your-commit-sha",
  "buildTime": "2025-01-21T...",
  "service": "mentalspace-backend",
  "version": "2.0.0"
}
```

**2. Run Smoke Tests**
```bash
./ops/smoke-tests.sh
```

Expected output:
```
[PASS] All tests passed!
```

**3. Check Deployment Report** (Manual deployment only)
```bash
# List reports
ls -lh ops/deployment-reports/

# View latest report
cat ops/deployment-reports/deployment-*.md
```

---

## 📊 What Just Happened?

Your deployment:

1. ✅ Built a Docker image with your Git SHA baked in
2. ✅ Pushed to ECR with an immutable digest
3. ✅ Created a new ECS task definition
4. ✅ Deployed to production with zero downtime
5. ✅ Ran health checks at container and ALB levels
6. ✅ Ran 10 smoke tests to verify everything works
7. ✅ Generated a deployment report with full audit trail

If anything failed, it automatically rolled back to the previous version.

---

## 🚀 Daily Usage

### Regular Deployments

**If using automated deployments:**
```bash
# Make your changes
git add .
git commit -m "feat: your feature"
git push origin master

# GitHub Actions deploys automatically
```

**If using manual deployments:**
```bash
# Make your changes
git add .
git commit -m "feat: your feature"
git push origin master

# Deploy manually
./ops/release_backend.sh
```

### Monitoring Production

**Check what's deployed:**
```bash
curl https://api.mentalspaceehr.com/api/v1/version | jq
```

**Run health checks:**
```bash
./ops/smoke-tests.sh
```

**Watch logs:**
```bash
export MSYS_NO_PATHCONV=1
aws logs tail /ecs/mentalspace-backend-prod --follow --region us-east-1
```

### Rolling Back

**If you need to rollback to previous version:**
```bash
# Find previous task definition
aws ecs describe-services \
  --cluster mentalspace-ehr-prod \
  --services mentalspace-backend \
  --region us-east-1 \
  --query 'services[0].taskDefinition'

# Rollback (replace :5 with previous revision number)
aws ecs update-service \
  --cluster mentalspace-ehr-prod \
  --service mentalspace-backend \
  --task-definition mentalspace-backend-prod:4 \
  --region us-east-1
```

---

## 🎯 Key URLs

- **API Base:** https://api.mentalspaceehr.com
- **Version:** https://api.mentalspaceehr.com/api/v1/version
- **Health Check:** https://api.mentalspaceehr.com/api/v1/health/live
- **Database Health:** https://api.mentalspaceehr.com/api/v1/health/ready

---

## 📚 Documentation

For more details, see:

- **[PRODUCTION-DEPLOYMENT.md](PRODUCTION-DEPLOYMENT.md)** - Complete deployment guide (15 pages)
- **[DEPLOYMENT-INFRASTRUCTURE-SUMMARY.md](DEPLOYMENT-INFRASTRUCTURE-SUMMARY.md)** - Full technical details
- **[ops/release_backend.sh](ops/release_backend.sh)** - Deployment script source code
- **[ops/smoke-tests.sh](ops/smoke-tests.sh)** - Smoke test script source code

---

## 🆘 Troubleshooting

### Deployment Failed

**Check GitHub Actions:**
1. Go to **Actions** tab
2. Click on failed workflow
3. Review error logs
4. Click **Re-run jobs** to retry

**Check AWS Console:**
1. Go to **ECS** → **Clusters** → **mentalspace-ehr-prod**
2. Click **mentalspace-backend** service
3. Check **Events** tab for errors

**Common Issues:**

**Issue:** "Permission denied: ops/release_backend.sh"
```bash
chmod +x ops/release_backend.sh
```

**Issue:** Deployment stuck "IN_PROGRESS"
- Check container logs: `aws logs tail /ecs/mentalspace-backend-prod --region us-east-1`
- Usually means health check failing or app crash

**Issue:** Smoke tests failing
- Wait a few minutes for app to fully start
- Run tests again: `./ops/smoke-tests.sh`

---

## ✅ Success Checklist

- [ ] GitHub secrets configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- [ ] Scripts made executable (chmod +x)
- [ ] First deployment completed successfully
- [ ] Version endpoint returns correct Git SHA
- [ ] Smoke tests all passing
- [ ] Deployment report generated (if manual deployment)

---

**You're all set!** 🎉

Your production deployments are now:
- ✅ Reproducible (immutable image digests)
- ✅ Verifiable (Git SHA tracking)
- ✅ Automated (CI/CD pipeline)
- ✅ Safe (automatic rollback)
- ✅ Auditable (deployment reports)

For detailed information, see [PRODUCTION-DEPLOYMENT.md](PRODUCTION-DEPLOYMENT.md)
