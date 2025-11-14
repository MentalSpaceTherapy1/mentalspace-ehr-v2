const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://mentalspace_admin:9JS1df2PprIr%3D_MCJgyrjB%5EC.os%3D%5E7@mentalspace-db-dev.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr',
  ssl: { rejectUnauthorized: false }
});

async function verifyUser() {
  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT id, email, "firstName", "lastName", roles, "isActive"
      FROM users
      WHERE email = 'ejoseph@chctherapy.com'
    `);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('User found in DEV database:');
      console.log('  ID:', user.id);
      console.log('  Name:', user.firstName, user.lastName);
      console.log('  Roles:', user.roles);
      console.log('  Active:', user.isActive);
    } else {
      console.log('User not found');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyUser();
