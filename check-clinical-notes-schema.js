const { Client } = require('pg');

const client = new Client({
  host: 'mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'mentalspace_ehr',
  user: 'mentalspace_admin',
  password: 'MentalSpace2024!SecurePwd',
  ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
  try {
    await client.connect();
    console.log('Connected to production database');

    // Get all columns from clinical_notes table
    const result = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'clinical_notes'
      ORDER BY ordinal_position;
    `);

    console.log('\n=== CLINICAL_NOTES TABLE COLUMNS ===');
    console.log('Total columns:', result.rows.length);
    console.log('\nColumns:');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });

    // Check specifically for AI-related columns
    const aiColumns = result.rows.filter(col =>
      col.column_name.toLowerCase().includes('ai') ||
      col.column_name.toLowerCase().includes('generated')
    );

    console.log('\n=== AI-RELATED COLUMNS ===');
    if (aiColumns.length > 0) {
      aiColumns.forEach(col => {
        console.log(`  ✓ ${col.column_name} exists`);
      });
    } else {
      console.log('  No AI-related columns found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();
