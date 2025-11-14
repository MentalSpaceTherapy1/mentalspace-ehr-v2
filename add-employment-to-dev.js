const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function addEmploymentFields() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    console.log('=== CREATING EMPLOYMENT ENUM TYPES ===');

    // Create EmploymentStatus enum
    try {
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'SUSPENDED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('✓ Created EmploymentStatus enum');
    } catch (error) {
      console.log(`⚠️  EmploymentStatus enum: ${error.message}`);
    }

    // Create EmploymentType enum
    try {
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN', 'PER_DIEM');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('✓ Created EmploymentType enum');
    } catch (error) {
      console.log(`⚠️  EmploymentType enum: ${error.message}`);
    }

    console.log('\n=== ADDING EMPLOYMENT COLUMNS ===');

    const columns = [
      { name: 'employeeId', sql: 'ADD COLUMN IF NOT EXISTS "employeeId" TEXT' },
      { name: 'hireDate', sql: 'ADD COLUMN IF NOT EXISTS "hireDate" TIMESTAMP(3)' },
      { name: 'terminationDate', sql: 'ADD COLUMN IF NOT EXISTS "terminationDate" TIMESTAMP(3)' },
      { name: 'employmentStatus', sql: 'ADD COLUMN IF NOT EXISTS "employmentStatus" "EmploymentStatus" DEFAULT \'ACTIVE\'' },
      { name: 'department', sql: 'ADD COLUMN IF NOT EXISTS "department" TEXT' },
      { name: 'jobTitle', sql: 'ADD COLUMN IF NOT EXISTS "jobTitle" TEXT' },
      { name: 'workLocation', sql: 'ADD COLUMN IF NOT EXISTS "workLocation" TEXT' },
      { name: 'employmentType', sql: 'ADD COLUMN IF NOT EXISTS "employmentType" "EmploymentType"' },
      { name: 'managerId', sql: 'ADD COLUMN IF NOT EXISTS "managerId" TEXT' }
    ];

    for (const column of columns) {
      try {
        await client.query(`ALTER TABLE "users" ${column.sql}`);
        console.log(`✓ Added column: ${column.name}`);
      } catch (error) {
        console.log(`⚠️  Column ${column.name}: ${error.message}`);
      }
    }

    // Add unique constraint on employeeId
    try {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "users_employeeId_key" ON "users"("employeeId") WHERE "employeeId" IS NOT NULL
      `);
      console.log('✓ Added unique constraint on employeeId');
    } catch (error) {
      console.log(`⚠️  Unique constraint: ${error.message}`);
    }

    // Verify
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('employeeId', 'hireDate', 'terminationDate', 'employmentStatus', 'department', 'jobTitle', 'workLocation', 'employmentType', 'managerId')
      ORDER BY column_name;
    `);

    console.log('\n=== VERIFICATION ===');
    console.log(`Found ${result.rows.length}/9 employment columns`);
    if (result.rows.length === 9) {
      console.log('✅ All 9 employment fields successfully added');
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addEmploymentFields();
