import { PrismaClient, UserRole, Gender, ClientStatus, AppointmentStatus, NoteStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Hash password for all users
  const password = await bcrypt.hash('SecurePass123!', 10);

  // ============================================================================
  // Create Users
  // ============================================================================
  console.log('Creating users...');

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@mentalspace.com',
      password,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: UserRole.ADMINISTRATOR,
      title: 'PsyD',
      licenseNumber: 'PSY-12345',
      licenseState: 'CA',
      licenseExpiration: new Date('2026-12-31'),
      npiNumber: '1234567890',
      credentials: ['Licensed Psychologist', 'Board Certified'],
      specialties: ['Clinical Psychology', 'Trauma', 'Anxiety'],
      languagesSpoken: ['English', 'Spanish'],
      phoneNumber: '555-0101',
      defaultRate: 200.00,
      isActive: true,
      isSupervisor: true,
      supervisionLicenses: ['PSY'],
    },
  });

  const supervisorUser = await prisma.user.create({
    data: {
      email: 'supervisor@mentalspace.com',
      password,
      firstName: 'Michael',
      lastName: 'Chen',
      role: UserRole.SUPERVISOR,
      title: 'PhD',
      licenseNumber: 'PSY-23456',
      licenseState: 'CA',
      licenseExpiration: new Date('2027-06-30'),
      npiNumber: '2345678901',
      credentials: ['Licensed Clinical Psychologist', 'ABPP Board Certified'],
      specialties: ['Cognitive Behavioral Therapy', 'Depression', 'Anxiety Disorders'],
      languagesSpoken: ['English', 'Mandarin'],
      phoneNumber: '555-0102',
      defaultRate: 180.00,
      isActive: true,
      isSupervisor: true,
      supervisionLicenses: ['PSY', 'LMFT', 'LCSW'],
    },
  });

  const clinician1 = await prisma.user.create({
    data: {
      email: 'clinician1@mentalspace.com',
      password,
      firstName: 'Emily',
      lastName: 'Rodriguez',
      role: UserRole.CLINICIAN,
      title: 'AMFT',
      licenseNumber: 'AMFT-98765',
      licenseState: 'CA',
      licenseExpiration: new Date('2026-03-31'),
      credentials: ['Associate Marriage and Family Therapist'],
      specialties: ['Family Therapy', 'Adolescents', 'Relationship Issues'],
      languagesSpoken: ['English', 'Spanish'],
      phoneNumber: '555-0103',
      defaultRate: 120.00,
      isActive: true,
      isUnderSupervision: true,
      supervisorId: supervisorUser.id,
      supervisionStartDate: new Date('2024-01-15'),
      requiredSupervisionHours: 3000,
      completedSupervisionHours: 850.5,
    },
  });

  const clinician2 = await prisma.user.create({
    data: {
      email: 'clinician2@mentalspace.com',
      password,
      firstName: 'David',
      lastName: 'Thompson',
      role: UserRole.ASSOCIATE,
      title: 'ACSW',
      licenseNumber: 'ACSW-45678',
      licenseState: 'CA',
      licenseExpiration: new Date('2025-11-30'),
      credentials: ['Associate Clinical Social Worker'],
      specialties: ['Trauma-Informed Care', 'PTSD', 'Veterans'],
      languagesSpoken: ['English'],
      phoneNumber: '555-0104',
      defaultRate: 110.00,
      isActive: true,
      isUnderSupervision: true,
      supervisorId: supervisorUser.id,
      supervisionStartDate: new Date('2023-09-01'),
      requiredSupervisionHours: 3200,
      completedSupervisionHours: 1420.0,
    },
  });

  const billerUser = await prisma.user.create({
    data: {
      email: 'billing@mentalspace.com',
      password,
      firstName: 'Jennifer',
      lastName: 'Martinez',
      role: UserRole.BILLING_STAFF,
      title: 'Billing Specialist',
      licenseNumber: 'N/A',
      licenseState: 'CA',
      licenseExpiration: new Date('2099-12-31'),
      credentials: ['Certified Medical Biller'],
      specialties: ['Medical Billing', 'Insurance Claims'],
      languagesSpoken: ['English', 'Spanish'],
      phoneNumber: '555-0105',
      isActive: true,
    },
  });

  console.log(`Created ${5} users`);

  // ============================================================================
  // Create Clients
  // ============================================================================
  console.log('Creating clients...');

  const clients = [];

  const client1 = await prisma.client.create({
    data: {
      medicalRecordNumber: 'MRN-001001',
      firstName: 'Jessica',
      lastName: 'Anderson',
      dateOfBirth: new Date('1985-03-15'),
      primaryPhone: '555-1001',
      primaryPhoneType: 'Mobile',
      email: 'jessica.anderson@example.com',
      preferredContactMethod: 'Email',
      addressStreet1: '123 Main Street',
      addressCity: 'Los Angeles',
      addressState: 'CA',
      addressZipCode: '90001',
      gender: Gender.FEMALE,
      maritalStatus: 'Married',
      race: ['White'],
      ethnicity: 'Not Hispanic or Latino',
      primaryLanguage: 'English',
      otherLanguages: [],
      education: 'Bachelor\'s Degree',
      employmentStatus: 'Employed Full-Time',
      occupation: 'Marketing Manager',
      status: ClientStatus.ACTIVE,
      primaryTherapistId: clinician1.id,
      treatmentConsent: true,
      treatmentConsentDate: new Date('2024-01-10'),
      hipaaAcknowledgment: true,
      hipaaAcknowledgmentDate: new Date('2024-01-10'),
      appointmentReminders: true,
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  clients.push(client1);

  const client2 = await prisma.client.create({
    data: {
      medicalRecordNumber: 'MRN-001002',
      firstName: 'Marcus',
      lastName: 'Williams',
      dateOfBirth: new Date('1992-07-22'),
      primaryPhone: '555-1002',
      primaryPhoneType: 'Mobile',
      email: 'marcus.williams@example.com',
      preferredContactMethod: 'Phone',
      addressStreet1: '456 Oak Avenue',
      addressCity: 'Los Angeles',
      addressState: 'CA',
      addressZipCode: '90002',
      gender: Gender.MALE,
      maritalStatus: 'Single',
      race: ['Black or African American'],
      ethnicity: 'Not Hispanic or Latino',
      primaryLanguage: 'English',
      otherLanguages: [],
      education: 'Some College',
      employmentStatus: 'Employed Part-Time',
      occupation: 'Retail Associate',
      status: ClientStatus.ACTIVE,
      primaryTherapistId: clinician2.id,
      treatmentConsent: true,
      treatmentConsentDate: new Date('2024-02-05'),
      hipaaAcknowledgment: true,
      hipaaAcknowledgmentDate: new Date('2024-02-05'),
      appointmentReminders: true,
      isVeteran: true,
      militaryBranch: 'Army',
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  clients.push(client2);

  const client3 = await prisma.client.create({
    data: {
      medicalRecordNumber: 'MRN-001003',
      firstName: 'Maria',
      lastName: 'Garcia',
      dateOfBirth: new Date('1978-11-08'),
      primaryPhone: '555-1003',
      primaryPhoneType: 'Mobile',
      email: 'maria.garcia@example.com',
      preferredContactMethod: 'Phone',
      addressStreet1: '789 Elm Street',
      addressCity: 'Los Angeles',
      addressState: 'CA',
      addressZipCode: '90003',
      gender: Gender.FEMALE,
      maritalStatus: 'Divorced',
      race: ['White'],
      ethnicity: 'Hispanic or Latino',
      primaryLanguage: 'Spanish',
      otherLanguages: ['English'],
      needsInterpreter: false,
      education: 'High School Diploma',
      employmentStatus: 'Employed Full-Time',
      occupation: 'Home Health Aide',
      status: ClientStatus.ACTIVE,
      primaryTherapistId: clinician1.id,
      treatmentConsent: true,
      treatmentConsentDate: new Date('2023-11-20'),
      hipaaAcknowledgment: true,
      hipaaAcknowledgmentDate: new Date('2023-11-20'),
      appointmentReminders: true,
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  clients.push(client3);

  const client4 = await prisma.client.create({
    data: {
      medicalRecordNumber: 'MRN-001004',
      firstName: 'Alex',
      lastName: 'Kim',
      dateOfBirth: new Date('1995-05-30'),
      primaryPhone: '555-1004',
      primaryPhoneType: 'Mobile',
      email: 'alex.kim@example.com',
      preferredContactMethod: 'Email',
      addressStreet1: '321 Pine Road',
      addressCity: 'Pasadena',
      addressState: 'CA',
      addressZipCode: '91101',
      gender: Gender.NON_BINARY,
      pronouns: 'they/them',
      maritalStatus: 'Single',
      race: ['Asian'],
      ethnicity: 'Not Hispanic or Latino',
      primaryLanguage: 'English',
      otherLanguages: ['Korean'],
      education: 'Master\'s Degree',
      employmentStatus: 'Employed Full-Time',
      occupation: 'Software Engineer',
      status: ClientStatus.ACTIVE,
      primaryTherapistId: supervisorUser.id,
      treatmentConsent: true,
      treatmentConsentDate: new Date('2024-03-12'),
      hipaaAcknowledgment: true,
      hipaaAcknowledgmentDate: new Date('2024-03-12'),
      electronicCommunication: true,
      appointmentReminders: true,
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  clients.push(client4);

  const client5 = await prisma.client.create({
    data: {
      medicalRecordNumber: 'MRN-001005',
      firstName: 'Sarah',
      lastName: 'Miller',
      dateOfBirth: new Date('2005-09-18'),
      primaryPhone: '555-1005',
      primaryPhoneType: 'Mobile',
      email: 'sarah.miller@example.com',
      preferredContactMethod: 'Phone',
      addressStreet1: '654 Maple Drive',
      addressCity: 'Glendale',
      addressState: 'CA',
      addressZipCode: '91201',
      gender: Gender.FEMALE,
      maritalStatus: 'Single',
      race: ['White'],
      ethnicity: 'Not Hispanic or Latino',
      primaryLanguage: 'English',
      otherLanguages: [],
      education: 'High School Student',
      employmentStatus: 'Student',
      status: ClientStatus.ACTIVE,
      primaryTherapistId: clinician1.id,
      treatmentConsent: true,
      treatmentConsentDate: new Date('2024-04-01'),
      hipaaAcknowledgment: true,
      hipaaAcknowledgmentDate: new Date('2024-04-01'),
      guardianName: 'Karen Miller',
      guardianPhone: '555-1006',
      guardianRelationship: 'Mother',
      appointmentReminders: true,
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  clients.push(client5);

  const client6 = await prisma.client.create({
    data: {
      medicalRecordNumber: 'MRN-001006',
      firstName: 'Robert',
      lastName: 'Taylor',
      dateOfBirth: new Date('1960-02-14'),
      primaryPhone: '555-1007',
      primaryPhoneType: 'Home',
      secondaryPhone: '555-1008',
      secondaryPhoneType: 'Mobile',
      addressStreet1: '987 Cedar Lane',
      addressCity: 'Burbank',
      addressState: 'CA',
      addressZipCode: '91501',
      gender: Gender.MALE,
      maritalStatus: 'Widowed',
      race: ['White'],
      ethnicity: 'Not Hispanic or Latino',
      primaryLanguage: 'English',
      otherLanguages: [],
      education: 'Bachelor\'s Degree',
      employmentStatus: 'Retired',
      status: ClientStatus.ACTIVE,
      primaryTherapistId: clinician2.id,
      treatmentConsent: true,
      treatmentConsentDate: new Date('2024-01-25'),
      hipaaAcknowledgment: true,
      hipaaAcknowledgmentDate: new Date('2024-01-25'),
      isVeteran: true,
      militaryBranch: 'Navy',
      militaryDischargeType: 'Honorable',
      appointmentReminders: true,
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  clients.push(client6);

  const client7 = await prisma.client.create({
    data: {
      medicalRecordNumber: 'MRN-001007',
      firstName: 'Priya',
      lastName: 'Patel',
      dateOfBirth: new Date('1988-12-05'),
      primaryPhone: '555-1009',
      primaryPhoneType: 'Mobile',
      email: 'priya.patel@example.com',
      preferredContactMethod: 'Email',
      addressStreet1: '147 Willow Street',
      addressCity: 'Long Beach',
      addressState: 'CA',
      addressZipCode: '90801',
      gender: Gender.FEMALE,
      maritalStatus: 'Married',
      race: ['Asian'],
      ethnicity: 'Not Hispanic or Latino',
      primaryLanguage: 'English',
      otherLanguages: ['Hindi', 'Gujarati'],
      education: 'Master\'s Degree',
      employmentStatus: 'Employed Full-Time',
      occupation: 'Pharmacist',
      status: ClientStatus.ACTIVE,
      primaryTherapistId: supervisorUser.id,
      treatmentConsent: true,
      treatmentConsentDate: new Date('2024-02-20'),
      hipaaAcknowledgment: true,
      hipaaAcknowledgmentDate: new Date('2024-02-20'),
      electronicCommunication: true,
      appointmentReminders: true,
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  clients.push(client7);

  const client8 = await prisma.client.create({
    data: {
      medicalRecordNumber: 'MRN-001008',
      firstName: 'James',
      lastName: 'Brown',
      dateOfBirth: new Date('1973-08-29'),
      primaryPhone: '555-1010',
      primaryPhoneType: 'Mobile',
      email: 'james.brown@example.com',
      preferredContactMethod: 'Phone',
      addressStreet1: '258 Birch Avenue',
      addressCity: 'Santa Monica',
      addressState: 'CA',
      addressZipCode: '90401',
      gender: Gender.MALE,
      maritalStatus: 'Divorced',
      race: ['Black or African American'],
      ethnicity: 'Not Hispanic or Latino',
      primaryLanguage: 'English',
      otherLanguages: [],
      education: 'Some College',
      employmentStatus: 'Self-Employed',
      occupation: 'Contractor',
      status: ClientStatus.ACTIVE,
      primaryTherapistId: clinician1.id,
      treatmentConsent: true,
      treatmentConsentDate: new Date('2023-12-10'),
      hipaaAcknowledgment: true,
      hipaaAcknowledgmentDate: new Date('2023-12-10'),
      appointmentReminders: true,
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  clients.push(client8);

  const client9 = await prisma.client.create({
    data: {
      medicalRecordNumber: 'MRN-001009',
      firstName: 'Emily',
      lastName: 'Chen',
      dateOfBirth: new Date('2001-04-12'),
      primaryPhone: '555-1011',
      primaryPhoneType: 'Mobile',
      email: 'emily.chen@example.com',
      preferredContactMethod: 'Email',
      addressStreet1: '369 Spruce Court',
      addressCity: 'Irvine',
      addressState: 'CA',
      addressZipCode: '92602',
      gender: Gender.FEMALE,
      maritalStatus: 'Single',
      race: ['Asian'],
      ethnicity: 'Not Hispanic or Latino',
      primaryLanguage: 'English',
      otherLanguages: ['Mandarin'],
      education: 'Bachelor\'s Degree (In Progress)',
      employmentStatus: 'Student',
      occupation: 'University Student',
      status: ClientStatus.ACTIVE,
      primaryTherapistId: clinician2.id,
      treatmentConsent: true,
      treatmentConsentDate: new Date('2024-03-01'),
      hipaaAcknowledgment: true,
      hipaaAcknowledgmentDate: new Date('2024-03-01'),
      electronicCommunication: true,
      appointmentReminders: true,
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  clients.push(client9);

  const client10 = await prisma.client.create({
    data: {
      medicalRecordNumber: 'MRN-001010',
      firstName: 'Michael',
      lastName: 'Davis',
      dateOfBirth: new Date('1982-06-25'),
      primaryPhone: '555-1012',
      primaryPhoneType: 'Mobile',
      email: 'michael.davis@example.com',
      preferredContactMethod: 'Phone',
      addressStreet1: '741 Redwood Boulevard',
      addressCity: 'Anaheim',
      addressState: 'CA',
      addressZipCode: '92801',
      gender: Gender.MALE,
      maritalStatus: 'Married',
      race: ['White'],
      ethnicity: 'Not Hispanic or Latino',
      primaryLanguage: 'English',
      otherLanguages: [],
      education: 'Bachelor\'s Degree',
      employmentStatus: 'Employed Full-Time',
      occupation: 'Teacher',
      status: ClientStatus.ACTIVE,
      primaryTherapistId: supervisorUser.id,
      treatmentConsent: true,
      treatmentConsentDate: new Date('2024-01-15'),
      hipaaAcknowledgment: true,
      hipaaAcknowledgmentDate: new Date('2024-01-15'),
      appointmentReminders: true,
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  clients.push(client10);

  console.log(`Created ${clients.length} clients`);

  // ============================================================================
  // Create Emergency Contacts
  // ============================================================================
  console.log('Creating emergency contacts...');

  for (const client of clients.slice(0, 5)) {
    await prisma.emergencyContact.create({
      data: {
        clientId: client.id,
        name: 'Emergency Contact for ' + client.firstName,
        relationship: 'Spouse',
        phone: '555-9999',
        isPrimary: true,
        okayToDiscussHealth: true,
        okayToLeaveMessage: true,
      },
    });
  }

  // ============================================================================
  // Create Appointments
  // ============================================================================
  console.log('Creating appointments...');

  const today = new Date();
  const appointments = [];

  // Past completed appointments
  for (let i = 1; i <= 8; i++) {
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - (i * 7));

    const clientIndex = i % clients.length;
    const clinicianId = i % 2 === 0 ? clinician1.id : clinician2.id;

    const appointment = await prisma.appointment.create({
      data: {
        clientId: clients[clientIndex].id,
        clinicianId: clinicianId,
        appointmentDate: pastDate,
        startTime: '10:00 AM',
        endTime: '11:00 AM',
        duration: 60,
        appointmentType: 'Individual Therapy',
        serviceLocation: 'Office',
        status: AppointmentStatus.COMPLETED,
        statusUpdatedDate: pastDate,
        statusUpdatedBy: clinicianId,
        cptCode: '90834',
        icdCodes: ['F41.1', 'F33.1'],
        chargeAmount: 150.00,
        billingStatus: 'Billed',
        checkedInTime: '9:55 AM',
        checkedInBy: 'Front Desk',
        checkedOutTime: '11:05 AM',
        checkedOutBy: 'Front Desk',
        actualDuration: 60,
        createdBy: adminUser.id,
        lastModifiedBy: adminUser.id,
      },
    });
    appointments.push(appointment);
  }

  // Upcoming scheduled appointments
  for (let i = 1; i <= 8; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + i);

    const clientIndex = i % clients.length;
    const clinicianId = i % 2 === 0 ? clinician1.id : clinician2.id;

    const appointment = await prisma.appointment.create({
      data: {
        clientId: clients[clientIndex].id,
        clinicianId: clinicianId,
        appointmentDate: futureDate,
        startTime: i % 2 === 0 ? '2:00 PM' : '3:00 PM',
        endTime: i % 2 === 0 ? '3:00 PM' : '4:00 PM',
        duration: 60,
        appointmentType: 'Individual Therapy',
        serviceLocation: 'Office',
        status: AppointmentStatus.SCHEDULED,
        statusUpdatedDate: new Date(),
        statusUpdatedBy: adminUser.id,
        cptCode: '90834',
        icdCodes: ['F41.1'],
        chargeAmount: 150.00,
        billingStatus: 'Not Billed',
        emailReminderSent: false,
        smsReminderSent: false,
        createdBy: adminUser.id,
        lastModifiedBy: adminUser.id,
      },
    });
    appointments.push(appointment);
  }

  // Some cancelled and no-show appointments
  const cancelledDate = new Date(today);
  cancelledDate.setDate(cancelledDate.getDate() - 3);

  const cancelledAppt = await prisma.appointment.create({
    data: {
      clientId: clients[0].id,
      clinicianId: clinician1.id,
      appointmentDate: cancelledDate,
      startTime: '1:00 PM',
      endTime: '2:00 PM',
      duration: 60,
      appointmentType: 'Individual Therapy',
      serviceLocation: 'Office',
      status: AppointmentStatus.CANCELLED,
      statusUpdatedDate: cancelledDate,
      statusUpdatedBy: clients[0].id,
      cancellationDate: cancelledDate,
      cancellationReason: 'Client Illness',
      cancellationNotes: 'Client called to cancel due to flu',
      cancelledBy: clients[0].id,
      cancellationFeeApplied: false,
      billingStatus: 'Not Billed',
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  appointments.push(cancelledAppt);

  const noShowDate = new Date(today);
  noShowDate.setDate(noShowDate.getDate() - 2);

  const noShowAppt = await prisma.appointment.create({
    data: {
      clientId: clients[1].id,
      clinicianId: clinician2.id,
      appointmentDate: noShowDate,
      startTime: '11:00 AM',
      endTime: '12:00 PM',
      duration: 60,
      appointmentType: 'Individual Therapy',
      serviceLocation: 'Office',
      status: AppointmentStatus.NO_SHOW,
      statusUpdatedDate: noShowDate,
      statusUpdatedBy: clinician2.id,
      noShowDate: noShowDate,
      noShowFeeApplied: true,
      noShowNotes: 'Client did not show up or call',
      billingStatus: 'Pending',
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  appointments.push(noShowAppt);

  // Today's appointments
  const todayAppt1 = await prisma.appointment.create({
    data: {
      clientId: clients[2].id,
      clinicianId: clinician1.id,
      appointmentDate: today,
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      duration: 60,
      appointmentType: 'Individual Therapy',
      serviceLocation: 'Office',
      status: AppointmentStatus.CONFIRMED,
      statusUpdatedDate: today,
      statusUpdatedBy: adminUser.id,
      cptCode: '90834',
      icdCodes: ['F33.1', 'F41.1'],
      chargeAmount: 150.00,
      billingStatus: 'Not Billed',
      emailReminderSent: true,
      emailReminderDate: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  appointments.push(todayAppt1);

  const todayAppt2 = await prisma.appointment.create({
    data: {
      clientId: clients[3].id,
      clinicianId: clinician2.id,
      appointmentDate: today,
      startTime: '2:00 PM',
      endTime: '3:00 PM',
      duration: 60,
      appointmentType: 'Individual Therapy',
      serviceLocation: 'Telehealth',
      telehealthLink: 'https://meet.example.com/session-12345',
      telehealthPlatform: 'Zoom',
      status: AppointmentStatus.CONFIRMED,
      statusUpdatedDate: today,
      statusUpdatedBy: adminUser.id,
      cptCode: '90834',
      icdCodes: ['F41.9'],
      chargeAmount: 150.00,
      billingStatus: 'Not Billed',
      emailReminderSent: true,
      emailReminderDate: new Date(today.getTime() - 24 * 60 * 60 * 1000),
      createdBy: adminUser.id,
      lastModifiedBy: adminUser.id,
    },
  });
  appointments.push(todayAppt2);

  console.log(`Created ${appointments.length} appointments`);

  // ============================================================================
  // Create Clinical Notes
  // ============================================================================
  console.log('Creating clinical notes...');

  // Completed notes for past appointments
  const completedAppointments = appointments.filter(a => a.status === AppointmentStatus.COMPLETED);

  for (let i = 0; i < 6 && i < completedAppointments.length; i++) {
    const appt = completedAppointments[i];
    const requiresCosign = [clinician1.id, clinician2.id].includes(appt.clinicianId);
    const status = requiresCosign ? NoteStatus.COSIGNED : NoteStatus.SIGNED;

    await prisma.clinicalNote.create({
      data: {
        clientId: appt.clientId,
        clinicianId: appt.clinicianId,
        appointmentId: appt.id,
        noteType: 'SOAP Note',
        sessionDate: appt.appointmentDate,
        sessionStartTime: appt.startTime,
        sessionEndTime: appt.endTime,
        sessionDuration: appt.duration,
        subjective: 'Client reported feeling anxious this week. Described difficulty sleeping and racing thoughts. States that work stress has been particularly high with upcoming deadlines.',
        objective: 'Client appeared tense, sitting forward in chair. Speech was rapid at times. Made good eye contact. Engaged appropriately in session. No signs of acute distress.',
        assessment: 'Client continues to struggle with anxiety symptoms related to work stress. Reports some improvement in coping skills learned in previous sessions. Sleep disturbance persists.',
        plan: 'Continue weekly therapy sessions. Practice breathing exercises daily. Client to track anxiety levels and sleep patterns. Discussed potential for medication consultation if symptoms worsen.',
        suicidalIdeation: false,
        homicidalIdeation: false,
        selfHarm: false,
        riskLevel: 'Low',
        diagnosisCodes: ['F41.1', 'F51.05'],
        interventionsUsed: ['Cognitive Behavioral Therapy', 'Breathing Exercises', 'Psychoeducation'],
        progressTowardGoals: 'Client showing moderate progress toward anxiety management goals. Reports increased awareness of triggers.',
        nextSessionPlan: 'Continue working on anxiety management techniques. Introduce progressive muscle relaxation.',
        status: status,
        signedDate: appt.appointmentDate,
        signedBy: appt.clinicianId,
        requiresCosign: requiresCosign,
        cosignedDate: requiresCosign ? new Date(appt.appointmentDate.getTime() + 24 * 60 * 60 * 1000) : null,
        cosignedBy: requiresCosign ? supervisorUser.id : null,
        dueDate: new Date(appt.appointmentDate.getTime() + 48 * 60 * 60 * 1000),
        completedOnTime: true,
        daysToComplete: 1,
        cptCode: '90834',
        billable: true,
        lastModifiedBy: appt.clinicianId,
      },
    });
  }

  // Draft notes for recent appointments
  const draftAppointments = completedAppointments.slice(6, 8);

  for (const appt of draftAppointments) {
    await prisma.clinicalNote.create({
      data: {
        clientId: appt.clientId,
        clinicianId: appt.clinicianId,
        appointmentId: appt.id,
        noteType: 'SOAP Note',
        sessionDate: appt.appointmentDate,
        sessionStartTime: appt.startTime,
        sessionEndTime: appt.endTime,
        sessionDuration: appt.duration,
        subjective: 'Client reported...',
        objective: 'Client appeared...',
        assessment: 'Assessment in progress...',
        plan: 'Plan to be completed...',
        suicidalIdeation: false,
        homicidalIdeation: false,
        selfHarm: false,
        riskLevel: 'Low',
        diagnosisCodes: ['F41.1'],
        interventionsUsed: ['Cognitive Behavioral Therapy'],
        status: NoteStatus.DRAFT,
        requiresCosign: true,
        dueDate: new Date(appt.appointmentDate.getTime() + 48 * 60 * 60 * 1000),
        completedOnTime: false,
        cptCode: '90834',
        billable: true,
        lastModifiedBy: appt.clinicianId,
      },
    });
  }

  // Notes pending cosign
  const pendingCosignAppt = completedAppointments[Math.min(4, completedAppointments.length - 1)];
  if (pendingCosignAppt) {
    await prisma.clinicalNote.create({
      data: {
        clientId: pendingCosignAppt.clientId,
        clinicianId: clinician1.id,
        appointmentId: pendingCosignAppt.id,
        noteType: 'SOAP Note',
        sessionDate: pendingCosignAppt.appointmentDate,
        sessionStartTime: pendingCosignAppt.startTime,
        sessionEndTime: pendingCosignAppt.endTime,
        sessionDuration: pendingCosignAppt.duration,
        subjective: 'Client reported significant improvement in mood over the past week. Sleep patterns have normalized. Client expressed gratitude for the therapeutic work.',
        objective: 'Client appeared relaxed and engaged. Smiled frequently. Speech was normal rate and volume. Demonstrated good insight.',
        assessment: 'Client showing excellent progress. Anxiety symptoms have decreased significantly. Client demonstrating effective use of coping strategies.',
        plan: 'Continue current treatment plan. Begin spacing out sessions to bi-weekly. Monitor for any return of symptoms.',
        suicidalIdeation: false,
        homicidalIdeation: false,
        selfHarm: false,
        riskLevel: 'Low',
        diagnosisCodes: ['F41.1'],
        interventionsUsed: ['Cognitive Behavioral Therapy', 'Mindfulness'],
        progressTowardGoals: 'Client has met most treatment goals. Ready to transition to maintenance phase.',
        nextSessionPlan: 'Discuss transition to bi-weekly sessions. Review relapse prevention strategies.',
        status: NoteStatus.PENDING_COSIGN,
        signedDate: pendingCosignAppt.appointmentDate,
        signedBy: clinician1.id,
        requiresCosign: true,
        dueDate: new Date(pendingCosignAppt.appointmentDate.getTime() + 48 * 60 * 60 * 1000),
        completedOnTime: true,
        daysToComplete: 1,
        cptCode: '90834',
        billable: true,
        lastModifiedBy: clinician1.id,
      },
    });
  }

  console.log(`Created 10 clinical notes`);

  // ============================================================================
  // Create Supervision Sessions
  // ============================================================================
  console.log('Creating supervision sessions...');

  const supervisionDates = [
    new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000),
    new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000),
    new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
  ];

  for (let i = 0; i < supervisionDates.length; i++) {
    const sessionDate = supervisionDates[i];
    const superviseeId = i % 2 === 0 ? clinician1.id : clinician2.id;

    await prisma.supervisionSession.create({
      data: {
        supervisorId: supervisorUser.id,
        superviseeId: superviseeId,
        sessionDate: sessionDate,
        sessionStartTime: '4:00 PM',
        sessionEndTime: '5:00 PM',
        sessionDuration: 60,
        sessionType: 'Individual',
        sessionFormat: 'In-Person',
        casesDiscussedJson: [
          {
            clientInitials: 'JA',
            presentingIssue: 'Anxiety',
            discussionPoints: 'Reviewed treatment progress, discussed intervention strategies',
          },
          {
            clientInitials: 'MG',
            presentingIssue: 'Depression',
            discussionPoints: 'Explored cultural considerations in treatment',
          },
        ],
        topicsCovered: ['Case Conceptualization', 'Cultural Competence', 'Ethics'],
        skillsDeveloped: ['Assessment', 'Intervention Planning'],
        feedbackProvided: 'Supervisee demonstrates strong clinical skills and appropriate clinical judgment. Continue to develop case conceptualization abilities.',
        areasOfStrength: ['Rapport Building', 'Active Listening', 'Empathy'],
        areasForImprovement: ['Documentation Timeliness', 'Treatment Planning'],
        actionItemsJson: [
          {
            action: 'Complete all progress notes within 24 hours',
            dueDate: new Date(sessionDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            action: 'Review CBT techniques for anxiety',
            dueDate: new Date(sessionDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
        nextSessionScheduled: true,
        nextSessionDate: new Date(sessionDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        hoursEarned: 1.0,
        hourType: 'Direct Individual',
        supervisorSignature: 'Michael Chen, PhD',
        supervisorSignDate: sessionDate,
        superviseeSignature: i % 2 === 0 ? 'Emily Rodriguez, AMFT' : 'David Thompson, ACSW',
        superviseeSignDate: sessionDate,
        superviseeReflection: 'This supervision session was very helpful. I gained valuable insights into cultural considerations in treatment and feel more confident in my approach.',
      },
    });

    // Create corresponding hours log
    await prisma.supervisionHoursLog.create({
      data: {
        superviseeId: superviseeId,
        supervisorId: supervisorUser.id,
        hourDate: sessionDate,
        hourType: 'Direct Individual',
        hoursEarned: 1.0,
        sessionDescription: 'Individual supervision session covering case conceptualization, cultural competence, and ethics',
        topicsCovered: ['Case Conceptualization', 'Cultural Competence', 'Ethics'],
        verifiedBySupervisor: true,
        supervisorVerificationDate: sessionDate,
        supervisorSignature: 'Michael Chen, PhD',
        appliesTo: i % 2 === 0 ? 'AMFT' : 'ACSW',
        status: 'Approved',
        createdBy: supervisorUser.id,
      },
    });
  }

  console.log(`Created 3 supervision sessions and hours logs`);

  // ============================================================================
  // Create Diagnoses
  // ============================================================================
  console.log('Creating diagnoses...');

  for (let i = 0; i < 5; i++) {
    const client = clients[i];
    const diagnoses = [
      { code: 'F41.1', description: 'Generalized Anxiety Disorder', type: 'Primary' },
      { code: 'F33.1', description: 'Major Depressive Disorder, Recurrent, Moderate', type: 'Secondary' },
    ];

    for (const diag of diagnoses) {
      await prisma.diagnosis.create({
        data: {
          clientId: client.id,
          icdCode: diag.code,
          diagnosisDescription: diag.description,
          diagnosisType: diag.type,
          onsetDate: new Date(client.registrationDate),
          status: 'Active',
          diagnosedBy: client.primaryTherapistId,
          diagnosisDate: client.registrationDate,
        },
      });
    }
  }

  console.log('Created diagnoses for clients');

  // ============================================================================
  // Create Insurance Information
  // ============================================================================
  console.log('Creating insurance information...');

  for (let i = 0; i < 7; i++) {
    const client = clients[i];
    await prisma.insuranceInformation.create({
      data: {
        clientId: client.id,
        rank: 'Primary',
        insuranceCompany: i % 3 === 0 ? 'Blue Cross Blue Shield' : i % 3 === 1 ? 'Aetna' : 'Cigna',
        planName: 'PPO Plan',
        planType: 'PPO',
        memberId: `MEMBER${1000 + i}`,
        groupNumber: `GROUP${100 + i}`,
        effectiveDate: new Date('2024-01-01'),
        subscriberIsClient: true,
        customerServicePhone: '1-800-123-4567',
        requiresPriorAuth: false,
        mentalHealthCoverage: true,
        copay: 30.00,
        coinsurance: 20,
        deductible: 1000.00,
        deductibleMet: 500.00,
        outOfPocketMax: 3000.00,
        outOfPocketMet: 750.00,
        lastVerificationDate: new Date(),
        lastVerifiedBy: billerUser.id,
        verificationNotes: 'Benefits verified. Mental health coverage confirmed.',
      },
    });
  }

  console.log('Created insurance information for clients');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
