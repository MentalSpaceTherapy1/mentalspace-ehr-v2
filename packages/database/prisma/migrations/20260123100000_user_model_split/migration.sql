-- Phase 2.1: User Model Split
-- This migration creates new tables to extract related fields from the User model
-- for better separation of concerns and reduced model complexity.
-- Original fields on User are kept temporarily for backward compatibility.

-- CreateTable: UserProfile
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "middleName" TEXT,
    "suffix" TEXT,
    "preferredName" TEXT,
    "phoneNumber" TEXT,
    "officeExtension" TEXT,
    "personalEmail" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "profileBio" TEXT,
    "profilePhotoS3" TEXT,
    "yearsOfExperience" INTEGER,
    "education" TEXT[],
    "approachesToTherapy" TEXT[],
    "treatmentPhilosophy" TEXT,
    "specialties" TEXT[],
    "languagesSpoken" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserCredentials
CREATE TABLE "user_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "licenseExpiration" TIMESTAMP(3),
    "npiNumber" TEXT,
    "deaNumber" TEXT,
    "taxonomyCode" TEXT,
    "supervisionLicenses" TEXT[],
    "digitalSignature" TEXT,
    "signatureDate" TIMESTAMP(3),
    "signaturePin" TEXT,
    "signaturePassword" TEXT,
    "signatureBiometric" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserPreferences
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "noteReminders" BOOLEAN NOT NULL DEFAULT true,
    "supervisoryAlerts" BOOLEAN NOT NULL DEFAULT true,
    "defaultOfficeLocation" TEXT,
    "availableForScheduling" BOOLEAN NOT NULL DEFAULT true,
    "acceptsNewClients" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraints on userId
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");
CREATE UNIQUE INDEX "user_credentials_userId_key" ON "user_credentials"("userId");
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "user_preferences"("userId");

-- AddForeignKey: UserProfile -> User
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserCredentials -> User
ALTER TABLE "user_credentials" ADD CONSTRAINT "user_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserPreferences -> User
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Migration: Copy existing data from users table to new tables
-- This ensures all existing users have their data in the new structure

-- Copy to user_profiles
INSERT INTO "user_profiles" (
    "id",
    "userId",
    "middleName",
    "suffix",
    "preferredName",
    "phoneNumber",
    "officeExtension",
    "personalEmail",
    "emergencyContactName",
    "emergencyContactPhone",
    "profileBio",
    "profilePhotoS3",
    "yearsOfExperience",
    "education",
    "approachesToTherapy",
    "treatmentPhilosophy",
    "specialties",
    "languagesSpoken",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    "id",
    "middleName",
    "suffix",
    "preferredName",
    "phoneNumber",
    "officeExtension",
    "personalEmail",
    "emergencyContactName",
    "emergencyContactPhone",
    "profileBio",
    "profilePhotoS3",
    "yearsOfExperience",
    "education",
    "approachesToTherapy",
    "treatmentPhilosophy",
    "specialties",
    "languagesSpoken",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users";

-- Copy to user_credentials
INSERT INTO "user_credentials" (
    "id",
    "userId",
    "title",
    "licenseNumber",
    "licenseState",
    "licenseExpiration",
    "npiNumber",
    "deaNumber",
    "taxonomyCode",
    "supervisionLicenses",
    "digitalSignature",
    "signatureDate",
    "signaturePin",
    "signaturePassword",
    "signatureBiometric",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    "id",
    "title",
    "licenseNumber",
    "licenseState",
    "licenseExpiration",
    "npiNumber",
    "deaNumber",
    "taxonomyCode",
    "supervisionLicenses",
    "digitalSignature",
    "signatureDate",
    "signaturePin",
    "signaturePassword",
    "signatureBiometric",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users";

-- Copy to user_preferences
INSERT INTO "user_preferences" (
    "id",
    "userId",
    "emailNotifications",
    "smsNotifications",
    "appointmentReminders",
    "noteReminders",
    "supervisoryAlerts",
    "defaultOfficeLocation",
    "availableForScheduling",
    "acceptsNewClients",
    "theme",
    "timezone",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    "id",
    COALESCE("emailNotifications", true),
    COALESCE("smsNotifications", false),
    COALESCE("appointmentReminders", true),
    COALESCE("noteReminders", true),
    COALESCE("supervisoryAlerts", true),
    "defaultOfficeLocation",
    COALESCE("availableForScheduling", true),
    COALESCE("acceptsNewClients", true),
    'light',
    'America/New_York',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users";

-- Note: Original fields on the users table are kept for backward compatibility.
-- They will be deprecated and removed in a future migration after all services
-- have been updated to use the new related tables.
