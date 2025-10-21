const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'brendajb@chctherapy.com' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      roles: true,
      isActive: true,
      createdAt: true,
    },
  });

  console.log('User record:', JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}

checkUser();
