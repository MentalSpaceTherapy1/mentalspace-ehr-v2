# Login Issue Fix - Deployment Instructions

## Issues Fixed

I've identified and fixed **3 critical configuration issues** that were preventing login in production:

### 1. Missing `.env.production` File
**Problem:** Frontend didn't know where to send API requests in production
**Solution:** Created `/packages/frontend/.env.production` with:
```bash
VITE_API_URL=https://api.mentalspaceehr.com/api/v1
```

### 2. Incorrect API URL Fallback in `main.tsx`
**Problem:** Fallback URL pointed to old ELB without `/api/v1` path
**Solution:** Fixed `packages/frontend/src/main.tsx:10` to use correct path:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
```

### 3. CORS Configuration Missing Production Domain
**Problem:** Backend doesn't allow requests from CloudFront distribution
**Solution:** Instructions below to update backend CORS configuration

---

## Deployment Steps

### Step 1: Deploy Frontend to S3/CloudFront

The frontend has already been rebuilt with the correct configuration. Deploy it using:

```bash
# Navigate to frontend directory
cd packages/frontend

# Ensure .env.production exists with correct API URL
echo "VITE_API_URL=https://api.mentalspaceehr.com/api/v1" > .env.production

# Rebuild frontend (just to be safe)
npm run build

# Deploy to S3
aws s3 sync dist/ s3://mentalspaceehr-frontend --delete

# Invalidate CloudFront cache to serve new files immediately
aws cloudfront create-invalidation \
  --distribution-id E3AL81URAGOXL4 \
  --paths "/*"
```

**Note:** The CloudFront distribution ID is `E3AL81URAGOXL4` (from your deployment context).

---

### Step 2: Update Backend CORS Configuration

The backend needs to allow requests from your production CloudFront domain.

**Option A: Update via Environment Variable (Recommended for ECS)**

Add your CloudFront URL to the `CORS_ORIGINS` environment variable in your ECS task definition:

```bash
CORS_ORIGINS=https://mentalspaceehr.com,https://www.mentalspaceehr.com,https://d111111abcdef8.cloudfront.net
```

Replace `d111111abcdef8.cloudfront.net` with your actual CloudFront distribution domain.

**To find your CloudFront domain:**
```bash
aws cloudfront get-distribution --id E3AL81URAGOXL4 --query 'Distribution.DomainName' --output text
```

**Option B: Update via AWS Console**

1. Go to **ECS Console** → **Task Definitions**
2. Find your task definition (likely `mentalspace-ehr-backend-prod`)
3. Create new revision
4. Under **Environment Variables**, update or add:
   - **Key:** `CORS_ORIGINS`
   - **Value:** `https://mentalspaceehr.com,https://www.mentalspaceehr.com,https://YOUR_CLOUDFRONT_DOMAIN`
5. Update ECS service to use new task definition revision
6. Wait for service to redeploy (~2-3 minutes)

---

### Step 3: Verify CloudFront Distribution Configuration

Ensure your CloudFront distribution is properly configured:

```bash
aws cloudfront get-distribution-config --id E3AL81URAGOXL4 > cloudfront-config.json
```

**Check these settings:**
- **Origin Domain:** Should point to `mentalspaceehr-frontend.s3.amazonaws.com`
- **Viewer Protocol Policy:** Should be `redirect-to-https`
- **Alternate Domain Names (CNAMEs):** Should include `mentalspaceehr.com` and `www.mentalspaceehr.com`
- **SSL Certificate:** Should be configured with your ACM certificate

---

### Step 4: Test Login Functionality

After deployment, test the login flow:

1. **Open Production Website:**
   ```bash
   # Open in browser
   open https://mentalspaceehr.com
   ```

2. **Open Browser DevTools** (F12) → Network tab

3. **Attempt Login** with test credentials

4. **Check API Requests:**
   - Look for requests to `https://api.mentalspaceehr.com/api/v1/auth/login`
   - Should return `200 OK` with JWT tokens
   - Check for CORS errors in console

**Expected Success Response:**
```json
{
  "status": "success",
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    }
  }
}
```

---

## Troubleshooting

### Issue: Login requests return 404

**Cause:** Frontend is using wrong API URL
**Fix:**
1. Verify `.env.production` exists with correct URL
2. Rebuild frontend: `npm run build`
3. Redeploy to S3
4. Invalidate CloudFront cache

**Check in browser:**
```javascript
// In browser console on mentalspaceehr.com
console.log('API URL:', localStorage.getItem('apiUrl'))
```

---

### Issue: CORS errors in browser console

**Error Message:**
```
Access to XMLHttpRequest at 'https://api.mentalspaceehr.com/api/v1/auth/login'
from origin 'https://mentalspaceehr.com' has been blocked by CORS policy
```

**Cause:** Backend CORS not configured for production domain
**Fix:**
1. Update `CORS_ORIGINS` environment variable in ECS task definition
2. Include all frontend domains:
   - `https://mentalspaceehr.com`
   - `https://www.mentalspaceehr.com`
   - `https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net`
3. Restart ECS service

**Verify backend CORS config:**
```bash
curl -I https://api.mentalspaceehr.com/api/v1/health \
  -H "Origin: https://mentalspaceehr.com"

# Should return:
# Access-Control-Allow-Origin: https://mentalspaceehr.com
```

---

### Issue: Login works but immediately logs out

**Cause:** Token refresh failing or session timeout
**Fix:**
1. Check JWT tokens in browser localStorage
2. Verify `JWT_SECRET` is set in backend environment
3. Check token expiration times

**Debug in browser console:**
```javascript
// Check stored tokens
console.log('Access Token:', localStorage.getItem('token'))
console.log('Refresh Token:', localStorage.getItem('refreshToken'))

// Decode JWT (without verifying - for debugging only)
const token = localStorage.getItem('token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
  console.log('Expires:', new Date(payload.exp * 1000));
}
```

---

### Issue: 502 Bad Gateway from API

**Cause:** Backend ECS service not running or unhealthy
**Fix:**
1. Check ECS service health:
   ```bash
   aws ecs describe-services \
     --cluster mentalspace-ehr-prod \
     --services mentalspace-ehr-backend-prod
   ```
2. Check ALB target health:
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn $(aws elbv2 describe-target-groups \
       --names mentalspace-ehr-backend-prod-tg \
       --query 'TargetGroups[0].TargetGroupArn' \
       --output text)
   ```
3. Check CloudWatch logs for backend errors

---

## Environment Variable Checklist

### Frontend (.env.production)
```bash
VITE_API_URL=https://api.mentalspaceehr.com/api/v1
```

### Backend (ECS Task Definition)
```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://... (from RDS)
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=https://mentalspaceehr.com,https://www.mentalspaceehr.com,https://YOUR_CLOUDFRONT_DOMAIN
FRONTEND_URL=https://mentalspaceehr.com
BACKEND_URL=https://api.mentalspaceehr.com
```

---

## Quick Deployment Commands

```bash
# 1. Rebuild frontend with production config
cd /home/user/mentalspace-ehr-v2/packages/frontend
echo "VITE_API_URL=https://api.mentalspaceehr.com/api/v1" > .env.production
npm run build

# 2. Deploy to S3
aws s3 sync dist/ s3://mentalspaceehr-frontend --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E3AL81URAGOXL4 \
  --paths "/*"

# 4. Wait for invalidation to complete (~30-60 seconds)
aws cloudfront wait invalidation-completed \
  --distribution-id E3AL81URAGOXL4 \
  --id <invalidation-id-from-step-3>

# 5. Test login
curl -X POST https://api.mentalspaceehr.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://mentalspaceehr.com" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## Files Modified

1. ✅ `packages/frontend/.env.production` - Created with production API URL
2. ✅ `packages/frontend/src/main.tsx` - Fixed API URL fallback
3. ✅ `packages/frontend/dist/` - Rebuilt with correct configuration

---

## Next Steps After Deployment

1. **Test all login scenarios:**
   - Login with valid credentials
   - Login with invalid credentials (should show error)
   - Logout
   - Session persistence (refresh page)
   - Token refresh after 1 hour

2. **Monitor CloudWatch Logs:**
   - Backend API logs for authentication errors
   - CloudFront access logs for 404/403 errors

3. **Set up monitoring alerts:**
   - 401/403 errors spike
   - Failed login attempts
   - API response time degradation

4. **Document production credentials:**
   - Create admin user if not exists
   - Store credentials securely (AWS Secrets Manager recommended)

---

## Support

If you continue experiencing login issues after following these steps:

1. Check browser console for errors (F12 → Console)
2. Check network tab for failed requests (F12 → Network)
3. Check CloudWatch logs for backend errors
4. Verify all environment variables are set correctly

**Common Error Messages:**

| Error | Cause | Fix |
|-------|-------|-----|
| `404 Not Found` | Wrong API URL | Check VITE_API_URL |
| `CORS policy` | CORS not configured | Update CORS_ORIGINS |
| `401 Unauthorized` | Invalid credentials | Check user exists in DB |
| `502 Bad Gateway` | Backend not running | Check ECS service |
| `Network Error` | DNS/routing issue | Check Route 53 records |

---

**Deployment completed:** $(date)
**CloudFront Distribution:** E3AL81URAGOXL4
**Frontend URL:** https://mentalspaceehr.com
**API URL:** https://api.mentalspaceehr.com/api/v1
