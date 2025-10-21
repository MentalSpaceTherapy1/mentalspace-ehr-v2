import { PrismaClient } from '@mentalspace/database';

let prisma: PrismaClient;

/**
 * Get test database client
 * Uses a separate test database to avoid affecting production/development data
 */
export function getTestDb(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/mentalspace_test',
        },
      },
    });
  }
  return prisma;
}

/**
 * Clean all tables in the test database
 * Run this before/after each test to ensure isolation
 */
export async function cleanDatabase(): Promise<void> {
  const db = getTestDb();

  // Get all table names from Prisma
  const tablenames = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames) {
    if (tablename !== '_prisma_migrations') {
      try {
        await db.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
      } catch (error) {
        console.log(`Could not truncate ${tablename}`, error);
      }
    }
  }
}

/**
 * Disconnect from test database
 * Run this after all tests complete
 */
export async function disconnectTestDb(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

/**
 * Reset database to initial state with migrations
 */
export async function resetDatabase(): Promise<void> {
  await cleanDatabase();
  // Note: Migrations should be run manually before tests
  // npx prisma migrate deploy --schema=./packages/database/prisma/schema.prisma
}

/**
 * Create a test user for authentication tests
 */
export async function createTestUser(overrides: Partial<any> = {}) {
  const db = getTestDb();
  const bcrypt = require('bcryptjs');

  const defaultUser = {
    email: 'test@mentalspace.com',
    password: await bcrypt.hash('Test123!@#', 10),
    firstName: 'Test',
    lastName: 'User',
    role: 'CLINICIAN',
    isActive: true,
    emailVerified: true,
    ...overrides,
  };

  return await db.user.create({
    data: defaultUser,
  });
}

/**
 * Create a test client (patient)
 */
export async function createTestClient(overrides: Partial<any> = {}) {
  const db = getTestDb();

  const defaultClient = {
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-01-01'),
    email: 'client@test.com',
    phone: '555-0100',
    status: 'ACTIVE',
    ...overrides,
  };

  return await db.client.create({
    data: defaultClient,
  });
}

/**
 * Create a test appointment
 */
export async function createTestAppointment(clientId: string, clinicianId: string, overrides: Partial<any> = {}) {
  const db = getTestDb();

  const defaultAppointment = {
    clientId,
    clinicianId,
    appointmentDate: new Date(),
    duration: 60,
    status: 'SCHEDULED',
    appointmentType: 'INITIAL_CONSULTATION',
    ...overrides,
  };

  return await db.appointment.create({
    data: defaultAppointment,
  });
}

/**
 * Create a test clinical note
 */
export async function createTestClinicalNote(
  clientId: string,
  clinicianId: string,
  appointmentId: string,
  overrides: Partial<any> = {}
) {
  const db = getTestDb();

  const defaultNote = {
    clientId,
    clinicianId,
    appointmentId,
    noteType: 'Progress Note',
    sessionDate: new Date(),
    content: 'Test clinical note content',
    status: 'DRAFT',
    ...overrides,
  };

  return await db.clinicalNote.create({
    data: defaultNote,
  });
}
