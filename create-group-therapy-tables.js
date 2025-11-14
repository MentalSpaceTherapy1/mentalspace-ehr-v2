const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function createGroupTherapyTables() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    console.log('=== CREATING GROUP THERAPY TABLES ===\n');

    // Create group_sessions table
    console.log('Creating group_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "group_sessions" (
        "id" TEXT NOT NULL,
        "groupName" TEXT NOT NULL,
        "description" TEXT,
        "facilitatorId" TEXT NOT NULL,
        "coFacilitatorId" TEXT,
        "maxCapacity" INTEGER NOT NULL,
        "currentEnrollment" INTEGER NOT NULL DEFAULT 0,
        "groupType" TEXT NOT NULL,
        "isOpenEnrollment" BOOLEAN NOT NULL DEFAULT false,
        "requiresScreening" BOOLEAN NOT NULL DEFAULT true,
        "isTelehealthAvailable" BOOLEAN NOT NULL DEFAULT false,
        "appointmentTypeId" TEXT NOT NULL,
        "recurringPattern" TEXT,
        "dayOfWeek" INTEGER,
        "startTime" TEXT,
        "duration" INTEGER,
        "billingType" TEXT NOT NULL,
        "ratePerMember" DOUBLE PRECISION,
        "status" TEXT NOT NULL,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "group_sessions_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✓ group_sessions table created');

    // Create group_members table
    console.log('Creating group_members table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "group_members" (
        "id" TEXT NOT NULL,
        "groupId" TEXT NOT NULL,
        "clientId" TEXT NOT NULL,
        "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "exitDate" TIMESTAMP(3),
        "status" TEXT NOT NULL,
        "exitReason" TEXT,
        "attendanceCount" INTEGER NOT NULL DEFAULT 0,
        "absenceCount" INTEGER NOT NULL DEFAULT 0,
        "lastAttendance" TIMESTAMP(3),
        "screenedBy" TEXT,
        "screeningDate" TIMESTAMP(3),
        "screeningNotes" TEXT,
        "approved" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✓ group_members table created');

    // Create group_attendance table
    console.log('Creating group_attendance table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "group_attendance" (
        "id" TEXT NOT NULL,
        "groupMemberId" TEXT NOT NULL,
        "appointmentId" TEXT NOT NULL,
        "attended" BOOLEAN NOT NULL DEFAULT false,
        "checkedInAt" TIMESTAMP(3),
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "group_attendance_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✓ group_attendance table created\n');

    // Create indexes
    console.log('Creating indexes...');

    // group_sessions indexes
    await client.query(`CREATE INDEX IF NOT EXISTS "group_sessions_facilitatorId_idx" ON "group_sessions"("facilitatorId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "group_sessions_status_idx" ON "group_sessions"("status");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "group_sessions_groupType_idx" ON "group_sessions"("groupType");`);

    // group_members indexes
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "group_members_groupId_clientId_key" ON "group_members"("groupId", "clientId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "group_members_groupId_idx" ON "group_members"("groupId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "group_members_clientId_idx" ON "group_members"("clientId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "group_members_status_idx" ON "group_members"("status");`);

    // group_attendance indexes
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "group_attendance_groupMemberId_appointmentId_key" ON "group_attendance"("groupMemberId", "appointmentId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "group_attendance_appointmentId_idx" ON "group_attendance"("appointmentId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "group_attendance_groupMemberId_idx" ON "group_attendance"("groupMemberId");`);

    console.log('✓ All indexes created\n');

    // Create foreign key constraints
    console.log('Creating foreign key constraints...');

    // group_sessions foreign keys
    await client.query(`
      ALTER TABLE "group_sessions"
      ADD CONSTRAINT IF NOT EXISTS "group_sessions_facilitatorId_fkey"
      FOREIGN KEY ("facilitatorId") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
    `);
    await client.query(`
      ALTER TABLE "group_sessions"
      ADD CONSTRAINT IF NOT EXISTS "group_sessions_coFacilitatorId_fkey"
      FOREIGN KEY ("coFacilitatorId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);
    await client.query(`
      ALTER TABLE "group_sessions"
      ADD CONSTRAINT IF NOT EXISTS "group_sessions_appointmentTypeId_fkey"
      FOREIGN KEY ("appointmentTypeId") REFERENCES "appointment_types"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
    `);

    // group_members foreign keys
    await client.query(`
      ALTER TABLE "group_members"
      ADD CONSTRAINT IF NOT EXISTS "group_members_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "group_sessions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    await client.query(`
      ALTER TABLE "group_members"
      ADD CONSTRAINT IF NOT EXISTS "group_members_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "clients"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
    `);
    await client.query(`
      ALTER TABLE "group_members"
      ADD CONSTRAINT IF NOT EXISTS "group_members_screenedBy_fkey"
      FOREIGN KEY ("screenedBy") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    // group_attendance foreign keys
    await client.query(`
      ALTER TABLE "group_attendance"
      ADD CONSTRAINT IF NOT EXISTS "group_attendance_groupMemberId_fkey"
      FOREIGN KEY ("groupMemberId") REFERENCES "group_members"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);
    await client.query(`
      ALTER TABLE "group_attendance"
      ADD CONSTRAINT IF NOT EXISTS "group_attendance_appointmentId_fkey"
      FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    console.log('✓ All foreign key constraints created\n');

    console.log('✅ All group therapy tables successfully created!');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

createGroupTherapyTables();
