const { Client } = require('pg');

const client = new Client({
  host: 'mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'mentalspace_ehr',
  user: 'mentalspace_admin',
  password: 'MentalSpace2024!SecurePwd',
  ssl: { rejectUnauthorized: false }
});

async function addEmployeeFields() {
  try {
    await client.connect();
    console.log('Connected to production database');

    // Add missing columns to users table
    console.log('\n=== ADDING EMPLOYEE FIELDS TO USERS TABLE ===');

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

    // Verify columns were added
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
      console.log('✅ All 9 employee fields successfully added');
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

addEmployeeFields();
