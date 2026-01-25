# PRODUCT REQUIREMENTS DOCUMENT

## Prior Authorization Module with Lisa AI Integration

Complete Implementation Specification for Claude Code

MentalSpace EHR v2

Version 2.0
January 25, 2026

Target Payers: CareSource, Amerigroup, Peach State (Georgia Medicaid CMOs)

---

## Table of Contents

1. Executive Summary & Current State Analysis
2. Complete Form Specification (Verbatim)
   - 2.1 Header Fields
   - 2.2 Clinical Information Grid - All 6 Categories
   - 2.3 Narrative Sections - All 12 Fields
3. Data Model Specification
   - 3.1 Prisma Schema Definitions
   - 3.2 TypeScript Interfaces
   - 3.3 Enum Definitions
4. API Specification
   - 4.1 New Endpoints
   - 4.2 Request/Response Schemas
5. Lisa AI Integration Specification
   - 5.1 Data Aggregation Requirements
   - 5.2 AI Prompt Engineering
   - 5.3 Symptom-to-Dropdown Mapping Logic
6. Frontend Component Specification
   - 6.1 Component Hierarchy
   - 6.2 Form State Management
   - 6.3 UI/UX Requirements
7. PDF Generation Specification
8. Workflow & Status Management
9. Implementation Checklist

---

## 1. Executive Summary & Current State Analysis

### 1.1 Purpose

This PRD provides complete implementation specifications for building a Prior Authorization (PA) module within MentalSpace EHR. The module will enable clinicians and billing staff to complete, submit, and track prior authorization requests for mental health services to Georgia Medicaid CMOs.

> ⚠️ **IMPORTANT:** This form is used verbatim for CareSource, Amerigroup, AND Peach State. All three CMOs use the identical questionnaire structure. The implementation must replicate the exact field names, dropdown options, and layout specified in this document.

### 1.2 Existing Codebase Assessment

The current MentalSpace EHR v2 repository contains a partial Prior Authorization implementation:

**Existing Backend Files:**

| File Path | Current Functionality |
|-----------|----------------------|
| packages/backend/src/routes/priorAuthorization.routes.ts | CRUD routes, session tracking, renewal |
| packages/backend/src/controllers/priorAuthorization.controller.ts | Request handling, validation |
| packages/backend/src/services/priorAuthorization.service.ts | Business logic, session management, alerts |

**What Exists vs. What's Missing:**

| Component | Current State | Required Action |
|-----------|--------------|-----------------|
| Session Tracking | ✅ Implemented | Keep - integrate with new module |
| Expiration Alerts | ✅ Implemented | Keep - already sends email warnings |
| Renewal Workflow | ✅ Implemented | Extend - connect to questionnaire |
| Clinical Questionnaire | ❌ Not Implemented | BUILD - Full form per this PRD |
| Frontend UI | ❌ Not Implemented | BUILD - Complete UI per Section 6 |
| Lisa AI Integration | ❌ Not Implemented | BUILD - Per Section 5 |
| PDF Generation | ❌ Not Implemented | BUILD - Per Section 7 |

### 1.3 Key Requirements Summary

- Replicate the CMO questionnaire form EXACTLY as specified in Section 2
- All dropdown fields must use the EXACT options: N/A, Mild, Moderate, Severe
- Lisa AI must auto-fill ALL fields (dropdowns AND narratives) from patient chart data
- "Generate with Lisa" button triggers AI completion of entire form
- Both clinicians AND admin/billing staff can access the module
- Output as PDF matching CMO format AND support future portal integration
- Reauthorization must pull data from previous PA submissions

---

## 2. Complete Form Specification (Verbatim)

> ⚠️ **IMPORTANT:** The following specification must be implemented EXACTLY as written. Field names, dropdown options, and section labels are regulatory requirements from the CMO. Do not paraphrase, abbreviate, or modify any field labels.

### 2.1 Header Fields

The following fields appear at the top of the PA form and are auto-populated from client records:

| Field Label (Verbatim) | Field Type | Data Source | Validation Rules |
|------------------------|------------|-------------|------------------|
| Client Name | Text (read-only) | Client.firstName + Client.lastName | Required, from client record |
| DOB | Date (read-only) | Client.dateOfBirth | Required, format: M/D/YYYY |
| Diagnosis | Text + Code + Date | ClientDiagnosis records | ICD-10 code + description + date |
| Insurance Provider | Text + Member ID | InsuranceInformation | Payer name + member ID number |

**Diagnosis Field Format Example:**
```
Adjustment disorder with depressed F43.21     11/21/2024
```
Format: [Diagnosis Description] [ICD-10 Code] [Diagnosis Date]

---

### 2.2 Clinical Information Grid

The Clinical Information section contains 6 categories arranged in a 2-column by 3-row grid. Each category contains multiple symptom items, each with a severity dropdown.

> ⚠️ **IMPORTANT:** ALL symptom dropdowns use the SAME four options: N/A, Mild, Moderate, Severe. Some items also have a text field for additional details (marked with 'Text Input' below).

**Grid Layout:**
```
┌─────────────────────────┬─────────────────────────┐
│    Anxiety Disorders    │         Mania           │
├─────────────────────────┼─────────────────────────┤
│      Depression         │    Substance Abuse      │
├─────────────────────────┼─────────────────────────┤
│  Psychotic Disorders    │  Personality Disorder   │
└─────────────────────────┴─────────────────────────┘
```

**Universal Dropdown Options:**

| Option Value | Clinical Interpretation |
|--------------|------------------------|
| N/A | Symptom not present / not applicable to this client |
| Mild | Symptom present with minimal functional impairment |
| Moderate | Symptom present with noticeable functional impairment |
| Severe | Symptom present with significant functional impairment |

#### Category 1: Anxiety Disorders

Field name prefix: `anxiety_`

| Symptom Item (Verbatim Label) | Field Name | Input Type |
|------------------------------|------------|------------|
| Obsessions/Compulsions | anxiety_obsessions_compulsions | Dropdown |
| Generalized Anxiety | anxiety_generalized | Dropdown |
| Panic Attacks | anxiety_panic_attacks | Dropdown |
| Phobias | anxiety_phobias | Dropdown |
| Somatic Complaints | anxiety_somatic_complaints | Dropdown |
| PTSD Symptoms | anxiety_ptsd_symptoms | Dropdown |

#### Category 2: Mania

Field name prefix: `mania_`

| Symptom Item (Verbatim Label) | Field Name | Input Type |
|------------------------------|------------|------------|
| Insomnia | mania_insomnia | Dropdown |
| Grandiosity | mania_grandiosity | Dropdown |
| Pressured Speech | mania_pressured_speech | Dropdown |
| Racing Thoughts / Flight of Ideas | mania_racing_thoughts | Dropdown |
| Poor Judgement / Impulsiveness | mania_poor_judgement | Dropdown |

#### Category 3: Psychotic Disorders

Field name prefix: `psychotic_`

| Symptom Item (Verbatim Label) | Field Name | Input Type |
|------------------------------|------------|------------|
| Delusions / Paranoia | psychotic_delusions_paranoia | Dropdown |
| Self-care Issues | psychotic_selfcare_issues | Dropdown |
| Hallucinations | psychotic_hallucinations | Dropdown |
| Disorganized Thought Process | psychotic_disorganized_thought | Dropdown |
| Loose Associations | psychotic_loose_associations | Dropdown |

#### Category 4: Depression

Field name prefix: `depression_`

| Symptom Item (Verbatim Label) | Field Name | Input Type |
|------------------------------|------------|------------|
| Impaired Concentration | depression_impaired_concentration | Dropdown |
| Impaired Memory | depression_impaired_memory | Dropdown |
| Psychomotor Retardation | depression_psychomotor_retardation | Dropdown |
| Sexual Issues | depression_sexual_issues | Dropdown |
| Appetite Disturbance | depression_appetite_disturbance | Dropdown |
| Irritability | depression_irritability | Dropdown |
| Agitation | depression_agitation | Dropdown |
| Sleep Disturbance | depression_sleep_disturbance | Dropdown |
| Hopelessness / Helplessness | depression_hopelessness | Dropdown |

#### Category 5: Substance Abuse

Field name prefix: `substance_`

| Symptom Item (Verbatim Label) | Field Name | Input Type |
|------------------------------|------------|------------|
| Loss of Control of Dosage | substance_loss_of_control | Dropdown |
| Amnesic Episodes | substance_amnesic_episodes | Dropdown |
| Legal Problems | substance_legal_problems | Dropdown |
| Alcohol Abuse | substance_alcohol_abuse | Dropdown |
| Opiate Abuse | substance_opiate_abuse | Dropdown |
| Prescription Medication Abuse | substance_prescription_abuse | Dropdown |
| Polysubstance Abuse | substance_polysubstance_abuse | Dropdown |
| Other Drugs | substance_other_drugs | Text Input |

#### Category 6: Personality Disorder

Field name prefix: `personality_`

| Symptom Item (Verbatim Label) | Field Name | Input Type |
|------------------------------|------------|------------|
| Oddness / Eccentricities | personality_oddness | Dropdown |
| Oppositional | personality_oppositional | Dropdown |
| Disregard for Law | personality_disregard_law | Dropdown |
| Recurring Self Injuries | personality_self_injuries | Dropdown |
| Sense of Entitlement | personality_entitlement | Dropdown |
| Passive Aggressive | personality_passive_aggressive | Dropdown |
| Dependency | personality_dependency | Dropdown |
| Enduring Traits of | personality_enduring_traits | Text Input |

**Complete Symptom Count Summary:**

| Category | Dropdown Fields | Text Fields | Total |
|----------|----------------|-------------|-------|
| Anxiety Disorders | 6 | 0 | 6 |
| Mania | 5 | 0 | 5 |
| Psychotic Disorders | 5 | 0 | 5 |
| Depression | 9 | 0 | 9 |
| Substance Abuse | 7 | 1 (Other Drugs) | 8 |
| Personality Disorder | 7 | 1 (Enduring Traits) | 8 |
| **TOTAL** | **39** | **2** | **41** |

---

### 2.3 Narrative Sections

The following 12 narrative sections require free-text responses. Each section has a specific clinical focus and should be populated with relevant information from the client's chart.

> ⚠️ **IMPORTANT:** The section labels shown in the 'Verbatim Label' column MUST appear exactly as written in the UI. The 'Clinical Prompt' column provides guidance for clinicians and Lisa AI on what information to include.

#### Narrative Section 1: Risk of Harm

| Property | Value |
|----------|-------|
| Verbatim Label | Risk of Harm |
| Field Name | narrative_risk_of_harm |
| Clinical Prompt | Current/Hx of SI and HI that cause concern for safety, welfare, and wellness of the member. |
| Data Sources | C-SSRS results, PHQ-9 Question 9, safety plans, crisis notes, hospitalization records |
| Input Type | Textarea - minimum 500 characters recommended |

#### Narrative Section 2: Functional Status

| Property | Value |
|----------|-------|
| Verbatim Label | Functional Status |
| Field Name | narrative_functional_status |
| Clinical Prompt | Ability to meet basic needs, fulfill usual role, and maintain health and wellness. |
| Data Sources | GAF scores, functional assessments, ADL evaluations, intake notes, progress notes |
| Input Type | Textarea - minimum 500 characters recommended |

#### Narrative Section 3: Co-morbidities

| Property | Value |
|----------|-------|
| Verbatim Label | Co-morbidities |
| Field Name | narrative_comorbidities |
| Clinical Prompt | Symptoms and Tx for medical/SUD diagnosis in addition to primary Hx. |
| Data Sources | Medical history, secondary diagnoses, medication interactions, SUD screening results |
| Input Type | Textarea - can be N/A if not applicable |

#### Narrative Section 4: Environmental Stressors

| Property | Value |
|----------|-------|
| Verbatim Label | Environmental Stressors |
| Field Name | narrative_environmental_stressors |
| Clinical Prompt | Stress in the environment such as home, school, and work that interfere with the member's wellbeing. |
| Data Sources | Psychosocial assessments, intake forms, progress notes documenting stressors |
| Input Type | Textarea - minimum 200 characters recommended |

#### Narrative Section 5: Natural Support in the Environment

| Property | Value |
|----------|-------|
| Verbatim Label | Natural Support in the Environment |
| Field Name | narrative_natural_support |
| Clinical Prompt | Personal associations and relationships in the community that enhance the quality and security of the member. |
| Data Sources | Family/support system documentation, intake forms, treatment plans, progress notes |
| Input Type | Textarea - minimum 200 characters recommended |

#### Narrative Section 6: Response to Current Treatment and Definition of Discharge Goals

| Property | Value |
|----------|-------|
| Verbatim Label | Response to Current Treatment and Definition of Discharge Goals |
| Field Name | narrative_treatment_response |
| Clinical Prompt | Document client's progress toward treatment goals and criteria for successful discharge. |
| Data Sources | Treatment plan reviews, progress notes, outcome measure trends (PHQ-9, GAD-7), discharge planning |
| Input Type | Textarea - minimum 500 characters recommended, include specific goals |

#### Narrative Section 7: Level of Care

| Property | Value |
|----------|-------|
| Verbatim Label | Level of Care |
| Field Name | narrative_level_of_care |
| Clinical Prompt | Acceptance and Engagement - document client's engagement in therapeutic process. |
| Data Sources | Session attendance, participation notes, treatment compliance documentation |
| Input Type | Textarea - minimum 100 characters recommended |

#### Narrative Section 8: Transportation Available

| Property | Value |
|----------|-------|
| Verbatim Label | Transportation Available |
| Field Name | transportation_available |
| Input Type | Dropdown: Yes, No, Other |
| Additional Field | transportation_notes (Textarea - if 'Other' selected) |

#### Narrative Section 9: History

| Property | Value |
|----------|-------|
| Verbatim Label | History |
| Field Name | narrative_history |
| Clinical Prompt | History of outpatient and inpatient mental health treatment. |
| Data Sources | Treatment history, previous PA records, hospitalization records, intake documentation |
| Input Type | Textarea - minimum 300 characters recommended |

#### Narrative Section 10: Presenting Problems

| Property | Value |
|----------|-------|
| Verbatim Label | Presenting Problems |
| Field Name | narrative_presenting_problems |
| Clinical Prompt | Current issues bringing client to treatment, including client's own words when appropriate. |
| Data Sources | Chief complaints, intake assessments, recent progress notes, client statements |
| Input Type | Textarea - minimum 500 characters, can include direct quotes from client |

#### Narrative Section 11: Other Clinical Information

| Property | Value |
|----------|-------|
| Verbatim Label | Other Clinical Information |
| Field Name | narrative_other_clinical_info |
| Clinical Prompt | Any additional clinical information relevant to the authorization request. |
| Data Sources | Any relevant clinical documentation not captured in other sections |
| Input Type | Textarea - optional field |

#### Narrative Section 12: Current Medications

| Property | Value |
|----------|-------|
| Verbatim Label | Current Medications |
| Field Name | narrative_current_medications |
| Clinical Prompt | List all current psychiatric and relevant medical medications. |
| Data Sources | Medication list in client profile, prescriptions, medication reconciliation records |
| Input Type | Textarea - can state 'No known medications' or 'Client did not report medications' |

**Narrative Sections Summary:**

| # | Section Label (Verbatim) | Field Type | Required |
|---|-------------------------|------------|----------|
| 1 | Risk of Harm | Textarea | Yes |
| 2 | Functional Status | Textarea | Yes |
| 3 | Co-morbidities | Textarea | Yes |
| 4 | Environmental Stressors | Textarea | Yes |
| 5 | Natural Support in the Environment | Textarea | Yes |
| 6 | Response to Current Treatment and Definition of Discharge Goals | Textarea | Yes |
| 7 | Level of Care | Textarea | Yes |
| 8 | Transportation Available | Dropdown + Notes | Yes |
| 9 | History | Textarea | Yes |
| 10 | Presenting Problems | Textarea | Yes |
| 11 | Other Clinical Information | Textarea | No |
| 12 | Current Medications | Textarea | Yes |

---

## 3. Data Model Specification

### 3.1 Prisma Schema Definition

Add the following model to `packages/database/prisma/schema.prisma`:

**Severity Level Enum:**
```prisma
enum SeverityLevel {
  NA
  MILD
  MODERATE
  SEVERE
}
```

**Transportation Option Enum:**
```prisma
enum TransportationOption {
  YES
  NO
  OTHER
}
```

**PA Questionnaire Model:**
```prisma
model PriorAuthorizationQuestionnaire {
  id                          String   @id @default(uuid())
  priorAuthorizationId        String   @unique
  priorAuthorization          PriorAuthorization @relation(fields: [priorAuthorizationId], references: [id])

  // Header Fields (auto-populated, stored for record)
  clientName                  String
  clientDOB                   DateTime
  diagnosisDisplay            String   // Full display string
  insuranceDisplay            String   // Payer name + member ID

  // === ANXIETY DISORDERS ===
  anxiety_obsessions_compulsions    SeverityLevel @default(NA)
  anxiety_generalized               SeverityLevel @default(NA)
  anxiety_panic_attacks             SeverityLevel @default(NA)
  anxiety_phobias                   SeverityLevel @default(NA)
  anxiety_somatic_complaints        SeverityLevel @default(NA)
  anxiety_ptsd_symptoms             SeverityLevel @default(NA)

  // === MANIA ===
  mania_insomnia                    SeverityLevel @default(NA)
  mania_grandiosity                 SeverityLevel @default(NA)
  mania_pressured_speech            SeverityLevel @default(NA)
  mania_racing_thoughts             SeverityLevel @default(NA)
  mania_poor_judgement              SeverityLevel @default(NA)

  // === PSYCHOTIC DISORDERS ===
  psychotic_delusions_paranoia      SeverityLevel @default(NA)
  psychotic_selfcare_issues         SeverityLevel @default(NA)
  psychotic_hallucinations          SeverityLevel @default(NA)
  psychotic_disorganized_thought    SeverityLevel @default(NA)
  psychotic_loose_associations      SeverityLevel @default(NA)

  // === DEPRESSION ===
  depression_impaired_concentration SeverityLevel @default(NA)
  depression_impaired_memory        SeverityLevel @default(NA)
  depression_psychomotor_retardation SeverityLevel @default(NA)
  depression_sexual_issues          SeverityLevel @default(NA)
  depression_appetite_disturbance   SeverityLevel @default(NA)
  depression_irritability           SeverityLevel @default(NA)
  depression_agitation              SeverityLevel @default(NA)
  depression_sleep_disturbance      SeverityLevel @default(NA)
  depression_hopelessness           SeverityLevel @default(NA)

  // === SUBSTANCE ABUSE ===
  substance_loss_of_control         SeverityLevel @default(NA)
  substance_amnesic_episodes        SeverityLevel @default(NA)
  substance_legal_problems          SeverityLevel @default(NA)
  substance_alcohol_abuse           SeverityLevel @default(NA)
  substance_opiate_abuse            SeverityLevel @default(NA)
  substance_prescription_abuse      SeverityLevel @default(NA)
  substance_polysubstance_abuse     SeverityLevel @default(NA)
  substance_other_drugs             String?  // Text field

  // === PERSONALITY DISORDER ===
  personality_oddness               SeverityLevel @default(NA)
  personality_oppositional          SeverityLevel @default(NA)
  personality_disregard_law         SeverityLevel @default(NA)
  personality_self_injuries         SeverityLevel @default(NA)
  personality_entitlement           SeverityLevel @default(NA)
  personality_passive_aggressive    SeverityLevel @default(NA)
  personality_dependency            SeverityLevel @default(NA)
  personality_enduring_traits       String?  // Text field

  // === NARRATIVE SECTIONS ===
  narrative_risk_of_harm            String   @db.Text
  narrative_functional_status       String   @db.Text
  narrative_comorbidities           String   @db.Text
  narrative_environmental_stressors String   @db.Text
  narrative_natural_support         String   @db.Text
  narrative_treatment_response      String   @db.Text
  narrative_level_of_care           String   @db.Text
  transportation_available          TransportationOption
  transportation_notes              String?  @db.Text
  narrative_history                 String   @db.Text
  narrative_presenting_problems     String   @db.Text
  narrative_other_clinical_info     String?  @db.Text
  narrative_current_medications     String   @db.Text

  // === AI GENERATION TRACKING ===
  aiGeneratedAt                     DateTime?
  aiGeneratedBy                     String?  // User who triggered generation
  aiDataSourcesSummary              Json?    // Which records were used
  aiConfidenceScores                Json?    // Per-field confidence

  // === METADATA ===
  createdAt                         DateTime @default(now())
  updatedAt                         DateTime @updatedAt
  createdBy                         String
  lastModifiedBy                    String
}
```

### 3.2 TypeScript Interfaces

Create file: `packages/shared/src/types/priorAuthQuestionnaire.ts`

```typescript
export enum SeverityLevel {
  NA = 'NA',
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE'
}

export const SeverityLevelDisplayMap: Record<SeverityLevel, string> = {
  [SeverityLevel.NA]: 'N/A',
  [SeverityLevel.MILD]: 'Mild',
  [SeverityLevel.MODERATE]: 'Moderate',
  [SeverityLevel.SEVERE]: 'Severe'
};

export enum TransportationOption {
  YES = 'YES',
  NO = 'NO',
  OTHER = 'OTHER'
}

export interface ClinicalSymptomField {
  fieldName: string;
  label: string;
  category: 'anxiety' | 'mania' | 'psychotic' | 'depression' | 'substance' | 'personality';
  inputType: 'dropdown' | 'text';
}

export interface PAQuestionnaireFormData {
  // Header
  clientName: string;
  clientDOB: string;
  diagnosisDisplay: string;
  insuranceDisplay: string;

  // All 39 dropdown fields (SeverityLevel)
  anxiety_obsessions_compulsions: SeverityLevel;
  anxiety_generalized: SeverityLevel;
  // ... (all other fields as specified in Section 2.2)

  // 2 text fields in clinical grid
  substance_other_drugs?: string;
  personality_enduring_traits?: string;

  // All 12 narrative fields
  narrative_risk_of_harm: string;
  narrative_functional_status: string;
  // ... (all other narrative fields as specified in Section 2.3)
}
```

---

## 4. API Specification

### 4.1 New Endpoints

Add these endpoints to `packages/backend/src/routes/priorAuthorization.routes.ts`:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/v1/prior-authorizations/:id/questionnaire | Get questionnaire for a PA |
| POST | /api/v1/prior-authorizations/:id/questionnaire | Create/update questionnaire |
| POST | /api/v1/prior-authorizations/:id/generate-with-lisa | AI auto-fill entire form |
| POST | /api/v1/prior-authorizations/:id/submit | Submit PA to payer |
| GET | /api/v1/prior-authorizations/:id/pdf | Generate PDF output |
| POST | /api/v1/prior-authorizations/:id/appeal | Initiate appeal process |
| GET | /api/v1/prior-authorizations/client/:clientId/history | Get all PAs for a client |

### 4.2 Generate with Lisa - Request/Response

**POST /api/v1/prior-authorizations/:id/generate-with-lisa**

Request Body:
```json
{
  "regenerateFields": ["all"] | ["narrative_risk_of_harm", "anxiety_*", ...],
  "preserveUserEdits": boolean,
  "additionalContext": string  // Optional clinician notes
}
```

Response Body:
```json
{
  "success": true,
  "questionnaire": { /* Full PAQuestionnaireFormData */ },
  "aiMetadata": {
    "generatedAt": "2026-01-25T10:30:00Z",
    "dataSourcesUsed": {
      "progressNotes": ["note-uuid-1", "note-uuid-2"],
      "assessments": ["assessment-uuid-1"],
      "outcomeMeasures": ["phq9-uuid", "gad7-uuid"],
      "treatmentPlans": ["tp-uuid-1"]
    },
    "fieldConfidence": {
      "anxiety_generalized": 0.92,
      "depression_sleep_disturbance": 0.87,
      "narrative_risk_of_harm": 0.95
    },
    "warningsOrGaps": [
      "No recent PHQ-9 found - depression fields based on progress notes only"
    ]
  }
}
```

---

## 5. Lisa AI Integration Specification

### 5.1 AI Service Architecture

Create new service: `packages/backend/src/services/ai/priorAuthGeneration.service.ts`

This service orchestrates data aggregation and AI processing for PA form completion.

**Core Functions:**

| Function | Purpose |
|----------|---------|
| generateFullQuestionnaire() | Main orchestrator - calls all sub-functions and returns complete form |
| aggregateClientData() | Fetches all relevant data from client record (see 5.2) |
| mapSymptomsToSeverity() | AI analysis to map clinical data to dropdown selections |
| generateNarrativeContent() | AI generation of all 12 narrative sections |
| calculateConfidenceScores() | Assess confidence level for each generated field |

### 5.2 Data Aggregation Requirements

The following data must be fetched for AI processing:

| Data Source | Prisma Model | Fields to Extract |
|-------------|--------------|-------------------|
| Client Profile | Client | Demographics, medical history |
| Diagnoses | ClientDiagnosis | All active diagnoses with ICD-10 |
| Progress Notes | ClinicalNote | Last 10 notes, focus on symptoms |
| Treatment Plans | TreatmentPlan | Goals, objectives, progress |
| Outcome Measures | OutcomeMeasure | PHQ-9, GAD-7, C-SSRS scores |
| Assessments | Assessment | Intake, psychosocial history |
| Medications | ClientMedication | Current med list with dosages |
| Insurance | InsuranceInformation | Payer name, member ID |
| Previous PAs | PriorAuthorization | Historical PA data for reauth |

### 5.3 Symptom-to-Dropdown Mapping Logic

Lisa must analyze clinical documentation and map findings to the correct severity level. Here is the mapping logic for key symptom categories:

**Depression Mapping from PHQ-9:**

| PHQ-9 Score | Severity Level | Rationale |
|-------------|---------------|-----------|
| 0-4 | N/A | Minimal symptoms, no clinical significance |
| 5-9 | Mild | Mild depressive symptoms present |
| 10-14 | Moderate | Moderate depression requiring intervention |
| 15+ | Severe | Severe depression, significant impairment |

**Anxiety Mapping from GAD-7:**

| GAD-7 Score | Severity Level | Rationale |
|-------------|---------------|-----------|
| 0-4 | N/A | Minimal anxiety symptoms |
| 5-9 | Mild | Mild anxiety present |
| 10-14 | Moderate | Moderate anxiety symptoms |
| 15+ | Severe | Severe anxiety |

**Risk of Harm Mapping from C-SSRS:**

| C-SSRS Finding | Risk Statement Generation |
|----------------|--------------------------|
| No positive responses | "Client currently is not a risk of self-harm, suicidal ideation or homicidal ideation" |
| Passive ideation only | Document passive ideation, note no active plan or intent |
| Active ideation present | Document active ideation, safety plan status, intervention measures |

### 5.4 AI Prompt Template

The following prompt structure should be used when calling the Anthropic API for form generation:

```
SYSTEM PROMPT:
You are Lisa, an AI clinical assistant for MentalSpace EHR. Your task is to complete
a Prior Authorization questionnaire for a mental health client based on their clinical
records. You must:

1. Analyze the provided clinical data to determine appropriate severity levels
2. Use ONLY these severity options: N/A, Mild, Moderate, Severe
3. Generate professional clinical narratives for each section
4. Be conservative - when unsure, choose lower severity
5. Always note when data is insufficient for confident assessment

Output your response as a JSON object matching the PAQuestionnaireFormData interface.

USER PROMPT:
Complete the Prior Authorization questionnaire for this client:

CLIENT PROFILE:
{clientProfile}

DIAGNOSES:
{diagnoses}

RECENT PROGRESS NOTES (last 10):
{progressNotes}

OUTCOME MEASURES:
- PHQ-9 Score: {phq9Score} (Date: {phq9Date})
- GAD-7 Score: {gad7Score} (Date: {gad7Date})
- C-SSRS: {cssrsResults}

TREATMENT PLAN:
{treatmentPlan}

CURRENT MEDICATIONS:
{medications}

PREVIOUS PRIOR AUTHORIZATIONS (if reauth):
{previousPAs}
```

---

## 6. Frontend Component Specification

### 6.1 Component Hierarchy

```
pages/PriorAuthorization/
├── index.tsx                          # Route entry, lazy loading
├── PriorAuthorizationList.tsx         # Dashboard/list view
├── PriorAuthorizationDetail.tsx       # Single PA view with tabs
├── PriorAuthorizationForm/
│   ├── index.tsx                      # Form container
│   ├── PAFormHeader.tsx               # Client info header
│   ├── ClinicalGridSection.tsx        # 6-category symptom grid
│   ├── SeverityDropdown.tsx           # Reusable dropdown component
│   ├── NarrativeSection.tsx           # Single narrative field
│   ├── NarrativeSectionsContainer.tsx # All 12 narratives
│   ├── GenerateWithLisaButton.tsx     # AI generation trigger
│   └── FormActions.tsx                # Save, Submit, Generate buttons
├── PAStatusTracker.tsx                # Visual status timeline
├── PAPDFPreview.tsx                   # PDF preview modal
└── hooks/
    ├── usePriorAuthForm.ts            # Form state management
    ├── useLisaGeneration.ts           # AI generation hook
    └── usePAList.ts                   # List fetching/filtering
```

### 6.2 Key Component Specifications

**SeverityDropdown.tsx**

Reusable dropdown for all 39 symptom severity fields.

```typescript
interface SeverityDropdownProps {
  fieldName: string;           // e.g., 'anxiety_panic_attacks'
  label: string;               // e.g., 'Panic Attacks'
  value: SeverityLevel;
  onChange: (field: string, value: SeverityLevel) => void;
  aiGenerated?: boolean;       // Show AI indicator
  aiConfidence?: number;       // 0-1 confidence score
  disabled?: boolean;
}

// Dropdown options - MUST match exactly:
const SEVERITY_OPTIONS = [
  { value: 'NA', label: 'N/A' },
  { value: 'MILD', label: 'Mild' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'SEVERE', label: 'Severe' }
];
```

**GenerateWithLisaButton.tsx**

Prominent button to trigger AI form completion.

```typescript
interface GenerateWithLisaButtonProps {
  priorAuthId: string;
  onGenerationComplete: (data: PAQuestionnaireFormData) => void;
  onError: (error: Error) => void;
  disabled?: boolean;
}

// Button states:
// - Default: 'Generate with Lisa' with sparkle icon
// - Loading: 'Lisa is analyzing...' with spinner
// - Success: Brief 'Generated!' then return to default
// - Error: 'Generation failed' with retry option
```

**ClinicalGridSection.tsx**

Renders the 2x3 grid of symptom categories.

```typescript
// Grid layout specification:
// Row 1: Anxiety Disorders | Mania
// Row 2: Depression | Substance Abuse
// Row 3: Psychotic Disorders | Personality Disorder

// Each category renders as a card with:
// - Category header
// - List of SeverityDropdown components
// - Text input for 'Other Drugs' and 'Enduring Traits'
```

### 6.3 Form State Management

Use React Hook Form with Zod validation:

```typescript
// packages/frontend/src/pages/PriorAuthorization/hooks/usePriorAuthForm.ts

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const severityEnum = z.enum(['NA', 'MILD', 'MODERATE', 'SEVERE']);
const transportEnum = z.enum(['YES', 'NO', 'OTHER']);

const paQuestionnaireSchema = z.object({
  // Header (read-only, validated as strings)
  clientName: z.string(),
  clientDOB: z.string(),
  diagnosisDisplay: z.string(),
  insuranceDisplay: z.string(),

  // All 39 severity dropdowns
  anxiety_obsessions_compulsions: severityEnum,
  anxiety_generalized: severityEnum,
  // ... (all other symptom fields)

  // Text fields in clinical grid
  substance_other_drugs: z.string().optional(),
  personality_enduring_traits: z.string().optional(),

  // Required narrative fields
  narrative_risk_of_harm: z.string().min(50, 'Risk assessment required'),
  narrative_functional_status: z.string().min(50, 'Functional status required'),
  narrative_comorbidities: z.string().min(1, 'Required - enter N/A if none'),
  narrative_environmental_stressors: z.string().min(50, 'Environmental stressors required'),
  narrative_natural_support: z.string().min(50, 'Natural support required'),
  narrative_treatment_response: z.string().min(100, 'Treatment response required'),
  narrative_level_of_care: z.string().min(20, 'Level of care required'),
  transportation_available: transportEnum,
  transportation_notes: z.string().optional(),
  narrative_history: z.string().min(50, 'History required'),
  narrative_presenting_problems: z.string().min(100, 'Presenting problems required'),
  narrative_other_clinical_info: z.string().optional(),
  narrative_current_medications: z.string().min(1, 'Required - state if no medications'),
});
```

---

## 7. PDF Generation Specification

### 7.1 PDF Layout Requirements

The generated PDF must match the CMO form layout for compliance. Use the existing `export-pdf.service.ts` as a foundation.

**PDF Structure:**

1. **Header Section**
   - Practice logo and name
   - "Prior Authorization Questionnaire" title
   - Date generated

2. **Client Information Block**
   - Client Name, DOB, Diagnosis, Insurance - formatted as on original form

3. **Clinical Information Grid**
   - Replicate the 2-column, 3-row grid layout
   - Show symptom labels with selected severity
   - Format: "Panic Attacks: Moderate"

4. **Narrative Sections**
   - Each section with bold header matching form labels
   - Full text content below each header
   - Page breaks as needed to avoid orphaned headers

5. **Signature Block**
   - Clinician signature line (integrate with existing e-sig)
   - Date, credentials, NPI

### 7.2 PDF Service Extension

Extend `packages/backend/src/services/export-pdf.service.ts`:

```typescript
export async function generatePriorAuthPDF(
  priorAuthId: string,
  includeSignature: boolean = false
): Promise<Buffer> {
  // 1. Fetch PA and questionnaire data
  // 2. Build PDF using pdfkit or puppeteer
  // 3. Apply CMO form layout
  // 4. Add signature if requested
  // 5. Return PDF buffer
}
```

---

## 8. Workflow & Status Management

### 8.1 PA Status Lifecycle

| Status | Description | Allowed Transitions |
|--------|-------------|---------------------|
| DRAFT | Form in progress, not yet submitted | → SUBMITTED, → (deleted) |
| SUBMITTED | Sent to payer, awaiting response | → PENDING, → APPROVED, → DENIED |
| PENDING | Payer requested more info | → SUBMITTED, → APPROVED, → DENIED |
| APPROVED | Authorization granted | → EXPIRED, → EXHAUSTED |
| DENIED | Authorization denied | → APPEAL |
| APPEAL | Denial under appeal | → APPROVED, → DENIED |
| EXPIRED | Auth period ended | (terminal - create new PA) |
| EXHAUSTED | All sessions used | (terminal - create new PA) |

### 8.2 User Role Permissions

| Action | Clinician | Supervisor | Admin/Billing | Practice Admin |
|--------|-----------|------------|---------------|----------------|
| Create PA | ✅ | ✅ | ✅ | ✅ |
| Edit Own Draft | ✅ | ✅ | ✅ | ✅ |
| Edit Others' Draft | ❌ | ✅ (supervisees) | ❌ | ✅ |
| Generate with Lisa | ✅ | ✅ | ❌ | ✅ |
| Submit PA | ✅ | ✅ | ✅ | ✅ |
| Update Approval Info | ❌ | ❌ | ✅ | ✅ |
| View All PAs | Own only | Own + supervisees | ✅ | ✅ |
| Generate PDF | ✅ | ✅ | ✅ | ✅ |
| Delete Draft | Own only | Own + supervisees | ❌ | ✅ |

---

## 9. Implementation Checklist

Use this checklist to track implementation progress:

### Phase 1: Database & Backend Foundation (Week 1-2)

- [ ] Add SeverityLevel and TransportationOption enums to Prisma schema
- [ ] Add PriorAuthorizationQuestionnaire model to Prisma schema
- [ ] Run migration: `npx prisma migrate dev --name add-pa-questionnaire`
- [ ] Create TypeScript interfaces in packages/shared
- [ ] Create priorAuthQuestionnaire.service.ts
- [ ] Create priorAuthQuestionnaire.controller.ts
- [ ] Add new routes to priorAuthorization.routes.ts
- [ ] Write unit tests for new service functions

### Phase 2: Frontend Form UI (Week 2-3)

- [ ] Create PriorAuthorization page directory structure
- [ ] Implement SeverityDropdown component
- [ ] Implement ClinicalGridSection with all 6 categories
- [ ] Implement all NarrativeSection components
- [ ] Implement PAFormHeader with client info
- [ ] Implement form state management with React Hook Form + Zod
- [ ] Add form to router and navigation
- [ ] Test form save/load functionality

### Phase 3: Lisa AI Integration (Week 3-4)

- [ ] Create priorAuthGeneration.service.ts
- [ ] Implement data aggregation from all client sources
- [ ] Build AI prompt template for form generation
- [ ] Implement symptom-to-severity mapping logic
- [ ] Implement narrative section generation
- [ ] Create GenerateWithLisaButton component
- [ ] Add confidence scoring and warnings
- [ ] Test AI generation with sample client data

### Phase 4: PDF Generation & Submission (Week 4-5)

- [ ] Extend export-pdf.service.ts for PA forms
- [ ] Create CMO-compliant PDF template
- [ ] Implement signature integration
- [ ] Create PAPDFPreview component
- [ ] Implement submission workflow
- [ ] Add status change notifications

### Phase 5: List View & Polish (Week 5-6)

- [ ] Implement PriorAuthorizationList with filtering
- [ ] Implement PAStatusTracker component
- [ ] Add role-based permissions
- [ ] Implement reauthorization flow (copy from previous)
- [ ] End-to-end testing
- [ ] Documentation and training materials

---

**— End of Document —**
