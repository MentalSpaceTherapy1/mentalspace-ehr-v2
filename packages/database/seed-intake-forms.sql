-- SQL Script to populate IntakeForm table
-- This can be run directly against the PostgreSQL database

-- Note: Replace 'ADMIN_USER_ID' with your actual admin user ID from the users table
-- You can get it by running: SELECT id FROM users WHERE email = 'admin@mentalspace.com';

-- Insert all 25 intake forms
INSERT INTO intake_forms (id, form_name, form_description, form_type, form_fields_json, is_active, is_required, assigned_to_new_clients, created_by, last_modified_by, created_at, updated_at)
SELECT
  gen_random_uuid(),
  form_data.form_name,
  form_data.form_description,
  form_data.form_type,
  '[]'::json,
  form_data.is_active,
  form_data.is_required,
  form_data.assigned_to_new_clients,
  (SELECT id FROM users WHERE email = 'admin@mentalspace.com' LIMIT 1),
  (SELECT id FROM users WHERE email = 'admin@mentalspace.com' LIMIT 1),
  now(),
  now()
FROM (VALUES
  ('Client Information Form', 'Basic demographic and contact information for new clients', 'Demographic', true, true, true),
  ('Informed Consent for Treatment', 'Consent form outlining the nature of therapy, confidentiality limits, and client rights', 'Consent', true, true, true),
  ('HIPAA Privacy Notice Acknowledgment', 'Acknowledgment of receipt and understanding of HIPAA privacy practices', 'Consent', true, true, true),
  ('Financial Agreement and Payment Policy', 'Agreement regarding fees, payment methods, insurance, and cancellation policy', 'Financial', true, true, true),
  ('Emergency Contact Information', 'Emergency contact details and authorized persons to contact in case of emergency', 'Safety', true, true, true),
  ('Medical History Questionnaire', 'Comprehensive medical history including current medications, allergies, and past treatments', 'Medical', true, true, true),
  ('Mental Health History', 'Previous mental health treatment, hospitalizations, and current symptoms', 'Clinical', true, true, true),
  ('Substance Use Assessment', 'Assessment of current and past substance use, including alcohol and drugs', 'Clinical', true, false, false),
  ('Trauma History Questionnaire', 'Assessment of traumatic experiences and their impact', 'Clinical', true, false, false),
  ('Family History Form', 'Family medical and mental health history, including genetic factors', 'Clinical', true, false, false),
  ('Social Support and Relationships', 'Assessment of current relationships, social support system, and living situation', 'Psychosocial', true, false, false),
  ('Employment and Financial Stress Assessment', 'Evaluation of work-related stress and financial concerns affecting mental health', 'Psychosocial', true, false, false),
  ('Cultural Background and Identity', 'Information about cultural background, religious beliefs, and identity factors', 'Psychosocial', true, false, false),
  ('Treatment Goals and Expectations', 'Client''s goals for therapy and expectations for the therapeutic process', 'Treatment', true, false, true),
  ('Insurance Information and Authorization', 'Insurance details and authorization to bill insurance company', 'Financial', true, false, false),
  ('Release of Information', 'Authorization to release or obtain information from other healthcare providers', 'Consent', true, false, false),
  ('Telehealth Consent Form', 'Consent for telehealth services, including technology requirements and limitations', 'Consent', true, false, false),
  ('Medication Management Consent', 'Consent for medication evaluation and management services', 'Consent', true, false, false),
  ('Couples Therapy Agreement', 'Agreement for couples therapy, including confidentiality and session guidelines', 'Consent', true, false, false),
  ('Family Therapy Agreement', 'Agreement for family therapy sessions, roles, and confidentiality considerations', 'Consent', true, false, false),
  ('Minor Consent Form (Parent/Guardian)', 'Parental consent for treatment of minors and privacy considerations', 'Consent', true, false, false),
  ('Safety Plan', 'Personalized safety plan for crisis situations and suicidal ideation', 'Safety', true, false, false),
  ('Client Satisfaction Survey', 'Feedback on therapeutic services and client satisfaction', 'Feedback', true, false, false),
  ('Termination Summary Form', 'Summary of treatment outcomes and recommendations upon termination', 'Clinical', true, false, false),
  ('No-Show and Late Cancellation Policy', 'Acknowledgment of policies regarding missed appointments and late cancellations', 'Administrative', true, true, true)
) AS form_data(form_name, form_description, form_type, is_active, is_required, assigned_to_new_clients);

-- Verify the insert
SELECT COUNT(*) as total_forms FROM intake_forms;
SELECT form_name, form_type, is_active, is_required, assigned_to_new_clients
FROM intake_forms
ORDER BY form_name;
