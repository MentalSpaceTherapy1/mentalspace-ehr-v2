const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:9JS1df2PprIr=_MCJgyrjB^C.os=^7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr?schema=public&sslmode=require'
    }
  }
});

async function createAdmin() {
  try {
    console.log('Creating admin user...');

    // Hash the password
    const hashedPassword = await bcrypt.hash('SecurePass123!', 10);

    // Create the admin user
    const user = await prisma.user.upsert({
      where: { email: 'admin@mentalspace.com' },
      update: {},
      create: {
        email: 'admin@mentalspace.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@mentalspace.com');
    console.log('Password: SecurePass123!');
    console.log('User ID:', user.id);

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
