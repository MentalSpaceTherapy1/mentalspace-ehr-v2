const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setPassword() {
  try {
    const password = 'SecurePass123!';
    const passwordHash = await bcrypt.hash(password, 10);

    const updated = await prisma.portalAccount.update({
      where: { email: 'lelejoseli@gmail.com' },
      data: { password: passwordHash }
    });

    console.log('✅ Password set successfully!');
    console.log('\n=== PORTAL LOGIN CREDENTIALS ===');
    console.log('Email:', updated.email);
    console.log('Password:', password);
    console.log('\n📍 Login at: http://localhost:5175/portal/login');

    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

setPassword();
