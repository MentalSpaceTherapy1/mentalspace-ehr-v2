# Client Portal Code Audit Report

**Date:** January 1, 2026
**Auditor:** Claude Code
**Scope:** Client Portal frontend and backend codebase
**Files Reviewed:** 60+ files (32 frontend, 28 backend)

---

## Executive Summary

The Client Portal codebase review identified **34 issues** across 4 severity categories. The most critical findings relate to **incomplete email verification** (currently bypassed with auto-activation) and **missing email delivery implementation**. The codebase demonstrates solid security practices including proper JWT handling, rate limiting, and HIPAA-compliant patterns, but several features remain incomplete.

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 3 | Requires immediate attention |
| High | 8 | Should be addressed before production |
| Medium | 12 | Recommended improvements |
| Low | 11 | Code quality enhancements |

---

## Critical Issues

### 1. Email Verification Not Implemented - Auto-Activation Bypass
**File:** `packages/backend/src/services/portal/auth.service.ts`
**Lines:** 72-74, 81-82

**Description:** Portal accounts are automatically activated without email verification. The verification email sending is commented out.

```typescript
emailVerified: true, // Auto-verify for now
accountStatus: 'ACTIVE', // Auto-activate for now
portalAccessGranted: true, // Auto-grant access for now
// ...
// TODO: Send verification email
// await sendVerificationEmail(data.email, verificationToken);
```

**Risk:** Anyone with a valid MRN can create a portal account without proving email ownership. This could allow unauthorized access if MRNs are guessed or leaked.

**Recommended Fix:**
1. Implement `sendVerificationEmail()` function using email service (SES/SendGrid)
2. Set `emailVerified: false` and `accountStatus: 'PENDING_VERIFICATION'` by default
3. Require email verification before allowing login

---

### 2. Password Reset Emails Not Sent
**File:** `packages/backend/src/services/portal/auth.service.ts`
**Lines:** 367-368

**Description:** Password reset tokens are generated and stored, but no email is actually sent to the user.

```typescript
// TODO: Send password reset email
// await sendPasswordResetEmail(email, resetToken);
```

**Risk:** Password reset functionality appears to work but users never receive the reset link, causing support overhead and potential account lockouts.

**Recommended Fix:**
1. Implement `sendPasswordResetEmail()` function
2. Include secure reset link with token in email
3. Add email delivery logging for audit trail

---

### 3. Auto-Activation During Login
**File:** `packages/backend/src/services/portal/auth.service.ts`
**Lines:** 203-232

**Description:** The login function automatically activates pending accounts and grants portal access, bypassing the intended verification flow.

```typescript
if (portalAccount.accountStatus === 'PENDING_VERIFICATION') {
  // Auto-activate pending accounts (temporary fix since email verification isn't fully implemented)
  await prisma.portalAccount.update({
    where: { id: portalAccount.id },
    data: {
      accountStatus: 'ACTIVE',
      emailVerified: true,
      portalAccessGranted: true,
      grantedDate: new Date(),
    },
  });
```

**Risk:** Completely negates the email verification security control.

**Recommended Fix:**
1. Remove auto-activation logic once email verification is implemented
2. Return clear error message for unverified accounts

---

## High Severity Issues

### 4. Messaging System Returns Empty Arrays (Stub Implementation)
**File:** `packages/backend/src/controllers/portal/dashboard.controller.ts`
**Lines:** 46-50, 296, 337

**Description:** Messaging functionality returns hardcoded empty arrays instead of actual data.

```typescript
// TODO: Implement messaging system
const unreadMessages = 0;
// ...
const messages: any[] = [];
```

**Risk:** Users see messaging UI but feature doesn't work. Poor user experience and potential confusion.

**Recommended Fix:**
1. Implement `portalMessage` queries in dashboard controller
2. Connect to existing messaging infrastructure if available
3. Or clearly disable/hide messaging UI until implemented

---

### 5. Extensive TypeScript `any` Type Usage
**Files:** Multiple controllers in `packages/backend/src/controllers/portal/`
**Instances:** 100+ occurrences

**Description:** Controllers use `(req as any).portalAccount` pattern throughout, losing type safety.

```typescript
const clientId = (req as any).portalAccount?.clientId;
```

**Affected Files:**
- billing.controller.ts (14 instances)
- auth.controller.ts (12 instances)
- moodTracking.controller.ts (6 instances)
- messages.controller.ts (10 instances)
- documents.controller.ts (12 instances)
- dashboard.controller.ts (16 instances)
- profile.controller.ts (10 instances)
- phase1.controller.ts (18 instances)
- therapist.controller.ts (4 instances)
- therapistProfile.controller.ts (8 instances)

**Risk:** Type errors at runtime, harder to maintain, IDE autocompletion doesn't work.

**Recommended Fix:**
1. Create proper type extension for Express Request:
```typescript
interface PortalRequest extends Request {
  portalAccount?: {
    id: string;
    clientId: string;
    email: string;
  };
}
```
2. Update middleware to use typed request
3. Update all controllers to use typed request

---

### 6. Resend Verification Email Not Implemented
**File:** `packages/backend/src/services/portal/auth.service.ts`
**Lines:** 162-163

**Description:** Function generates new token but doesn't send email.

```typescript
// TODO: Send verification email
// await sendVerificationEmail(email, verificationToken);
```

**Recommended Fix:** Implement email sending alongside verification email fix.

---

### 7. Account Settings Email Change Verification Not Sent
**File:** `packages/backend/src/services/portal/auth.service.ts`
**Lines:** 556-557

**Description:** When user changes email, verification token is generated but email not sent.

```typescript
// TODO: Send verification email to new address
// await sendVerificationEmail(data.email, verificationToken);
```

**Recommended Fix:** Implement verification email sending for email changes.

---

### 8. Mood Tracking Returns Empty Arrays
**File:** `packages/backend/src/controllers/portal/dashboard.controller.ts`
**Lines:** 52-53

**Description:** Mood tracking feature returns empty placeholder data.

```typescript
// TODO: Implement mood tracking
const recentMoods: any[] = [];
```

**Recommended Fix:** Connect to `MoodEntry` model or disable UI feature.

---

### 9. Payment Processor Integration Incomplete
**File:** `packages/backend/src/controllers/portal/billing.controller.ts`

**Description:** Billing controller exists but payment processing integration appears incomplete.

**Recommended Fix:** Complete Stripe/payment gateway integration or disable online payment UI.

---

### 10. Notification System Not Implemented
**Multiple Files**

**Description:** Notification preferences are stored but notifications are not sent.

**Recommended Fix:**
1. Implement notification service
2. Connect email/SMS providers
3. Add notification triggers for appointments, messages, etc.

---

### 11. JWT Tokens Stored in localStorage
**File:** `packages/frontend/src/pages/Portal/PortalLogin.tsx`
**Lines:** 31-33

**Description:** Portal tokens are stored in localStorage, which is accessible to XSS attacks.

```typescript
localStorage.setItem('portalToken', response.data.data.token);
localStorage.setItem('portalClient', JSON.stringify(response.data.data.client));
localStorage.setItem('portalAccount', JSON.stringify(response.data.data.portalAccount));
```

**Note:** This is intentional architecture (separate from EHR httpOnly cookies) but worth documenting the security tradeoff.

**Recommended Fix (if enhanced security needed):**
1. Use httpOnly cookies for portal auth similar to EHR
2. Or implement token rotation with shorter expiry

---

## Medium Severity Issues

### 12. Hardcoded Badge Value in Navigation
**File:** `packages/frontend/src/components/PortalLayout.tsx`
**Line:** 62

**Description:** Messages badge shows hardcoded value instead of API data.

```typescript
badge: 3, // TODO: Get from API
```

**Recommended Fix:**
1. Fetch unread message count from `/portal/messages/unread/count` endpoint
2. Use React state to track badge value
3. Update on navigation or with polling/websocket

---

### 13. Debug Console Logs in Production Code
**File:** `packages/frontend/src/pages/Portal/PortalDocuments.tsx`
**Lines:** ~74, ~80

**Description:** Debug logging statements left in code.

```typescript
console.log('NAVIGATION DEBUG:', {...});
console.log('Before navigate - current URL:', window.location.href);
```

**Recommended Fix:** Remove debug console.log statements or wrap with environment check.

---

### 14. Verbose Logging of Registration Data
**File:** `packages/backend/src/services/portal/auth.service.ts`
**Lines:** 19-26

**Description:** Registration logs potentially sensitive information.

```typescript
logger.info('Client ID received:', data.clientId);
logger.info('Email:', data.email);
```

**Recommended Fix:**
1. Reduce logging verbosity in production
2. Use log levels appropriately (debug vs info)
3. Consider masking email in logs

---

### 15. Missing Input Validation on Some Endpoints
**Multiple Controllers**

**Description:** While Zod validation is used on routes, some internal service functions don't validate inputs.

**Recommended Fix:** Add defensive validation in service layer.

---

### 16. Error Messages May Leak Information
**File:** `packages/backend/src/services/portal/auth.service.ts`
**Line:** 37

**Description:** Different error messages for UUID vs MRN could help attackers determine valid identifiers.

```typescript
throw new AppError(isUUID ? 'Client not found' : 'Client with this MRN not found. Please check with your therapist.', 404);
```

**Recommended Fix:** Use consistent generic error message for both cases.

---

### 17. Missing Rate Limiting on Some Portal Endpoints
**Review Required**

**Description:** Verify all portal endpoints have appropriate rate limiting.

**Recommended Fix:** Audit all routes and ensure rate limiters are applied consistently.

---

### 18. Incomplete Therapist Change Request Flow
**File:** `packages/frontend/src/pages/Portal/PortalTherapistChange.tsx`

**Description:** UI exists but backend implementation may be incomplete.

**Recommended Fix:** Verify end-to-end flow works or disable UI.

---

### 19. Self-Scheduling Feature Completeness Unknown
**Files:** `packages/frontend/src/pages/Portal/PortalSelfScheduling.tsx`

**Description:** Self-scheduling UI exists but needs verification of complete integration.

**Recommended Fix:** Test end-to-end scheduling flow.

---

### 20. Document Upload Error Handling
**File:** `packages/frontend/src/lib/portalApi.ts`
**Lines:** 182-193

**Description:** File upload function lacks size/type validation on frontend.

```typescript
export const uploadDocumentFile = async (file: File): Promise<{ fileUrl: string }> => {
  const formData = new FormData();
  formData.append('file', file);
```

**Recommended Fix:**
1. Add client-side file type validation
2. Add file size limit check
3. Show user-friendly error messages

---

### 21. Missing Loading States on Form Submissions
**Multiple Portal Pages**

**Description:** Some forms lack proper loading state during submission.

**Recommended Fix:** Add loading indicators to prevent double submissions.

---

### 22. Missing Error Boundary in Portal
**File:** `packages/frontend/src/components/PortalLayout.tsx`

**Description:** No error boundary to catch React rendering errors.

**Recommended Fix:** Add ErrorBoundary component to catch and display errors gracefully.

---

### 23. API Response Inconsistency
**Multiple Endpoints**

**Description:** Some endpoints return `data.data`, others return `data` directly.

**Recommended Fix:** Standardize API response format across all endpoints.

---

## Low Severity Issues

### 24. Unused Imports (Potential)
**Multiple Files**

**Description:** Some files may have unused imports.

**Recommended Fix:** Run ESLint with unused-imports rule enabled.

---

### 25. Commented Out Code
**File:** `packages/backend/src/services/portal/auth.service.ts`
**Multiple locations**

**Description:** Commented out email sending functions.

```typescript
// await sendVerificationEmail(data.email, verificationToken);
```

**Recommended Fix:** Either implement or remove commented code.

---

### 26. Copyright Year Outdated
**File:** `packages/frontend/src/pages/Portal/PortalRegister.tsx`
**Line:** 158

**Description:** Copyright shows 2025.

```typescript
<p className="mt-2">© 2025 MentalSpace EHR. All rights reserved.</p>
```

**Recommended Fix:** Update to 2026 or use dynamic year.

---

### 27. Magic Numbers in Code
**Multiple Files**

**Description:** Various magic numbers without constants.

```typescript
const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
```

**Recommended Fix:** Extract to named constants.

---

### 28. Inconsistent Error Handling Style
**Multiple Controllers**

**Description:** Some controllers use try/catch, others let errors propagate.

**Recommended Fix:** Standardize error handling approach.

---

### 29. Missing JSDoc Comments
**Multiple Service Files**

**Description:** Service functions lack documentation.

**Recommended Fix:** Add JSDoc comments for public APIs.

---

### 30. Environment Variable Fallbacks
**File:** `packages/frontend/src/lib/api.ts`
**Line:** 4

**Description:** Fallback to localhost may not be appropriate for production.

```typescript
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api/v1';
```

**Recommended Fix:** Ensure environment variables are always set in deployment.

---

### 31. Rate Limiter Comment Accuracy
**File:** `packages/backend/src/middleware/rateLimiter.ts`
**Line:** 119

**Description:** Comment says "temporarily increased for testing" - should be reverted.

```typescript
max: 20, // Maximum 20 account creations per hour per IP (temporarily increased for testing)
```

**Recommended Fix:** Review and set appropriate production limit.

---

### 32. Potential Memory Leak in CSRF Token Promise
**File:** `packages/frontend/src/lib/api.ts`
**Lines:** 14-40

**Description:** `csrfTokenPromise` reference is held but may not be cleaned up on errors.

**Recommended Fix:** Add cleanup in error case (already partially handled, verify completeness).

---

### 33. Console.error Calls in Frontend
**Multiple Portal Files**

**Description:** Production code uses console.error for error logging.

**Recommended Fix:** Implement proper error reporting service (Sentry, etc.).

---

### 34. Missing Accessibility Labels
**Multiple Portal Pages**

**Description:** Some interactive elements may lack proper aria labels.

**Recommended Fix:** Audit accessibility and add appropriate labels.

---

## Security Positive Findings

The following security practices were found to be properly implemented:

1. **JWT Token Configuration** - Portal tokens use proper audience (`mentalspace-portal`) and issuer (`mentalspace-ehr`) validation
2. **Password Hashing** - bcrypt with salt rounds of 10
3. **Account Lockout** - Locks account after 5 failed attempts for 15 minutes
4. **Rate Limiting** - Applied to auth endpoints (5/15min login, 20/hour registration, 3/hour password reset)
5. **CSRF Protection** - Properly exempted for portal auth routes (uses Bearer tokens)
6. **Secure Password Reset** - Generic response prevents email enumeration
7. **Input Validation** - Zod schemas on route definitions
8. **HIPAA Logging** - Security events are logged appropriately
9. **Client Status Check** - Verifies client account is ACTIVE before allowing login
10. **Token Expiry** - Access tokens expire in 1 hour, refresh in 7 days

---

## Recommendations Summary

### Immediate Actions (Critical)
1. Implement email service integration (SES/SendGrid)
2. Enable proper email verification flow
3. Remove auto-activation bypasses
4. Send password reset emails

### Short-Term (High)
1. Complete messaging system or hide UI
2. Add proper TypeScript types for portal requests
3. Implement notification system
4. Complete payment integration or disable

### Medium-Term (Medium)
1. Fetch badge values from API
2. Remove debug logs
3. Add error boundaries
4. Standardize API responses

### Ongoing (Low)
1. Code cleanup (unused imports, commented code)
2. Documentation improvements
3. Accessibility audit
4. Performance optimization

---

## Appendix: Files Reviewed

### Frontend (32 files)
- `packages/frontend/src/pages/Portal/` - All portal pages
- `packages/frontend/src/components/PortalLayout.tsx`
- `packages/frontend/src/lib/api.ts`
- `packages/frontend/src/lib/portalApi.ts`

### Backend (28 files)
- `packages/backend/src/controllers/portal/` - All portal controllers
- `packages/backend/src/services/portal/` - All portal services
- `packages/backend/src/routes/portalAuth.routes.ts`
- `packages/backend/src/routes/portal.routes.ts`
- `packages/backend/src/middleware/portalAuth.ts`
- `packages/backend/src/middleware/rateLimiter.ts`
- `packages/backend/src/app.ts`

---

*Report generated by Claude Code audit process*
