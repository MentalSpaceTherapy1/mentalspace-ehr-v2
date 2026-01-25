import { Response } from 'express';

import logger from '../../utils/logger';
import bcrypt from 'bcryptjs';
import prisma from '../../services/database';
import { PortalRequest } from '../../types/express.d';
import { sendSuccess, sendBadRequest, sendUnauthorized, sendNotFound, sendServerError } from '../../utils/apiResponse';

/**
 * Get client profile
 * GET /api/v1/portal/profile
 */
export const getProfile = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        emergencyContacts: {
          take: 1, // Get the primary emergency contact
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      return sendNotFound(res, 'Client');
    }

    const emergencyContact = client.emergencyContacts[0];

    return sendSuccess(res, {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.primaryPhone,
      dateOfBirth: client.dateOfBirth,
      address: client.addressStreet1,
      city: client.addressCity,
      state: client.addressState,
      zipCode: client.addressZipCode,
      emergencyContactName: emergencyContact?.name,
      emergencyContactPhone: emergencyContact?.phone,
      emergencyContactRelationship: emergencyContact?.relationship,
    });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return sendServerError(res, 'Failed to fetch profile');
  }
};

/**
 * Update client profile
 * PUT /api/v1/portal/profile
 */
export const updateProfile = async (req: PortalRequest, res: Response) => {
  try {
    const clientId = req.portalAccount?.clientId;
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
    } = req.body;

    if (!clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return sendBadRequest(res, 'First name, last name, and email are required');
    }

    // Update client information
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        firstName,
        lastName,
        email,
        primaryPhone: phone,
        addressStreet1: address,
        addressCity: city,
        addressState: state,
        addressZipCode: zipCode,
      },
    });

    // Update or create emergency contact if provided
    if (emergencyContactName || emergencyContactPhone || emergencyContactRelationship) {
      // Check if emergency contact exists
      const existingContact = await prisma.emergencyContact.findFirst({
        where: { clientId },
      });

      if (existingContact) {
        await prisma.emergencyContact.update({
          where: { id: existingContact.id },
          data: {
            name: emergencyContactName,
            phone: emergencyContactPhone,
            relationship: emergencyContactRelationship,
          },
        });
      } else {
        await prisma.emergencyContact.create({
          data: {
            clientId,
            name: emergencyContactName,
            phone: emergencyContactPhone,
            relationship: emergencyContactRelationship,
            isPrimary: true,
          },
        });
      }
    }

    logger.info(`Profile updated for client ${clientId}`);

    return sendSuccess(res, updatedClient, 'Profile updated successfully');
  } catch (error) {
    logger.error('Error updating profile:', error);
    return sendServerError(res, 'Failed to update profile');
  }
};

/**
 * Get account settings (notification preferences)
 * GET /api/v1/portal/account/settings
 */
export const getAccountSettings = async (req: PortalRequest, res: Response) => {
  try {
    const portalAccountId = req.portalAccount?.id;
    const clientId = req.portalAccount?.clientId;

    if (!portalAccountId || !clientId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Get portal account info (contains notification preferences)
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { id: portalAccountId },
    });

    return sendSuccess(res, {
      id: portalAccountId,
      username: portalAccount?.email || '',
      emailNotifications: portalAccount?.emailNotifications ?? true,
      smsNotifications: portalAccount?.smsNotifications ?? false,
      appointmentReminders: portalAccount?.appointmentReminders ?? true,
      billingReminders: portalAccount?.billingReminders ?? true,
      messageNotifications: portalAccount?.messageNotifications ?? true,
    });
  } catch (error) {
    logger.error('Error fetching account settings:', error);
    return sendServerError(res, 'Failed to fetch account settings');
  }
};

/**
 * Update notification preferences
 * PUT /api/v1/portal/account/notifications
 */
export const updateNotificationPreferences = async (req: PortalRequest, res: Response) => {
  try {
    const portalAccountId = req.portalAccount?.id;
    const {
      emailNotifications,
      smsNotifications,
      appointmentReminders,
      billingReminders,
      messageNotifications,
    } = req.body;

    if (!portalAccountId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Update portal account notification preferences
    await prisma.portalAccount.update({
      where: { id: portalAccountId },
      data: {
        emailNotifications,
        smsNotifications,
        appointmentReminders,
        billingReminders,
        messageNotifications,
      },
    });

    logger.info(`Notification preferences updated for portal account ${portalAccountId}`);

    return sendSuccess(res, null, 'Notification preferences updated successfully');
  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    return sendServerError(res, 'Failed to update notification preferences');
  }
};

/**
 * Change password
 * POST /api/v1/portal/account/change-password
 */
export const changePassword = async (req: PortalRequest, res: Response) => {
  try {
    const portalAccountId = req.portalAccount?.id;
    const { currentPassword, newPassword } = req.body;

    if (!portalAccountId) {
      return sendUnauthorized(res, 'Unauthorized');
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      return sendBadRequest(res, 'Current password and new password are required');
    }

    if (newPassword.length < 8) {
      return sendBadRequest(res, 'Password must be at least 8 characters long');
    }

    // Get portal account
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { id: portalAccountId },
    });

    if (!portalAccount) {
      return sendNotFound(res, 'Account');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, portalAccount.password);

    if (!isPasswordValid) {
      return sendBadRequest(res, 'Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.portalAccount.update({
      where: { id: portalAccountId },
      data: {
        password: hashedPassword,
      },
    });

    logger.info(`Password changed for portal account ${portalAccountId}`);

    return sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    logger.error('Error changing password:', error);
    return sendServerError(res, 'Failed to change password');
  }
};
