-- AlterTable: Add password management fields to User table
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT,
ADD COLUMN IF NOT EXISTS "passwordResetExpiry" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT,
ADD COLUMN IF NOT EXISTS "invitationSentAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "invitationToken" TEXT;

-- Create unique indexes for tokens
CREATE UNIQUE INDEX IF NOT EXISTS "users_passwordResetToken_key" ON "users"("passwordResetToken");
CREATE UNIQUE INDEX IF NOT EXISTS "users_emailVerificationToken_key" ON "users"("emailVerificationToken");
CREATE UNIQUE INDEX IF NOT EXISTS "users_invitationToken_key" ON "users"("invitationToken");
