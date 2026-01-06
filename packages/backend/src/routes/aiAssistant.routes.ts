/**
 * AI Personal Assistant Routes
 *
 * Defines all API routes for the AI Personal Assistant feature.
 * All routes require authentication.
 *
 * Route Structure:
 * - POST   /chat                    - Send message and get response
 * - POST   /chat/stream             - Stream response (SSE)
 * - GET    /conversations           - List conversations
 * - GET    /conversations/:id       - Get full conversation
 * - DELETE /conversations/:id       - Delete conversation
 * - PATCH  /conversations/:id/archive - Archive conversation
 * - PATCH  /conversations/:id/pin   - Pin/unpin conversation
 * - POST   /report                  - Generate AI report
 * - GET    /health                  - Service health check
 *
 * @module routes/aiAssistant
 */

import { Router } from 'express';
import * as AIAssistantController from '../controllers/aiAssistant.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Chat Endpoints
 */

/**
 * @route POST /api/v1/ai/assistant/chat
 * @desc Send a message to the AI assistant
 * @access Private
 */
router.post('/chat', AIAssistantController.chat);

/**
 * @route POST /api/v1/ai/assistant/chat/stream
 * @desc Stream AI response using Server-Sent Events
 * @access Private
 */
router.post('/chat/stream', AIAssistantController.streamChat);

/**
 * Conversation Management Endpoints
 */

/**
 * @route GET /api/v1/ai/assistant/conversations
 * @desc Get list of user's conversations
 * @access Private
 */
router.get('/conversations', AIAssistantController.getConversations);

/**
 * @route GET /api/v1/ai/assistant/conversations/:id
 * @desc Get a full conversation with all messages
 * @access Private
 */
router.get('/conversations/:id', AIAssistantController.getConversation);

/**
 * @route DELETE /api/v1/ai/assistant/conversations/:id
 * @desc Delete a conversation
 * @access Private
 */
router.delete('/conversations/:id', AIAssistantController.deleteConversation);

/**
 * @route PATCH /api/v1/ai/assistant/conversations/:id/archive
 * @desc Archive a conversation
 * @access Private
 */
router.patch('/conversations/:id/archive', AIAssistantController.archiveConversation);

/**
 * @route PATCH /api/v1/ai/assistant/conversations/:id/pin
 * @desc Pin or unpin a conversation
 * @access Private
 */
router.patch('/conversations/:id/pin', AIAssistantController.togglePinConversation);

/**
 * Report Generation
 */

/**
 * @route POST /api/v1/ai/assistant/report
 * @desc Generate a report based on natural language request
 * @access Private
 */
router.post('/report', AIAssistantController.generateReport);

/**
 * Health Check
 */

/**
 * @route GET /api/v1/ai/assistant/health
 * @desc Health check for AI Assistant service
 * @access Private
 */
router.get('/health', AIAssistantController.healthCheck);

export default router;
