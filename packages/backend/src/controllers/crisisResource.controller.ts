/**
 * Crisis Resource Controller
 * Module 6 - Telehealth Phase 2: Emergency System Enhancements
 *
 * REST API controller for crisis resources management
 */

import { Request, Response } from 'express';
import * as crisisResourceService from '../services/crisisResource.service';
import logger from '../utils/logger';

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

    res.json({
      success: true,
      data: resources,
      count: resources.length,
    });
  } catch (error: any) {
    logger.error('Error getting crisis resources', {
      error: error.message,
      query: req.query,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve crisis resources',
      error: error.message,
    });
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

    res.json({
      success: true,
      data: resources,
      count: resources.length,
      emergencyType,
    });
  } catch (error: any) {
    logger.error('Error getting crisis resources for emergency', {
      error: error.message,
      emergencyType: req.params.emergencyType,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve crisis resources for emergency',
      error: error.message,
    });
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

    res.json({
      success: true,
      data: resource,
    });
  } catch (error: any) {
    logger.error('Error getting crisis resource', {
      error: error.message,
      id: req.params.id,
    });

    if (error.message === 'Crisis resource not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve crisis resource',
      error: error.message,
    });
  }
}

/**
 * POST /api/v1/crisis-resources
 * Create a new crisis resource
 * Requires: ADMINISTRATOR or SUPERVISOR role
 */
export async function createCrisisResource(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
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
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: [
          'name',
          'phone',
          'description',
          'category',
          'availability',
          'serviceType',
          'geographicScope',
        ],
      });
    }

    // Validate phone number format
    if (!crisisResourceService.validatePhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
      });
    }

    const resourceData = {
      ...req.body,
      language: language || ['English'],
      createdBy: userId,
    };

    const resource = await crisisResourceService.createCrisisResource(resourceData);

    res.status(201).json({
      success: true,
      message: 'Crisis resource created successfully',
      data: resource,
    });
  } catch (error: any) {
    logger.error('Error creating crisis resource', {
      error: error.message,
      body: req.body,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to create crisis resource',
      error: error.message,
    });
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
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Validate phone number if provided
    if (req.body.phone && !crisisResourceService.validatePhoneNumber(req.body.phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
      });
    }

    const updateData = {
      ...req.body,
      lastModifiedBy: userId,
    };

    const resource = await crisisResourceService.updateCrisisResource(id, updateData);

    res.json({
      success: true,
      message: 'Crisis resource updated successfully',
      data: resource,
    });
  } catch (error: any) {
    logger.error('Error updating crisis resource', {
      error: error.message,
      id: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update crisis resource',
      error: error.message,
    });
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
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const resource = await crisisResourceService.deleteCrisisResource(id, userId);

    res.json({
      success: true,
      message: 'Crisis resource deleted successfully',
      data: resource,
    });
  } catch (error: any) {
    logger.error('Error deleting crisis resource', {
      error: error.message,
      id: req.params.id,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to delete crisis resource',
      error: error.message,
    });
  }
}

/**
 * POST /api/v1/crisis-resources/reorder
 * Reorder crisis resources
 * Requires: ADMINISTRATOR or SUPERVISOR role
 */
export async function reorderCrisisResources(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const { updates } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        message: 'Updates must be an array',
      });
    }

    const results = await crisisResourceService.reorderCrisisResources(updates, userId);

    res.json({
      success: true,
      message: 'Crisis resources reordered successfully',
      data: results,
    });
  } catch (error: any) {
    logger.error('Error reordering crisis resources', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to reorder crisis resources',
      error: error.message,
    });
  }
}

/**
 * GET /api/v1/crisis-resources/categories
 * Get all unique crisis resource categories
 */
export async function getCrisisResourceCategories(req: Request, res: Response) {
  try {
    const categories = await crisisResourceService.getCrisisResourceCategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    logger.error('Error getting crisis resource categories', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve crisis resource categories',
      error: error.message,
    });
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
      return res.status(400).json({
        success: false,
        message: 'Search term (q) is required',
      });
    }

    const resources = await crisisResourceService.searchCrisisResources(q);

    res.json({
      success: true,
      data: resources,
      count: resources.length,
      searchTerm: q,
    });
  } catch (error: any) {
    logger.error('Error searching crisis resources', {
      error: error.message,
      searchTerm: req.query.q,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to search crisis resources',
      error: error.message,
    });
  }
}
