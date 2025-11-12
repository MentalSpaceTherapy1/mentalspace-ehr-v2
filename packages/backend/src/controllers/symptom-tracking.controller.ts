import { Request, Response } from 'express';
import symptomTrackingService from '../services/symptom-tracking.service';
import { ValidationError } from '../utils/errors';
import logger, { logControllerError } from '../utils/logger';

/**
 * Create a new symptom log entry
 */
export const createSymptomLog = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const data = req.body;

    // Validate required fields
    if (!data.symptoms || !Array.isArray(data.symptoms) || data.symptoms.length === 0) {
      throw new ValidationError('Symptoms array is required');
    }

    if (!data.severity || data.severity < 1 || data.severity > 10) {
      throw new ValidationError('Severity must be between 1 and 10');
    }

    const log = await symptomTrackingService.logSymptom(
      clientId,
      data,
      req.user!.id
    );

    res.status(201).json({
      success: true,
      data: log,
      message: 'Symptom log created successfully',
    });
  } catch (error) {
    logControllerError('createSymptomLog', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create symptom log',
    });
  }
};

/**
 * Get symptom logs with filtering and pagination
 */
export const getSymptomLogs = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate, symptomType, minSeverity, maxSeverity, page, limit } = req.query;

    const filters: any = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      symptomType: symptomType as string | undefined,
      minSeverity: minSeverity ? parseInt(minSeverity as string) : undefined,
      maxSeverity: maxSeverity ? parseInt(maxSeverity as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    };

    const result = await symptomTrackingService.getSymptomLogs(clientId, filters);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error) {
    logControllerError('getSymptomLogs', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch symptom logs',
    });
  }
};

/**
 * Get a single symptom log by ID
 */
export const getSymptomLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await symptomTrackingService.getSymptomLogById(id);

    res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error) {
    logControllerError('getSymptomLogById', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch symptom log',
    });
  }
};

/**
 * Update a symptom log
 */
export const updateSymptomLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const log = await symptomTrackingService.updateSymptomLog(
      id,
      data,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      data: log,
      message: 'Symptom log updated successfully',
    });
  } catch (error) {
    logControllerError('updateSymptomLog', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update symptom log',
    });
  }
};

/**
 * Delete a symptom log
 */
export const deleteSymptomLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await symptomTrackingService.deleteSymptomLog(id, req.user!.id);

    res.status(200).json(result);
  } catch (error) {
    logControllerError('deleteSymptomLog', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete symptom log',
    });
  }
};

/**
 * Get symptom trends
 */
export const getSymptomTrends = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };

    const trends = await symptomTrackingService.getSymptomTrends(clientId, dateRange);

    res.status(200).json({
      success: true,
      data: trends,
    });
  } catch (error) {
    logControllerError('getSymptomTrends', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch symptom trends',
    });
  }
};

/**
 * Get symptom summary
 */
export const getSymptomSummary = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('Start date and end date are required');
    }

    const dateRange = {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    };

    const summary = await symptomTrackingService.getSymptomSummary(clientId, dateRange);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logControllerError('getSymptomSummary', error, { params: req.params });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch symptom summary',
    });
  }
};
