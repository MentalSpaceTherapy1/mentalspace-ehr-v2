import { Router } from 'express';
import * as messagingController from '../controllers/messaging.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// MESSAGE ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/messages
 * @desc    Create a new message
 * @access  Private
 */
router.post('/', messagingController.createMessage);

/**
 * @route   GET /api/v1/messages
 * @desc    Get messages for current user (inbox)
 * @access  Private
 */
router.get('/', messagingController.getMessages);

/**
 * @route   GET /api/v1/messages/sent
 * @desc    Get sent messages for current user
 * @access  Private
 */
router.get('/sent', messagingController.getSentMessages);

/**
 * @route   GET /api/v1/messages/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
router.get('/unread-count', messagingController.getUnreadCount);

/**
 * @route   GET /api/v1/messages/:id
 * @desc    Get message by ID
 * @access  Private
 */
router.get('/:id', messagingController.getMessageById);

/**
 * @route   PUT /api/v1/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
router.put('/:id/read', messagingController.markAsRead);

/**
 * @route   PUT /api/v1/messages/:id/archive
 * @desc    Archive a message
 * @access  Private
 */
router.put('/:id/archive', messagingController.archiveMessage);

/**
 * @route   DELETE /api/v1/messages/:id
 * @desc    Delete a message
 * @access  Private
 */
router.delete('/:id', messagingController.deleteMessage);

// ============================================================================
// CHANNEL ROUTES
// ============================================================================

/**
 * @route   POST /api/v1/messages/channels
 * @desc    Create a new channel
 * @access  Private
 */
router.post('/channels', messagingController.createChannel);

/**
 * @route   GET /api/v1/messages/channels
 * @desc    Get channels for current user
 * @access  Private
 */
router.get('/channels', messagingController.getChannels);

/**
 * @route   GET /api/v1/messages/channels/:id
 * @desc    Get channel by ID
 * @access  Private
 */
router.get('/channels/:id', messagingController.getChannelById);

/**
 * @route   PUT /api/v1/messages/channels/:id
 * @desc    Update a channel
 * @access  Private
 */
router.put('/channels/:id', messagingController.updateChannel);

/**
 * @route   POST /api/v1/messages/channels/:id/members
 * @desc    Add member to channel
 * @access  Private
 */
router.post('/channels/:id/members', messagingController.addMember);

/**
 * @route   DELETE /api/v1/messages/channels/:id/members/:memberId
 * @desc    Remove member from channel
 * @access  Private
 */
router.delete('/channels/:id/members/:memberId', messagingController.removeMember);

/**
 * @route   PUT /api/v1/messages/channels/:id/archive
 * @desc    Archive a channel
 * @access  Private
 */
router.put('/channels/:id/archive', messagingController.archiveChannel);

export default router;
