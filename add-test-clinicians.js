const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function addTestClinicians() {
  try {
    console.log('👨‍⚕️ Adding test clinicians to database...\n');

    const testClinicians = [
      {
        email: 'dr.smith@chctherapy.com',
        firstName: 'John',
        lastName: 'Smith',
        title: 'Dr.',
        credentials: ['PhD', 'LCSW'],
        specialties: [],
        languagesSpoken: [],
        roles: ['CLINICIAN'],
        password: 'Clinician123!',
      },
      {
        email: 'dr.johnson@chctherapy.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        title: 'Dr.',
        credentials: ['PsyD'],
        specialties: [],
        languagesSpoken: [],
        roles: ['CLINICIAN'],
        password: 'Clinician123!',
      },
      {
        email: 'therapist.williams@chctherapy.com',
        firstName: 'Michael',
        lastName: 'Williams',
        title: 'Mr.',
        credentials: ['LMFT'],
        specialties: [],
        languagesSpoken: [],
        roles: ['CLINICIAN'],
        password: 'Clinician123!',
      },
      {
        email: 'therapist.brown@chctherapy.com',
        firstName: 'Emily',
        lastName: 'Brown',
        title: 'Ms.',
        credentials: ['LPC'],
        specialties: [],
        languagesSpoken: [],
        roles: ['CLINICIAN'],
        password: 'Clinician123!',
      },
    ];

    for (const clinician of testClinicians) {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: clinician.email }
      });

      if (existing) {
        console.log(`⚠️  User ${clinician.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(clinician.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: clinician.email,
          password: hashedPassword,
          firstName: clinician.firstName,
          lastName: clinician.lastName,
          title: clinician.title,
          credentials: clinician.credentials,
          specialties: clinician.specialties,
          languagesSpoken: clinician.languagesSpoken,
          roles: clinician.roles,
          isActive: true,
        }
      });

      console.log(`✅ Created clinician: ${clinician.title} ${clinician.firstName} ${clinician.lastName}`);
      console.log(`   Email: ${clinician.email}`);
      console.log(`   Password: ${clinician.password}`);
      console.log(`   ID: ${user.id}\n`);
    }

    // Verify clinicians were added
    const allClinicians = await prisma.user.findMany({
      where: {
        roles: {
          has: 'CLINICIAN'
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        title: true,
        roles: true
      }
    });

    console.log(`\n📊 Total clinicians in database: ${allClinicians.length}`);
    console.log('\n✅ Clinician dropdown should now be populated with these users!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestClinicians();
