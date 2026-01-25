/**
 * Emergency Protocol Controller
 * Module 6 - Telehealth Phase 2: Emergency System Enhancements
 */

import { Request, Response } from 'express';
import { getErrorMessage, getErrorCode } from '../utils/errorHelpers';
// Phase 5.4: Import consolidated Express types to eliminate `as any` casts
import '../types/express.d';
import * as emergencyProtocolService from '../services/emergencyProtocol.service';
import logger from '../utils/logger';
import { sendSuccess, sendCreated, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../utils/apiResponse';

export async function getEmergencyProtocols(req: Request, res: Response) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const protocols = await emergencyProtocolService.getEmergencyProtocols(includeInactive);

    return sendSuccess(res, { data: protocols, count: protocols.length });
  } catch (error) {
    logger.error('Error getting emergency protocols', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to retrieve emergency protocols');
  }
}

export async function getProtocolForEmergencyType(req: Request, res: Response) {
  try {
    const { emergencyType } = req.params;
    const protocol = await emergencyProtocolService.getProtocolForEmergencyType(emergencyType);

    if (!protocol) {
      return sendNotFound(res, 'Protocol for this emergency type');
    }

    return sendSuccess(res, protocol);
  } catch (error) {
    logger.error('Error getting protocol for emergency type', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to retrieve emergency protocol');
  }
}

export async function getEmergencyProtocolById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const protocol = await emergencyProtocolService.getEmergencyProtocolById(id);

    return sendSuccess(res, protocol);
  } catch (error) {
    if (getErrorMessage(error) === 'Emergency protocol not found') {
      return sendNotFound(res, 'Emergency protocol');
    }
    return sendServerError(res, 'Failed to retrieve emergency protocol');
  }
}

export async function createEmergencyProtocol(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    // Validate protocol structure
    const validation = emergencyProtocolService.validateProtocolStructure(req.body);
    if (!validation.valid) {
      return sendBadRequest(res, `Invalid protocol structure: ${validation.errors?.join(', ')}`);
    }

    const protocolData = {
      ...req.body,
      createdBy: userId,
    };

    const protocol = await emergencyProtocolService.createEmergencyProtocol(protocolData);

    return sendCreated(res, protocol, 'Emergency protocol created successfully');
  } catch (error) {
    logger.error('Error creating emergency protocol', { error: getErrorMessage(error) });
    return sendServerError(res, 'Failed to create emergency protocol');
  }
}

export async function updateEmergencyProtocol(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    const updateData = {
      ...req.body,
      lastModifiedBy: userId,
    };

    const protocol = await emergencyProtocolService.updateEmergencyProtocol(id, updateData);

    return sendSuccess(res, protocol, 'Emergency protocol updated successfully');
  } catch (error) {
    return sendServerError(res, 'Failed to update emergency protocol');
  }
}

export async function deleteEmergencyProtocol(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, 'User not authenticated');
    }

    const protocol = await emergencyProtocolService.deleteEmergencyProtocol(id, userId);

    return sendSuccess(res, protocol, 'Emergency protocol deleted successfully');
  } catch (error) {
    return sendServerError(res, 'Failed to delete emergency protocol');
  }
}
