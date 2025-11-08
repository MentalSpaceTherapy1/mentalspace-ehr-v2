/**
 * Emergency Protocol Controller
 * Module 6 - Telehealth Phase 2: Emergency System Enhancements
 */

import { Request, Response } from 'express';
import * as emergencyProtocolService from '../services/emergencyProtocol.service';
import logger from '../utils/logger';

export async function getEmergencyProtocols(req: Request, res: Response) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const protocols = await emergencyProtocolService.getEmergencyProtocols(includeInactive);

    res.json({
      success: true,
      data: protocols,
      count: protocols.length,
    });
  } catch (error: any) {
    logger.error('Error getting emergency protocols', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve emergency protocols',
      error: error.message,
    });
  }
}

export async function getProtocolForEmergencyType(req: Request, res: Response) {
  try {
    const { emergencyType } = req.params;
    const protocol = await emergencyProtocolService.getProtocolForEmergencyType(emergencyType);

    if (!protocol) {
      return res.status(404).json({
        success: false,
        message: 'No protocol found for this emergency type',
      });
    }

    res.json({
      success: true,
      data: protocol,
    });
  } catch (error: any) {
    logger.error('Error getting protocol for emergency type', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve emergency protocol',
      error: error.message,
    });
  }
}

export async function getEmergencyProtocolById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const protocol = await emergencyProtocolService.getEmergencyProtocolById(id);

    res.json({
      success: true,
      data: protocol,
    });
  } catch (error: any) {
    if (error.message === 'Emergency protocol not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve emergency protocol',
      error: error.message,
    });
  }
}

export async function createEmergencyProtocol(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    // Validate protocol structure
    const validation = emergencyProtocolService.validateProtocolStructure(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid protocol structure',
        errors: validation.errors,
      });
    }

    const protocolData = {
      ...req.body,
      createdBy: userId,
    };

    const protocol = await emergencyProtocolService.createEmergencyProtocol(protocolData);

    res.status(201).json({
      success: true,
      message: 'Emergency protocol created successfully',
      data: protocol,
    });
  } catch (error: any) {
    logger.error('Error creating emergency protocol', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create emergency protocol',
      error: error.message,
    });
  }
}

export async function updateEmergencyProtocol(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const updateData = {
      ...req.body,
      lastModifiedBy: userId,
    };

    const protocol = await emergencyProtocolService.updateEmergencyProtocol(id, updateData);

    res.json({
      success: true,
      message: 'Emergency protocol updated successfully',
      data: protocol,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency protocol',
      error: error.message,
    });
  }
}

export async function deleteEmergencyProtocol(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const protocol = await emergencyProtocolService.deleteEmergencyProtocol(id, userId);

    res.json({
      success: true,
      message: 'Emergency protocol deleted successfully',
      data: protocol,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete emergency protocol',
      error: error.message,
    });
  }
}
