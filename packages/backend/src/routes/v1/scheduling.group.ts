/**
 * Scheduling & Calendar Route Group
 * Module 3: Appointments, Waitlist, Availability, AI Scheduling
 */
import { Router } from 'express';
import appointmentRoutes from '../appointment.routes';
import appointmentTypeRoutes from '../appointmentType.routes';
import groupSessionRoutes from '../groupSession.routes';
import clinicianScheduleRoutes from '../clinicianSchedule.routes';
import availabilityRoutes from '../availability.routes';
import timeOffRoutes from '../timeOff.routes';
import waitlistRoutes from '../waitlist.routes';
import waitlistMatchingRoutes from '../waitlistMatching.routes';
import selfSchedulingRoutes from '../self-scheduling.routes';
import schedulingRulesRoutes from '../scheduling-rules.routes';
import aiSchedulingRoutes from '../aiScheduling.routes';
import reminderRoutes from '../reminder.routes';

const router = Router();

// Core appointments
router.use('/appointments', appointmentRoutes);
router.use('/appointment-types', appointmentTypeRoutes);
router.use('/group-sessions', groupSessionRoutes);

// Clinician schedules and availability
router.use('/clinician-schedules', clinicianScheduleRoutes);
router.use('/provider-availability', availabilityRoutes);
router.use('/time-off', timeOffRoutes);

// Waitlist management
router.use('/waitlist', waitlistRoutes);
router.use('/waitlist-matching', waitlistMatchingRoutes);

// Self-scheduling (Module 7)
router.use('/self-schedule', selfSchedulingRoutes);
router.use('/scheduling-rules', schedulingRulesRoutes);

// AI-powered scheduling
router.use('/ai-scheduling', aiSchedulingRoutes);

// Appointment reminders
router.use('/reminders', reminderRoutes);

export default router;
