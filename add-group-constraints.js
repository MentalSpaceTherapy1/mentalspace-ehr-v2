const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addConstraintIfNotExists(constraintName, alterQuery) {
  const checkResult = await client.query(`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE constraint_name = $1
  `, [constraintName]);

  if (checkResult.rows.length === 0) {
    try {
      await client.query(alterQuery);
      console.log(`  ✓ ${constraintName} created`);
    } catch (err) {
      console.log(`  ⚠ ${constraintName} failed: ${err.message}`);
    }
  } else {
    console.log(`  ✓ ${constraintName} already exists`);
  }
}

async function addGroupConstraints() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    console.log('=== ADDING GROUP THERAPY FOREIGN KEY CONSTRAINTS ===\n');

    // group_sessions foreign keys
    await addConstraintIfNotExists('group_sessions_facilitatorId_fkey', `
      ALTER TABLE "group_sessions"
      ADD CONSTRAINT "group_sessions_facilitatorId_fkey"
      FOREIGN KEY ("facilitatorId") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
    `);

    await addConstraintIfNotExists('group_sessions_coFacilitatorId_fkey', `
      ALTER TABLE "group_sessions"
      ADD CONSTRAINT "group_sessions_coFacilitatorId_fkey"
      FOREIGN KEY ("coFacilitatorId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    await addConstraintIfNotExists('group_sessions_appointmentTypeId_fkey', `
      ALTER TABLE "group_sessions"
      ADD CONSTRAINT "group_sessions_appointmentTypeId_fkey"
      FOREIGN KEY ("appointmentTypeId") REFERENCES "appointment_types"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
    `);

    // group_members foreign keys
    await addConstraintIfNotExists('group_members_groupId_fkey', `
      ALTER TABLE "group_members"
      ADD CONSTRAINT "group_members_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "group_sessions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await addConstraintIfNotExists('group_members_clientId_fkey', `
      ALTER TABLE "group_members"
      ADD CONSTRAINT "group_members_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "clients"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
    `);

    await addConstraintIfNotExists('group_members_screenedBy_fkey', `
      ALTER TABLE "group_members"
      ADD CONSTRAINT "group_members_screenedBy_fkey"
      FOREIGN KEY ("screenedBy") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    // group_attendance foreign keys
    await addConstraintIfNotExists('group_attendance_groupMemberId_fkey', `
      ALTER TABLE "group_attendance"
      ADD CONSTRAINT "group_attendance_groupMemberId_fkey"
      FOREIGN KEY ("groupMemberId") REFERENCES "group_members"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    await addConstraintIfNotExists('group_attendance_appointmentId_fkey', `
      ALTER TABLE "group_attendance"
      ADD CONSTRAINT "group_attendance_appointmentId_fkey"
      FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    console.log('\n✅ All foreign key constraints processed!');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addGroupConstraints();
