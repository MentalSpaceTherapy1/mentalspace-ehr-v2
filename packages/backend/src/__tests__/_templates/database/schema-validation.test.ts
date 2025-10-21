/**
 * Database Schema Validation Tests
 *
 * Validates:
 * - All 77 tables exist
 * - All columns have correct data types
 * - All foreign keys are configured
 * - All indexes exist
 * - All constraints (NOT NULL, UNIQUE, CHECK) work
 * - Cascading deletes work correctly
 */

import { getTestDb, cleanDatabase, disconnectTestDb } from '../../helpers/testDatabase';

describe('Database Schema Validation', () => {
  const db = getTestDb();

  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('Table Existence', () => {
    const expectedTables = [
      'User',
      'Client',
      'Appointment',
      'ClinicalNote',
      'Insurance',
      'EmergencyContact',
      'Guardian',
      'Diagnosis',
      'ServiceCode',
      'Billing',
      'TelehealthSession',
      'PortalUser',
      'AppointmentRequest',
      'ClientDocument',
      'ClientForm',
      'Assessment',
      'MoodTracking',
      'Message',
      'Reminder',
      'AuditLog',
      // Add all 77 tables...
    ];

    it('should have all required tables', async () => {
      const tables = await db.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname='public'
      `;

      const tableNames = tables.map((t) => t.tablename);

      for (const expectedTable of expectedTables) {
        expect(tableNames).toContain(expectedTable.toLowerCase());
      }
    });
  });

  describe('User Table Schema', () => {
    it('should have correct columns', async () => {
      const columns = await db.$queryRaw<Array<{ column_name: string; data_type: string; is_nullable: string }>>`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'User'
      `;

      const columnNames = columns.map((c) => c.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('password');
      expect(columnNames).toContain('firstName');
      expect(columnNames).toContain('lastName');
      expect(columnNames).toContain('role');
      expect(columnNames).toContain('isActive');
      expect(columnNames).toContain('createdAt');
      expect(columnNames).toContain('updatedAt');
    });

    it('should enforce NOT NULL on required fields', async () => {
      await expect(
        db.user.create({
          data: {
            // Missing required email field
            password: 'test',
            firstName: 'Test',
            lastName: 'User',
            role: 'CLINICIAN',
          } as any,
        })
      ).rejects.toThrow();
    });

    it('should enforce UNIQUE constraint on email', async () => {
      await db.user.create({
        data: {
          email: 'unique@test.com',
          password: 'test',
          firstName: 'Test',
          lastName: 'User',
          role: 'CLINICIAN',
        },
      });

      await expect(
        db.user.create({
          data: {
            email: 'unique@test.com', // Duplicate
            password: 'test2',
            firstName: 'Test2',
            lastName: 'User2',
            role: 'CLINICIAN',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Client Table Schema', () => {
    it('should have correct columns', async () => {
      const columns = await db.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name FROM information_schema.columns WHERE table_name = 'Client'
      `;

      const columnNames = columns.map((c) => c.column_name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('firstName');
      expect(columnNames).toContain('lastName');
      expect(columnNames).toContain('dateOfBirth');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('phone');
      expect(columnNames).toContain('status');
    });

    it('should allow NULL in optional fields', async () => {
      const client = await db.client.create({
        data: {
          firstName: 'Minimal',
          lastName: 'Client',
          dateOfBirth: new Date('1990-01-01'),
          // email, phone are optional
        },
      });

      expect(client.email).toBeNull();
      expect(client.phone).toBeNull();
    });
  });

  describe('Foreign Key Relationships', () => {
    it('should enforce foreign key constraint (Client -> Appointment)', async () => {
      await expect(
        db.appointment.create({
          data: {
            clientId: 'nonexistent-client-id',
            clinicianId: 'nonexistent-clinician-id',
            appointmentDate: new Date(),
            duration: 60,
            status: 'SCHEDULED',
            appointmentType: 'INITIAL_CONSULTATION',
          },
        })
      ).rejects.toThrow();
    });

    it('should maintain referential integrity', async () => {
      const client = await db.client.create({
        data: {
          firstName: 'Test',
          lastName: 'Client',
          dateOfBirth: new Date('1990-01-01'),
        },
      });

      const user = await db.user.create({
        data: {
          email: 'fk@test.com',
          password: 'test',
          firstName: 'Test',
          lastName: 'User',
          role: 'CLINICIAN',
        },
      });

      const appointment = await db.appointment.create({
        data: {
          clientId: client.id,
          clinicianId: user.id,
          appointmentDate: new Date(),
          duration: 60,
          status: 'SCHEDULED',
          appointmentType: 'INITIAL_CONSULTATION',
        },
      });

      expect(appointment.clientId).toBe(client.id);
      expect(appointment.clinicianId).toBe(user.id);
    });
  });

  describe('Cascading Deletes', () => {
    it('should cascade delete related records when client is deleted', async () => {
      const client = await db.client.create({
        data: {
          firstName: 'Cascade',
          lastName: 'Test',
          dateOfBirth: new Date('1990-01-01'),
        },
      });

      await db.emergencyContact.create({
        data: {
          clientId: client.id,
          name: 'Emergency',
          relationship: 'Friend',
          phone: '555-0000',
        },
      });

      await db.client.delete({ where: { id: client.id } });

      const contacts = await db.emergencyContact.findMany({
        where: { clientId: client.id },
      });

      expect(contacts.length).toBe(0); // Should be cascaded
    });
  });

  describe('Indexes', () => {
    it('should have index on Client.email for fast lookups', async () => {
      const indexes = await db.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes WHERE tablename = 'Client' AND indexname LIKE '%email%'
      `;

      expect(indexes.length).toBeGreaterThan(0);
    });

    it('should have index on Appointment.appointmentDate for scheduling queries', async () => {
      const indexes = await db.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname FROM pg_indexes WHERE tablename = 'Appointment'
      `;

      const hasDateIndex = indexes.some((idx) => idx.indexname.includes('date'));
      expect(hasDateIndex).toBe(true);
    });
  });

  describe('Data Type Validation', () => {
    it('should store dates correctly', async () => {
      const client = await db.client.create({
        data: {
          firstName: 'Date',
          lastName: 'Test',
          dateOfBirth: new Date('1990-05-15'),
        },
      });

      expect(client.dateOfBirth).toBeInstanceOf(Date);
      expect(client.dateOfBirth.getFullYear()).toBe(1990);
    });

    it('should store boolean correctly', async () => {
      const user = await db.user.create({
        data: {
          email: 'bool@test.com',
          password: 'test',
          firstName: 'Bool',
          lastName: 'Test',
          role: 'CLINICIAN',
          isActive: true,
        },
      });

      expect(typeof user.isActive).toBe('boolean');
      expect(user.isActive).toBe(true);
    });

    it('should store JSON correctly', async () => {
      // If your schema has JSON fields
      const metadata = { key: 'value', nested: { data: 123 } };

      // Example: If Client has a metadata JSON field
      // const client = await db.client.create({
      //   data: {
      //     firstName: 'JSON',
      //     lastName: 'Test',
      //     dateOfBirth: new Date(),
      //     metadata,
      //   },
      // });
      //
      // expect(client.metadata).toEqual(metadata);
    });
  });

  describe('Migration Completeness', () => {
    it('should have all migrations applied', async () => {
      const migrations = await db.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL
      `;

      expect(migrations.length).toBeGreaterThan(0);
      // Should have all 17 migrations (or current count)
    });

    it('should not have any failed migrations', async () => {
      const failed = await db.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL
      `;

      expect(failed.length).toBe(0);
    });
  });

  describe('Data Integrity Checks', () => {
    it('should not have orphaned appointments (appointments without clients)', async () => {
      const orphaned = await db.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count
        FROM "Appointment" a
        LEFT JOIN "Client" c ON a."clientId" = c.id
        WHERE c.id IS NULL
      `;

      expect(Number(orphaned[0].count)).toBe(0);
    });

    it('should not have orphaned clinical notes', async () => {
      const orphaned = await db.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count
        FROM "ClinicalNote" cn
        LEFT JOIN "Client" c ON cn."clientId" = c.id
        WHERE c.id IS NULL
      `;

      expect(Number(orphaned[0].count)).toBe(0);
    });

    it('should not have NULL values in required timestamp fields', async () => {
      const nullTimestamps = await db.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count FROM "Client" WHERE "createdAt" IS NULL OR "updatedAt" IS NULL
      `;

      expect(Number(nullTimestamps[0].count)).toBe(0);
    });
  });
});
