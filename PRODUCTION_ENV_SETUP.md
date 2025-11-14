# Production Environment Configuration

## Frontend Environment Variables

Create the following file: `packages/frontend/.env.production`

```env
VITE_API_URL=https://api.mentalspaceehr.com/api/v1
VITE_SOCKET_URL=wss://api.mentalspaceehr.com
```

## Development Environment Variables (for reference)

File: `packages/frontend/.env`

```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_SOCKET_URL=ws://localhost:3001
```

## Super Admin Credentials

**Production Login:**
- Email: `superadmin@mentalspace.com`
- Password: `Password123!`

## Build and Deploy Commands

```bash
# Build frontend with production environment
cd packages/frontend
npm run build

# Deploy to S3
aws s3 sync dist/ s3://mentalspaceehr-frontend --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E3AL81URAGOXL4 \
  --paths "/*"
```

## Status

✅ Super admin user created/verified in production database
✅ Password updated to Password123!
⏳ Frontend environment configuration (manual step required)
⏳ Frontend rebuild and deployment
⏳ CloudFront cache invalidation
⏳ Login verification

