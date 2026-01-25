/**
 * Prior Authorization PDF Generation Service
 * Generates PDF documents for PA questionnaires matching CMO formats
 */

import puppeteer from 'puppeteer';
import logger from '../utils/logger';
import prisma from './database';
import { getQuestionnaire } from './priorAuthQuestionnaire.service';

interface PAHeaderInfo {
  clientName: string;
  clientDOB: string;
  insuranceDisplay: string;
  diagnosisDisplay: string;
  authorizationNumber: string;
}

/**
 * Generate HTML for the PA questionnaire PDF
 */
function generatePAQuestionnaireHTML(headerInfo: PAHeaderInfo, formData: Record<string, unknown>): string {
  const timestamp = new Date().toLocaleString();

  // Severity level display helper
  const getSeverityDisplay = (value: string | undefined) => {
    if (!value || value === 'NA') return { text: 'N/A', color: '#6b7280', bg: '#f3f4f6' };
    if (value === 'MILD') return { text: 'Mild', color: '#ca8a04', bg: '#fef9c3' };
    if (value === 'MODERATE') return { text: 'Moderate', color: '#ea580c', bg: '#fed7aa' };
    if (value === 'SEVERE') return { text: 'Severe', color: '#dc2626', bg: '#fee2e2' };
    return { text: value, color: '#6b7280', bg: '#f3f4f6' };
  };

  // Build symptom categories HTML
  const symptomCategories = [
    {
      name: 'Anxiety Symptoms',
      color: '#f59e0b',
      fields: [
        { key: 'anxiety_obsessions_compulsions', label: 'Obsessions / Compulsions' },
        { key: 'anxiety_generalized', label: 'Generalized Anxiety' },
        { key: 'anxiety_panic_attacks', label: 'Panic Attacks' },
        { key: 'anxiety_phobias', label: 'Phobias' },
        { key: 'anxiety_somatic_complaints', label: 'Somatic Complaints' },
        { key: 'anxiety_ptsd_symptoms', label: 'PTSD Symptoms' },
      ],
    },
    {
      name: 'Mania Symptoms',
      color: '#a855f7',
      fields: [
        { key: 'mania_insomnia', label: 'Insomnia' },
        { key: 'mania_grandiosity', label: 'Grandiosity' },
        { key: 'mania_pressured_speech', label: 'Pressured Speech' },
        { key: 'mania_racing_thoughts', label: 'Racing Thoughts' },
        { key: 'mania_poor_judgement', label: 'Poor Judgement' },
      ],
    },
    {
      name: 'Psychotic Symptoms',
      color: '#ef4444',
      fields: [
        { key: 'psychotic_delusions_paranoia', label: 'Delusions / Paranoia' },
        { key: 'psychotic_selfcare_issues', label: 'Self-Care Issues' },
        { key: 'psychotic_hallucinations', label: 'Hallucinations' },
        { key: 'psychotic_disorganized_thought', label: 'Disorganized Thought' },
        { key: 'psychotic_loose_associations', label: 'Loose Associations' },
      ],
    },
    {
      name: 'Depression Symptoms',
      color: '#3b82f6',
      fields: [
        { key: 'depression_impaired_concentration', label: 'Impaired Concentration' },
        { key: 'depression_impaired_memory', label: 'Impaired Memory' },
        { key: 'depression_psychomotor_retardation', label: 'Psychomotor Retardation' },
        { key: 'depression_sexual_issues', label: 'Sexual Issues' },
        { key: 'depression_appetite_disturbance', label: 'Appetite Disturbance' },
        { key: 'depression_irritability', label: 'Irritability' },
        { key: 'depression_agitation', label: 'Agitation' },
        { key: 'depression_sleep_disturbance', label: 'Sleep Disturbance' },
        { key: 'depression_hopelessness', label: 'Hopelessness' },
      ],
    },
    {
      name: 'Substance Use',
      color: '#22c55e',
      fields: [
        { key: 'substance_loss_of_control', label: 'Loss of Control' },
        { key: 'substance_amnesic_episodes', label: 'Amnesic Episodes' },
        { key: 'substance_legal_problems', label: 'Legal Problems' },
        { key: 'substance_alcohol_abuse', label: 'Alcohol Abuse' },
        { key: 'substance_opiate_abuse', label: 'Opiate Abuse' },
        { key: 'substance_prescription_abuse', label: 'Prescription Abuse' },
        { key: 'substance_polysubstance_abuse', label: 'Polysubstance Abuse' },
      ],
    },
    {
      name: 'Personality',
      color: '#06b6d4',
      fields: [
        { key: 'personality_oddness', label: 'Oddness' },
        { key: 'personality_oppositional', label: 'Oppositional Behavior' },
        { key: 'personality_disregard_law', label: 'Disregard for Law' },
        { key: 'personality_self_injuries', label: 'Self-Injuries' },
        { key: 'personality_entitlement', label: 'Entitlement' },
        { key: 'personality_passive_aggressive', label: 'Passive-Aggressive' },
        { key: 'personality_dependency', label: 'Dependency' },
      ],
    },
  ];

  // Build symptom grid HTML
  const symptomGridHTML = symptomCategories.map(category => {
    const fieldsHTML = category.fields.map(field => {
      const severity = getSeverityDisplay(formData[field.key] as string);
      return `
        <div class="symptom-row">
          <span class="symptom-label">${field.label}</span>
          <span class="severity-badge" style="background: ${severity.bg}; color: ${severity.color};">${severity.text}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="symptom-category">
        <div class="category-header" style="border-left-color: ${category.color};">
          <h3>${category.name}</h3>
        </div>
        <div class="symptom-fields">
          ${fieldsHTML}
        </div>
      </div>
    `;
  }).join('');

  // Narrative sections
  const narrativeSections = [
    { key: 'narrative_history', label: 'Psychiatric History' },
    { key: 'narrative_presenting_problems', label: 'Presenting Problems' },
    { key: 'narrative_risk_of_harm', label: 'Risk of Harm Assessment' },
    { key: 'narrative_functional_status', label: 'Functional Status' },
    { key: 'narrative_comorbidities', label: 'Medical Comorbidities' },
    { key: 'narrative_environmental_stressors', label: 'Environmental Stressors' },
    { key: 'narrative_natural_support', label: 'Natural Support Systems' },
    { key: 'narrative_treatment_response', label: 'Treatment Response' },
    { key: 'narrative_level_of_care', label: 'Level of Care Justification' },
    { key: 'narrative_current_medications', label: 'Current Medications' },
    { key: 'narrative_other_clinical_info', label: 'Other Clinical Information' },
  ];

  const narrativeHTML = narrativeSections.map(section => {
    const content = formData[section.key] as string || 'Not documented';
    return `
      <div class="narrative-section">
        <h3>${section.label}</h3>
        <div class="narrative-content">${content}</div>
      </div>
    `;
  }).join('');

  // Transportation section
  const transportationValue = formData.transportation_available || 'YES';
  const transportationNotes = formData.transportation_notes || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Prior Authorization Clinical Questionnaire</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        @page {
          size: A4;
          margin: 1cm;
        }

        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 9pt;
          line-height: 1.4;
          color: #1f2937;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #4f46e5;
          padding-bottom: 15px;
          margin-bottom: 15px;
        }

        .logo-section {
          display: flex;
          flex-direction: column;
        }

        .logo {
          font-size: 18pt;
          font-weight: bold;
          color: #4f46e5;
        }

        .subtitle {
          font-size: 10pt;
          color: #6b7280;
          margin-top: 2px;
        }

        .doc-info {
          text-align: right;
          font-size: 8pt;
          color: #6b7280;
        }

        .patient-info {
          background: linear-gradient(135deg, #eff6ff, #f0fdf4);
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 15px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .patient-info .info-item {
          display: flex;
          flex-direction: column;
        }

        .patient-info .label {
          font-size: 7pt;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 600;
        }

        .patient-info .value {
          font-size: 9pt;
          font-weight: 600;
          color: #1e3a8a;
        }

        .section-title {
          background: #4f46e5;
          color: white;
          padding: 8px 12px;
          font-size: 11pt;
          font-weight: 600;
          margin: 15px 0 10px 0;
          border-radius: 4px;
        }

        .symptom-category {
          margin-bottom: 10px;
          break-inside: avoid;
        }

        .category-header {
          background: #f3f4f6;
          padding: 6px 10px;
          border-left: 4px solid #4f46e5;
          margin-bottom: 5px;
        }

        .category-header h3 {
          font-size: 10pt;
          color: #374151;
          font-weight: 600;
        }

        .symptom-fields {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
          padding-left: 14px;
        }

        .symptom-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3px 8px;
          background: #fafafa;
          border-radius: 3px;
        }

        .symptom-label {
          font-size: 8pt;
          color: #4b5563;
        }

        .severity-badge {
          font-size: 7pt;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
          min-width: 50px;
          text-align: center;
        }

        .narrative-section {
          margin-bottom: 12px;
          break-inside: avoid;
        }

        .narrative-section h3 {
          font-size: 9pt;
          color: #1e40af;
          font-weight: 600;
          margin-bottom: 4px;
          padding-bottom: 3px;
          border-bottom: 1px solid #e5e7eb;
        }

        .narrative-content {
          font-size: 9pt;
          color: #374151;
          padding: 8px;
          background: #f9fafb;
          border-radius: 4px;
          white-space: pre-wrap;
          min-height: 40px;
        }

        .transportation-section {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 12px;
          margin-top: 15px;
        }

        .transportation-section h3 {
          font-size: 10pt;
          color: #166534;
          margin-bottom: 8px;
        }

        .transportation-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .footer {
          margin-top: 20px;
          padding-top: 10px;
          border-top: 2px solid #e5e7eb;
          font-size: 7pt;
          color: #9ca3af;
          text-align: center;
        }

        .signature-section {
          margin-top: 20px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .signature-box {
          border-top: 1px solid #374151;
          padding-top: 5px;
          margin-top: 30px;
        }

        .signature-box .label {
          font-size: 8pt;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          <div class="logo">MentalSpace EHR</div>
          <div class="subtitle">Prior Authorization Clinical Questionnaire</div>
        </div>
        <div class="doc-info">
          <div>Authorization #: ${headerInfo.authorizationNumber}</div>
          <div>Generated: ${timestamp}</div>
          <div>Georgia Medicaid CMO Format</div>
        </div>
      </div>

      <div class="patient-info">
        <div class="info-item">
          <span class="label">Client Name</span>
          <span class="value">${headerInfo.clientName || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="label">Date of Birth</span>
          <span class="value">${headerInfo.clientDOB ? new Date(headerInfo.clientDOB).toLocaleDateString() : 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="label">Insurance</span>
          <span class="value">${headerInfo.insuranceDisplay || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="label">Diagnoses</span>
          <span class="value" style="font-size: 8pt;">${headerInfo.diagnosisDisplay || 'N/A'}</span>
        </div>
      </div>

      <div class="section-title">Clinical Symptoms Assessment</div>
      ${symptomGridHTML}

      ${formData.substance_other_drugs ? `
        <div class="narrative-section">
          <h3>Other Drugs (Specify)</h3>
          <div class="narrative-content">${formData.substance_other_drugs}</div>
        </div>
      ` : ''}

      ${formData.personality_enduring_traits ? `
        <div class="narrative-section">
          <h3>Enduring Personality Traits</h3>
          <div class="narrative-content">${formData.personality_enduring_traits}</div>
        </div>
      ` : ''}

      <div class="section-title">Clinical Narratives</div>
      ${narrativeHTML}

      <div class="transportation-section">
        <h3>Transportation Assessment</h3>
        <div class="transportation-grid">
          <div class="info-item">
            <span class="label">Transportation Available</span>
            <span class="value">${transportationValue}</span>
          </div>
          <div class="info-item">
            <span class="label">Notes</span>
            <span class="value">${transportationNotes || 'None'}</span>
          </div>
        </div>
      </div>

      <div class="signature-section">
        <div>
          <div class="signature-box">
            <div class="label">Clinician Signature / Date</div>
          </div>
        </div>
        <div>
          <div class="signature-box">
            <div class="label">Supervisor Signature / Date (if applicable)</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>MentalSpace EHR - Georgia Medicaid Prior Authorization</p>
        <p>This document contains Protected Health Information (PHI) and must be handled in accordance with HIPAA regulations.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate PDF for a Prior Authorization questionnaire
 */
export async function generatePAPdf(priorAuthorizationId: string): Promise<Buffer> {
  logger.info('Generating PA questionnaire PDF', { priorAuthorizationId });

  // Fetch questionnaire data
  const questionnaire = await getQuestionnaire(priorAuthorizationId);

  if (!questionnaire) {
    throw new Error('Questionnaire not found for this prior authorization');
  }

  // Fetch prior authorization for auth number
  const pa = await prisma.priorAuthorization.findUnique({
    where: { id: priorAuthorizationId },
    select: { authorizationNumber: true },
  });

  if (!pa) {
    throw new Error('Prior Authorization not found');
  }

  const headerInfo: PAHeaderInfo = {
    clientName: questionnaire.formData.clientName || '',
    clientDOB: questionnaire.formData.clientDOB || '',
    insuranceDisplay: questionnaire.formData.insuranceDisplay || '',
    diagnosisDisplay: questionnaire.formData.diagnosisDisplay || '',
    authorizationNumber: pa.authorizationNumber,
  };

  // Generate HTML
  const htmlContent = generatePAQuestionnaireHTML(headerInfo, questionnaire.formData as unknown as Record<string, unknown>);

  // Launch Puppeteer and generate PDF
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5cm',
        right: '0.5cm',
        bottom: '0.5cm',
        left: '0.5cm',
      },
    });

    logger.info('PA questionnaire PDF generated successfully', { priorAuthorizationId });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export const priorAuthPdfService = {
  generatePAPdf,
};

export default priorAuthPdfService;
