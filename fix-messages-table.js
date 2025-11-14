const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function fixMessagesTable() {
  try {
    await client.connect();
    console.log('Connected to dev database\n');

    console.log('=== FIXING MESSAGES TABLE ===\n');

    // Check existing columns
    const columnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'messages'
      ORDER BY ordinal_position;
    `);

    console.log('Current columns in messages table:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    console.log('');

    const existingColumns = new Set(columnsResult.rows.map(r => r.column_name));

    // Create enums if they don't exist
    console.log('Creating enums if not exists...');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "RecipientType" AS ENUM ('INDIVIDUAL', 'DEPARTMENT', 'TEAM', 'ALL_STAFF', 'ROLE_BASED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ RecipientType enum');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "MessageType" AS ENUM ('DIRECT', 'BROADCAST', 'ANNOUNCEMENT', 'ALERT', 'SHIFT_HANDOFF');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ MessageType enum');

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "MessagePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ MessagePriority enum\n');

    console.log('Adding missing columns...\n');

    // Add recipientType if missing
    if (!existingColumns.has('recipientType')) {
      await client.query(`
        ALTER TABLE "messages"
        ADD COLUMN "recipientType" "RecipientType" NOT NULL DEFAULT 'INDIVIDUAL'::"RecipientType";
      `);
      console.log('✓ Added recipientType column');
    } else {
      console.log('⊘ recipientType already exists');
    }

    // Add recipientIds if missing
    if (!existingColumns.has('recipientIds')) {
      await client.query(`
        ALTER TABLE "messages"
        ADD COLUMN "recipientIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
      `);
      console.log('✓ Added recipientIds column');
    } else {
      console.log('⊘ recipientIds already exists');
    }

    // Add messageType if missing
    if (!existingColumns.has('messageType')) {
      await client.query(`
        ALTER TABLE "messages"
        ADD COLUMN "messageType" "MessageType" NOT NULL DEFAULT 'DIRECT'::"MessageType";
      `);
      console.log('✓ Added messageType column');
    } else {
      console.log('⊘ messageType already exists');
    }

    // Add readBy if missing
    if (!existingColumns.has('readBy')) {
      await client.query(`
        ALTER TABLE "messages"
        ADD COLUMN "readBy" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
      `);
      console.log('✓ Added readBy column');
    } else {
      console.log('⊘ readBy already exists');
    }

    // Add readAt if missing
    if (!existingColumns.has('readAt')) {
      await client.query(`
        ALTER TABLE "messages"
        ADD COLUMN "readAt" JSONB;
      `);
      console.log('✓ Added readAt column');
    } else {
      console.log('⊘ readAt already exists');
    }

    // Add threadId if missing
    if (!existingColumns.has('threadId')) {
      await client.query(`
        ALTER TABLE "messages"
        ADD COLUMN "threadId" TEXT;
      `);
      console.log('✓ Added threadId column');
    } else {
      console.log('⊘ threadId already exists');
    }

    // Add replyToId if missing
    if (!existingColumns.has('replyToId')) {
      await client.query(`
        ALTER TABLE "messages"
        ADD COLUMN "replyToId" TEXT;
      `);
      console.log('✓ Added replyToId column');
    } else {
      console.log('⊘ replyToId already exists');
    }

    // Remove old fields that don't match Prisma schema
    if (existingColumns.has('recipientId')) {
      await client.query(`ALTER TABLE "messages" DROP COLUMN "recipientId";`);
      console.log('✓ Removed old recipientId column');
    }

    if (existingColumns.has('channelId')) {
      await client.query(`ALTER TABLE "messages" DROP COLUMN "channelId";`);
      console.log('✓ Removed old channelId column');
    }

    if (existingColumns.has('parentMessageId')) {
      await client.query(`ALTER TABLE "messages" DROP COLUMN "parentMessageId";`);
      console.log('✓ Removed old parentMessageId column');
    }

    console.log('\n=== VERIFICATION ===\n');

    const finalColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'messages'
      ORDER BY ordinal_position;
    `);

    console.log('Final columns in messages table:');
    finalColumns.rows.forEach(col => {
      console.log(`  ✓ ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n✅ Messages table fixed successfully!');

  } catch (error) {
    console.error('\nError:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

fixMessagesTable();
