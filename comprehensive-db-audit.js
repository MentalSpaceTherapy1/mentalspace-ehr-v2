const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function comprehensiveDbAudit() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    console.log('=== COMPREHENSIVE DATABASE AUDIT ===\n');

    // Read Prisma schema
    const schemaPath = path.join(__dirname, 'packages', 'database', 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');

    // Extract all model names and their @@map values
    const modelRegex = /model\s+(\w+)\s*\{[\s\S]*?(?:@@map\("([^"]+)"\)|$)/g;
    const models = [];
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      const modelName = match[1];
      const tableName = match[2] || modelName.replace(/([A-Z])/g, '_$1').toLowerCase().substring(1);
      models.push({ modelName, tableName });
    }

    console.log(`Found ${models.length} models in Prisma schema\n`);

    // Get all existing tables from database
    const existingTablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const existingTables = new Set(existingTablesResult.rows.map(r => r.table_name));

    console.log(`Found ${existingTables.size} tables in database\n`);

    // Find missing tables
    const missingTables = [];
    const existingModels = [];

    for (const { modelName, tableName } of models) {
      if (existingTables.has(tableName)) {
        existingModels.push({ modelName, tableName });
      } else {
        missingTables.push({ modelName, tableName });
      }
    }

    if (missingTables.length > 0) {
      console.log('❌ MISSING TABLES:\n');
      missingTables.forEach(({ modelName, tableName }) => {
        console.log(`  ❌ ${tableName} (Prisma model: ${modelName})`);
      });
      console.log('');
    } else {
      console.log('✅ All Prisma models have corresponding tables!\n');
    }

    console.log(`✅ Existing tables: ${existingModels.length}`);
    console.log(`❌ Missing tables: ${missingTables.length}\n`);

    // Show existing tables
    console.log('=== EXISTING TABLES ===\n');
    existingModels.forEach(({ modelName, tableName }) => {
      console.log(`  ✓ ${tableName} (${modelName})`);
    });

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total Prisma models: ${models.length}`);
    console.log(`Existing tables: ${existingModels.length}`);
    console.log(`Missing tables: ${missingTables.length}`);

    if (missingTables.length > 0) {
      console.log('\n⚠️  CRITICAL: Missing tables will cause API errors!');
      console.log('Priority tables to create:');
      missingTables.slice(0, 10).forEach(({ modelName, tableName }) => {
        console.log(`  - ${tableName}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

comprehensiveDbAudit();
