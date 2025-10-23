const { PrismaClient } = require('@mentalspace/database');

const prisma = new PrismaClient();

async function auditClinicalNotes() {
  try {
    console.log('🔍 Auditing Clinical Notes for Missing Appointments...\n');

    // Get total counts
    const totalNotes = await prisma.clinicalNote.count();
    const notesWithoutAppointment = await prisma.clinicalNote.count({
      where: { appointmentId: null },
    });
    const notesWithAppointment = await prisma.clinicalNote.count({
      where: { appointmentId: { not: null } },
    });

    console.log('📊 Summary:');
    console.log(`   Total Notes: ${totalNotes}`);
    console.log(`   Notes WITH Appointment: ${notesWithAppointment} (${totalNotes > 0 ? Math.round((notesWithAppointment/totalNotes)*100) : 0}%)`);
    console.log(`   Notes WITHOUT Appointment: ${notesWithoutAppointment} (${totalNotes > 0 ? Math.round((notesWithoutAppointment/totalNotes)*100) : 0}%)`);
    console.log('');

    if (notesWithoutAppointment > 0) {
      console.log('⚠️  WARNING: Found notes without appointments!');
      console.log('   Migration will FAIL if these notes exist.');
      console.log('');

      // Get sample of notes without appointments
      const orphanedNotes = await prisma.clinicalNote.findMany({
        where: { appointmentId: null },
        take: 10,
        select: {
          id: true,
          clientId: true,
          noteType: true,
          sessionDate: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      console.log('   Sample of orphaned notes:');
      orphanedNotes.forEach((note, index) => {
        console.log(`   ${index + 1}. ID: ${note.id.substring(0, 8)}... | Type: ${note.noteType} | Session: ${note.sessionDate.toISOString().split('T')[0]}`);
      });
      console.log('');
      console.log('❌ ACTION REQUIRED: Create placeholder appointments for these notes before migration.');
    } else {
      console.log('✅ SAFE TO MIGRATE: All notes have appointments!');
    }

    console.log('');
    console.log('✨ Audit complete!');

  } catch (error) {
    console.error('❌ Error during audit:', error.message);
    if (error.code === 'P2021') {
      console.log('');
      console.log('   Note: The table might not exist yet, or the database is not accessible.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

auditClinicalNotes();
