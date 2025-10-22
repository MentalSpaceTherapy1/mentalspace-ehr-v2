/**
 * AWS Lambda function to run Prisma migrations
 * Deploy this to a Lambda function in the same VPC as RDS
 */

const { execSync } = require('child_process');
const path = require('path');

exports.handler = async (event) => {
    console.log('Starting database migration...');

    const databaseUrl = process.env.DATABASE_URL ||
        'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr';

    try {
        // Set environment variable
        process.env.DATABASE_URL = databaseUrl;

        // Run the migration
        const output = execSync('npx prisma migrate deploy', {
            cwd: '/var/task/packages/database',
            encoding: 'utf-8',
            stdio: 'pipe'
        });

        console.log('Migration output:', output);

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Migration completed successfully',
                output: output
            })
        };
    } catch (error) {
        console.error('Migration failed:', error);

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Migration failed',
                error: error.message,
                stderr: error.stderr?.toString()
            })
        };
    }
};
