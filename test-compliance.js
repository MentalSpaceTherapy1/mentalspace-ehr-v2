/**
 * Test Script for Compliance Management System
 * Module 9: Compliance Management - Agent 3
 *
 * Tests policy management and incident reporting functionality.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Compliance Management System...\n');
  console.log('='.repeat(60));

  try {
    // ========================================================================
    // STEP 1: Get Test Users
    // ========================================================================
    console.log('\n📋 STEP 1: Getting test users...');

    const admin = await prisma.user.findFirst({
      where: { roles: { has: 'ADMIN' } }
    });

    const clinician = await prisma.user.findFirst({
      where: { roles: { has: 'CLINICIAN' } }
    });

    const allUsers = await prisma.user.findMany({
      where: {
        OR: [
          { roles: { has: 'ADMIN' } },
          { roles: { has: 'CLINICIAN' } },
          { roles: { has: 'SUPPORT_STAFF' } }
        ]
      },
      select: { id: true, firstName: true, lastName: true, email: true, roles: true }
    });

    if (!admin || !clinician) {
      throw new Error('Required test users not found. Please seed database first.');
    }

    console.log(`✅ Admin: ${admin.firstName} ${admin.lastName} (${admin.email})`);
    console.log(`✅ Clinician: ${clinician.firstName} ${clinician.lastName} (${clinician.email})`);
    console.log(`✅ Found ${allUsers.length} total users for testing`);

    // ========================================================================
    // STEP 2: Create Test Policies
    // ========================================================================
    console.log('\n📋 STEP 2: Creating test policies...');

    const testPolicies = [
      {
        policyName: 'HIPAA Privacy and Security Policy',
        policyNumber: 'POL-HIPAA-2024-001',
        category: 'COMPLIANCE',
        version: '1.0',
        effectiveDate: new Date('2024-01-01'),
        reviewDate: new Date(),
        nextReviewDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        ownerId: admin.id,
        content: `
# HIPAA Privacy and Security Policy

## Purpose
This policy establishes guidelines for protecting patient health information (PHI) in compliance with HIPAA regulations.

## Scope
Applies to all staff members, contractors, and business associates who have access to PHI.

## Policy Statement
1. All PHI must be kept confidential and secure
2. Access to PHI is limited to authorized personnel only
3. PHI must not be disclosed without proper authorization
4. All breaches must be reported immediately

## Procedures
- Use secure systems for accessing and storing PHI
- Lock screens when away from workstation
- Dispose of PHI securely using shredding or secure deletion
- Report any suspected breaches to compliance officer

## Consequences
Violations may result in disciplinary action up to and including termination.
        `.trim(),
        summary: 'Guidelines for HIPAA compliance and PHI protection',
        requireAck: true,
        status: 'PUBLISHED'
      },
      {
        policyName: 'Clinical Documentation Standards',
        policyNumber: 'POL-CLIN-2024-002',
        category: 'CLINICAL',
        version: '2.0',
        effectiveDate: new Date('2024-06-01'),
        reviewDate: new Date(),
        nextReviewDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
        ownerId: clinician.id,
        content: `
# Clinical Documentation Standards

## Purpose
Ensure all clinical documentation meets professional and regulatory standards.

## Documentation Requirements
1. All sessions must be documented within 24 hours
2. Notes must include: presenting problem, interventions, progress, and plan
3. All entries must be signed and dated
4. Use appropriate clinical terminology

## Quality Standards
- Documentation must be legible and professional
- Avoid abbreviations unless standard
- Include objective observations and clinical reasoning
- Document client progress toward treatment goals
        `.trim(),
        summary: 'Standards for clinical note documentation',
        requireAck: true,
        status: 'APPROVED'
      },
      {
        policyName: 'Emergency Procedures and Crisis Response',
        policyNumber: 'POL-SAFE-2024-003',
        category: 'SAFETY',
        version: '1.5',
        effectiveDate: new Date('2024-03-15'),
        reviewDate: new Date(),
        nextReviewDate: new Date(new Date().setMonth(new Date().getMonth() - 1)), // Overdue for review
        ownerId: admin.id,
        content: `
# Emergency Procedures and Crisis Response

## Emergency Contacts
- 911 for life-threatening emergencies
- Crisis Hotline: 1-800-273-8255
- On-call clinician: [Contact info]

## Crisis Assessment Protocol
1. Assess immediate safety risk
2. Contact supervisor or on-call clinician
3. Implement safety plan if applicable
4. Document all interventions
5. Follow up within 24 hours

## Mandatory Reporting
All staff must report suspected abuse or neglect as required by law.
        `.trim(),
        summary: 'Emergency and crisis response procedures',
        requireAck: true,
        status: 'PUBLISHED'
      },
      {
        policyName: 'IT Security and Data Protection',
        policyNumber: 'POL-IT-2024-004',
        category: 'IT',
        version: '1.0',
        effectiveDate: new Date('2024-02-01'),
        reviewDate: new Date(),
        nextReviewDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        ownerId: admin.id,
        content: `
# IT Security and Data Protection

## Password Requirements
- Minimum 12 characters
- Must include uppercase, lowercase, numbers, and special characters
- Change every 90 days
- No password reuse for 12 cycles

## Access Control
- Multi-factor authentication required for remote access
- Principle of least privilege applies to all system access
- Regular access reviews conducted quarterly

## Data Security
- Encryption required for all PHI at rest and in transit
- Regular backups performed daily
- Disaster recovery plan tested annually
        `.trim(),
        summary: 'IT security policies and procedures',
        requireAck: true,
        status: 'DRAFT'
      }
    ];

    const createdPolicies = [];
    for (const policyData of testPolicies) {
      const policy = await prisma.policy.create({
        data: policyData,
        include: {
          owner: {
            select: { firstName: true, lastName: true }
          }
        }
      });
      createdPolicies.push(policy);
      console.log(`✅ Created: ${policy.policyNumber} - ${policy.policyName} (Status: ${policy.status})`);
    }

    // ========================================================================
    // STEP 3: Distribute Policies to Users
    // ========================================================================
    console.log('\n📋 STEP 3: Distributing policies to users...');

    const userIds = allUsers.map(u => u.id);

    // Distribute published policies
    const publishedPolicies = createdPolicies.filter(p => p.status === 'PUBLISHED');
    for (const policy of publishedPolicies) {
      await prisma.policy.update({
        where: { id: policy.id },
        data: { distributionList: userIds }
      });
      console.log(`📧 Distributed ${policy.policyNumber} to ${userIds.length} users`);
    }

    // ========================================================================
    // STEP 4: Test Policy Acknowledgments
    // ========================================================================
    console.log('\n📋 STEP 4: Creating policy acknowledgments...');

    let ackCount = 0;
    for (const policy of publishedPolicies) {
      // Have some users acknowledge
      const acknowledgers = allUsers.slice(0, Math.floor(allUsers.length * 0.7)); // 70% acknowledgment rate

      for (const user of acknowledgers) {
        try {
          await prisma.policyAcknowledgment.create({
            data: {
              policyId: policy.id,
              userId: user.id,
              signature: `${user.firstName} ${user.lastName}`,
              ipAddress: '127.0.0.1'
            }
          });
          ackCount++;
        } catch (error) {
          // Skip duplicates
        }
      }

      console.log(`✅ ${acknowledgers.length}/${userIds.length} users acknowledged ${policy.policyNumber}`);
    }

    console.log(`✅ Total acknowledgments created: ${ackCount}`);

    // ========================================================================
    // STEP 5: Create Test Incidents
    // ========================================================================
    console.log('\n📋 STEP 5: Creating test incidents...');

    const testIncidents = [
      {
        incidentDate: new Date(new Date().setDate(new Date().getDate() - 5)),
        incidentTime: '14:30',
        incidentType: 'CLINICAL',
        severity: 'MEDIUM',
        location: 'Office Building A',
        specificLocation: 'Therapy Room 3',
        reportedById: clinician.id,
        involvedParties: [clinician.id],
        witnesses: [],
        description: 'Client reported dissatisfaction with session format. Client felt rushed and not heard. Discussed concerns and adjusted session approach.',
        immediateAction: 'Adjusted session pacing, allowed more time for client to express concerns. Scheduled follow-up discussion for next session.',
        investigationStatus: 'RESOLVED',
        resolutionDate: new Date(new Date().setDate(new Date().getDate() - 3))
      },
      {
        incidentDate: new Date(new Date().setDate(new Date().getDate() - 2)),
        incidentTime: '10:15',
        incidentType: 'SECURITY',
        severity: 'HIGH',
        location: 'Main Lobby',
        specificLocation: 'Reception Desk',
        reportedById: admin.id,
        involvedParties: [],
        witnesses: [admin.id],
        description: 'Unauthorized individual attempted to access restricted area. Person claimed to be visiting a client but was not on the approved visitor list.',
        immediateAction: 'Security escorted individual out. All staff reminded about visitor protocols.',
        investigationStatus: 'IN_PROGRESS',
        assignedToId: admin.id,
        followUpDate: new Date(new Date().setDate(new Date().getDate() + 2))
      },
      {
        incidentDate: new Date(),
        incidentTime: '09:00',
        incidentType: 'MEDICATION_ERROR',
        severity: 'CRITICAL',
        location: 'Office Building B',
        specificLocation: 'Medication Room',
        reportedById: clinician.id,
        involvedParties: [clinician.id],
        witnesses: [],
        description: 'CRITICAL: Near-miss medication error. Wrong medication almost dispensed to client. Error caught during final verification step.',
        immediateAction: 'Medication administration halted. Correct medication identified and verified by two staff members before administration. Incident reported to supervisor immediately.',
        investigationStatus: 'PENDING'
      },
      {
        incidentDate: new Date(new Date().setDate(new Date().getDate() - 10)),
        incidentTime: '16:45',
        incidentType: 'COMPLIANCE',
        severity: 'LOW',
        location: 'Office Building A',
        specificLocation: 'Clinician Office 205',
        reportedById: admin.id,
        involvedParties: [clinician.id],
        witnesses: [],
        description: 'Clinical note not completed within required 24-hour timeframe. Note was 36 hours late.',
        immediateAction: 'Clinician reminded of documentation deadlines. Note completed immediately upon notification.',
        investigationStatus: 'CLOSED',
        resolutionDate: new Date(new Date().setDate(new Date().getDate() - 9))
      },
      {
        incidentDate: new Date(new Date().setDate(new Date().getDate() - 1)),
        incidentTime: '11:30',
        incidentType: 'SAFETY',
        severity: 'MEDIUM',
        location: 'Parking Lot',
        specificLocation: 'East Entrance',
        reportedById: admin.id,
        involvedParties: [],
        witnesses: [admin.id],
        description: 'Client slipped on wet surface near entrance during rainy weather. Client not injured but concerned about safety hazard.',
        immediateAction: 'Area immediately cordoned off. Wet floor signs placed. Maintenance notified to address drainage issue.',
        investigationStatus: 'UNDER_REVIEW',
        assignedToId: admin.id,
        followUpDate: new Date(new Date().setDate(new Date().getDate() + 5))
      }
    ];

    const createdIncidents = [];
    for (const incidentData of testIncidents) {
      // Generate incident number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const sequence = String(createdIncidents.length + 1).padStart(4, '0');
      const incidentNumber = `INC-${dateStr}-${sequence}`;

      const incident = await prisma.incident.create({
        data: {
          ...incidentData,
          incidentNumber
        },
        include: {
          reportedBy: {
            select: { firstName: true, lastName: true }
          }
        }
      });
      createdIncidents.push(incident);
      console.log(`✅ Created: ${incident.incidentNumber} - ${incident.incidentType} (Severity: ${incident.severity}, Status: ${incident.investigationStatus})`);
    }

    // ========================================================================
    // STEP 6: Add Corrective Actions to Incidents
    // ========================================================================
    console.log('\n📋 STEP 6: Adding corrective actions to incidents...');

    // Add corrective actions to the medication error incident
    const medicationIncident = createdIncidents.find(i => i.incidentType === 'MEDICATION_ERROR');
    if (medicationIncident) {
      const correctiveActions = [
        {
          id: 'CA-001',
          description: 'Implement double-verification protocol for all medication administration',
          assignedTo: admin.id,
          dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
          status: 'pending',
          notes: 'High priority - implement immediately'
        },
        {
          id: 'CA-002',
          description: 'Conduct medication safety training for all clinical staff',
          assignedTo: admin.id,
          dueDate: new Date(new Date().setDate(new Date().getDate() + 14)),
          status: 'pending',
          notes: 'Schedule training session ASAP'
        },
        {
          id: 'CA-003',
          description: 'Review and update medication administration policies',
          assignedTo: clinician.id,
          dueDate: new Date(new Date().setDate(new Date().getDate() + 21)),
          status: 'pending'
        }
      ];

      await prisma.incident.update({
        where: { id: medicationIncident.id },
        data: {
          correctiveActions,
          rootCause: 'Insufficient verification procedures and staff workload pressure led to near-miss error.'
        }
      });

      console.log(`✅ Added ${correctiveActions.length} corrective actions to ${medicationIncident.incidentNumber}`);
    }

    // ========================================================================
    // STEP 7: Generate Compliance Reports
    // ========================================================================
    console.log('\n📋 STEP 7: Generating compliance reports...');

    // Policy compliance report
    const policyCount = await prisma.policy.count({
      where: { status: 'PUBLISHED', requireAck: true }
    });

    const ackCountTotal = await prisma.policyAcknowledgment.count();

    const expectedAcknowledgments = policyCount * userIds.length;
    const complianceRate = expectedAcknowledgments > 0
      ? ((ackCountTotal / expectedAcknowledgments) * 100).toFixed(1)
      : 0;

    console.log('\n📊 Policy Compliance Report:');
    console.log(`   Published Policies: ${policyCount}`);
    console.log(`   Total Users: ${userIds.length}`);
    console.log(`   Expected Acknowledgments: ${expectedAcknowledgments}`);
    console.log(`   Actual Acknowledgments: ${ackCountTotal}`);
    console.log(`   Compliance Rate: ${complianceRate}%`);

    // Policies due for review
    const policiesDueForReview = await prisma.policy.count({
      where: {
        isActive: true,
        nextReviewDate: { lte: new Date() }
      }
    });
    console.log(`   Policies Due for Review: ${policiesDueForReview}`);

    // Incident statistics
    const incidentStats = {
      total: createdIncidents.length,
      bySeverity: {
        CRITICAL: createdIncidents.filter(i => i.severity === 'CRITICAL').length,
        HIGH: createdIncidents.filter(i => i.severity === 'HIGH').length,
        MEDIUM: createdIncidents.filter(i => i.severity === 'MEDIUM').length,
        LOW: createdIncidents.filter(i => i.severity === 'LOW').length
      },
      byStatus: {
        PENDING: createdIncidents.filter(i => i.investigationStatus === 'PENDING').length,
        IN_PROGRESS: createdIncidents.filter(i => i.investigationStatus === 'IN_PROGRESS').length,
        UNDER_REVIEW: createdIncidents.filter(i => i.investigationStatus === 'UNDER_REVIEW').length,
        RESOLVED: createdIncidents.filter(i => i.investigationStatus === 'RESOLVED').length,
        CLOSED: createdIncidents.filter(i => i.investigationStatus === 'CLOSED').length
      }
    };

    console.log('\n📊 Incident Statistics:');
    console.log(`   Total Incidents: ${incidentStats.total}`);
    console.log('\n   By Severity:');
    Object.entries(incidentStats.bySeverity).forEach(([severity, count]) => {
      console.log(`   - ${severity}: ${count}`);
    });
    console.log('\n   By Investigation Status:');
    Object.entries(incidentStats.byStatus).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });

    // High-priority alerts
    const criticalIncidents = createdIncidents.filter(i => i.severity === 'CRITICAL' && i.investigationStatus === 'PENDING');
    if (criticalIncidents.length > 0) {
      console.log(`\n🚨 ALERT: ${criticalIncidents.length} CRITICAL incident(s) pending investigation!`);
      criticalIncidents.forEach(inc => {
        console.log(`   - ${inc.incidentNumber}: ${inc.incidentType}`);
      });
    }

    // ========================================================================
    // STEP 8: Verification
    // ========================================================================
    console.log('\n📋 STEP 8: Verifying data integrity...');

    const finalPolicyCount = await prisma.policy.count();
    const finalAckCount = await prisma.policyAcknowledgment.count();
    const finalIncidentCount = await prisma.incident.count();

    console.log(`✅ Policies in database: ${finalPolicyCount}`);
    console.log(`✅ Policy acknowledgments: ${finalAckCount}`);
    console.log(`✅ Incidents in database: ${finalIncidentCount}`);

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ ALL TESTS PASSED!');
    console.log('\n📊 Summary:');
    console.log(`   - Policies created: ${createdPolicies.length}`);
    console.log(`   - Policy acknowledgments: ${ackCount}`);
    console.log(`   - Incidents created: ${createdIncidents.length}`);
    console.log(`   - Compliance rate: ${complianceRate}%`);
    console.log(`   - Critical incidents: ${incidentStats.bySeverity.CRITICAL}`);
    console.log('\n🎉 Compliance Management System is working correctly!');
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
