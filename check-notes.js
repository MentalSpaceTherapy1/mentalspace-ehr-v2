const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const notes = await prisma.clinicalNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        noteType: true,
        status: true,
        createdAt: true,
        client: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    console.log('\n=== LATEST 10 CLINICAL NOTES IN DATABASE ===');
    console.log(JSON.stringify(notes, null, 2));
    console.log('\nTotal notes found:', notes.length);
    
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
