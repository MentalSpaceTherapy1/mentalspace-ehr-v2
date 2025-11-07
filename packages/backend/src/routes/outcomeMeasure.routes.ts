import express from 'express';
import {
  getQuestionnaireDefinition,
  administerOutcomeMeasure,
  getClientOutcomeMeasures,
  getOutcomeMeasureById,
  getProgressData,
  getClientStatistics,
  updateClinicalNotes,
  linkToClinicalNote,
  deleteOutcomeMeasure,
} from '../controllers/outcomeMeasure.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * Outcome Measure Routes
 * Base path: /api/v1/outcome-measures
 *
 * Phase 2.3: Outcome Measures Integration
 */

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/outcome-measures/questionnaire/:type
 * Get questionnaire definition (PHQ9, GAD7, or PCL5)
 *
 * Response:
 * {
 *   success: true,
 *   message: string,
 *   data: {
 *     type: 'PHQ9' | 'GAD7' | 'PCL5',
 *     name: string,
 *     description: string,
 *     questions: Array<{ id: string, text: string }>,
 *     scoringInfo: {
 *       minScore: number,
 *       maxScore: number,
 *       severityRanges: Array<{ min: number, max: number, severity: string, label: string }>
 *     }
 *   }
 * }
 */
router.get('/questionnaire/:type', getQuestionnaireDefinition);

/**
 * POST /api/v1/outcome-measures/administer
 * Administer an outcome measure to a client
 *
 * Request body:
 * {
 *   clientId: string (required)
 *   measureType: 'PHQ9' | 'GAD7' | 'PCL5' (required)
 *   responses: Record<string, number> (required) - e.g., { "q1": 2, "q2": 1, ... }
 *   clinicalNoteId?: string (optional) - Link to clinical note
 *   appointmentId?: string (optional) - Link to appointment
 *   clinicalNotes?: string (optional) - Clinician's interpretation
 *   completionTime?: number (optional) - Time to complete in seconds
 * }
 *
 * Response:
 * {
 *   success: true,
 *   message: string,
 *   data: {
 *     id: string,
 *     clientId: string,
 *     measureType: string,
 *     totalScore: number,
 *     severity: string,
 *     severityLabel: string,
 *     administeredDate: Date,
 *     responses: Record<string, number>,
 *     client: { id, firstName, lastName, medicalRecordNumber },
 *     administeredBy: { id, firstName, lastName, title }
 *   }
 * }
 */
router.post('/administer', administerOutcomeMeasure);

/**
 * GET /api/v1/outcome-measures/client/:clientId
 * Get all outcome measures for a client
 *
 * Query params:
 * - measureType?: 'PHQ9' | 'GAD7' | 'PCL5' (optional) - Filter by measure type
 * - startDate?: ISO date string (optional) - Filter by start date
 * - endDate?: ISO date string (optional) - Filter by end date
 * - limit?: number (optional) - Limit number of results (default: 50)
 *
 * Response:
 * {
 *   success: true,
 *   message: string,
 *   data: {
 *     clientId: string,
 *     count: number,
 *     measures: OutcomeMeasure[]
 *   }
 * }
 */
router.get('/client/:clientId', getClientOutcomeMeasures);

/**
 * GET /api/v1/outcome-measures/progress/:clientId/:measureType
 * Get progress data for graphing a specific measure type
 *
 * Query params:
 * - startDate?: ISO date string (optional)
 * - endDate?: ISO date string (optional)
 *
 * Response:
 * {
 *   success: true,
 *   message: string,
 *   data: {
 *     measureType: string,
 *     dataPoints: Array<{
 *       id: string,
 *       date: Date,
 *       score: number,
 *       severity: string,
 *       severityLabel: string
 *     }>
 *   }
 * }
 */
router.get('/progress/:clientId/:measureType', getProgressData);

/**
 * GET /api/v1/outcome-measures/statistics/:clientId
 * Get statistical summary of all outcome measures for a client
 *
 * Response:
 * {
 *   success: true,
 *   message: string,
 *   data: {
 *     clientId: string,
 *     statistics: {
 *       PHQ9?: {
 *         totalAdministered: number,
 *         latestScore: number,
 *         latestDate: Date,
 *         firstScore: number,
 *         firstDate: Date,
 *         averageScore: number,
 *         minScore: number,
 *         maxScore: number,
 *         trend: number // Negative = improvement
 *       },
 *       GAD7?: { ... },
 *       PCL5?: { ... }
 *     }
 *   }
 * }
 */
router.get('/statistics/:clientId', getClientStatistics);

/**
 * GET /api/v1/outcome-measures/:id
 * Get outcome measure by ID
 *
 * Response:
 * {
 *   success: true,
 *   message: string,
 *   data: OutcomeMeasure (with client, administeredBy, clinicalNote, appointment)
 * }
 */
router.get('/:id', getOutcomeMeasureById);

/**
 * PATCH /api/v1/outcome-measures/:id/clinical-notes
 * Update clinician's notes/interpretation for an outcome measure
 *
 * Request body:
 * {
 *   clinicalNotes: string (required)
 * }
 */
router.patch('/:id/clinical-notes', updateClinicalNotes);

/**
 * PATCH /api/v1/outcome-measures/:id/link-note
 * Link outcome measure to a clinical note
 *
 * Request body:
 * {
 *   clinicalNoteId: string (required)
 * }
 */
router.patch('/:id/link-note', linkToClinicalNote);

/**
 * DELETE /api/v1/outcome-measures/:id
 * Delete an outcome measure
 *
 * Response:
 * {
 *   success: true,
 *   message: 'Outcome measure deleted successfully'
 * }
 */
router.delete('/:id', deleteOutcomeMeasure);

export default router;
