const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function checkBrendaPermissions() {
  try {
    // Find Brenda's user record
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'brenda', mode: 'insensitive' } },
          { firstName: { contains: 'brenda', mode: 'insensitive' } },
          { lastName: { contains: 'brenda', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('=== Users matching "brenda" ===');
    console.log(JSON.stringify(users, null, 2));

    if (users.length > 0) {
      console.log('\n=== Role Analysis ===');
      users.forEach(user => {
        console.log(`\nUser: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`Role stored in DB: "${user.role}"`);
        console.log(`Role type: ${typeof user.role}`);
        console.log(`Is Active: ${user.isActive}`);
        console.log(`Created: ${user.createdAt}`);

        // Check if role is an array or string
        if (Array.isArray(user.role)) {
          console.log(`Role is array with ${user.role.length} items:`, user.role);
        } else if (typeof user.role === 'string') {
          console.log(`Role is string: "${user.role}"`);
          // Try parsing as JSON
          try {
            const parsed = JSON.parse(user.role);
            console.log(`Parsed as JSON:`, parsed);
          } catch (e) {
            console.log(`Cannot parse as JSON - it's a plain string`);
          }
        } else {
          console.log(`Role is unexpected type:`, user.role);
        }
      });
    }

    // Also check the schema to understand the role column
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'role'
    `;
    console.log('\n=== Database Schema for role column ===');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBrendaPermissions();
