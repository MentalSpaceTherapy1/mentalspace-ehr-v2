const { PrismaClient } = require('@mentalspace/database');

const devPrisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr" }
  }
});

const prodPrisma = new PrismaClient({
  datasources: {
    db: { url: "postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr" }
  }
});

async function getCommonColumns(tableName) {
  // Get columns that exist in BOTH dev and prod databases
  const result = await prodPrisma.$queryRaw`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = ${tableName}
    AND table_schema = 'public'
  `;

  return result.map(r => r.column_name);
}

async function copyTableData(tableName, devRows, commonColumns) {
  console.log(`📦 Copying ${devRows.length} rows to ${tableName}...`);

  for (const row of devRows) {
    //Filter row to only include columns that exist in production
    const filteredRow = {};
    for (const col of commonColumns) {
      if (row[col] !== undefined) {
        filteredRow[col] = row[col];
      }
    }

    // Build column list and placeholders
    const columns = Object.keys(filteredRow);
    const values = Object.values(filteredRow);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const columnList = columns.map(c => `"${c}"`).join(', ');

    try {
      await prodPrisma.$executeRawUnsafe(
        `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`,
        ...values
      );
    } catch (error) {
      console.log(`  ⚠ Error inserting row into ${tableName}: ${error.message.substring(0, 100)}`);
    }
  }

  console.log(`✅ Copied ${devRows.length} rows to ${tableName}\n`);
}

async function migrate() {
  try {
    console.log('🔍 Checking current data...\n');

    const [devClients, prodClients] = await Promise.all([
      devPrisma.$queryRaw`SELECT COUNT(*) FROM clients`,
      prodPrisma.$queryRaw`SELECT COUNT(*) FROM clients`
    ]);

    console.log(`Dev Database: ${devClients[0].count} clients`);
    console.log(`Prod Database: ${prodClients[0].count} clients\n`);

    console.log('⚠️  WARNING: This will DELETE ALL existing production data and replace it with dev data!');
    console.log('Starting migration in 3 seconds...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🗑️  Step 1: Clearing production database using TRUNCATE CASCADE...');

    // Core tables to migrate
    const coreTables = [
      'users',
      'clients',
      'appointments',
      'emergency_contacts',
      'legal_guardians',
      'insurance_information',
      'diagnoses',
      'clinical_notes'
    ];

    // Truncate in reverse order to handle foreign keys
    for (const tableName of [...coreTables].reverse()) {
      try {
        await prodPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE`);
        console.log(`  ✓ Cleared ${tableName}`);
      } catch (error) {
        console.log(`  ⚠ Skipping ${tableName} (${error.message.substring(0, 50)}...)`);
      }
    }

    console.log('✅ Production database cleared\n');

    // Copy users first (with two-pass for supervisorId)
    console.log('📦 Step 2: Copying users...');
    const userColumns = await getCommonColumns('users');
    const users = await devPrisma.$queryRaw`SELECT * FROM users`;

    // First pass: Insert users without supervisorId
    for (const user of users) {
      const filteredUser = {};
      for (const col of userColumns) {
        if (col !== 'supervisorId' && user[col] !== undefined) {
          filteredUser[col] = user[col];
        }
      }

      const columns = Object.keys(filteredUser);
      const values = Object.values(filteredUser);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnList = columns.map(c => `"${c}"`).join(', ');

      await prodPrisma.$executeRawUnsafe(
        `INSERT INTO "users" (${columnList}) VALUES (${placeholders})`,
        ...values
      );
    }

    // Second pass: Update supervisorId
    for (const user of users) {
      if (user.supervisorId) {
        await prodPrisma.$executeRawUnsafe(
          `UPDATE "users" SET "supervisorId" = $1 WHERE id = $2`,
          user.supervisorId,
          user.id
        );
      }
    }

    console.log(`✅ Copied ${users.length} users\n`);

    // Copy other tables
    for (const tableName of ['clients', 'appointments', 'emergency_contacts', 'legal_guardians', 'insurance_information', 'diagnoses', 'clinical_notes']) {
      try {
        const columns = await getCommonColumns(tableName);
        const rows = await devPrisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`);

        if (rows.length > 0) {
          await copyTableData(tableName, rows, columns);
        } else {
          console.log(`⚠ No data in ${tableName}\n`);
        }
      } catch (error) {
        console.log(`⚠ Error with ${tableName}: ${error.message}\n`);
      }
    }

    console.log('✅ MIGRATION COMPLETE!\n');
    console.log('📊 Final counts:');
    const [finalClients, finalUsers, finalAppts] = await Promise.all([
      prodPrisma.$queryRaw`SELECT COUNT(*) FROM clients`,
      prodPrisma.$queryRaw`SELECT COUNT(*) FROM users`,
      prodPrisma.$queryRaw`SELECT COUNT(*) FROM appointments`
    ]);
    console.log(`  Clients: ${finalClients[0].count}`);
    console.log(`  Users: ${finalUsers[0].count}`);
    console.log(`  Appointments: ${finalAppts[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

migrate();
