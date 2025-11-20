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

async function testUserInsert() {
  try {
    console.log('🔍 Testing user insert with first user from dev...\n');

    // Get first user from dev
    const users = await devPrisma.$queryRaw`SELECT * FROM users LIMIT 1`;
    const user = users[0];

    console.log('📦 Sample user data:');
    console.log(JSON.stringify(user, null, 2));

    // Get column info from prod
    const columnInfo = await prodPrisma.$queryRaw`
      SELECT column_name, udt_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    console.log('\n📋 Production users table columns:');
    columnInfo.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });

    // Filter to common columns (excluding supervisorId)
    const filteredUser = {};
    const columnTypes = {};

    for (const colInfo of columnInfo) {
      const colName = colInfo.column_name;
      if (colName !== 'supervisorId' && user[colName] !== undefined) {
        filteredUser[colName] = user[colName];
        columnTypes[colName] = colInfo.udt_name;
      }
    }

    const columns = Object.keys(filteredUser);
    const values = Object.values(filteredUser);

    // Build placeholders with type casts
    const placeholders = columns.map((col, i) => {
      const type = columnTypes[col];
      // Handle enum arrays
      if (type.startsWith('_')) {
        const enumName = type.substring(1);
        return `$${i + 1}::${enumName}[]`;
      }
      return `$${i + 1}`;
    }).join(', ');

    const columnList = columns.map(c => `"${c}"`).join(', ');

    const sql = `INSERT INTO "users" (${columnList}) VALUES (${placeholders})`;

    console.log('\n📝 Generated SQL:');
    console.log(sql);
    console.log('\n📦 Values:');
    values.forEach((val, i) => {
      console.log(`  $${i + 1}: ${typeof val} - ${JSON.stringify(val)}`);
    });

    console.log('\n🚀 Attempting insert...');
    await prodPrisma.$executeRawUnsafe(sql, ...values);
    console.log('✅ Insert successful!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:');
    console.error(error);
  } finally {
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }
}

testUserInsert();
