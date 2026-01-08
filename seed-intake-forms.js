const { Client } = require('pg');

const dbUrl = process.env.DATABASE_URL || 'postgresql://mentalspace_admin:MentalSpace2024!SecurePwd@mentalspace-ehr-prod.ci16iwey2cac.us-east-1.rds.amazonaws.com:5432/mentalspace_ehr';
const client = new Client({
  connectionString: dbUrl.replace('?sslmode=require', ''),
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

const intakeForms = [
  { formName: 'Client Information Form', formDescription: 'Basic demographic and contact information for new clients', formType: 'Demographic', isRequired: true, assignedToNewClients: true },
  { formName: 'Informed Consent for Treatment', formDescription: 'Consent form outlining the nature of therapy, confidentiality limits, and client rights', formType: 'Consent', isRequired: true, assignedToNewClients: true },
  { formName: 'HIPAA Privacy Notice Acknowledgment', formDescription: 'Acknowledgment of receipt and understanding of HIPAA privacy practices', formType: 'Consent', isRequired: true, assignedToNewClients: true },
  { formName: 'Financial Agreement and Payment Policy', formDescription: 'Agreement regarding fees, payment methods, insurance, and cancellation policy', formType: 'Financial', isRequired: true, assignedToNewClients: true },
  { formName: 'Emergency Contact Information', formDescription: 'Emergency contact details and authorized persons to contact in case of emergency', formType: 'Safety', isRequired: true, assignedToNewClients: true },
  { formName: 'Medical History Questionnaire', formDescription: 'Comprehensive medical history including current medications, allergies, and past treatments', formType: 'Medical', isRequired: true, assignedToNewClients: true },
  { formName: 'Mental Health History', formDescription: 'Previous mental health treatment, hospitalizations, and current symptoms', formType: 'Clinical', isRequired: true, assignedToNewClients: true },
  { formName: 'Substance Use Assessment', formDescription: 'Assessment of current and past substance use, including alcohol and drugs', formType: 'Clinical', isRequired: false, assignedToNewClients: false },
  { formName: 'Trauma History Questionnaire', formDescription: 'Assessment of traumatic experiences and their impact', formType: 'Clinical', isRequired: false, assignedToNewClients: false },
  { formName: 'Family History Form', formDescription: 'Family medical and mental health history, including genetic factors', formType: 'Clinical', isRequired: false, assignedToNewClients: false },
  { formName: 'Social Support and Relationships', formDescription: 'Assessment of current relationships, social support system, and living situation', formType: 'Psychosocial', isRequired: false, assignedToNewClients: false },
  { formName: 'Employment and Financial Stress Assessment', formDescription: 'Evaluation of work-related stress and financial concerns affecting mental health', formType: 'Psychosocial', isRequired: false, assignedToNewClients: false },
  { formName: 'Cultural Background and Identity', formDescription: 'Information about cultural background, religious beliefs, and identity factors', formType: 'Psychosocial', isRequired: false, assignedToNewClients: false },
  { formName: 'Treatment Goals and Expectations', formDescription: "Client's goals for therapy and expectations for the therapeutic process", formType: 'Treatment', isRequired: false, assignedToNewClients: true },
  { formName: 'Insurance Information and Authorization', formDescription: 'Insurance details and authorization to bill insurance company', formType: 'Financial', isRequired: false, assignedToNewClients: false },
  { formName: 'Release of Information', formDescription: 'Authorization to release or obtain information from other healthcare providers', formType: 'Consent', isRequired: false, assignedToNewClients: false },
  { formName: 'Telehealth Consent Form', formDescription: 'Consent for telehealth services, including technology requirements and limitations', formType: 'Consent', isRequired: false, assignedToNewClients: false },
  { formName: 'Medication Management Consent', formDescription: 'Consent for medication evaluation and management services', formType: 'Consent', isRequired: false, assignedToNewClients: false },
  { formName: 'Couples Therapy Agreement', formDescription: 'Agreement for couples therapy, including confidentiality and session guidelines', formType: 'Consent', isRequired: false, assignedToNewClients: false },
  { formName: 'Family Therapy Agreement', formDescription: 'Agreement for family therapy sessions, roles, and confidentiality considerations', formType: 'Consent', isRequired: false, assignedToNewClients: false },
  { formName: 'Minor Consent Form (Parent/Guardian)', formDescription: 'Parental consent for treatment of minors and privacy considerations', formType: 'Consent', isRequired: false, assignedToNewClients: false },
  { formName: 'Safety Plan', formDescription: 'Personalized safety plan for crisis situations and suicidal ideation', formType: 'Safety', isRequired: false, assignedToNewClients: false },
  { formName: 'Client Satisfaction Survey', formDescription: 'Feedback on therapeutic services and client satisfaction', formType: 'Feedback', isRequired: false, assignedToNewClients: false },
  { formName: 'Termination Summary Form', formDescription: 'Summary of treatment outcomes and recommendations upon termination', formType: 'Clinical', isRequired: false, assignedToNewClients: false },
  { formName: 'No-Show and Late Cancellation Policy', formDescription: 'Acknowledgment of policies regarding missed appointments and late cancellations', formType: 'Administrative', isRequired: true, assignedToNewClients: true },
];

async function seedForms() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Get an admin user ID to use as created_by
    // Try to find a user with admin role in the user_roles junction table, or fallback to any user
    let adminUserId;
    try {
      const userResult = await client.query(`
        SELECT u.id FROM users u
        INNER JOIN "_UserRoles" ur ON u.id = ur."A"
        WHERE ur."B" IN ('ADMINISTRATOR', 'SUPERVISOR', 'SUPER_ADMIN')
        LIMIT 1
      `);
      if (userResult.rows.length > 0) {
        adminUserId = userResult.rows[0].id;
      }
    } catch (e) {
      // Junction table might not exist or have different structure
    }

    // Fallback: just get the first user (use "createdAt" for Prisma column naming)
    if (!adminUserId) {
      const fallbackResult = await client.query('SELECT id FROM users ORDER BY "createdAt" LIMIT 1');
      if (fallbackResult.rows.length === 0) {
        console.error('No users found in database');
        process.exit(1);
      }
      adminUserId = fallbackResult.rows[0].id;
    }
    console.log('Using admin user ID:', adminUserId);

    // Check existing forms
    const existingResult = await client.query('SELECT COUNT(*) as count FROM intake_forms');
    console.log('Existing forms:', existingResult.rows[0].count);

    let createdCount = 0;
    for (const form of intakeForms) {
      // Check if form already exists (use camelCase column names as defined in Prisma schema)
      const existing = await client.query('SELECT id FROM intake_forms WHERE "formName" = $1', [form.formName]);

      if (existing.rows.length > 0) {
        console.log(`Form already exists: ${form.formName}`);
        continue;
      }

      // Insert the form (use camelCase column names as defined in Prisma schema)
      await client.query(
        `INSERT INTO intake_forms (id, "formName", "formDescription", "formType", "formFieldsJson", "isActive", "isRequired", "assignedToNewClients", "createdBy", "lastModifiedBy", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, '[]'::json, true, $4, $5, $6, $6, now(), now())`,
        [form.formName, form.formDescription, form.formType, form.isRequired, form.assignedToNewClients, adminUserId]
      );

      createdCount++;
      console.log(`Created: ${form.formName}`);
    }

    // Verify final count
    const finalResult = await client.query('SELECT COUNT(*) as count FROM intake_forms');
    console.log(`\nSeeding complete!`);
    console.log(`Created: ${createdCount} forms`);
    console.log(`Total forms in database: ${finalResult.rows[0].count}`);

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seedForms();
