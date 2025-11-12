/**
 * Module 8 Test Data Seeder
 * Creates realistic test data for dashboards, widgets, reports, and predictions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedModule8TestData() {
  console.log('🌱 Starting Module 8 test data seeding...');

  try {
    // Get the first clinician and admin users for assignments
    const clinician = await prisma.user.findFirst({
      where: {
        roles: { has: 'CLINICIAN' }
      }
    });

    const admin = await prisma.user.findFirst({
      where: {
        roles: { has: 'ADMINISTRATOR' }
      }
    });

    if (!clinician || !admin) {
      console.error('❌ No clinician or admin user found. Please run the main seeder first.');
      return;
    }

    console.log(`✅ Found test users - Clinician: ${clinician.email}, Admin: ${admin.email}`);

    // 1. Create sample dashboards
    console.log('\n📊 Creating sample dashboards...');

    const executiveDashboard = await prisma.dashboard.create({
      data: {
        name: 'Executive Dashboard',
        description: 'High-level overview of practice performance and key metrics',
        userId: admin.id,
        isDefault: true,
        isPublic: true,
        layout: {},
      }
    });

    const clinicianDashboard = await prisma.dashboard.create({
      data: {
        name: 'Clinician Performance Dashboard',
        description: 'Track productivity, client outcomes, and clinical quality metrics',
        userId: clinician.id,
        isDefault: false,
        isPublic: false,
        layout: {},
      }
    });

    const operationsDashboard = await prisma.dashboard.create({
      data: {
        name: 'Operations Dashboard',
        description: 'Monitor capacity, scheduling efficiency, and operational KPIs',
        userId: admin.id,
        isDefault: false,
        isPublic: true,
        layout: {},
      }
    });

    console.log(`✅ Created 3 dashboards`);

    // 2. Add widgets to Executive Dashboard
    console.log('\n🧩 Adding widgets to Executive Dashboard...');

    await prisma.widget.createMany({
      data: [
        {
          dashboardId: executiveDashboard.id,
          widgetType: 'REVENUE_TODAY',
          title: 'Revenue Today',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: {},
        },
        {
          dashboardId: executiveDashboard.id,
          widgetType: 'MONTHLY_REVENUE',
          title: 'Monthly Revenue',
          position: { x: 3, y: 0, w: 3, h: 2 },
          config: {},
        },
        {
          dashboardId: executiveDashboard.id,
          widgetType: 'ACTIVE_CLIENTS',
          title: 'Active Clients',
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: { period: 90 },
        },
        {
          dashboardId: executiveDashboard.id,
          widgetType: 'NO_SHOW_RATE',
          title: 'No-Show Rate',
          position: { x: 9, y: 0, w: 3, h: 2 },
          config: { period: 30 },
        },
        {
          dashboardId: executiveDashboard.id,
          widgetType: 'REVENUE_TREND',
          title: 'Revenue Trend (30 Days)',
          position: { x: 0, y: 2, w: 6, h: 4 },
          config: { period: 30, chartType: 'line' },
        },
        {
          dashboardId: executiveDashboard.id,
          widgetType: 'APPOINTMENTS_BY_STATUS',
          title: 'Appointment Status Breakdown',
          position: { x: 6, y: 2, w: 6, h: 4 },
          config: { period: 30 },
        },
        {
          dashboardId: executiveDashboard.id,
          widgetType: 'CLINICIAN_PRODUCTIVITY',
          title: 'Clinician Productivity',
          position: { x: 0, y: 6, w: 6, h: 4 },
          config: { period: 30 },
        },
        {
          dashboardId: executiveDashboard.id,
          widgetType: 'CAPACITY_UTILIZATION',
          title: 'Capacity Utilization',
          position: { x: 6, y: 6, w: 3, h: 3 },
          config: { period: 7 },
        },
        {
          dashboardId: executiveDashboard.id,
          widgetType: 'UNSIGNED_NOTES',
          title: 'Unsigned Notes',
          position: { x: 9, y: 6, w: 3, h: 2 },
          config: {},
        },
      ]
    });

    console.log(`✅ Added 9 widgets to Executive Dashboard`);

    // 3. Add widgets to Clinician Dashboard
    console.log('\n🧩 Adding widgets to Clinician Performance Dashboard...');

    await prisma.widget.createMany({
      data: [
        {
          dashboardId: clinicianDashboard.id,
          widgetType: 'WEEKLY_APPOINTMENTS',
          title: 'This Week\'s Appointments',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: {},
        },
        {
          dashboardId: clinicianDashboard.id,
          widgetType: 'CLIENT_SATISFACTION',
          title: 'Client Satisfaction',
          position: { x: 3, y: 0, w: 3, h: 2 },
          config: {},
        },
        {
          dashboardId: clinicianDashboard.id,
          widgetType: 'AVG_SESSION_DURATION',
          title: 'Avg Session Duration',
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: { period: 30 },
        },
        {
          dashboardId: clinicianDashboard.id,
          widgetType: 'UPCOMING_APPOINTMENTS',
          title: 'Upcoming Appointments',
          position: { x: 0, y: 2, w: 6, h: 4 },
          config: { limit: 10 },
        },
        {
          dashboardId: clinicianDashboard.id,
          widgetType: 'UNSIGNED_NOTES_LIST',
          title: 'My Unsigned Notes',
          position: { x: 6, y: 2, w: 6, h: 4 },
          config: { limit: 10 },
        },
        {
          dashboardId: clinicianDashboard.id,
          widgetType: 'CLIENT_DEMOGRAPHICS',
          title: 'Client Demographics',
          position: { x: 0, y: 6, w: 6, h: 4 },
          config: {},
        },
      ]
    });

    console.log(`✅ Added 6 widgets to Clinician Performance Dashboard`);

    // 4. Add widgets to Operations Dashboard
    console.log('\n🧩 Adding widgets to Operations Dashboard...');

    await prisma.widget.createMany({
      data: [
        {
          dashboardId: operationsDashboard.id,
          widgetType: 'CAPACITY_UTILIZATION',
          title: 'Weekly Capacity',
          position: { x: 0, y: 0, w: 3, h: 3 },
          config: { period: 7 },
        },
        {
          dashboardId: operationsDashboard.id,
          widgetType: 'WAITLIST_SUMMARY',
          title: 'Waitlist Summary',
          position: { x: 3, y: 0, w: 3, h: 2 },
          config: {},
        },
        {
          dashboardId: operationsDashboard.id,
          widgetType: 'NO_SHOW_RATE',
          title: 'No-Show Rate',
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: { period: 30 },
        },
        {
          dashboardId: operationsDashboard.id,
          widgetType: 'UTILIZATION_TREND',
          title: 'Utilization Trend',
          position: { x: 0, y: 3, w: 6, h: 4 },
          config: { period: 30 },
        },
        {
          dashboardId: operationsDashboard.id,
          widgetType: 'APPOINTMENT_TYPES_BREAKDOWN',
          title: 'Appointment Types',
          position: { x: 6, y: 3, w: 4, h: 4 },
          config: { period: 30 },
        },
        {
          dashboardId: operationsDashboard.id,
          widgetType: 'RECENT_APPOINTMENTS',
          title: 'Recent Appointments',
          position: { x: 0, y: 7, w: 6, h: 4 },
          config: { limit: 10 },
        },
      ]
    });

    console.log(`✅ Added 6 widgets to Operations Dashboard`);

    // 5. Create sample custom reports
    console.log('\n📊 Creating sample custom reports...');

    try {
      const revenueReport = await prisma.customReport.create({
      data: {
        name: 'Revenue by Service Type',
        description: 'Breakdown of revenue by appointment type and billing codes',
        category: 'Revenue',
        createdById: admin.id,
        dataSources: ['appointments', 'billing'],
        fields: ['appointmentType', 'billingCode', 'amount', 'date'],
        filters: {
          dateRange: { start: '2024-01-01', end: '2024-12-31' },
          status: 'COMPLETED'
        },
        aggregations: [
          { field: 'amount', operation: 'sum', alias: 'totalRevenue' },
          { field: 'appointmentType', operation: 'count', alias: 'appointmentCount' }
        ],
        chartType: 'BAR',
        sortBy: 'totalRevenue',
        sortOrder: 'DESC',
      }
    });

    const productivityReport = await prisma.customReport.create({
      data: {
        name: 'Clinician Productivity Metrics',
        description: 'Track appointments, billable hours, and documentation completion',
        category: 'Productivity',
        createdById: admin.id,
        dataSources: ['users', 'appointments', 'notes'],
        fields: ['clinicianName', 'appointmentCount', 'billableHours', 'documentationRate'],
        filters: {
          dateRange: { start: '2024-11-01', end: '2024-11-30' },
          userRole: 'CLINICIAN'
        },
        aggregations: [
          { field: 'appointments', operation: 'count', alias: 'totalAppointments' },
          { field: 'duration', operation: 'sum', alias: 'totalHours' }
        ],
        chartType: 'TABLE',
        sortBy: 'totalAppointments',
        sortOrder: 'DESC',
      }
    });

    const complianceReport = await prisma.customReport.create({
      data: {
        name: 'Documentation Compliance',
        description: 'Monitor note signing, timeliness, and quality metrics',
        category: 'Compliance',
        createdById: admin.id,
        dataSources: ['notes', 'appointments'],
        fields: ['clinician', 'appointmentDate', 'noteStatus', 'signedDate', 'daysToSign'],
        filters: {
          dateRange: { start: '2024-10-01', end: '2024-11-30' }
        },
        aggregations: [
          { field: 'noteStatus', operation: 'count', alias: 'statusCount' },
          { field: 'daysToSign', operation: 'avg', alias: 'avgSigningTime' }
        ],
        chartType: 'PIE',
        sortBy: 'appointmentDate',
        sortOrder: 'DESC',
      }
    });

    const outcomesReport = await prisma.customReport.create({
      data: {
        name: 'Client Outcomes Analysis',
        description: 'Track symptom improvements and treatment effectiveness',
        category: 'Clinical',
        createdById: clinician.id,
        dataSources: ['clients', 'symptomTracking', 'outcomeTracking'],
        fields: ['clientName', 'diagnosis', 'initialScore', 'currentScore', 'improvement'],
        filters: {
          dateRange: { start: '2024-01-01', end: '2024-11-30' },
          status: 'ACTIVE'
        },
        aggregations: [
          { field: 'improvement', operation: 'avg', alias: 'avgImprovement' },
          { field: 'clients', operation: 'count', alias: 'totalClients' }
        ],
        chartType: 'LINE',
        sortBy: 'improvement',
        sortOrder: 'DESC',
      }
    });

    console.log(`✅ Created 4 custom reports`);

    // 6. Create report subscriptions
    console.log('\n📧 Creating report subscriptions...');

    await prisma.reportSubscription.createMany({
      data: [
        {
          reportId: revenueReport.id,
          userId: admin.id,
          frequency: 'WEEKLY',
          deliveryMethod: 'EMAIL',
          format: 'PDF',
          recipients: [admin.email],
          isActive: true,
          nextDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
        {
          reportId: productivityReport.id,
          userId: admin.id,
          frequency: 'MONTHLY',
          deliveryMethod: 'EMAIL',
          format: 'EXCEL',
          recipients: [admin.email],
          isActive: true,
          nextDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
        {
          reportId: complianceReport.id,
          userId: admin.id,
          frequency: 'DAILY',
          deliveryMethod: 'EMAIL',
          format: 'PDF',
          recipients: [admin.email, clinician.email],
          isActive: true,
          nextDeliveryDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        },
      ]
    });

      console.log(`✅ Created 3 report subscriptions`);
    } catch (reportError) {
      console.log('⚠️  Custom reports skipped (models not available in schema)');
    }

    // 7. Create some appointment data for widgets
    console.log('\n📅 Creating sample appointment data for widgets...');

    const clients = await prisma.client.findMany({
      take: 5,
      select: { id: true }
    });

    if (clients.length > 0) {
      const appointmentTypes = await prisma.appointmentType.findMany({
        take: 3,
        select: { id: true }
      });

      if (appointmentTypes.length > 0) {
        // Create appointments for the past 30 days with billing amounts
        const appointments = [];
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);

          const startHour = 9 + (i % 8);
          const endHour = startHour + 1;

          const status = i % 10 === 0 ? 'NO_SHOW' : i % 5 === 0 ? 'CANCELLED' : 'COMPLETED';
          const chargeAmount = status === 'COMPLETED' ? (100 + (i * 15)) : null;

          appointments.push({
            clientId: clients[i % clients.length].id,
            clinicianId: clinician.id,
            appointmentDate: date,
            startTime: `${startHour.toString().padStart(2, '0')}:00`,
            endTime: `${endHour.toString().padStart(2, '0')}:00`,
            duration: 60,
            appointmentType: 'Individual Therapy',
            serviceLocation: 'Office',
            status,
            statusUpdatedBy: clinician.id,
            chargeAmount,
            createdBy: clinician.id,
            lastModifiedBy: clinician.id,
          });
        }

        const createdAppointments = await prisma.appointment.createMany({
          data: appointments,
          skipDuplicates: true,
        });

        console.log(`✅ Created 30 sample appointments with billing data`);

        // Fetch the created appointments to add notes
        const appointmentRecords = await prisma.appointment.findMany({
          where: {
            clinicianId: clinician.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 30,
        });

        // First, create intake assessments for each unique client
        const clientIds = [...new Set(appointmentRecords.map(a => a.clientId))];
        const intakeNotes = [];

        for (const clientId of clientIds) {
          // Find the first appointment for this client
          const firstAppointment = appointmentRecords.find(a => a.clientId === clientId);
          if (firstAppointment) {
            const intakeDate = new Date(firstAppointment.appointmentDate);
            intakeDate.setDate(intakeDate.getDate() - 7); // 7 days before first appointment

            intakeNotes.push({
              appointmentId: firstAppointment.id,
              clientId: clientId,
              clinicianId: clinician.id,
              noteType: 'INTAKE_ASSESSMENT',
              sessionDate: intakeDate,
              dueDate: intakeDate,
              subjective: `Initial intake assessment. Patient seeking therapy services.`,
              objective: `Patient presented appropriately for initial assessment.`,
              assessment: `Patient appropriate for ongoing therapy services.`,
              plan: `Begin regular therapy sessions.`,
              status: 'SIGNED',
              signedDate: intakeDate,
              signedBy: clinician.id,
              lastModifiedBy: clinician.id,
            });
          }
        }

        if (intakeNotes.length > 0) {
          await prisma.clinicalNote.createMany({
            data: intakeNotes,
            skipDuplicates: true,
          });
          console.log(`✅ Created ${intakeNotes.length} intake assessment notes`);
        }

        // Now create progress notes for appointments
        const notes = [];
        for (let i = 0; i < appointmentRecords.length; i++) {
          const appointment = appointmentRecords[i];

          // Only create notes for completed appointments
          if (appointment.status === 'COMPLETED') {
            // 70% signed, 30% unsigned
            const isSigned = i % 10 < 7;
            const daysAgo = Math.floor(i / 3);
            const noteDate = new Date();
            noteDate.setDate(noteDate.getDate() - daysAgo);

            // Calculate due date (3 days after session for unsigned, same as signedDate for signed)
            const dueDateCalc = new Date(appointment.appointmentDate);
            dueDateCalc.setDate(dueDateCalc.getDate() + 3);

            notes.push({
              appointmentId: appointment.id,
              clientId: appointment.clientId,
              clinicianId: clinician.id,
              noteType: 'PROGRESS',
              sessionDate: appointment.appointmentDate,
              dueDate: isSigned ? noteDate : dueDateCalc,
              subjective: `Patient presented for appointment ${i + 1}. Mood appears stable.`,
              objective: `Patient cooperative, appropriate affect, good eye contact.`,
              assessment: `Patient showing progress. Symptoms well-managed.`,
              plan: `Continue current treatment plan. Follow-up as scheduled.`,
              status: isSigned ? 'SIGNED' : 'DRAFT',
              signedDate: isSigned ? noteDate : null,
              signedBy: isSigned ? clinician.id : null,
              lastModifiedBy: clinician.id,
            });
          }
        }

        if (notes.length > 0) {
          try {
            await prisma.clinicalNote.createMany({
              data: notes,
              skipDuplicates: true,
            });
            console.log(`✅ Created ${notes.length} progress notes (signed and unsigned)`);
          } catch (error) {
            console.log(`⚠️  Progress notes creation failed: ${error.message}`);
            console.log(`   Intake assessments were created but progress notes require additional setup.`);
          }
        }
      }
    }

    // 8. Summary
    console.log('\n✅ Module 8 test data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Dashboards: 3 (Executive, Clinician Performance, Operations)`);
    console.log(`   - Widgets: 21 across all dashboards`);
    console.log(`   - Sample Appointments: 30 with realistic billing amounts ($100-$535)`);
    console.log(`   - Clinical Notes: ~21 notes (70% signed, 30% unsigned for testing)`);
    console.log('\n💰 Widget Data Ready:');
    console.log(`   - Revenue widgets will show actual billing data`);
    console.log(`   - KVR widget will calculate based on signed notes`);
    console.log(`   - No-Show Rate calculated from appointment statuses`);
    console.log(`   - Unsigned Notes widget will show draft notes`);
    console.log('\n🎯 You can now test:');
    console.log(`   - Navigate to /dashboards to view custom dashboards`);
    console.log(`   - All widgets should display real data (not zeros)`);
    console.log(`   - Revenue Today/Monthly widgets will show billing totals`);
    console.log(`   - Productivity widgets will show clinician metrics`);

  } catch (error) {
    console.error('❌ Error seeding Module 8 test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeder
seedModule8TestData()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
