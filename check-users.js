const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    take: 5,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      roles: true
    }
  });

  console.log('Existing users:', JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

checkUsers();
