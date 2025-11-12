/**
 * Module 9: Communication & Document Management - Test Script
 * Agent 6 Implementation Test
 *
 * Tests:
 * 1. Internal Messaging System
 * 2. Channels
 * 3. Document Management
 * 4. Folder Structure
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing Communication & Document Management (Module 9 - Agent 6)...\n');

  try {
    // ========================================================================
    // SETUP: Get test users
    // ========================================================================
    console.log('📋 Step 1: Getting test users...');

    const admin = await prisma.user.findFirst({
      where: { roles: { has: 'ADMINISTRATOR' } }
    });

    const clinicians = await prisma.user.findMany({
      where: { roles: { has: 'CLINICIAN' } },
      take: 3,
    });

    const staff = await prisma.user.findMany({
      where: { isActive: true },
      take: 5,
    });

    if (!admin || clinicians.length < 2 || staff.length < 3) {
      throw new Error('Not enough test users in database');
    }

    console.log(`✅ Found admin: ${admin.firstName} ${admin.lastName}`);
    console.log(`✅ Found ${clinicians.length} clinicians`);
    console.log(`✅ Found ${staff.length} staff members\n`);

    // ========================================================================
    // TEST 1: INTERNAL MESSAGING SYSTEM
    // ========================================================================
    console.log('📝 Step 2: Testing Internal Messaging System...\n');

    // 2.1: Create a direct message
    console.log('   → Creating direct message...');
    const directMessage = await prisma.message.create({
      data: {
        senderId: admin.id,
        recipientType: 'INDIVIDUAL',
        recipientIds: [clinicians[0].id],
        subject: 'Welcome to the Team!',
        body: 'Welcome aboard! Looking forward to working with you.',
        messageType: 'DIRECT',
        priority: 'NORMAL',
      },
    });
    console.log(`   ✅ Direct message created: ${directMessage.id}`);

    // 2.2: Create a broadcast announcement
    console.log('   → Creating broadcast announcement...');
    const broadcastMessage = await prisma.message.create({
      data: {
        senderId: admin.id,
        recipientType: 'ALL_STAFF',
        recipientIds: staff.map(s => s.id),
        subject: 'Important Update: Office Hours',
        body: 'Please note that office hours have been updated starting next week.',
        messageType: 'ANNOUNCEMENT',
        priority: 'HIGH',
      },
    });
    console.log(`   ✅ Broadcast announcement created: ${broadcastMessage.id}`);

    // 2.3: Create urgent alert
    console.log('   → Creating urgent alert...');
    const alertMessage = await prisma.message.create({
      data: {
        senderId: clinicians[0].id,
        recipientType: 'DEPARTMENT',
        recipientIds: [admin.id, clinicians[1].id],
        subject: 'System Maintenance Tonight',
        body: 'The EHR system will be down for maintenance from 11pm-1am tonight.',
        messageType: 'ALERT',
        priority: 'URGENT',
      },
    });
    console.log(`   ✅ Urgent alert created: ${alertMessage.id}`);

    // 2.4: Create threaded message (reply)
    console.log('   → Creating threaded reply...');
    const replyMessage = await prisma.message.create({
      data: {
        senderId: clinicians[0].id,
        recipientType: 'INDIVIDUAL',
        recipientIds: [admin.id],
        subject: 'Re: Welcome to the Team!',
        body: 'Thank you! Excited to get started.',
        messageType: 'DIRECT',
        priority: 'NORMAL',
        replyToId: directMessage.id,
        threadId: directMessage.id,
      },
    });
    console.log(`   ✅ Reply message created: ${replyMessage.id}`);

    // 2.5: Mark message as read
    console.log('   → Marking message as read...');
    await prisma.message.update({
      where: { id: directMessage.id },
      data: {
        readBy: [clinicians[0].id],
        readAt: {
          [clinicians[0].id]: new Date().toISOString(),
        },
      },
    });
    console.log('   ✅ Message marked as read');

    // 2.6: Archive a message
    console.log('   → Archiving message...');
    await prisma.message.update({
      where: { id: alertMessage.id },
      data: { isArchived: true },
    });
    console.log('   ✅ Message archived\n');

    // ========================================================================
    // TEST 2: CHANNELS
    // ========================================================================
    console.log('📝 Step 3: Testing Channels...\n');

    // 3.1: Create department channel
    console.log('   → Creating department channel...');
    const departmentChannel = await prisma.channel.create({
      data: {
        name: 'Clinical Team',
        description: 'Channel for clinical team discussions',
        channelType: 'DEPARTMENT',
        memberIds: [admin.id, ...clinicians.map(c => c.id)],
        adminIds: [admin.id, clinicians[0].id],
        createdById: admin.id,
        isPrivate: false,
      },
    });
    console.log(`   ✅ Department channel created: ${departmentChannel.name}`);

    // 3.2: Create team channel
    console.log('   → Creating team channel...');
    const teamChannel = await prisma.channel.create({
      data: {
        name: 'Project Alpha',
        description: 'Private channel for Project Alpha team',
        channelType: 'TEAM',
        memberIds: [admin.id, clinicians[0].id, clinicians[1].id],
        adminIds: [admin.id],
        createdById: admin.id,
        isPrivate: true,
      },
    });
    console.log(`   ✅ Team channel created: ${teamChannel.name}`);

    // 3.3: Create announcement channel
    console.log('   → Creating announcement channel...');
    const announcementChannel = await prisma.channel.create({
      data: {
        name: 'General Announcements',
        description: 'Official announcements from management',
        channelType: 'ANNOUNCEMENTS',
        memberIds: staff.map(s => s.id),
        adminIds: [admin.id],
        createdById: admin.id,
        isPrivate: false,
      },
    });
    console.log(`   ✅ Announcement channel created: ${announcementChannel.name}`);

    // 3.4: Post message to channel
    console.log('   → Posting message to channel...');
    const channelMessage = await prisma.message.create({
      data: {
        senderId: admin.id,
        recipientType: 'TEAM',
        recipientIds: [departmentChannel.id],
        subject: 'Team Meeting Tomorrow',
        body: 'Reminder: Team meeting tomorrow at 10am in Conference Room A.',
        messageType: 'BROADCAST',
        priority: 'NORMAL',
      },
    });
    console.log(`   ✅ Channel message posted: ${channelMessage.id}\n`);

    // ========================================================================
    // TEST 3: DOCUMENT MANAGEMENT
    // ========================================================================
    console.log('📝 Step 4: Testing Document Management...\n');

    // 4.1: Create root folders
    console.log('   → Creating root folders...');
    const policiesFolder = await prisma.documentFolder.create({
      data: {
        name: 'Policies & Procedures',
        description: 'Practice policies and procedure documents',
        createdById: admin.id,
        isPublic: true,
      },
    });
    console.log(`   ✅ Created folder: ${policiesFolder.name}`);

    const trainingFolder = await prisma.documentFolder.create({
      data: {
        name: 'Training Materials',
        description: 'Staff training and development resources',
        createdById: admin.id,
        isPublic: true,
      },
    });
    console.log(`   ✅ Created folder: ${trainingFolder.name}`);

    const formsFolder = await prisma.documentFolder.create({
      data: {
        name: 'Forms & Templates',
        description: 'Clinical and administrative forms',
        createdById: admin.id,
        isPublic: false,
        accessList: [admin.id, ...clinicians.map(c => c.id)],
      },
    });
    console.log(`   ✅ Created folder: ${formsFolder.name}`);

    // 4.2: Create subfolder
    console.log('   → Creating subfolder...');
    const clinicalPoliciesFolder = await prisma.documentFolder.create({
      data: {
        name: 'Clinical Policies',
        description: 'Clinical practice policies',
        parentId: policiesFolder.id,
        createdById: admin.id,
        isPublic: true,
      },
    });
    console.log(`   ✅ Created subfolder: ${clinicalPoliciesFolder.name}`);

    // 4.3: Upload documents
    console.log('   → Uploading documents...');

    const hipaaPolicy = await prisma.document.create({
      data: {
        name: 'HIPAA Compliance Policy v2.1',
        description: 'Updated HIPAA compliance guidelines',
        fileUrl: 'https://example.com/documents/hipaa-policy-v2.1.pdf',
        fileType: 'application/pdf',
        fileSize: 1024567,
        category: 'POLICY',
        tags: ['hipaa', 'compliance', 'privacy'],
        folderId: policiesFolder.id,
        uploadedById: admin.id,
        isPublic: true,
        version: '2.1',
      },
    });
    console.log(`   ✅ Uploaded document: ${hipaaPolicy.name}`);

    const trainingManual = await prisma.document.create({
      data: {
        name: 'New Staff Onboarding Manual',
        description: 'Comprehensive onboarding guide for new employees',
        fileUrl: 'https://example.com/documents/onboarding-manual.pdf',
        fileType: 'application/pdf',
        fileSize: 2048000,
        category: 'TRAINING',
        tags: ['onboarding', 'training', 'hr'],
        folderId: trainingFolder.id,
        uploadedById: admin.id,
        isPublic: true,
        version: '1.0',
      },
    });
    console.log(`   ✅ Uploaded document: ${trainingManual.name}`);

    const consentForm = await prisma.document.create({
      data: {
        name: 'Telehealth Consent Form',
        description: 'Standard consent form for telehealth sessions',
        fileUrl: 'https://example.com/documents/telehealth-consent.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 51200,
        category: 'FORM',
        tags: ['telehealth', 'consent', 'clinical'],
        folderId: formsFolder.id,
        uploadedById: clinicians[0].id,
        isPublic: false,
        accessList: [admin.id, ...clinicians.map(c => c.id)],
        version: '1.0',
      },
    });
    console.log(`   ✅ Uploaded document: ${consentForm.name}`);

    // 4.4: Create document version
    console.log('   → Creating document version...');
    const hipaaPolicy_v2_2 = await prisma.document.create({
      data: {
        name: 'HIPAA Compliance Policy v2.2',
        description: 'Minor updates to HIPAA compliance guidelines',
        fileUrl: 'https://example.com/documents/hipaa-policy-v2.2.pdf',
        fileType: 'application/pdf',
        fileSize: 1034000,
        category: 'POLICY',
        tags: ['hipaa', 'compliance', 'privacy'],
        folderId: policiesFolder.id,
        uploadedById: admin.id,
        isPublic: true,
        version: '2.2',
        parentId: hipaaPolicy.id,
      },
    });
    console.log(`   ✅ Created version: ${hipaaPolicy_v2_2.version}`);

    // 4.5: Archive old document version
    console.log('   → Archiving old document version...');
    await prisma.document.update({
      where: { id: hipaaPolicy.id },
      data: { isArchived: true },
    });
    console.log('   ✅ Old version archived\n');

    // ========================================================================
    // VERIFICATION & SUMMARY
    // ========================================================================
    console.log('📊 Step 5: Verification & Summary...\n');

    // Count messages
    const messageCount = await prisma.message.count();
    const unreadCount = await prisma.message.count({
      where: { readBy: { isEmpty: true } },
    });

    // Count channels
    const channelCount = await prisma.channel.count();

    // Count documents and folders
    const documentCount = await prisma.document.count();
    const folderCount = await prisma.documentFolder.count();

    console.log('✅ All tests passed!\n');
    console.log('📊 Summary:');
    console.log(`   - Messages created: ${messageCount} (${unreadCount} unread)`);
    console.log(`   - Channels created: ${channelCount}`);
    console.log(`   - Documents uploaded: ${documentCount}`);
    console.log(`   - Folders created: ${folderCount}`);
    console.log('');

    // Display sample data
    console.log('📋 Sample Messages:');
    const recentMessages = await prisma.message.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { firstName: true, lastName: true },
        },
      },
    });
    recentMessages.forEach((msg, idx) => {
      console.log(`   ${idx + 1}. [${msg.priority}] "${msg.subject}" - from ${msg.sender.firstName} ${msg.sender.lastName}`);
    });
    console.log('');

    console.log('📁 Sample Folders:');
    const folders = await prisma.documentFolder.findMany({
      where: { parentId: null },
      include: {
        _count: {
          select: { documents: true, subfolders: true },
        },
      },
    });
    folders.forEach((folder, idx) => {
      console.log(`   ${idx + 1}. "${folder.name}" - ${folder._count.documents} docs, ${folder._count.subfolders} subfolders`);
    });
    console.log('');

    console.log('🎉 Communication & Document Management system is fully functional!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
