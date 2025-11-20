const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient();

async function checkRoles() {
  try {
    // Check UserRole enum values in database
    const enumValues = await prisma.$queryRaw`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
      ORDER BY enumsortorder
    `;

    console.log('=== UserRole enum values in production database ===');
    console.log(JSON.stringify(enumValues, null, 2));

    // Check Elize's roles
    const user = await prisma.user.findUnique({
      where: { email: 'ejoseph@chctherapy.com' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true
      }
    });

    console.log('\n=== User Elize Joseph ===');
    console.log(JSON.stringify(user, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoles();
