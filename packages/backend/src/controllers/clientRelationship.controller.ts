/**
 * Client Relationship Controller
 *
 * Handles HTTP requests for client relationships and provider management
 */

import { Request, Response, NextFunction } from 'express';
import { ClientRelationshipService } from '../services/clientRelationship.service';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError } from '../utils/errors';

// ============================================================================
// CLIENT RELATIONSHIP ENDPOINTS
// ============================================================================

/**
 * Create a new client relationship
 * POST /api/v1/client-relationships
 */
export const createRelationship = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestError('User ID not found in request');
    }

    const {
      client1Id,
      client2Id,
      relationshipType,
      relationshipDetails,
      isPrimary,
      isEmergencyContact,
      isAuthorizedContact,
      canScheduleAppointments,
      canAccessPortal,
      canReceiveInformation,
      canMakeMedicalDecisions,
      specificLimitations,
      roiSigned,
      roiSignedDate,
      roiExpirationDate,
      consentDocumentId,
      relationshipStartDate
    } = req.body;

    // Validate required fields
    if (!client1Id || !client2Id || !relationshipType) {
      throw new BadRequestError(
        'Missing required fields: client1Id, client2Id, relationshipType'
      );
    }

    const relationship = await ClientRelationshipService.createRelationship({
      client1Id,
      client2Id,
      relationshipType,
      relationshipDetails,
      isPrimary,
      isEmergencyContact,
      isAuthorizedContact,
      canScheduleAppointments,
      canAccessPortal,
      canReceiveInformation,
      canMakeMedicalDecisions,
      specificLimitations,
      roiSigned,
      roiSignedDate: roiSignedDate ? new Date(roiSignedDate) : undefined,
      roiExpirationDate: roiExpirationDate ? new Date(roiExpirationDate) : undefined,
      consentDocumentId,
      relationshipStartDate: relationshipStartDate ? new Date(relationshipStartDate) : undefined,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      data: relationship,
      message: 'Client relationship created successfully'
    });
  }
);

/**
 * Get relationship by ID
 * GET /api/v1/client-relationships/:id
 */
export const getRelationshipById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const relationship = await ClientRelationshipService.getRelationshipById(id);

    res.json({
      success: true,
      data: relationship
    });
  }
);

/**
 * Update a relationship
 * PUT /api/v1/client-relationships/:id
 */
export const updateRelationship = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const {
      relationshipDetails,
      isPrimary,
      isEmergencyContact,
      isAuthorizedContact,
      canScheduleAppointments,
      canAccessPortal,
      canReceiveInformation,
      canMakeMedicalDecisions,
      specificLimitations,
      roiSigned,
      roiSignedDate,
      roiExpirationDate,
      consentDocumentId,
      relationshipEndDate,
      isActive
    } = req.body;

    const relationship = await ClientRelationshipService.updateRelationship(id, {
      relationshipDetails,
      isPrimary,
      isEmergencyContact,
      isAuthorizedContact,
      canScheduleAppointments,
      canAccessPortal,
      canReceiveInformation,
      canMakeMedicalDecisions,
      specificLimitations,
      roiSigned,
      roiSignedDate: roiSignedDate ? new Date(roiSignedDate) : undefined,
      roiExpirationDate: roiExpirationDate ? new Date(roiExpirationDate) : undefined,
      consentDocumentId,
      relationshipEndDate: relationshipEndDate ? new Date(relationshipEndDate) : undefined,
      isActive
    });

    res.json({
      success: true,
      data: relationship,
      message: 'Relationship updated successfully'
    });
  }
);

/**
 * Delete (deactivate) a relationship
 * DELETE /api/v1/client-relationships/:id
 */
export const deleteRelationship = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const relationship = await ClientRelationshipService.deleteRelationship(id);

    res.json({
      success: true,
      data: relationship,
      message: 'Relationship deactivated successfully'
    });
  }
);

/**
 * Get family tree for a client
 * GET /api/v1/client-relationships/client/:clientId/family-tree
 */
export const getFamilyTree = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { clientId } = req.params;

    const familyTree = await ClientRelationshipService.getFamilyTree(clientId);

    res.json({
      success: true,
      data: familyTree
    });
  }
);

/**
 * Get all relationships for a client
 * GET /api/v1/client-relationships/client/:clientId
 */
export const getClientRelationships = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { clientId } = req.params;
    const { activeOnly } = req.query;

    const relationships = await ClientRelationshipService.getClientRelationships(
      clientId,
      activeOnly === 'true'
    );

    res.json({
      success: true,
      data: relationships,
      count: relationships.length
    });
  }
);

// ============================================================================
// CLIENT PROVIDER ENDPOINTS
// ============================================================================

/**
 * Add a provider to a client's care team
 * POST /api/v1/client-providers
 */
export const addProvider = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestError('User ID not found in request');
    }

    const {
      clientId,
      providerType,
      providerId,
      externalProviderName,
      externalProviderNPI,
      externalProviderPhone,
      externalProviderFax,
      externalProviderEmail,
      specialty,
      roiSigned,
      roiSignedDate,
      roiExpirationDate,
      canReceiveUpdates,
      canSendReferrals,
      startDate
    } = req.body;

    // Validate required fields
    if (!clientId || !providerType) {
      throw new BadRequestError('Missing required fields: clientId, providerType');
    }

    const provider = await ClientRelationshipService.addProvider({
      clientId,
      providerType,
      providerId,
      externalProviderName,
      externalProviderNPI,
      externalProviderPhone,
      externalProviderFax,
      externalProviderEmail,
      specialty,
      roiSigned,
      roiSignedDate: roiSignedDate ? new Date(roiSignedDate) : undefined,
      roiExpirationDate: roiExpirationDate ? new Date(roiExpirationDate) : undefined,
      canReceiveUpdates,
      canSendReferrals,
      startDate: startDate ? new Date(startDate) : undefined,
      createdBy: userId
    });

    res.status(201).json({
      success: true,
      data: provider,
      message: 'Provider added to care team successfully'
    });
  }
);

/**
 * Get provider by ID
 * GET /api/v1/client-providers/:id
 */
export const getProviderById = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const provider = await ClientRelationshipService.getProviderById(id);

    res.json({
      success: true,
      data: provider
    });
  }
);

/**
 * Update a provider
 * PUT /api/v1/client-providers/:id
 */
export const updateProvider = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const {
      externalProviderName,
      externalProviderPhone,
      externalProviderFax,
      externalProviderEmail,
      specialty,
      roiSigned,
      roiSignedDate,
      roiExpirationDate,
      canReceiveUpdates,
      canSendReferrals,
      lastCommunicationDate,
      isActive,
      endDate
    } = req.body;

    const provider = await ClientRelationshipService.updateProvider(id, {
      externalProviderName,
      externalProviderPhone,
      externalProviderFax,
      externalProviderEmail,
      specialty,
      roiSigned,
      roiSignedDate: roiSignedDate ? new Date(roiSignedDate) : undefined,
      roiExpirationDate: roiExpirationDate ? new Date(roiExpirationDate) : undefined,
      canReceiveUpdates,
      canSendReferrals,
      lastCommunicationDate: lastCommunicationDate ? new Date(lastCommunicationDate) : undefined,
      isActive,
      endDate: endDate ? new Date(endDate) : undefined
    });

    res.json({
      success: true,
      data: provider,
      message: 'Provider updated successfully'
    });
  }
);

/**
 * Delete (deactivate) a provider
 * DELETE /api/v1/client-providers/:id
 */
export const deleteProvider = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const provider = await ClientRelationshipService.deleteProvider(id);

    res.json({
      success: true,
      data: provider,
      message: 'Provider removed from care team successfully'
    });
  }
);

/**
 * Get care team for a client
 * GET /api/v1/client-providers/client/:clientId/care-team
 */
export const getCareTeam = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { clientId } = req.params;

    const careTeam = await ClientRelationshipService.getCareTeam(clientId);

    res.json({
      success: true,
      data: careTeam
    });
  }
);

/**
 * Get all providers for a client
 * GET /api/v1/client-providers/client/:clientId
 */
export const getClientProviders = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { clientId } = req.params;
    const { activeOnly } = req.query;

    const providers = await ClientRelationshipService.getClientProviders(
      clientId,
      activeOnly === 'true'
    );

    res.json({
      success: true,
      data: providers,
      count: providers.length
    });
  }
);
