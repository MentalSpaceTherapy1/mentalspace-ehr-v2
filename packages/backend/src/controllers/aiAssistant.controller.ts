/**
 * AI Personal Assistant Controller
 *
 * Handles all HTTP endpoints for the AI Personal Assistant feature.
 * Provides chat functionality, conversation management, and report generation.
 *
 * Endpoints:
 * - POST /api/v1/ai/assistant/chat - Send a message and get AI response
 * - POST /api/v1/ai/assistant/chat/stream - Stream AI response (SSE)
 * - GET /api/v1/ai/assistant/conversations - List user's conversations
 * - GET /api/v1/ai/assistant/conversations/:id - Get full conversation
 * - DELETE /api/v1/ai/assistant/conversations/:id - Delete conversation
 * - PATCH /api/v1/ai/assistant/conversations/:id/archive - Archive conversation
 * - PATCH /api/v1/ai/assistant/conversations/:id/pin - Pin/unpin conversation
 * - POST /api/v1/ai/assistant/report - Generate a report
 * - GET /api/v1/ai/assistant/health - Health check
 *
 * @module controllers/aiAssistant
 */

import { Request, Response } from 'express';
import { aiAssistantService, UserContext } from '../services/ai/aiAssistant.service';
import logger from '../utils/logger';

/**
 * Build user context from request
 */
function buildUserContext(req: Request): UserContext {
  const user = req.user as any;
  return {
    userId: user?.id || '',
    role: user?.role || 'CLINICIAN',
    permissions: user?.permissions || [],
    clinicianId: user?.clinicianId || user?.id,
    departmentId: user?.departmentId,
    supervisorId: user?.supervisorId
  };
}

/**
 * POST /api/v1/ai/assistant/chat
 * Send a message to the AI assistant and get a response
 *
 * @body {string} message - The user's message
 * @body {string} [conversationId] - Optional existing conversation ID
 * @body {string} [clientId] - Optional client context ID
 * @returns {Object} AI response with conversation details
 */
export const chat = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { message, conversationId, clientId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    if (message.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Message too long (max 10,000 characters)'
      });
    }

    const userContext = buildUserContext(req);

    const response = await aiAssistantService.processMessage(
      userId,
      message.trim(),
      conversationId || null,
      userContext
    );

    logger.info('AI Assistant chat completed', {
      userId,
      conversationId: response.conversationId,
      topic: response.topic
    });

    return res.json({
      success: true,
      data: {
        conversationId: response.conversationId,
        messageId: response.messageId,
        content: response.content,
        topic: response.topic,
        dataSourcesAccessed: response.dataSourcesAccessed,
        tokensUsed: response.tokensUsed
      }
    });

  } catch (error: any) {
    logger.error('AI Assistant chat error', {
      error: error.message,
      userId: req.user?.id
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to process message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/v1/ai/assistant/chat/stream
 * Stream AI response using Server-Sent Events
 *
 * @body {string} message - The user's message
 * @body {string} [conversationId] - Optional existing conversation ID
 */
export const streamChat = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const userContext = buildUserContext(req);

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Stream the response
    for await (const chunk of aiAssistantService.streamResponse(
      userId,
      message.trim(),
      conversationId || null,
      userContext
    )) {
      if (chunk.type === 'token') {
        res.write(`data: ${JSON.stringify({ type: 'token', content: chunk.content })}\n\n`);
      } else if (chunk.type === 'done') {
        res.write(`data: ${JSON.stringify({ type: 'done', messageId: chunk.messageId })}\n\n`);
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ type: 'error', content: chunk.content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error: any) {
    logger.error('AI Assistant stream error', {
      error: error.message,
      userId: req.user?.id
    });

    // If headers haven't been sent, send error response
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to stream response'
      });
    }

    // If streaming, send error in stream format
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Stream error occurred' })}\n\n`);
    res.end();
  }
};

/**
 * GET /api/v1/ai/assistant/conversations
 * Get list of user's conversations
 *
 * @query {number} [limit=20] - Max conversations to return
 * @query {number} [offset=0] - Pagination offset
 * @query {boolean} [includeArchived=false] - Include archived conversations
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const includeArchived = req.query.includeArchived === 'true';

    const conversations = await aiAssistantService.getUserConversations(userId, {
      limit,
      offset,
      includeArchived
    });

    return res.json({
      success: true,
      data: conversations,
      total: conversations.length,
      pagination: { limit, offset }
    });

  } catch (error: any) {
    logger.error('Failed to get conversations', {
      error: error.message,
      userId: req.user?.id
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to get conversations'
    });
  }
};

/**
 * GET /api/v1/ai/assistant/conversations/:id
 * Get a full conversation with all messages
 *
 * @param {string} id - Conversation ID
 */
export const getConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { id } = req.params;

    const conversation = await aiAssistantService.getFullConversation(id, userId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    return res.json({
      success: true,
      data: conversation
    });

  } catch (error: any) {
    logger.error('Failed to get conversation', {
      error: error.message,
      conversationId: req.params.id
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to get conversation'
    });
  }
};

/**
 * DELETE /api/v1/ai/assistant/conversations/:id
 * Delete a conversation
 *
 * @param {string} id - Conversation ID
 */
export const deleteConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { id } = req.params;

    await aiAssistantService.deleteConversation(id, userId);

    logger.info('AI conversation deleted', { conversationId: id, userId });

    return res.json({
      success: true,
      message: 'Conversation deleted'
    });

  } catch (error: any) {
    logger.error('Failed to delete conversation', {
      error: error.message,
      conversationId: req.params.id
    });

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete conversation'
    });
  }
};

/**
 * PATCH /api/v1/ai/assistant/conversations/:id/archive
 * Archive a conversation
 *
 * @param {string} id - Conversation ID
 */
export const archiveConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { id } = req.params;

    await aiAssistantService.archiveConversation(id, userId);

    return res.json({
      success: true,
      message: 'Conversation archived'
    });

  } catch (error: any) {
    logger.error('Failed to archive conversation', {
      error: error.message,
      conversationId: req.params.id
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to archive conversation'
    });
  }
};

/**
 * PATCH /api/v1/ai/assistant/conversations/:id/pin
 * Pin or unpin a conversation
 *
 * @param {string} id - Conversation ID
 * @body {boolean} pinned - Whether to pin or unpin
 */
export const togglePinConversation = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { id } = req.params;
    const { pinned } = req.body;

    if (typeof pinned !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'pinned field (boolean) is required'
      });
    }

    await aiAssistantService.togglePinConversation(id, userId, pinned);

    return res.json({
      success: true,
      message: pinned ? 'Conversation pinned' : 'Conversation unpinned'
    });

  } catch (error: any) {
    logger.error('Failed to toggle pin', {
      error: error.message,
      conversationId: req.params.id
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to update conversation'
    });
  }
};

/**
 * POST /api/v1/ai/assistant/report
 * Generate a report based on natural language request
 *
 * @body {string} request - Natural language report request
 */
export const generateReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { request } = req.body;

    if (!request || typeof request !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Report request is required'
      });
    }

    const userContext = buildUserContext(req);

    const report = await aiAssistantService.generateReport(
      userId,
      request,
      userContext
    );

    logger.info('AI report generated', {
      userId,
      reportType: report.reportType
    });

    return res.json({
      success: true,
      data: report
    });

  } catch (error: any) {
    logger.error('Failed to generate report', {
      error: error.message,
      userId: req.user?.id
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
};

/**
 * GET /api/v1/ai/assistant/health
 * Health check for AI Assistant service
 */
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const health = await aiAssistantService.healthCheck();

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return res.status(statusCode).json({
      success: health.status === 'healthy',
      data: health
    });

  } catch (error: any) {
    return res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        anthropic: false,
        database: false
      }
    });
  }
};
