const { Client } = require('pg');

const client = new Client({
  host: 'mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'mentalspace_ehr',
  user: 'mentalspace_admin',
  password: 'MentalSpace2024!SecurePwd',
  ssl: { rejectUnauthorized: false }
});

async function addEnumsAndColumns() {
  try {
    await client.connect();
    console.log('Connected to production database');

    console.log('\n=== CREATING EMPLOYMENT ENUM TYPES ===');

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

    console.log('\n=== ADDING ENUM COLUMNS ===');

    // Add employmentStatus column
    try {
      await client.query(`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employmentStatus" "EmploymentStatus" DEFAULT 'ACTIVE'
      `);
      console.log('✓ Added employmentStatus column');
    } catch (error) {
      console.log(`⚠️  employmentStatus column: ${error.message}`);
    }

    // Add employmentType column
    try {
      await client.query(`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employmentType" "EmploymentType"
      `);
      console.log('✓ Added employmentType column');
    } catch (error) {
      console.log(`⚠️  employmentType column: ${error.message}`);
    }

    // Verify all employee columns exist
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('employeeId', 'hireDate', 'terminationDate', 'employmentStatus', 'department', 'jobTitle', 'workLocation', 'employmentType', 'managerId')
      ORDER BY column_name;
    `);

    console.log('\n=== VERIFICATION ===');
    console.log('Columns found:', result.rows.map(r => r.column_name).join(', '));

    if (result.rows.length === 9) {
      console.log('✅ All 9 employee fields successfully added to users table');
    } else {
      console.log(`⚠️  Only ${result.rows.length}/9 columns found`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

addEnumsAndColumns();
