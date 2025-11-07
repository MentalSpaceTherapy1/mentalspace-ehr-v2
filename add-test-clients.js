const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const testClients = [
  {
    medicalRecordNumber: 'MRN001',
    firstName: 'Sarah',
    lastName: 'Anderson',
    dateOfBirth: new Date('1990-05-15'),
    gender: 'FEMALE',
    primaryPhone: '555-0101',
    email: 'sarah.anderson@email.com',
    addressStreet1: '123 Main St',
    addressCity: 'Boston',
    addressState: 'MA',
    addressZipCode: '02101',
    status: 'ACTIVE'
  },
  {
    medicalRecordNumber: 'MRN002',
    firstName: 'Michael',
    lastName: 'Chen',
    dateOfBirth: new Date('1985-08-22'),
    gender: 'MALE',
    primaryPhone: '555-0103',
    email: 'michael.chen@email.com',
    addressStreet1: '456 Oak Ave',
    addressCity: 'Cambridge',
    addressState: 'MA',
    addressZipCode: '02139',
    status: 'ACTIVE'
  },
  {
    medicalRecordNumber: 'MRN003',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    dateOfBirth: new Date('1995-03-10'),
    gender: 'FEMALE',
    primaryPhone: '555-0105',
    email: 'emily.rodriguez@email.com',
    addressStreet1: '789 Elm St',
    addressCity: 'Somerville',
    addressState: 'MA',
    addressZipCode: '02143',
    status: 'ACTIVE'
  },
  {
    medicalRecordNumber: 'MRN004',
    firstName: 'David',
    lastName: 'Thompson',
    dateOfBirth: new Date('1978-11-30'),
    gender: 'MALE',
    primaryPhone: '555-0107',
    email: 'david.thompson@email.com',
    addressStreet1: '321 Pine Rd',
    addressCity: 'Brookline',
    addressState: 'MA',
    addressZipCode: '02445',
    status: 'ACTIVE'
  },
  {
    medicalRecordNumber: 'MRN005',
    firstName: 'Jessica',
    lastName: 'Martinez',
    dateOfBirth: new Date('1992-07-18'),
    gender: 'FEMALE',
    primaryPhone: '555-0109',
    email: 'jessica.martinez@email.com',
    addressStreet1: '654 Maple Dr',
    addressCity: 'Newton',
    addressState: 'MA',
    addressZipCode: '02458',
    status: 'ACTIVE'
  },
  {
    medicalRecordNumber: 'MRN006',
    firstName: 'Robert',
    lastName: 'Williams',
    dateOfBirth: new Date('1988-01-25'),
    gender: 'MALE',
    primaryPhone: '555-0111',
    email: 'robert.williams@email.com',
    addressStreet1: '987 Cedar Ln',
    addressCity: 'Waltham',
    addressState: 'MA',
    addressZipCode: '02453',
    status: 'ACTIVE'
  },
  {
    medicalRecordNumber: 'MRN007',
    firstName: 'Amanda',
    lastName: 'Taylor',
    dateOfBirth: new Date('1997-09-05'),
    gender: 'FEMALE',
    primaryPhone: '555-0113',
    email: 'amanda.taylor@email.com',
    addressStreet1: '147 Birch St',
    addressCity: 'Arlington',
    addressState: 'MA',
    addressZipCode: '02474',
    status: 'ACTIVE'
  },
  {
    medicalRecordNumber: 'MRN008',
    firstName: 'Christopher',
    lastName: 'Brown',
    dateOfBirth: new Date('1983-12-12'),
    gender: 'MALE',
    primaryPhone: '555-0115',
    email: 'christopher.brown@email.com',
    addressStreet1: '258 Willow Way',
    addressCity: 'Medford',
    addressState: 'MA',
    addressZipCode: '02155',
    status: 'ACTIVE'
  },
  {
    medicalRecordNumber: 'MRN009',
    firstName: 'Nicole',
    lastName: 'Davis',
    dateOfBirth: new Date('1991-04-20'),
    gender: 'FEMALE',
    primaryPhone: '555-0117',
    email: 'nicole.davis@email.com',
    addressStreet1: '369 Spruce Ct',
    addressCity: 'Quincy',
    addressState: 'MA',
    addressZipCode: '02169',
    status: 'ACTIVE'
  },
  {
    medicalRecordNumber: 'MRN010',
    firstName: 'Kevin',
    lastName: 'Johnson',
    dateOfBirth: new Date('1986-06-08'),
    gender: 'MALE',
    primaryPhone: '555-0119',
    email: 'kevin.johnson@email.com',
    addressStreet1: '741 Poplar Ave',
    addressCity: 'Malden',
    addressState: 'MA',
    addressZipCode: '02148',
    status: 'ACTIVE'
  }
];

async function addTestClients() {
  try {
    console.log('Adding 10 test clients to the database...\n');

    // Get admin user to use as createdBy
    const adminUser = await prisma.user.findFirst({
      where: { roles: { has: 'ADMINISTRATOR' } }
    });

    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.');
      return;
    }

    console.log(`Using admin user: ${adminUser.firstName} ${adminUser.lastName} (ID: ${adminUser.id})\n`);

    for (const client of testClients) {
      const created = await prisma.client.create({
        data: {
          ...client,
          createdBy: adminUser.id,
          lastModifiedBy: adminUser.id,
          primaryTherapist: {
            connect: { id: adminUser.id }
          }
        }
      });
      console.log(`✅ Created client: ${created.firstName} ${created.lastName} (ID: ${created.id})`);
    }

    console.log('\n✅ Successfully added all 10 test clients!');

    // Display summary
    const totalClients = await prisma.client.count();
    console.log(`\n📊 Total clients in database: ${totalClients}`);

  } catch (error) {
    console.error('❌ Error adding clients:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestClients();
