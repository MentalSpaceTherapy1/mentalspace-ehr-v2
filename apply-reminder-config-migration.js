// Apply ClinicalNoteReminderConfig migration to production database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Creating ClinicalNoteReminderConfig table...');

  // Create enum type
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "NoteReminderConfigType" AS ENUM ('PRACTICE', 'USER', 'NOTE_TYPE');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log('Created NoteReminderConfigType enum');

  // Create table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "clinical_note_reminder_configs" (
      "id" TEXT NOT NULL,
      "configurationType" "NoteReminderConfigType" NOT NULL DEFAULT 'PRACTICE',
      "userId" TEXT,
      "noteType" TEXT,
      "enabled" BOOLEAN NOT NULL DEFAULT true,
      "reminderIntervals" INTEGER[] DEFAULT ARRAY[72, 48, 24]::INTEGER[],
      "sendOverdueReminders" BOOLEAN NOT NULL DEFAULT true,
      "overdueReminderFrequency" INTEGER NOT NULL DEFAULT 24,
      "maxOverdueReminders" INTEGER NOT NULL DEFAULT 3,
      "enableSundayWarnings" BOOLEAN NOT NULL DEFAULT true,
      "sundayWarningTime" TEXT NOT NULL DEFAULT '17:00',
      "enableDailyDigest" BOOLEAN NOT NULL DEFAULT false,
      "digestTime" TEXT NOT NULL DEFAULT '09:00',
      "digestDays" TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']::TEXT[],
      "enableEscalation" BOOLEAN NOT NULL DEFAULT true,
      "escalationAfterHours" INTEGER NOT NULL DEFAULT 48,
      "escalateTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "escalationMessage" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "clinical_note_reminder_configs_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log('Created clinical_note_reminder_configs table');

  // Create unique constraint
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "clinical_note_reminder_configs"
      ADD CONSTRAINT "clinical_note_reminder_configs_configurationType_userId_noteType_key"
      UNIQUE ("configurationType", "userId", "noteType");
    EXCEPTION
      WHEN duplicate_table THEN NULL;
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log('Created unique constraint');

  // Create indexes
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "clinical_note_reminder_configs_configurationType_idx"
    ON "clinical_note_reminder_configs"("configurationType");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "clinical_note_reminder_configs_userId_idx"
    ON "clinical_note_reminder_configs"("userId");
  `);
  console.log('Created indexes');

  // Insert default practice configuration
  const existingConfig = await prisma.$queryRaw`
    SELECT id FROM "clinical_note_reminder_configs"
    WHERE "configurationType" = 'PRACTICE'
    LIMIT 1
  `;

  if (existingConfig.length === 0) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "clinical_note_reminder_configs" (
        "id",
        "configurationType",
        "enabled",
        "reminderIntervals",
        "sendOverdueReminders",
        "overdueReminderFrequency",
        "maxOverdueReminders",
        "enableSundayWarnings",
        "sundayWarningTime",
        "enableDailyDigest",
        "digestTime",
        "digestDays",
        "enableEscalation",
        "escalationAfterHours",
        "escalateTo",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid()::text,
        'PRACTICE',
        true,
        ARRAY[72, 48, 24]::INTEGER[],
        true,
        24,
        3,
        true,
        '17:00',
        false,
        '09:00',
        ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']::TEXT[],
        true,
        48,
        ARRAY[]::TEXT[],
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `);
    console.log('Inserted default practice configuration');
  } else {
    console.log('Practice configuration already exists');
  }

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
