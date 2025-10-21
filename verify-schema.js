// Script to verify all tables exist in production database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr'
    }
  }
});

// List of expected tables from schema.prisma
const expectedTables = [
  'users',
  'practice_settings',
  'clients',
  'emergency_contacts',
  'legal_guardians',
  'insurance_information',
  'appointments',
  'telehealth_sessions',
  'telehealth_consents',
  'clinician_schedules',
  'schedule_exceptions',
  'waitlist_entries',
  'reminder_settings',
  'service_codes',
  'clinical_notes',
  'treatment_plans',
  'diagnoses',
  'medications',
  'diagnosis_history',
  'clinical_note_diagnoses',
  'supervision_sessions',
  'supervision_hours_log',
  'portal_accounts',
  'intake_forms',
  'intake_form_submissions',
  'assessment_assignments',
  'portal_messages',
  'prescription_refill_requests',
  'charge_entries',
  'payment_records',
  'client_statements',
  'client_documents',
  'insurance_cards',
  'payment_methods',
  'form_assignments',
  'document_signatures',
  'shared_documents',
  'session_reviews',
  'therapist_change_requests',
  'client_referrals',
  'mood_entries',
  'symptom_definitions',
  'client_symptom_trackers',
  'daily_prompts',
  'prompt_responses',
  'engagement_streaks',
  'milestones',
  'pre_session_preps',
  'resources',
  'resource_assignments',
  'crisis_toolkits',
  'crisis_toolkit_usage',
  'audio_messages',
  'audio_play_logs',
  'homework_assignments',
  'therapeutic_goals',
  'sub_goals',
  'goal_progress_updates',
  'win_entries',
  'win_comments',
  'coping_skill_logs',
  'scheduled_check_ins',
  'reminder_nudges',
  'nudge_deliveries',
  'micro_content',
  'micro_content_deliveries',
  'journal_entries',
  'ai_journal_prompts',
  'journal_comments',
  'voice_memos',
  'session_summaries',
  'audit_logs',
  'system_config',
  'productivity_metrics',
  'compliance_alerts',
  'georgia_compliance_rules',
  'performance_goals'
];

async function verifySchema() {
  try {
    console.log('Verifying database schema...\n');

    // Query to get all tables in the database
    const result = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    const actualTables = result.map(row => row.table_name);

    console.log(`Expected tables: ${expectedTables.length}`);
    console.log(`Actual tables: ${actualTables.length}\n`);

    // Check for missing tables
    const missingTables = expectedTables.filter(table => !actualTables.includes(table));

    if (missingTables.length > 0) {
      console.log('❌ MISSING TABLES:');
      missingTables.forEach(table => console.log(`  - ${table}`));
      console.log('');
    } else {
      console.log('✅ All expected tables exist!\n');
    }

    // Check for extra tables (not in schema)
    const extraTables = actualTables.filter(table =>
      !expectedTables.includes(table) &&
      table !== '_prisma_migrations'
    );

    if (extraTables.length > 0) {
      console.log('ℹ️  Extra tables (not in schema):');
      extraTables.forEach(table => console.log(`  - ${table}`));
      console.log('');
    }

    // List all tables
    console.log('All database tables:');
    actualTables.forEach(table => {
      const status = expectedTables.includes(table) ? '✓' : '?';
      console.log(`  ${status} ${table}`);
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log('Summary:');
    console.log(`  Expected: ${expectedTables.length}`);
    console.log(`  Found: ${actualTables.length}`);
    console.log(`  Missing: ${missingTables.length}`);
    console.log(`  Extra: ${extraTables.length}`);
    console.log(`${'='.repeat(60)}`);

    if (missingTables.length === 0) {
      console.log('\n✅ DATABASE SCHEMA VERIFICATION SUCCESSFUL!');
    } else {
      console.log('\n❌ DATABASE SCHEMA VERIFICATION FAILED!');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error verifying schema:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifySchema();
