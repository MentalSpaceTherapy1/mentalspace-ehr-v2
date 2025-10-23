-- Audit query to check clinical notes for missing appointments
SELECT
  COUNT(*) as total_notes,
  SUM(CASE WHEN "appointmentId" IS NULL THEN 1 ELSE 0 END) as notes_without_appointment,
  SUM(CASE WHEN "appointmentId" IS NOT NULL THEN 1 ELSE 0 END) as notes_with_appointment
FROM clinical_notes;

-- Sample of notes without appointments (if any)
SELECT
  id,
  "clientId",
  "noteType",
  "sessionDate",
  "createdAt"
FROM clinical_notes
WHERE "appointmentId" IS NULL
LIMIT 10;
