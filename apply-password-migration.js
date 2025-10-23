const { Client } = require('pg');
const fs = require('fs');

async function applyMigration() {
  const client = new Client({
    host: 'mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com',
    port: 5432,
    database: 'mentalspace_ehr',
    user: 'mentalspace_admin',
    password: 'MentalSpace2024!SecurePwd',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to production database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    console.log('\n📦 Applying password management migration...');
    const sql = fs.readFileSync('packages/database/prisma/migrations/20251022014019_add_password_management_fields/migration.sql', 'utf8');
    await client.query(sql);
    console.log('✅ Migration applied successfully!');

    console.log('\n🔍 Verifying new columns...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('mustChangePassword', 'passwordResetToken', 'passwordResetExpiry', 'emailVerified', 'emailVerificationToken', 'invitationSentAt', 'invitationToken')
      ORDER BY column_name
    `);

    console.log('\n📊 Columns added:');
    console.table(result.rows);
    console.log(`\n✅ ${result.rows.length}/7 columns verified\n`);

    if (result.rows.length === 7) {
      console.log('🎉 Password management system is ready!');
      console.log('\nNew capabilities:');
      console.log('✓ Staff invitation emails with temporary passwords');
      console.log('✓ Force password change on first login');
      console.log('✓ Self-service password reset for staff');
      console.log('✓ Client portal invitation emails');
      console.log('✓ Email verification for portal accounts');
    } else {
      console.warn('⚠️  Some columns may be missing. Please check the migration.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
