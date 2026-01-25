/**
 * Crisis Resource Controller
 * Module 6 - Telehealth Phase 2: Emergency System Enhancements
 *
 * REST API controller for crisis resources management
 */

import { Request, Response } from 'express';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as crisisResourceService from '../services/crisisResource.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../utils/apiResponse';

/**
 * GET /api/v1/crisis-resources
 * Get all crisis resources with optional filtering
 */
export async function getCrisisResources(req: Request, res: Response) {
  try {
    const { category, state, city, geographicScope } = req.query;

    const filter: any = {};

    if (category) {
      filter.category = category as string;
    }

    if (state) {
      filter.state = state as string;
    }

    if (city) {
      filter.city = city as string;
    }

    if (geographicScope) {
      filter.geographicScope = geographicScope as string;
    }

    const resources = await crisisResourceService.getCrisisResources(filter);

    return sendSuccess(res, { data: resources, count: resources.length });
  } catch (error) {
    logger.error('Error getting crisis resources', {
      error: getErrorMessage(error),
      query: req.query,
    });
    return sendServerError(res, 'Failed to retrieve crisis resources');
  }
}

/**
 * GET /api/v1/crisis-resources/emergency/:emergencyType
 * Get crisis resources for a specific emergency type
 */
export async function getCrisisResourcesForEmergency(req: Request, res: Response) {
  try {
    const { emergencyType } = req.params;
    const { state, city } = req.query;

    const resources = await crisisResourceService.getCrisisResourcesForEmergency(
      emergencyType,
      state as string | undefined,
      city as string | undefined
    );

    return sendSuccess(res, { data: resources, count: resources.length, emergencyType });
  } catch (error) {
    logger.error('Error getting crisis resources for emergency', {
      error: getErrorMessage(error),
      emergencyType: req.params.emergencyType,
    });
    return sendServerError(res, 'Failed to retrieve crisis resources for emergency');
  }
}

/**
 * GET /api/v1/crisis-resources/:id
 * Get a single crisis resource by ID
 */
export async function getCrisisResourceById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const resource = await crisisResourceService.getCrisisResourceById(id);

    return sendSuccess(res, resource);
  } catch (error) {
    logger.error('Error getting crisis resource', {
      error: getErrorMessage(error),
      id: req.params.id,
    });

    if (getErrorMessage(error) === 'Crisis resource not found') {
      return sendNotFound(res, 'Crisis resource');
    }

    return sendServerError(res, 'Failed to retrieve crisis resource');
  }
}

/**
 * POST /api/v1/crisis-resources
 * Create a new crisis resource
 * Requires: ADMINISTRATOR or SUPERVISOR role
 */
export async function createCrisisResource(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Validate required fields
    const {
      name,
      phone,
      description,
      category,
      availability,
      serviceType,
      geographicScope,
      language,
    } = req.body;

    if (
      !name ||
      !phone ||
      !description ||
      !category ||
      !availability ||
      !serviceType ||
      !geographicScope
    ) {
      return sendBadRequest(res, 'Missing required fields: name, phone, description, category, availability, serviceType, geographicScope');
    }

    // Validate phone number format
    if (!crisisResourceService.validatePhoneNumber(phone)) {
      return sendBadRequest(res, 'Invalid phone number format');
    }

    const resourceData = {
      ...req.body,
      language: language || ['English'],
      createdBy: userId,
    };

    const resource = await crisisResourceService.createCrisisResource(resourceData);

    return sendCreated(res, resource, 'Crisis resource created successfully');
  } catch (error) {
    logger.error('Error creating crisis resource', {
      error: getErrorMessage(error),
      body: req.body,
    });
    return sendServerError(res, 'Failed to create crisis resource');
  }
}

/**
 * PUT /api/v1/crisis-resources/:id
 * Update an existing crisis resource
 * Requires: ADMINISTRATOR or SUPERVISOR role
 */
export async function updateCrisisResource(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Validate phone number if provided
    if (req.body.phone && !crisisResourceService.validatePhoneNumber(req.body.phone)) {
      return sendBadRequest(res, 'Invalid phone number format');
    }

    const updateData = {
      ...req.body,
      lastModifiedBy: userId,
    };

    const resource = await crisisResourceService.updateCrisisResource(id, updateData);

    return sendSuccess(res, resource, 'Crisis resource updated successfully');
  } catch (error) {
    logger.error('Error updating crisis resource', {
      error: getErrorMessage(error),
      id: req.params.id,
    });
    return sendServerError(res, 'Failed to update crisis resource');
  }
}

/**
 * DELETE /api/v1/crisis-resources/:id
 * Delete (deactivate) a crisis resource
 * Requires: ADMINISTRATOR role
 */
export async function deleteCrisisResource(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    const resource = await crisisResourceService.deleteCrisisResource(id, userId);

    return sendSuccess(res, resource, 'Crisis resource deleted successfully');
  } catch (error) {
    logger.error('Error deleting crisis resource', {
      error: getErrorMessage(error),
      id: req.params.id,
    });
    return sendServerError(res, 'Failed to delete crisis resource');
  }
}

/**
 * POST /api/v1/crisis-resources/reorder
 * Reorder crisis resources
 * Requires: ADMINISTRATOR or SUPERVISOR role
 */
export async function reorderCrisisResources(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const { updates } = req.body;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    if (!Array.isArray(updates)) {
      return sendBadRequest(res, 'Updates must be an array');
    }

    const results = await crisisResourceService.reorderCrisisResources(updates, userId);

    return sendSuccess(res, results, 'Crisis resources reordered successfully');
  } catch (error) {
    logger.error('Error reordering crisis resources', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to reorder crisis resources');
  }
}

/**
 * GET /api/v1/crisis-resources/categories
 * Get all unique crisis resource categories
 */
export async function getCrisisResourceCategories(req: Request, res: Response) {
  try {
    const categories = await crisisResourceService.getCrisisResourceCategories();

    return sendSuccess(res, categories);
  } catch (error) {
    logger.error('Error getting crisis resource categories', {
      error: getErrorMessage(error),
    });
    return sendServerError(res, 'Failed to retrieve crisis resource categories');
  }
}

/**
 * GET /api/v1/crisis-resources/search
 * Search crisis resources by name or description
 */
export async function searchCrisisResources(req: Request, res: Response) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return sendBadRequest(res, 'Search term (q) is required');
    }

    const resources = await crisisResourceService.searchCrisisResources(q);

    return sendSuccess(res, { data: resources, count: resources.length, searchTerm: q });
  } catch (error) {
    logger.error('Error searching crisis resources', {
      error: getErrorMessage(error),
      searchTerm: req.query.q,
    });
    return sendServerError(res, 'Failed to search crisis resources');
  }
}
