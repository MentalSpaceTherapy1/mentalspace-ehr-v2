# Signature PIN Setup Instructions

## Problem
Test user `ejoseph@chctherapy.com` needs a signature PIN configured to sign clinical notes during testing.

## Solution Options

### Option 1: Manual Setup via UI (RECOMMENDED for immediate testing)

1. **Login** to the application as ejoseph@chctherapy.com
2. **Navigate** to User Settings or Profile
3. **Find** the "Signature Authentication" section
4. **Set** a signature PIN (4-6 digits, e.g., "1234")
5. **Confirm** by entering your current login password

### Option 2: Direct Database Update (Requires database access)

If you have direct access to the RDS database, run this SQL query:

```sql
UPDATE "User"
SET "signaturePin" = '$2a$10$swaGUXnrMOKha5myWPm1C.sPzaeLb/AuN4SAepmhIV5k48VioP4xG'
WHERE email = 'ejoseph@chctherapy.com';
```

**Note:** The hash above is for PIN "1234" (bcrypt hashed with 10 rounds)

### Option 3: Run Script via ECS Task

A script has been created at `packages/backend/update-signature-pin.js` that can be executed as a one-time ECS task:

1. **Build** backend Docker image:
   ```bash
   docker build -t mentalspace-backend:signature-pin -f packages/backend/Dockerfile .
   ```

2. **Push** to ECR (requires ECR permissions):
   ```bash
   docker tag mentalspace-backend:signature-pin 471112967148.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:signature-pin
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 471112967148.dkr.ecr.us-east-1.amazonaws.com
   docker push 471112967148.dkr.ecr.us-east-1.amazonaws.com/mentalspace-backend:signature-pin
   ```

3. **Run** as ECS task:
   ```bash
   aws ecs run-task \
     --cluster mentalspace-ehr-prod \
     --task-definition mentalspace-backend-prod \
     --overrides '{"containerOverrides":[{"name":"backend","command":["node","update-signature-pin.js"]}]}' \
     --region us-east-1
   ```

### Option 4: Use API Endpoint (Requires current password)

If you know the user's current login password, use the API endpoint:

```bash
POST https://api.mentalspaceehr.com/api/v1/users/signature-pin
Headers:
  Authorization: Bearer <user_token>
  Content-Type: application/json
Body:
  {
    "pin": "1234",
    "currentPassword": "<user's login password>"
  }
```

## Verification

After setup, verify the signature PIN is configured:

```bash
GET https://api.mentalspaceehr.com/api/v1/users/signature-status
Headers:
  Authorization: Bearer <user_token>
```

Expected response:
```json
{
  "success": true,
  "data": {
    "hasPinConfigured": true,
    "hasPasswordConfigured": false
  }
}
```

## Test PIN

Once configured, the test user can sign clinical notes using PIN: **1234**

## Security Note

This PIN should only be used in test/development environments. For production, users should set strong, unique PINs through the UI with proper password verification.

---

**Status:** Script and documentation prepared (commit df95437)
**Blocker #4:** Waiting for signature PIN configuration to complete via one of the options above
