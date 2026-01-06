/**
 * AI Personal Assistant Service
 *
 * Provides an intelligent AI assistant with access to clinical and operational data.
 * Handles natural language queries, generates reports, and assists with practice management.
 *
 * Features:
 * - Intent detection (clinical, operational, reporting, general)
 * - Role-based data access with HIPAA-compliant audit logging
 * - Conversation history management
 * - Real-time streaming responses
 * - Context-aware responses based on user permissions
 *
 * @module ai/aiAssistant.service
 */

import logger, { auditLogger } from '../../utils/logger';
import prisma from '../database';
import { anthropicService } from './anthropic.service';
import { AIConversationTopic, AIMessageRole, Prisma } from '@prisma/client';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * User context passed to the AI service
 */
export interface UserContext {
  userId: string;
  role: string;
  permissions: string[];
  clinicianId?: string;
  departmentId?: string;
  supervisorId?: string;
}

/**
 * Message in a conversation
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Result of intent detection
 */
export interface IntentResult {
  topic: AIConversationTopic;
  confidence: number;
  entities: {
    clientName?: string;
    clientId?: string;
    dateRange?: { start: Date; end: Date };
    reportType?: string;
    metricType?: string;
    staffName?: string;
    appointmentId?: string;
  };
  requiresClientAccess: boolean;
  requiresFinancialAccess: boolean;
  requiresStaffAccess: boolean;
}

/**
 * Data gathered for context
 */
export interface GatheredContext {
  clients?: any[];
  appointments?: any[];
  clinicalNotes?: any[];
  billing?: any;
  staff?: any[];
  metrics?: Record<string, any>;
  reports?: any;
}

/**
 * Response from processing a message
 */
export interface AssistantResponse {
  conversationId: string;
  messageId: string;
  content: string;
  topic: AIConversationTopic;
  dataSourcesAccessed: string[];
  tokensUsed: number;
}

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

const SYSTEM_PROMPT = `You are MindSpace AI, an intelligent assistant for MentalSpace EHR - a comprehensive mental health practice management system. You have access to clinical and operational data based on the user's role and permissions.

CAPABILITIES:
- Answer questions about clients, appointments, billing, compliance, and staff
- Generate reports and summaries from practice data
- Assist with clinical documentation (notes, treatment plans, assessments)
- Provide operational insights (revenue, scheduling, productivity, KPIs)
- Help navigate system features and workflows
- Answer compliance and policy questions

IMPORTANT RESTRICTIONS:
- NEVER disclose client PHI to users without proper authorization
- ALWAYS verify the user has permission to access requested data before providing it
- Flag any safety concerns (suicidal ideation, abuse reports, crisis situations) immediately
- Recommend professional consultation for clinical decisions - do not make diagnoses
- Do not provide medical advice or treatment recommendations
- Always cite your data sources when answering queries

RESPONSE GUIDELINES:
1. Be concise and professional
2. Cite specific data when answering queries (e.g., "Based on 47 appointments this week...")
3. Offer to provide more detail if you give a summary
4. Suggest related queries the user might find helpful
5. For sensitive clinical data, always note the access reason for audit purposes
6. If data is unavailable or access denied, explain why clearly

FORMATTING:
- Use markdown for structured responses
- Use tables for comparative data
- Use bullet points for lists
- Bold important numbers and findings`;

const INTENT_DETECTION_PROMPT = `Analyze the user's message and determine the primary intent. Classify into one of these categories:

CLINICAL - Questions about clients, diagnoses, treatment plans, progress notes, assessments, symptoms
Examples: "What diagnoses does John Smith have?", "Show me Sarah's recent progress notes", "Which clients have GAD-7 scores above 15?"

OPERATIONAL - Questions about revenue, scheduling, staff management, appointments, billing, productivity
Examples: "What's our revenue this month?", "How many no-shows last week?", "Show me appointment utilization"

REPORTING - Requests to generate or view reports, analytics, dashboards, comparisons
Examples: "Generate a financial report for Q4", "Compare this month to last month", "What's our no-show trend?"

GENERAL - Help with system navigation, feature questions, general inquiries not fitting above
Examples: "How do I schedule a group session?", "What features are available?", "Help me understand the billing module"

Respond with a JSON object:
{
  "topic": "CLINICAL" | "OPERATIONAL" | "REPORTING" | "GENERAL",
  "confidence": 0.0-1.0,
  "entities": {
    "clientName": "if mentioned",
    "dateRange": { "description": "if mentioned, like 'last month' or 'this week'" },
    "reportType": "if requesting a specific report type",
    "metricType": "if asking about specific metrics"
  },
  "requiresClientAccess": true/false,
  "requiresFinancialAccess": true/false,
  "requiresStaffAccess": true/false
}`;

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AIAssistantService {
  /**
   * Process a user message and generate an AI response
   *
   * @param userId - The authenticated user's ID
   * @param message - The user's message
   * @param conversationId - Optional existing conversation ID
   * @param userContext - User's role and permissions
   * @returns AssistantResponse with the AI's reply
   */
  async processMessage(
    userId: string,
    message: string,
    conversationId: string | null,
    userContext: UserContext
  ): Promise<AssistantResponse> {
    try {
      // 1. Get or create conversation
      let conversation = conversationId
        ? await this.getConversation(conversationId, userId)
        : await this.createConversation(userId);

      if (!conversation) {
        conversation = await this.createConversation(userId);
      }

      // 2. Detect intent
      const intent = await this.detectIntent(message);

      // 3. Update conversation topic if needed
      if (conversation.topic !== intent.topic) {
        await prisma.aIConversation.update({
          where: { id: conversation.id },
          data: { topic: intent.topic }
        });
      }

      // 4. Verify permissions for requested data
      const hasPermission = this.verifyPermissions(intent, userContext);
      if (!hasPermission.allowed) {
        return this.createAccessDeniedResponse(
          conversation.id,
          hasPermission.reason,
          userId
        );
      }

      // 5. Gather relevant context based on intent
      const context = await this.gatherContext(intent, userContext);

      // 6. Log data access for HIPAA compliance
      await this.logDataAccess(
        conversation.id,
        userId,
        intent,
        context
      );

      // 7. Save user message
      const userMessage = await prisma.aIConversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: AIMessageRole.USER,
          content: message
        }
      });

      // 8. Get conversation history for context
      const history = await this.getConversationHistory(conversation.id, 10);

      // 9. Build the full prompt with context
      const fullPrompt = this.buildContextualPrompt(
        message,
        context,
        userContext,
        intent
      );

      // 10. Generate AI response
      const aiResponse = await anthropicService.generateCompletion(
        SYSTEM_PROMPT,
        fullPrompt,
        { temperature: 0.7, maxTokens: 2048 }
      );

      // 11. Save assistant message
      const assistantMessage = await prisma.aIConversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: AIMessageRole.ASSISTANT,
          content: aiResponse,
          dataSourcesAccessed: this.getDataSourcesList(context),
          confidence: intent.confidence
        }
      });

      // 12. Update conversation token count (estimate)
      const tokensUsed = Math.ceil((message.length + aiResponse.length) / 4);
      await prisma.aIConversation.update({
        where: { id: conversation.id },
        data: {
          totalTokensUsed: { increment: tokensUsed },
          updatedAt: new Date()
        }
      });

      // 13. Generate title if this is the first message
      if (history.length === 0) {
        await this.generateConversationTitle(conversation.id, message);
      }

      logger.info('AI Assistant processed message', {
        conversationId: conversation.id,
        userId,
        topic: intent.topic,
        tokensUsed
      });

      return {
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        content: aiResponse,
        topic: intent.topic,
        dataSourcesAccessed: this.getDataSourcesList(context),
        tokensUsed
      };

    } catch (error: any) {
      logger.error('AI Assistant error processing message', {
        error: error.message,
        userId,
        conversationId
      });
      throw error;
    }
  }

  /**
   * Stream a response for real-time UI updates
   */
  async *streamResponse(
    userId: string,
    message: string,
    conversationId: string | null,
    userContext: UserContext
  ): AsyncGenerator<{ type: 'token' | 'done' | 'error'; content: string; messageId?: string }> {
    try {
      // Get or create conversation
      let conversation = conversationId
        ? await this.getConversation(conversationId, userId)
        : await this.createConversation(userId);

      if (!conversation) {
        conversation = await this.createConversation(userId);
      }

      // Detect intent and gather context
      const intent = await this.detectIntent(message);
      const hasPermission = this.verifyPermissions(intent, userContext);

      if (!hasPermission.allowed) {
        yield { type: 'error', content: hasPermission.reason };
        return;
      }

      const context = await this.gatherContext(intent, userContext);

      // Log data access
      await this.logDataAccess(conversation.id, userId, intent, context);

      // Save user message
      await prisma.aIConversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: AIMessageRole.USER,
          content: message
        }
      });

      // Build prompt
      const fullPrompt = this.buildContextualPrompt(message, context, userContext, intent);

      // Stream response
      let fullResponse = '';
      for await (const token of anthropicService.generateStreamingCompletion(
        SYSTEM_PROMPT,
        fullPrompt,
        { temperature: 0.7, maxTokens: 2048 }
      )) {
        fullResponse += token;
        yield { type: 'token', content: token };
      }

      // Save complete response
      const assistantMessage = await prisma.aIConversationMessage.create({
        data: {
          conversationId: conversation.id,
          role: AIMessageRole.ASSISTANT,
          content: fullResponse,
          dataSourcesAccessed: this.getDataSourcesList(context),
          confidence: intent.confidence
        }
      });

      yield { type: 'done', content: fullResponse, messageId: assistantMessage.id };

    } catch (error: any) {
      logger.error('AI Assistant streaming error', { error: error.message, userId });
      yield { type: 'error', content: error.message };
    }
  }

  /**
   * Detect the intent of a user message
   */
  async detectIntent(message: string): Promise<IntentResult> {
    try {
      const response = await anthropicService.generateCompletion(
        INTENT_DETECTION_PROMPT,
        message,
        { temperature: 0.3, maxTokens: 500 }
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          topic: this.mapTopicToEnum(parsed.topic),
          confidence: parsed.confidence || 0.8,
          entities: parsed.entities || {},
          requiresClientAccess: parsed.requiresClientAccess || false,
          requiresFinancialAccess: parsed.requiresFinancialAccess || false,
          requiresStaffAccess: parsed.requiresStaffAccess || false
        };
      }
    } catch (error: any) {
      logger.warn('Intent detection fallback to GENERAL', { error: error.message });
    }

    // Default to GENERAL if detection fails
    return {
      topic: AIConversationTopic.GENERAL,
      confidence: 0.5,
      entities: {},
      requiresClientAccess: false,
      requiresFinancialAccess: false,
      requiresStaffAccess: false
    };
  }

  /**
   * Map string topic to enum
   */
  private mapTopicToEnum(topic: string): AIConversationTopic {
    const topicMap: Record<string, AIConversationTopic> = {
      'CLINICAL': AIConversationTopic.CLINICAL,
      'OPERATIONAL': AIConversationTopic.OPERATIONAL,
      'REPORTING': AIConversationTopic.REPORTING,
      'GENERAL': AIConversationTopic.GENERAL
    };
    return topicMap[topic?.toUpperCase()] || AIConversationTopic.GENERAL;
  }

  /**
   * Verify user has permission to access requested data
   */
  private verifyPermissions(
    intent: IntentResult,
    userContext: UserContext
  ): { allowed: boolean; reason: string } {
    const { role, permissions } = userContext;

    // Super admins and administrators have full access
    if (role === 'SUPER_ADMIN' || role === 'ADMINISTRATOR') {
      return { allowed: true, reason: '' };
    }

    // Check clinical data access
    if (intent.requiresClientAccess) {
      const clinicalRoles = ['CLINICIAN', 'SUPERVISOR', 'ASSOCIATE'];
      if (!clinicalRoles.includes(role)) {
        return {
          allowed: false,
          reason: 'You do not have permission to access clinical/client data. Please contact an administrator if you need this access.'
        };
      }
    }

    // Check financial data access
    if (intent.requiresFinancialAccess) {
      const billingRoles = ['BILLING_STAFF', 'ADMINISTRATOR', 'SUPERVISOR'];
      if (!billingRoles.includes(role) && !permissions.includes('billing:read')) {
        return {
          allowed: false,
          reason: 'You do not have permission to access financial data. Please contact an administrator if you need this access.'
        };
      }
    }

    // Check staff data access
    if (intent.requiresStaffAccess) {
      const hrRoles = ['ADMINISTRATOR', 'SUPERVISOR', 'SUPER_ADMIN'];
      if (!hrRoles.includes(role) && !permissions.includes('staff:read')) {
        return {
          allowed: false,
          reason: 'You do not have permission to access staff data. Please contact an administrator if you need this access.'
        };
      }
    }

    return { allowed: true, reason: '' };
  }

  /**
   * Gather relevant context based on detected intent
   */
  async gatherContext(
    intent: IntentResult,
    userContext: UserContext
  ): Promise<GatheredContext> {
    const context: GatheredContext = {};

    try {
      switch (intent.topic) {
        case AIConversationTopic.CLINICAL:
          context.clients = await this.gatherClinicalContext(intent, userContext);
          break;

        case AIConversationTopic.OPERATIONAL:
          context.metrics = await this.gatherOperationalContext(intent, userContext);
          context.appointments = await this.gatherAppointmentContext(intent, userContext);
          break;

        case AIConversationTopic.REPORTING:
          context.reports = await this.gatherReportingContext(intent, userContext);
          break;

        case AIConversationTopic.GENERAL:
          // General queries don't need specific context
          break;
      }
    } catch (error: any) {
      logger.error('Error gathering context', { error: error.message, intent: intent.topic });
    }

    return context;
  }

  /**
   * Gather clinical context (clients, notes, treatment plans)
   */
  private async gatherClinicalContext(
    intent: IntentResult,
    userContext: UserContext
  ): Promise<any[]> {
    const where: Prisma.ClientWhereInput = {};

    // Filter by clinician if not admin
    if (userContext.role === 'CLINICIAN' && userContext.clinicianId) {
      where.primaryTherapistId = userContext.clinicianId;
    }

    // Search by client name if provided
    if (intent.entities.clientName) {
      const nameParts = intent.entities.clientName.split(' ');
      where.OR = [
        { firstName: { contains: nameParts[0], mode: 'insensitive' } },
        { lastName: { contains: nameParts[nameParts.length - 1], mode: 'insensitive' } }
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        status: true,
        primaryTherapistId: true,
        diagnoses: {
          take: 5,
          orderBy: { diagnosisDate: 'desc' }
        },
        treatmentPlans: {
          take: 3,
          orderBy: { planDate: 'desc' },
          select: {
            id: true,
            status: true,
            planDate: true,
            goalsJson: true
          }
        },
        clinicalNotes: {
          take: 5,
          orderBy: { sessionDate: 'desc' },
          select: {
            id: true,
            noteType: true,
            sessionDate: true,
            status: true
          }
        }
      }
    });

    return clients;
  }

  /**
   * Gather operational context (metrics, KPIs)
   */
  private async gatherOperationalContext(
    intent: IntentResult,
    userContext: UserContext
  ): Promise<Record<string, any>> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get appointment metrics
    const [
      thisMonthAppointments,
      lastMonthAppointments,
      noShows,
      completedSessions,
      pendingCharges
    ] = await Promise.all([
      prisma.appointment.count({
        where: { appointmentDate: { gte: startOfMonth } }
      }),
      prisma.appointment.count({
        where: { appointmentDate: { gte: startOfLastMonth, lte: endOfLastMonth } }
      }),
      prisma.appointment.count({
        where: {
          appointmentDate: { gte: startOfMonth },
          status: 'NO_SHOW'
        }
      }),
      prisma.appointment.count({
        where: {
          appointmentDate: { gte: startOfMonth },
          status: 'COMPLETED'
        }
      }),
      prisma.chargeEntry.count({
        where: { chargeStatus: 'PENDING' }
      })
    ]);

    // Get revenue metrics
    const payments = await prisma.paymentRecord.aggregate({
      where: { paymentDate: { gte: startOfMonth } },
      _sum: { paymentAmount: true }
    });

    return {
      currentMonth: {
        totalAppointments: thisMonthAppointments,
        completedSessions,
        noShows,
        noShowRate: thisMonthAppointments > 0
          ? ((noShows / thisMonthAppointments) * 100).toFixed(1) + '%'
          : '0%',
        revenue: Number(payments._sum?.paymentAmount) || 0
      },
      lastMonth: {
        totalAppointments: lastMonthAppointments
      },
      billing: {
        pendingCharges
      },
      period: {
        start: startOfMonth.toISOString(),
        end: now.toISOString()
      }
    };
  }

  /**
   * Gather appointment context
   */
  private async gatherAppointmentContext(
    intent: IntentResult,
    userContext: UserContext
  ): Promise<any[]> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const where: Prisma.AppointmentWhereInput = {
      appointmentDate: { gte: oneWeekAgo }
    };

    if (userContext.role === 'CLINICIAN' && userContext.clinicianId) {
      where.clinicianId = userContext.clinicianId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      take: 20,
      orderBy: { appointmentDate: 'desc' },
      select: {
        id: true,
        appointmentDate: true,
        startTime: true,
        endTime: true,
        status: true,
        appointmentType: true,
        serviceLocation: true,
        client: {
          select: { firstName: true, lastName: true }
        },
        clinician: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    return appointments;
  }

  /**
   * Gather reporting context
   */
  private async gatherReportingContext(
    intent: IntentResult,
    userContext: UserContext
  ): Promise<any> {
    // Get summary metrics for report generation
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      clientCount,
      activeClientCount,
      clinicianCount,
      appointmentStats,
      revenueStats
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { roles: { has: 'CLINICIAN' }, isActive: true } }),
      prisma.appointment.groupBy({
        by: ['status'],
        where: { appointmentDate: { gte: startOfMonth } },
        _count: true
      }),
      prisma.paymentRecord.aggregate({
        where: { paymentDate: { gte: startOfMonth } },
        _sum: { paymentAmount: true },
        _count: true
      })
    ]);

    return {
      summary: {
        totalClients: clientCount,
        activeClients: activeClientCount,
        activeClinicians: clinicianCount
      },
      appointments: {
        byStatus: appointmentStats.reduce((acc: any, stat) => {
          acc[stat.status] = stat._count;
          return acc;
        }, {})
      },
      revenue: {
        thisMonth: Number(revenueStats._sum?.paymentAmount) || 0,
        paymentCount: revenueStats._count
      },
      reportPeriod: {
        start: startOfMonth.toISOString(),
        end: now.toISOString()
      }
    };
  }

  /**
   * Build a contextual prompt with gathered data
   */
  private buildContextualPrompt(
    userMessage: string,
    context: GatheredContext,
    userContext: UserContext,
    intent: IntentResult
  ): string {
    let contextSection = '';

    if (context.clients && context.clients.length > 0) {
      contextSection += `\n\nCLINICAL DATA (${context.clients.length} clients found):\n`;
      contextSection += context.clients.map(c =>
        `- ${c.firstName} ${c.lastName} (Status: ${c.status}, Primary Dx: ${c.primaryDiagnosis || 'None'}, Recent Notes: ${c.clinicalNotes?.length || 0})`
      ).join('\n');
    }

    if (context.metrics) {
      contextSection += `\n\nOPERATIONAL METRICS:\n`;
      contextSection += `- This Month: ${context.metrics.currentMonth.totalAppointments} appointments, ${context.metrics.currentMonth.completedSessions} completed, ${context.metrics.currentMonth.noShowRate} no-show rate\n`;
      contextSection += `- Revenue this month: $${context.metrics.currentMonth.revenue?.toFixed(2) || '0.00'}\n`;
      contextSection += `- Pending charges: ${context.metrics.billing.pendingCharges}`;
    }

    if (context.appointments && context.appointments.length > 0) {
      contextSection += `\n\nRECENT APPOINTMENTS (${context.appointments.length}):\n`;
      contextSection += context.appointments.slice(0, 10).map(a =>
        `- ${a.appointmentDate} ${a.startTime}: ${a.client?.firstName} ${a.client?.lastName} with ${a.clinician?.firstName} ${a.clinician?.lastName} (${a.status})`
      ).join('\n');
    }

    if (context.reports) {
      contextSection += `\n\nREPORT DATA:\n`;
      contextSection += `- Total Clients: ${context.reports.summary.totalClients} (${context.reports.summary.activeClients} active)\n`;
      contextSection += `- Active Clinicians: ${context.reports.summary.activeClinicians}\n`;
      contextSection += `- Revenue this period: $${context.reports.revenue.thisMonth?.toFixed(2) || '0.00'}`;
    }

    return `USER CONTEXT:
Role: ${userContext.role}
${userContext.clinicianId ? `Clinician ID: ${userContext.clinicianId}` : ''}
Current Date/Time: ${new Date().toISOString()}
Query Topic: ${intent.topic}
${contextSection}

USER QUESTION:
${userMessage}

Please provide a helpful, accurate response based on the data provided. If you reference specific data, cite where it comes from.`;
  }

  /**
   * Log data access for HIPAA compliance
   */
  private async logDataAccess(
    conversationId: string,
    userId: string,
    intent: IntentResult,
    context: GatheredContext
  ): Promise<void> {
    const dataTypes: string[] = [];
    const recordIds: string[] = [];
    let containsPHI = false;

    if (context.clients && context.clients.length > 0) {
      dataTypes.push('Client');
      recordIds.push(...context.clients.map(c => c.id));
      containsPHI = true;
    }

    if (context.appointments && context.appointments.length > 0) {
      dataTypes.push('Appointment');
      recordIds.push(...context.appointments.map(a => a.id));
    }

    if (dataTypes.length > 0) {
      await prisma.aIDataAccessLog.create({
        data: {
          conversationId,
          userId,
          dataType: dataTypes.join(', '),
          recordIds,
          queryDescription: `${intent.topic} query`,
          recordCount: recordIds.length,
          containsPHI
        }
      });

      auditLogger.info('AI Assistant data access', {
        userId,
        conversationId,
        dataTypes,
        recordCount: recordIds.length,
        containsPHI,
        action: 'AI_DATA_ACCESS'
      });
    }
  }

  /**
   * Get list of data sources accessed
   */
  private getDataSourcesList(context: GatheredContext): string[] {
    const sources: string[] = [];
    if (context.clients) sources.push('clients');
    if (context.appointments) sources.push('appointments');
    if (context.clinicalNotes) sources.push('clinical_notes');
    if (context.billing) sources.push('billing');
    if (context.staff) sources.push('staff');
    if (context.metrics) sources.push('metrics');
    if (context.reports) sources.push('reports');
    return sources;
  }

  /**
   * Create an access denied response
   */
  private async createAccessDeniedResponse(
    conversationId: string,
    reason: string,
    userId: string
  ): Promise<AssistantResponse> {
    const message = await prisma.aIConversationMessage.create({
      data: {
        conversationId,
        role: AIMessageRole.ASSISTANT,
        content: reason,
        isError: true,
        errorMessage: 'Access denied'
      }
    });

    auditLogger.warn('AI Assistant access denied', {
      userId,
      conversationId,
      reason,
      action: 'AI_ACCESS_DENIED'
    });

    return {
      conversationId,
      messageId: message.id,
      content: reason,
      topic: AIConversationTopic.GENERAL,
      dataSourcesAccessed: [],
      tokensUsed: 0
    };
  }

  // ============================================================================
  // CONVERSATION MANAGEMENT
  // ============================================================================

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, clientId?: string): Promise<any> {
    return prisma.aIConversation.create({
      data: {
        userId,
        clientId,
        topic: AIConversationTopic.GENERAL
      }
    });
  }

  /**
   * Get a conversation by ID (validates user ownership)
   */
  async getConversation(conversationId: string, userId: string): Promise<any> {
    return prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId,
        isArchived: false
      }
    });
  }

  /**
   * Get conversation history (recent messages)
   */
  async getConversationHistory(
    conversationId: string,
    limit: number = 10
  ): Promise<ChatMessage[]> {
    const messages = await prisma.aIConversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return messages.reverse().map(m => ({
      role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
      content: m.content
    }));
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string, options?: {
    limit?: number;
    offset?: number;
    includeArchived?: boolean;
  }): Promise<any[]> {
    return prisma.aIConversation.findMany({
      where: {
        userId,
        isArchived: options?.includeArchived ? undefined : false
      },
      orderBy: { updatedAt: 'desc' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { messages: true }
        }
      }
    });
  }

  /**
   * Get a full conversation with all messages
   */
  async getFullConversation(conversationId: string, userId: string): Promise<any> {
    return prisma.aIConversation.findFirst({
      where: {
        id: conversationId,
        userId
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string, userId: string): Promise<void> {
    await prisma.aIConversation.updateMany({
      where: { id: conversationId, userId },
      data: { isArchived: true }
    });
  }

  /**
   * Delete a conversation (hard delete)
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    // First verify ownership
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId }
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Delete conversation (cascade deletes messages)
    await prisma.aIConversation.delete({
      where: { id: conversationId }
    });

    logger.info('AI conversation deleted', { conversationId, userId });
  }

  /**
   * Pin/unpin a conversation
   */
  async togglePinConversation(
    conversationId: string,
    userId: string,
    pinned: boolean
  ): Promise<void> {
    await prisma.aIConversation.updateMany({
      where: { id: conversationId, userId },
      data: { isPinned: pinned }
    });
  }

  /**
   * Generate a title for a conversation based on first message
   */
  private async generateConversationTitle(
    conversationId: string,
    firstMessage: string
  ): Promise<void> {
    try {
      const title = await anthropicService.generateCompletion(
        'Generate a very short (3-6 words) title summarizing this question. Return only the title, no quotes or punctuation.',
        firstMessage,
        { temperature: 0.5, maxTokens: 30 }
      );

      await prisma.aIConversation.update({
        where: { id: conversationId },
        data: { title: title.trim().slice(0, 100) }
      });
    } catch (error: any) {
      logger.warn('Failed to generate conversation title', { error: error.message });
    }
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  /**
   * Generate a report based on natural language request
   */
  async generateReport(
    userId: string,
    reportRequest: string,
    userContext: UserContext
  ): Promise<{ reportType: string; data: any; summary: string }> {
    // Detect what kind of report is being requested
    const intent = await this.detectIntent(reportRequest);

    // Gather comprehensive data for report
    const context = await this.gatherReportingContext(intent, userContext);

    // Generate report summary using AI
    const summary = await anthropicService.generateCompletion(
      'You are a report generator. Create a concise executive summary of the provided data.',
      `Generate a summary for this ${intent.entities.reportType || 'general'} report request: "${reportRequest}"\n\nData: ${JSON.stringify(context)}`,
      { temperature: 0.5 }
    );

    return {
      reportType: intent.entities.reportType || 'general',
      data: context,
      summary
    };
  }

  /**
   * Health check for the AI Assistant service
   */
  async healthCheck(): Promise<{ status: string; anthropic: boolean; database: boolean }> {
    const anthropicOk = await anthropicService.healthCheck();
    let databaseOk = false;

    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseOk = true;
    } catch {
      databaseOk = false;
    }

    return {
      status: anthropicOk && databaseOk ? 'healthy' : 'degraded',
      anthropic: anthropicOk,
      database: databaseOk
    };
  }
}

// Export singleton instance
export const aiAssistantService = new AIAssistantService();
export default aiAssistantService;
