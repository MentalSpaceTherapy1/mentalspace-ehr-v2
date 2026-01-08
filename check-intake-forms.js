const { Client } = require('pg');

// Parse the connection string manually to handle SSL
const dbUrl = process.env.DATABASE_URL || 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr';
const client = new Client({
  connectionString: dbUrl.replace('?sslmode=require', ''),
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

async function checkForms() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Check intake_forms table
    const formsResult = await client.query('SELECT COUNT(*) as count FROM intake_forms');
    console.log('Total intake forms:', formsResult.rows[0].count);

    // List all forms if they exist
    if (parseInt(formsResult.rows[0].count) > 0) {
      const allForms = await client.query('SELECT id, form_name, form_type, is_active FROM intake_forms ORDER BY form_name');
      console.log('\nAll intake forms:');
      allForms.rows.forEach((f, i) => {
        console.log(`${i + 1}. ${f.form_name} (${f.form_type}) - Active: ${f.is_active}`);
      });
    } else {
      console.log('\nNo intake forms found in database!');
      console.log('The seed-intake-forms.sql script needs to be run to populate the forms.');
    }

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkForms();
