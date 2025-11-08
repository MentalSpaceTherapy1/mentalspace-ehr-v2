/**
 * Emergency Protocols Seed Data
 * Module 6 - Telehealth Phase 2: Emergency System Enhancements
 *
 * Standardized emergency response protocols for mental health crises
 * during telehealth sessions. Based on industry best practices and
 * clinical guidelines.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Emergency protocols with detailed step-by-step guidance
const emergencyProtocols = [
  // ============================================================================
  // PROTOCOL 1: SUICIDAL IDEATION WITH PLAN
  // ============================================================================
  {
    id: 'suicidal-ideation-with-plan',
    name: 'Suicidal Ideation with Plan and Intent',
    description:
      'Protocol for responding to clients expressing suicidal ideation with a specific plan and intent to harm themselves. This is a critical emergency requiring immediate intervention.',
    triggerConditions: [
      'suicidal_ideation_with_plan',
      'suicidal_ideation_with_intent',
      'access_to_lethal_means',
      'immediate_suicide_risk',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Stay Calm and Connected',
        description:
          'Maintain a calm, supportive demeanor. Do not end the session. Keep the client engaged in conversation.',
        actions: [
          'Express concern and empathy',
          'Tell client you are taking this seriously',
          'Assure client they did the right thing by sharing',
          'Do NOT leave client alone',
        ],
        criticalWarning: 'Never end the session abruptly',
      },
      {
        stepNumber: 2,
        title: 'Assess Immediate Risk',
        description: 'Conduct rapid safety assessment',
        actions: [
          'Ask: "Do you have a plan for how you would end your life?"',
          'Ask: "Do you intend to act on this plan?"',
          'Ask: "Do you have access to means (weapons, pills, etc.)?"',
          'Ask: "When do you plan to do this?"',
          'Ask: "Where are you right now?" (confirm location)',
          'Assess for protective factors',
        ],
        documentation: 'Document all responses verbatim',
      },
      {
        stepNumber: 3,
        title: 'Capture Client Location',
        description:
          'If location not already captured, attempt to identify client location for emergency services',
        actions: [
          'Ask client directly for their address',
          'Confirm street address, city, state, zip',
          'Ask for landmarks or apartment/unit number',
          'Document visible location details from video',
        ],
        criticalWarning: 'Location is essential for emergency response',
      },
      {
        stepNumber: 4,
        title: 'Remove Access to Means',
        description: 'Work with client to reduce access to lethal means',
        actions: [
          'Ask about specific means available',
          'If possible, ask client to remove means from immediate area',
          'Identify who else is in the home who can help',
          'Create distance between client and lethal means',
        ],
      },
      {
        stepNumber: 5,
        title: 'Determine Need for 911',
        description: 'Decide if emergency services are needed',
        criteria: [
          'Client has plan, intent, and means',
          'Client refuses to contract for safety',
          'Client is actively preparing to harm self',
          'Client has taken steps toward suicide (pills, weapon)',
          'No support person available to stay with client',
        ],
        action: 'If any criteria met, prepare to call 911',
      },
      {
        stepNumber: 6,
        title: 'Call 911 (if indicated)',
        description: 'Contact emergency services',
        actions: [
          'Tell client you are calling 911 for their safety',
          'Use separate phone to call 911 (keep session connected)',
          'Provide dispatcher with client location and situation',
          'Provide client name and description',
          'Stay on telehealth session until help arrives',
          'Document 911 call time and who you spoke with',
        ],
        documentation: 'Log exact time of 911 call and dispatcher information',
      },
      {
        stepNumber: 7,
        title: 'Notify Supervisor',
        description: 'Immediately inform clinical supervisor',
        actions: [
          'Contact supervisor via emergency notification system',
          'Provide brief situation overview',
          'Share client location and current status',
          'Request immediate guidance if needed',
        ],
        timing: 'During or immediately after crisis',
      },
      {
        stepNumber: 8,
        title: 'Contact Emergency Contact',
        description: 'Reach out to client emergency contact if appropriate',
        actions: [
          'Call emergency contact on file',
          'Inform them of situation (within HIPAA limits)',
          'Ask them to go to client location if possible',
          'Provide crisis hotline numbers',
        ],
        hipaaNote:
          'You may disclose PHI to prevent imminent harm under 45 CFR 164.512(j)',
      },
      {
        stepNumber: 9,
        title: 'Stay Connected Until Help Arrives',
        description: 'Remain on session with client',
        actions: [
          'Continue supportive conversation',
          'Use de-escalation techniques',
          'Remind client that help is coming',
          'Keep client talking about reasons for living',
          'Stay until EMS or police arrive',
        ],
        criticalWarning: 'Do not end session until help is on scene',
      },
      {
        stepNumber: 10,
        title: 'Document Thoroughly',
        description: 'Complete detailed documentation immediately',
        actions: [
          'Document all statements client made (verbatim)',
          'Note assessment findings',
          'Record actions taken (911 call, notifications)',
          'Document timeline of events',
          'Include outcome (EMS arrival, hospitalization, etc.)',
        ],
        timing: 'Complete within 1 hour of incident',
      },
    ],
    requiredActions: [
      {
        id: 'assess-risk',
        item: 'Conducted comprehensive suicide risk assessment',
        required: true,
      },
      {
        id: 'capture-location',
        item: 'Confirmed client location for emergency services',
        required: true,
      },
      {
        id: 'remove-means',
        item: 'Attempted to remove or distance client from lethal means',
        required: true,
      },
      {
        id: 'call-911',
        item: 'Called 911 if imminent risk identified',
        conditionallyRequired: true,
      },
      {
        id: 'notify-supervisor',
        item: 'Notified clinical supervisor',
        required: true,
      },
      {
        id: 'contact-emergency-contact',
        item: 'Contacted emergency contact (if appropriate)',
        conditionallyRequired: true,
      },
      {
        id: 'complete-documentation',
        item: 'Completed comprehensive documentation within 1 hour',
        required: true,
      },
    ],
    documentationReqs: {
      requiredFields: [
        'Exact statements made by client (verbatim)',
        'Detailed risk assessment findings',
        'Client location (address)',
        'Means available and accessible',
        'Timeline of all interventions',
        '911 call details (if applicable)',
        'Supervisor notification details',
        'Emergency contact notification details',
        'Outcome of intervention',
      ],
      template: `EMERGENCY PROTOCOL ACTIVATED: Suicidal Ideation with Plan

RISK ASSESSMENT:
- Plan: [Describe specific plan]
- Intent: [Client's stated intent]
- Means: [Available means and access]
- Timeframe: [When client planned to act]
- Location: [Client's current location - full address]

CLIENT STATEMENTS (VERBATIM):
[Quote exact statements about suicidal ideation, plan, and intent]

INTERVENTIONS:
[x] Risk assessment completed
[x] Location confirmed
[x] Means safety addressed
[ ] 911 called at [TIME] - spoke with [DISPATCHER NAME]
[x] Supervisor notified at [TIME]
[ ] Emergency contact [NAME] notified at [TIME]

PROTECTIVE FACTORS:
[List any protective factors identified]

OUTCOME:
[Describe resolution - EMS arrival, voluntary safety plan, etc.]

FOLLOW-UP PLAN:
[Next steps for client care]

Clinician: [NAME]
Date/Time: [TIMESTAMP]`,
    },
    notificationRules: {
      supervisor: {
        when: 'IMMEDIATE',
        method: ['EMAIL', 'SMS', 'PHONE'],
        message:
          'Emergency protocol activated: Suicidal ideation with plan. Immediate review required.',
      },
      emergencyContact: {
        when: 'IF_SAFE_AND_APPROPRIATE',
        method: ['PHONE'],
        hipaaException: '45 CFR 164.512(j) - Prevention of imminent harm',
      },
      complianceTeam: {
        when: 'WITHIN_24_HOURS',
        method: ['EMAIL'],
        message: 'Emergency incident report for review',
      },
    },
    isActive: true,
    displayOrder: 1,
  },

  // ============================================================================
  // PROTOCOL 2: ACTIVE SELF-HARM
  // ============================================================================
  {
    id: 'active-self-harm',
    name: 'Active Self-Harm During Session',
    description:
      'Protocol for responding when a client is actively engaging in self-harm behavior during the telehealth session.',
    triggerConditions: [
      'active_self_harm',
      'visible_injury',
      'cutting_behavior',
      'burning_behavior',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Immediate Assessment',
        description: 'Quickly assess severity of injury',
        actions: [
          'Ask: "Are you hurt right now?"',
          'Ask: "Can you show me the injury?"',
          'Ask: "Are you bleeding? How much?"',
          'Assess if injury is life-threatening',
          'Confirm client location',
        ],
        criticalWarning: 'Determine if immediate medical attention needed',
      },
      {
        stepNumber: 2,
        title: 'Stop the Behavior',
        description: 'Intervene to stop ongoing self-harm',
        actions: [
          'Calmly ask client to stop',
          'Ask client to put down any implements',
          'Express concern for their safety',
          'Ask client to move away from harmful items',
        ],
      },
      {
        stepNumber: 3,
        title: 'First Aid Guidance',
        description: 'Provide first aid instructions if appropriate',
        actions: [
          'Ask client to apply pressure if bleeding',
          'Guide client to run cool water over burn',
          'Ask client to clean wound if possible',
          'Assess if stitches or medical care needed',
        ],
        medicalNote: 'If severe injury, proceed to call 911',
      },
      {
        stepNumber: 4,
        title: 'Determine Medical Need',
        description: 'Decide if emergency medical care is needed',
        criteria: [
          'Severe bleeding that won\'t stop',
          'Deep cuts that may need stitches',
          'Severe burns',
          'Client losing consciousness',
          'Signs of shock',
        ],
        action: 'If any criteria met, call 911',
      },
      {
        stepNumber: 5,
        title: 'Call 911 (if indicated)',
        description: 'Contact emergency medical services',
        actions: [
          'Tell client calling for their safety',
          'Call 911 on separate line',
          'Describe injuries to dispatcher',
          'Provide client location',
          'Stay on line with both client and 911',
        ],
      },
      {
        stepNumber: 6,
        title: 'Safety Planning',
        description: 'Create immediate safety plan',
        actions: [
          'Remove all self-harm implements from reach',
          'Identify who can be with client',
          'Call support person to stay with client',
          'Create list of coping skills to use',
          'Provide crisis hotline numbers',
        ],
      },
      {
        stepNumber: 7,
        title: 'Notifications',
        description: 'Notify supervisor and emergency contact',
        actions: [
          'Immediately notify clinical supervisor',
          'Contact emergency contact if appropriate',
          'Document all notifications',
        ],
        timing: 'During or immediately after incident',
      },
      {
        stepNumber: 8,
        title: 'Complete Documentation',
        description: 'Thorough documentation of incident',
        actions: [
          'Describe observed self-harm behavior',
          'Document severity of injuries',
          'Note all interventions provided',
          'Record outcomes and follow-up plan',
        ],
      },
    ],
    requiredActions: [
      {
        id: 'assess-severity',
        item: 'Assessed severity of self-harm injury',
        required: true,
      },
      {
        id: 'stop-behavior',
        item: 'Intervened to stop ongoing self-harm',
        required: true,
      },
      {
        id: 'first-aid',
        item: 'Provided first aid guidance',
        conditionallyRequired: true,
      },
      {
        id: 'call-911',
        item: 'Called 911 for severe injuries',
        conditionallyRequired: true,
      },
      {
        id: 'safety-plan',
        item: 'Created immediate safety plan',
        required: true,
      },
      {
        id: 'notify-supervisor',
        item: 'Notified clinical supervisor',
        required: true,
      },
      {
        id: 'document',
        item: 'Completed documentation immediately',
        required: true,
      },
    ],
    documentationReqs: {
      requiredFields: [
        'Description of self-harm behavior observed',
        'Type and severity of injuries',
        'Client statements about intent',
        'First aid provided',
        'Medical assessment decision',
        '911 call details (if applicable)',
        'Safety plan created',
        'Notifications made',
        'Follow-up plan',
      ],
      template: `EMERGENCY: Active Self-Harm

INCIDENT DESCRIPTION:
- Behavior observed: [Describe what you saw]
- Type of injury: [Cuts, burns, etc.]
- Severity: [Mild, moderate, severe]
- Body location: [Where on body]

MEDICAL ASSESSMENT:
- Bleeding: [Yes/No - amount]
- Depth of injury: [Superficial/deep]
- Medical attention needed: [Yes/No]
- 911 called: [Yes/No - if yes, time and details]

INTERVENTIONS:
- Asked client to stop behavior
- First aid guidance provided
- Implements removed from reach
- Safety plan created

SAFETY PLAN:
- Support person: [Name]
- Coping skills: [List]
- Crisis resources provided

NOTIFICATIONS:
- Supervisor: [Name, time]
- Emergency contact: [If applicable]

FOLLOW-UP:
[Next appointment, additional support needed]`,
    },
    notificationRules: {
      supervisor: {
        when: 'IMMEDIATE',
        method: ['EMAIL', 'SMS', 'PHONE'],
        message: 'Active self-harm during telehealth session. Immediate review required.',
      },
      emergencyContact: {
        when: 'IF_SEVERE_INJURY',
        method: ['PHONE'],
      },
    },
    isActive: true,
    displayOrder: 2,
  },

  // ============================================================================
  // PROTOCOL 3: HOMICIDAL IDEATION / THREAT TO OTHERS
  // ============================================================================
  {
    id: 'homicidal-ideation',
    name: 'Homicidal Ideation or Threat to Others',
    description:
      'Protocol for responding to threats of violence toward others (Tarasoff duty to warn).',
    triggerConditions: [
      'homicidal_ideation',
      'threat_to_specific_person',
      'violence_risk',
      'tarasoff_duty',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Assess Threat Specificity',
        description: 'Determine if threat is specific and credible',
        actions: [
          'Ask: "Who do you plan to harm?"',
          'Ask: "How would you harm them?"',
          'Ask: "When do you plan to do this?"',
          'Ask: "Do you have access to weapons?"',
          'Assess imminence of threat',
        ],
        legalNote: 'Duty to warn if identifiable victim and credible threat',
      },
      {
        stepNumber: 2,
        title: 'Document Threat Details',
        description: 'Record all threat details verbatim',
        actions: [
          'Write exact words used by client',
          'Note specific victim name/identity',
          'Document plan and means',
          'Record timeline',
        ],
        criticalWarning: 'Documentation is legally critical',
      },
      {
        stepNumber: 3,
        title: 'Consult Supervisor Immediately',
        description: 'Emergency consultation required',
        actions: [
          'Contact supervisor immediately',
          'Describe threat specifics',
          'Discuss duty to warn obligations',
          'Document consultation',
        ],
        legalNote: 'Required before warning victim',
      },
      {
        stepNumber: 4,
        title: 'Call 911 if Imminent',
        description: 'Contact police if threat is imminent',
        actions: [
          'If client leaving session to harm someone, call 911',
          'Provide client location',
          'Provide potential victim location if known',
          'Describe threat and weapons',
        ],
        timing: 'Immediate if imminent threat',
      },
      {
        stepNumber: 5,
        title: 'Duty to Warn (if applicable)',
        description: 'Warn identifiable victim and authorities',
        actions: [
          'Contact identifiable victim directly',
          'Warn victim of threat in clear terms',
          'Contact local law enforcement',
          'Provide threat details to police',
          'Document all warnings',
        ],
        legalNote: 'Tarasoff duty overrides confidentiality',
      },
      {
        stepNumber: 6,
        title: 'Document All Actions',
        description: 'Comprehensive legal documentation',
        actions: [
          'Document threat verbatim',
          'Record assessment of credibility',
          'Note all consultations',
          'Document all warnings given',
          'Include legal justification',
        ],
      },
    ],
    requiredActions: [
      {
        id: 'assess-threat',
        item: 'Assessed specificity and credibility of threat',
        required: true,
      },
      {
        id: 'supervisor-consult',
        item: 'Consulted with supervisor immediately',
        required: true,
      },
      {
        id: 'call-911',
        item: 'Called 911 if imminent threat',
        conditionallyRequired: true,
      },
      {
        id: 'warn-victim',
        item: 'Warned identifiable victim (Tarasoff duty)',
        conditionallyRequired: true,
      },
      {
        id: 'warn-police',
        item: 'Warned law enforcement',
        conditionallyRequired: true,
      },
      {
        id: 'document-legal',
        item: 'Completed legal documentation',
        required: true,
      },
    ],
    documentationReqs: {
      requiredFields: [
        'Exact threat statements (verbatim)',
        'Identifiable victim information',
        'Plan and means described',
        'Imminence assessment',
        'Supervisor consultation details',
        'Warnings given (who, when, how)',
        'Law enforcement contact',
        'Legal justification cited',
      ],
      template: `TARASOFF SITUATION: Threat to Others

THREAT ASSESSMENT:
- Victim: [Name and identifying information]
- Threat: [Exact words used by client - verbatim]
- Plan: [How client plans to harm victim]
- Means: [Weapons or means available]
- Imminence: [Timeline of threat]

CREDIBILITY ASSESSMENT:
[Assessment of whether threat is serious and credible]

SUPERVISOR CONSULTATION:
- Supervisor: [Name]
- Time: [Timestamp]
- Recommendation: [Supervisor's guidance]

ACTIONS TAKEN:
[ ] Called 911 at [TIME]
[ ] Warned victim [NAME] at [TIME] via [PHONE/IN-PERSON]
[ ] Contacted police [DEPARTMENT] at [TIME]

LEGAL JUSTIFICATION:
Tarasoff v. Regents of University of California duty to warn.
GA Code § 43-39-16 (protection from liability when warning)

DOCUMENTATION:
All actions taken in good faith to protect identifiable victim.`,
    },
    notificationRules: {
      supervisor: {
        when: 'IMMEDIATE',
        method: ['PHONE'],
        message: 'Urgent: Threat to others. Tarasoff consultation needed immediately.',
      },
      complianceTeam: {
        when: 'WITHIN_2_HOURS',
        method: ['EMAIL'],
      },
    },
    isActive: true,
    displayOrder: 3,
  },

  // ============================================================================
  // PROTOCOL 4: MEDICAL EMERGENCY
  // ============================================================================
  {
    id: 'medical-emergency',
    name: 'Medical Emergency During Session',
    description:
      'Protocol for medical emergencies such as heart attack, stroke, seizure, overdose, or severe injury.',
    triggerConditions: [
      'medical_emergency',
      'heart_attack_symptoms',
      'stroke_symptoms',
      'seizure',
      'overdose',
      'loss_of_consciousness',
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Recognize Medical Emergency',
        description: 'Identify signs of medical emergency',
        signs: [
          'Chest pain, shortness of breath',
          'Facial drooping, slurred speech, arm weakness (stroke)',
          'Seizure activity',
          'Loss of consciousness',
          'Choking or inability to breathe',
          'Severe bleeding',
        ],
      },
      {
        stepNumber: 2,
        title: 'Call 911 Immediately',
        description: 'Do not delay',
        actions: [
          'Call 911 on separate phone line',
          'Provide client exact location',
          'Describe medical symptoms to dispatcher',
          'Stay on line with 911',
          'Keep telehealth session connected',
        ],
        criticalWarning: 'Call 911 first, then notify others',
      },
      {
        stepNumber: 3,
        title: 'Provide First Aid Instructions',
        description: 'Guide client or bystanders',
        actions: [
          'If conscious, keep client calm and talking',
          'If choking, instruct Heimlich maneuver',
          'If seizure, protect head, turn on side',
          'If overdose, try to keep awake',
          'Do not move client unless immediate danger',
        ],
      },
      {
        stepNumber: 4,
        title: 'Stay Connected',
        description: 'Remain on session until EMS arrives',
        actions: [
          'Continue monitoring client condition',
          'Provide updates to 911 dispatcher',
          'Talk to client if responsive',
          'Guide bystanders if present',
          'Confirm when EMS arrives',
        ],
      },
      {
        stepNumber: 5,
        title: 'Notify Supervisor',
        description: 'Inform supervisor of medical emergency',
        actions: [
          'Contact supervisor immediately after 911 call',
          'Brief situation summary',
          'Request guidance if needed',
        ],
      },
      {
        stepNumber: 6,
        title: 'Document Incident',
        description: 'Complete medical emergency documentation',
        actions: [
          'Describe symptoms observed',
          'Note time of 911 call',
          'Record EMS arrival time',
          'Document outcome',
        ],
      },
    ],
    requiredActions: [
      {
        id: 'call-911',
        item: 'Called 911 immediately',
        required: true,
      },
      {
        id: 'first-aid',
        item: 'Provided first aid instructions if applicable',
        conditionallyRequired: true,
      },
      {
        id: 'stay-connected',
        item: 'Remained on session until EMS arrived',
        required: true,
      },
      {
        id: 'notify-supervisor',
        item: 'Notified supervisor',
        required: true,
      },
      {
        id: 'document',
        item: 'Completed documentation',
        required: true,
      },
    ],
    documentationReqs: {
      requiredFields: [
        'Symptoms observed',
        'Time symptoms began',
        '911 call details',
        'First aid provided',
        'EMS arrival time',
        'Client outcome',
      ],
      template: `MEDICAL EMERGENCY DURING TELEHEALTH

SYMPTOMS OBSERVED:
[Describe what you observed - chest pain, facial drooping, etc.]

TIME OF ONSET:
[When symptoms began]

ACTIONS TAKEN:
- Called 911 at [TIME]
- Dispatcher: [Name if provided]
- EMS arrival: [TIME]
- First aid instructions: [What guidance provided]

CLIENT CONDITION:
[Conscious/unconscious, responsive/unresponsive]

OUTCOME:
[EMS transported to hospital, etc.]

NOTIFICATIONS:
- Supervisor: [Name, time]`,
    },
    notificationRules: {
      supervisor: {
        when: 'IMMEDIATE',
        method: ['PHONE', 'SMS'],
      },
    },
    isActive: true,
    displayOrder: 4,
  },
];

/**
 * Seed the emergency protocols database
 */
export async function seedEmergencyProtocols() {
  console.log('Starting emergency protocols seed...');

  try {
    // Delete existing protocols (if re-seeding)
    const deleteCount = await prisma.emergencyProtocol.deleteMany({});
    console.log(`Deleted ${deleteCount.count} existing emergency protocols`);

    // Insert all emergency protocols
    let successCount = 0;
    let errorCount = 0;

    for (const protocol of emergencyProtocols) {
      try {
        await prisma.emergencyProtocol.create({
          data: protocol,
        });
        successCount++;
        console.log(`✓ Added: ${protocol.name}`);
      } catch (error: any) {
        errorCount++;
        console.error(`✗ Failed to add ${protocol.name}:`, error.message);
      }
    }

    console.log('\n=== Emergency Protocols Seed Complete ===');
    console.log(`Successfully added: ${successCount} protocols`);
    console.log(`Failed: ${errorCount} protocols`);
    console.log(`Total in database: ${await prisma.emergencyProtocol.count()}`);

    // Display protocol list
    const protocols = await prisma.emergencyProtocol.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        name: true,
        triggerConditions: true,
      },
    });

    console.log('\n=== Active Emergency Protocols ===');
    protocols.forEach((protocol, index) => {
      console.log(`\n${index + 1}. ${protocol.name}`);
      console.log(`   Triggers: ${protocol.triggerConditions.join(', ')}`);
    });

  } catch (error: any) {
    console.error('Error seeding emergency protocols:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedEmergencyProtocols()
    .then(() => {
      console.log('\nEmergency protocols seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nEmergency protocols seed failed:', error);
      process.exit(1);
    });
}
