# E-Signature Implementation for Client Portal Intake Forms

## Overview
This document summarizes the e-signature functionality being added to allow clients to electronically sign intake forms in the Client Portal.

## ✅ COMPLETED

### 1. Database Schema Updates
**File**: `packages/database/prisma/schema.prisma`

Added the following fields to the `IntakeFormSubmission` model:

```prisma
// E-Signature fields
signatureData      String?   // Base64 encoded signature image (canvas drawing)
signedByName       String?   // Full name entered by client
signedDate         DateTime?
signatureIpAddress String?   // IP address at time of signature
consentAgreed      Boolean   @default(false) // Client agreed to e-signature consent
```

### 2. Database Migration
**File**: `packages/database/prisma/migrations/20251022022500_add_esignature_to_intake_forms/migration.sql`

Created migration SQL:
```sql
ALTER TABLE "intake_form_submissions"
ADD COLUMN "signatureData" TEXT,
ADD COLUMN "signedByName" TEXT,
ADD COLUMN "signedDate" TIMESTAMP(3),
ADD COLUMN "signatureIpAddress" TEXT,
ADD COLUMN "consentAgreed" BOOLEAN NOT NULL DEFAULT false;
```

## 📋 TODO - REMAINING IMPLEMENTATION

### 3. Backend API Updates

**File to Modify**: `packages/backend/src/controllers/portal/documents.controller.ts`

Update the `submitForm` function to accept e-signature data:

```typescript
// Add to validation schema
const submitFormSchema = z.object({
  responses: z.record(z.any()),
  // E-signature fields
  signatureData: z.string().optional(),
  signedByName: z.string().optional(),
  signatureIpAddress: z.string().optional(),
  consentAgreed: z.boolean().default(false),
});

// Update the submission creation
const submission = await prisma.intakeFormSubmission.create({
  data: {
    formId,
    clientId,
    responsesJson: validatedData.responses,
    status: 'Submitted',
    submittedDate: new Date(),
    // E-signature fields
    signatureData: validatedData.signatureData,
    signedByName: validatedData.signedByName,
    signedDate: validatedData.signatureData ? new Date() : null,
    signatureIpAddress: validatedData.signatureIpAddress || req.ip,
    consentAgreed: validatedData.consentAgreed,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  },
});
```

### 4. Frontend E-Signature Component

**New File**: `packages/frontend/src/components/Portal/SignaturePad.tsx`

Create a canvas-based signature component:

```typescript
import { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSignatureChange: (signatureData: string | null) => void;
  width?: number;
  height?: number;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSignatureChange,
  width = 500,
  height = 200,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Drawing logic implementation
  const startDrawing = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (!isEmpty) {
      const canvas = canvasRef.current;
      if (canvas) {
        const signatureData = canvas.toDataURL('image/png');
        onSignatureChange(signatureData);
      }
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onSignatureChange(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  return (
    <div className="signature-pad-container">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        className="border border-gray-300 rounded cursor-crosshair bg-white"
      />
      <button
        type="button"
        onClick={clear}
        className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
      >
        Clear Signature
      </button>
    </div>
  );
};
```

### 5. Portal Form Submission Integration

**File to Modify**: `packages/frontend/src/pages/Portal/FormSubmission.tsx` (or wherever form submission happens)

Add e-signature section to form:

```typescript
const [signatureData, setSignatureData] = useState<string | null>(null);
const [signedByName, setSignedByName] = useState('');
const [consentAgreed, setConsentAgreed] = useState(false);

// In the form render:
<div className="e-signature-section">
  <h3>Electronic Signature</h3>

  <div className="mb-4">
    <label>
      <input
        type="checkbox"
        checked={consentAgreed}
        onChange={(e) => setConsentAgreed(e.target.checked)}
        required
      />
      I consent to use electronic signature and agree that it has the same legal effect as a handwritten signature.
    </label>
  </div>

  <div className="mb-4">
    <label className="block mb-2">Full Name (Type your name as signature)</label>
    <input
      type="text"
      value={signedByName}
      onChange={(e) => setSignedByName(e.target.value)}
      className="w-full px-3 py-2 border rounded"
      placeholder="John Doe"
      required
    />
  </div>

  <div className="mb-4">
    <label className="block mb-2">Draw Your Signature</label>
    <SignaturePad onSignatureChange={setSignatureData} />
  </div>
</div>

// In submit handler:
const submitForm = async () => {
  if (!consentAgreed) {
    alert('You must agree to use electronic signature');
    return;
  }

  if (!signedByName) {
    alert('Please enter your full name');
    return;
  }

  if (!signatureData) {
    alert('Please provide your signature');
    return;
  }

  const response = await api.post(`/portal/forms/${formId}/submit`, {
    responses: formResponses,
    signatureData,
    signedByName,
    consentAgreed,
  });
};
```

### 6. EHR Side - View Signature

**File to Modify**: `packages/frontend/src/pages/Clients/ClientForms.tsx` (or form submission view)

Display the signature when viewing submitted forms:

```typescript
{submission.signatureData && (
  <div className="signature-display mt-4">
    <h4>Client Signature</h4>
    <div className="border p-4 rounded bg-gray-50">
      <img
        src={submission.signatureData}
        alt="Client Signature"
        className="max-w-md"
      />
      <p className="mt-2">
        <strong>Signed by:</strong> {submission.signedByName}
      </p>
      <p>
        <strong>Signed on:</strong> {new Date(submission.signedDate).toLocaleString()}
      </p>
      <p className="text-sm text-gray-600">
        IP Address: {submission.signatureIpAddress}
      </p>
    </div>
  </div>
)}
```

## Deployment Steps

1. **Apply Migration to Local Database**
   ```bash
   cd packages/database
   npx prisma migrate deploy
   ```

2. **Regenerate Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **Test Locally**
   - Start backend and frontend
   - Navigate to portal
   - Assign a form to a client
   - Login as client
   - Fill out form and add signature
   - Submit and verify signature is saved

4. **Deploy to Production**
   ```bash
   # Apply migration to production database
   DATABASE_URL="postgresql://..." npx prisma migrate deploy

   # Deploy backend with new code
   bash ops/release_backend.sh

   # Build and deploy frontend
   cd packages/frontend
   npm run build
   aws s3 sync dist/ s3://mentalspaceehr-frontend/ --delete
   aws cloudfront create-invalidation --distribution-id E3AL81URAGOXL4 --paths "/*"
   ```

## Legal/Compliance Considerations

1. **E-SIGN Act Compliance**
   - ✅ Consent checkbox required
   - ✅ Records timestamp of signature
   - ✅ Records IP address for audit trail
   - ✅ Stores both typed name and drawn signature

2. **HIPAA Compliance**
   - Signatures are PHI and stored securely
   - Audit trail maintained (IP, timestamp, user agent)
   - Access controls already in place via authentication

3. **Data Retention**
   - Signatures stored as base64 PNG images
   - Can be converted to PDF for archival if needed
   - Consider adding "Print with Signature" feature for clinicians

## Next Steps

1. Implement backend API changes (30 min)
2. Create SignaturePad component (45 min)
3. Integrate into form submission flow (30 min)
4. Add signature display in EHR (20 min)
5. Test end-to-end (30 min)
6. Deploy to production (15 min)

**Total estimated time: ~3 hours**
