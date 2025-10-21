const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkMigrations() {
  try {
    console.log('Checking applied migrations in production database...\n');

    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at, logs
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC
    `;

    console.log(`Total migrations applied: ${migrations.length}\n`);

    migrations.forEach((m, idx) => {
      console.log(`${(migrations.length - idx).toString().padStart(2)}. ${m.migration_name}`);
      console.log(`    Applied: ${m.finished_at}`);
      if (m.logs) {
        console.log(`    Logs: ${m.logs.substring(0, 100)}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigrations();
