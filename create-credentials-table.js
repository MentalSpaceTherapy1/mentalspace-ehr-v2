const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function createCredentialsTable() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    console.log('=== CREATING CREDENTIALING ENUMS AND TABLE ===\n');

    // Create CredentialType enum
    console.log('Creating CredentialType enum...');
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "CredentialType" AS ENUM (
          'STATE_LICENSE',
          'DEA_LICENSE',
          'NPI',
          'BOARD_CERTIFICATION',
          'MALPRACTICE_INSURANCE',
          'LIABILITY_INSURANCE',
          'BACKGROUND_CHECK',
          'REFERENCE_CHECK',
          'OTHER'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ CredentialType enum created/verified');

    // Create VerificationStatus enum
    console.log('Creating VerificationStatus enum...');
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "VerificationStatus" AS ENUM (
          'PENDING',
          'VERIFIED',
          'EXPIRED',
          'SUSPENDED',
          'REVOKED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ VerificationStatus enum created/verified');

    // Create ScreeningStatus enum
    console.log('Creating ScreeningStatus enum...');
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "ScreeningStatus" AS ENUM (
          'CLEAR',
          'FLAGGED',
          'PENDING',
          'ERROR'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ ScreeningStatus enum created/verified\n');

    // Create credentials table
    console.log('Creating credentials table...');
    await client.query(`
      CREATE TABLE "credentials" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "credentialType" "CredentialType" NOT NULL,
        "credentialNumber" TEXT NOT NULL,
        "issuingAuthority" TEXT NOT NULL,
        "issuingState" TEXT,
        "issueDate" TIMESTAMP(3) NOT NULL,
        "expirationDate" TIMESTAMP(3) NOT NULL,
        "renewalDate" TIMESTAMP(3),
        "ceuRequirements" INTEGER,
        "renewalRequirements" JSONB,
        "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
        "verificationDate" TIMESTAMP(3),
        "verificationMethod" TEXT,
        "lastScreeningDate" TIMESTAMP(3),
        "screeningStatus" "ScreeningStatus" NOT NULL DEFAULT 'CLEAR',
        "screeningNotes" TEXT,
        "documents" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "restrictions" TEXT,
        "scope" TEXT,
        "alertsSent" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✓ credentials table created');

    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX "credentials_userId_idx" ON "credentials"("userId");
    `);
    await client.query(`
      CREATE INDEX "credentials_expirationDate_idx" ON "credentials"("expirationDate");
    `);
    await client.query(`
      CREATE INDEX "credentials_credentialType_idx" ON "credentials"("credentialType");
    `);
    await client.query(`
      CREATE INDEX "credentials_verificationStatus_idx" ON "credentials"("verificationStatus");
    `);
    await client.query(`
      CREATE INDEX "credentials_screeningStatus_idx" ON "credentials"("screeningStatus");
    `);
    console.log('✓ All indexes created');

    // Create foreign key constraint
    console.log('Creating foreign key constraint...');
    await client.query(`
      ALTER TABLE "credentials"
      ADD CONSTRAINT "credentials_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    console.log('✓ Foreign key constraint created');

    console.log('\n✅ credentials table successfully created!');

    // Verify
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'credentials'
      ORDER BY ordinal_position;
    `);

    console.log(`\nVerification: Found ${columns.rows.length} columns in credentials table`);

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

createCredentialsTable();
