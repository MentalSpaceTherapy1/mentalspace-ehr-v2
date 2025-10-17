-- This file documents the EHR integration points for Module 9 Client Portal
-- All Portal models are linked to existing EHR entities (Client, User, Appointment)

-- CATEGORY 1: CORE TRANSACTIONAL FEATURES
-- InsuranceCard -> Client (CASCADE delete when client deleted)
-- PaymentMethod -> Client (CASCADE delete when client deleted)
-- FormAssignment -> Client, IntakeForm, IntakeFormSubmission
-- DocumentSignature -> Can be signed by Client or User
-- SharedDocument -> Client (documents shared by User/therapist)
-- SessionReview -> Client, User (clinician), Appointment (CASCADE)
-- TherapistChangeRequest -> Client, User (current), User (new)

-- CATEGORY 2: DAILY ENGAGEMENT
-- MoodEntry -> Client (client self-reports, therapist views)
-- SymptomDefinition -> Created by User (therapist)
-- ClientSymptomTracker -> Client, SymptomDefinition, assigned by User
-- DailyPrompt -> Client, created by User (therapist)
-- PromptResponse -> Client, DailyPrompt
-- EngagementStreak -> Client (one-to-one)
-- Milestone -> Client
-- PreSessionPrep -> Client, Appointment (therapist views before session)

-- CATEGORY 3: BETWEEN-SESSION SUPPORT
-- Resource -> Created by User (therapist/admin)
-- ResourceAssignment -> Client, Resource, assigned by User
-- CrisisToolkit -> Client (one-to-one), managed by User
-- CrisisToolkitUsage -> Client, CrisisToolkit (alerts therapist if high usage)
-- AudioMessage -> Client, created by User (therapist records messages)
-- AudioPlayLog -> Client, AudioMessage
-- HomeworkAssignment -> Client, assigned by User (therapist)

-- CATEGORY 4: PROGRESS & MOTIVATION
-- TherapeuticGoal -> Client, created by User OR Client
-- SubGoal -> TherapeuticGoal
-- GoalProgressUpdate -> TherapeuticGoal, updated by User OR Client
-- WinEntry -> Client
-- WinComment -> WinEntry, commented by User (therapist)
-- CopingSkillLog -> Client (therapist views to see what's working)

-- CATEGORY 5: SMART NOTIFICATIONS
-- ScheduledCheckIn -> Client, created by User (therapist)
-- ReminderNudge -> Client, created by User or SYSTEM
-- NudgeDelivery -> ReminderNudge
-- MicroContent -> Created by User or SYSTEM, approved by User
-- MicroContentDelivery -> Client, MicroContent

-- CATEGORY 6: JOURNALING
-- JournalEntry -> Client (private unless shared with therapist)
-- AIJournalPrompt -> JournalEntry
-- JournalComment -> JournalEntry, commented by User (therapist)

-- CATEGORY 7: COMMUNICATION
-- VoiceMemo -> PortalMessage (existing), sent by Client or User
-- SessionSummary -> Client, Appointment, created by User (clinician)

-- EHR DASHBOARD VIEWS NEEDED:
-- 1. Therapist Dashboard: View assigned clients' portal activity
--    - Recent mood entries, homework completion, crisis toolkit usage
--    - Pre-session prep notes, session reviews (if shared)
--    - Outstanding form assignments
--
-- 2. Admin Dashboard: Oversight of all portal activity
--    - All session reviews (including those not shared with therapist)
--    - Therapist change requests
--    - Portal adoption rates, engagement metrics
--
-- 3. Client Chart Integration: Portal data appears in client's EHR chart
--    - Mood trends graph in client overview
--    - Homework assignments in treatment plan section
--    - Therapeutic goals in treatment planning
--    - Crisis toolkit usage alerts in clinical notes area
