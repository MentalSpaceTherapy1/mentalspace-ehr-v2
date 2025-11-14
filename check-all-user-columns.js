const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'mentalspace_ehr',
  user: 'mentalspace_admin',
  password: 'MentalSpace2024!SecurePwd',
  ssl: { rejectUnauthorized: false }
});

async function compareSchema() {
  try {
    await client.connect();
    console.log('Connected to production database');

    // Get all columns from users table
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY column_name;
    `);

    const dbColumns = result.rows.map(r => r.column_name);
    console.log('\n=== DATABASE COLUMNS (users table) ===');
    console.log(`Total: ${dbColumns.length} columns`);
    console.log(dbColumns.join(', '));

    // Expected columns from User model in schema.prisma
    const schemaColumns = [
      'id', 'email', 'password', 'firstName', 'middleName', 'lastName', 'suffix', 'preferredName',
      'roles', 'title', 'licenseNumber', 'licenseState', 'licenseExpiration', 'npiNumber',
      'deaNumber', 'taxonomyCode', 'specialties', 'languagesSpoken', 'profileBio',
      'profilePhotoS3', 'yearsOfExperience', 'education', 'approachesToTherapy', 'treatmentPhilosophy',
      'isUnderSupervision', 'supervisorId', 'supervisionStartDate', 'supervisionEndDate',
      'requiredSupervisionHours', 'completedSupervisionHours', 'isSupervisor', 'supervisionLicenses',
      'phoneNumber', 'officeExtension', 'personalEmail', 'emergencyContactName', 'emergencyContactPhone',
      'defaultOfficeLocation', 'availableForScheduling', 'acceptsNewClients',
      'emailNotifications', 'smsNotifications', 'appointmentReminders', 'noteReminders', 'supervisoryAlerts',
      'defaultRate', 'hourlyPayrollRate', 'taxId',
      'isActive', 'mfaEnabled', 'lastLoginDate',
      'mustChangePassword', 'passwordResetToken', 'passwordResetExpiry',
      'emailVerified', 'emailVerificationToken', 'invitationSentAt', 'invitationToken',
      'digitalSignature', 'signatureDate', 'signaturePin', 'signaturePassword', 'signatureBiometric',
      'employeeId', 'hireDate', 'terminationDate', 'employmentStatus', 'department',
      'jobTitle', 'workLocation', 'employmentType', 'managerId',
      'createdAt', 'updatedAt',
      'failedLoginAttempts', 'accountLockedUntil', 'passwordChangedAt', 'passwordHistory',
      'mfaSecret', 'mfaBackupCodes', 'mfaMethod', 'mfaEnabledAt'
    ];

    console.log('\n=== SCHEMA COLUMNS (from schema.prisma) ===');
    console.log(`Total: ${schemaColumns.length} columns`);

    // Find missing columns
    const missingInDb = schemaColumns.filter(col => !dbColumns.includes(col));
    const extraInDb = dbColumns.filter(col => !schemaColumns.includes(col));

    console.log('\n=== MISSING IN DATABASE ===');
    if (missingInDb.length > 0) {
      console.log(`❌ ${missingInDb.length} columns missing from database:`);
      missingInDb.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('✅ All schema columns exist in database');
    }

    console.log('\n=== EXTRA IN DATABASE ===');
    if (extraInDb.length > 0) {
      console.log(`⚠️  ${extraInDb.length} extra columns in database (not in schema):`);
      extraInDb.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('✅ No extra columns in database');
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

compareSchema();
