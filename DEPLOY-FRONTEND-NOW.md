# Deploy Frontend - Quick Guide

**Status**: Frontend built and ready, network issue preventing automatic deployment from local machine.

**Built Files Location**: `packages/frontend/dist/`

**Deployment Package**: `frontend-deployment.tar.gz` (997 KB)

---

## 🚀 Quick Deploy (Choose One Method)

### **Method 1: AWS Console (Easiest - 2 minutes)**

1. **Go to S3 Console**: https://console.aws.amazon.com/s3
2. **Open bucket**: `mentalspaceehr-frontend`
3. **Delete old files**:
   - Select all files in the bucket
   - Click "Delete"
4. **Upload new files**:
   - Click "Upload"
   - Drag these 3 files from `packages/frontend/dist/`:
     - `index.html`
     - `assets/index-BddJySWR.js`
     - `assets/index-Fg2rh1rY.css`
   - Click "Upload"
5. **Invalidate CloudFront**:
   - Go to: https://console.aws.amazon.com/cloudfront
   - Click distribution `E3AL81URAGOXL4`
   - Go to "Invalidations" tab
   - Click "Create invalidation"
   - Paths: `/*`
   - Click "Create invalidation"

**Done! Wait 2-3 minutes for CloudFront, then test at https://mentalspaceehr.com**

---

### **Method 2: AWS CLI (From another machine/terminal)**

```bash
# Navigate to the project
cd C:\Users\Elize\mentalspace-ehr-v2

# Sync to S3
aws s3 sync packages/frontend/dist/ s3://mentalspaceehr-frontend --delete --region us-east-1

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id E3AL81URAGOXL4 \
  --paths "/*"
```

---

### **Method 3: PowerShell (Try if Git Bash has network issues)**

```powershell
# Open PowerShell as Administrator
cd C:\Users\Elize\mentalspace-ehr-v2

# Sync to S3
aws s3 sync packages/frontend/dist/ s3://mentalspaceehr-frontend --delete --region us-east-1

# Invalidate CloudFront
aws cloudfront create-invalidation `
  --distribution-id E3AL81URAGOXL4 `
  --paths "/*"
```

---

## 📦 What's Being Deployed

**New Features**:
- ✅ "My Profile" button in sidebar (above Logout)
- ✅ Navigates to `/profile` page
- ✅ Profile page with Signature Authentication settings

**Files**:
- `index.html` (1.79 KB)
- `assets/index-BddJySWR.js` (2.27 MB) - ⬅️ NEW FILE
- `assets/index-Fg2rh1rY.css` (94 KB)

**Changes from previous deployment**:
- Added "My Profile" navigation button
- Same profile page and signature settings

---

## ✅ After Deployment - Test Checklist

1. **Wait 2-3 minutes** for CloudFront invalidation
2. **Hard refresh** browser (Ctrl+F5)
3. **Login** to https://mentalspaceehr.com
4. **Look in sidebar** - You should see:
   ```
   [EJ User Icon]
   Elize Joseph
   CLINICIAN

   [👤 My Profile]  ⬅️ NEW BUTTON
   [🚪 Logout]
   ```
5. **Click "My Profile"**
6. **Verify** you see "Signature Authentication Settings"
7. **Try to set PIN**:
   - Enter current password
   - Enter PIN: 1234
   - Click "Set PIN"
8. **Result tells us migration status**:
   - ✅ Success → Migration applied!
   - ❌ Error → Need to apply migration

---

## 🐛 Troubleshooting

### Issue: Don't see "My Profile" button after deployment

**Solution**:
1. Hard refresh (Ctrl+F5)
2. Clear browser cache
3. Check CloudFront invalidation completed
4. Verify correct files uploaded to S3

### Issue: S3 upload fails

**Solution**:
1. Check AWS credentials: `aws sts get-caller-identity`
2. Check internet connection
3. Try AWS Console upload (Method 1)
4. Check if VPN/firewall is blocking S3

### Issue: Files already in S3 from previous deployment

**Solution**: That's fine! The `--delete` flag or manual delete in console will remove old files.

---

## 📝 What Was Fixed

**Problem**: Clicking on "EJ" in sidebar did nothing

**Solution**: Added "My Profile" button that navigates to `/profile` route

**Code Changed**:
- `packages/frontend/src/components/Layout.tsx` - Added button
- Committed to GitHub: `c9f29ba`

---

## 🎯 Current Status

- ✅ Code committed to GitHub
- ✅ Frontend built (22.63s)
- ✅ Deployment package created
- ⏳ Waiting for S3 upload
- ⏳ Waiting for CloudFront invalidation

**Once deployed, you can test the complete Phase 1.4 feature!**

---

**Files ready at**: `C:\Users\Elize\mentalspace-ehr-v2\packages\frontend\dist\`

**Just need**: Upload to S3 and invalidate CloudFront

**Est. Time**: 5 minutes (2 min upload + 3 min CloudFront)
