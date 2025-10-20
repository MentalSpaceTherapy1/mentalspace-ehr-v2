import { Request, Response } from 'express';

import logger from '../../utils/logger';
import bcrypt from 'bcryptjs';
import prisma from '../../services/database';

/**
 * Get client profile
 * GET /api/v1/portal/profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;

    if (!clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
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
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    const emergencyContact = client.emergencyContacts[0];

    return res.status(200).json({
      success: true,
      data: {
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
      },
    });
  } catch (error: any) {
    logger.error('Error fetching profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
};

/**
 * Update client profile
 * PUT /api/v1/portal/profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).portalAccount?.clientId;
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
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, and email are required',
      });
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

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedClient,
    });
  } catch (error: any) {
    logger.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

/**
 * Get account settings (notification preferences)
 * GET /api/v1/portal/account/settings
 */
export const getAccountSettings = async (req: Request, res: Response) => {
  try {
    const portalAccountId = (req as any).portalAccount?.id;
    const clientId = (req as any).portalAccount?.clientId;

    if (!portalAccountId || !clientId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Get portal account info (contains notification preferences)
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { id: portalAccountId },
    });

    return res.status(200).json({
      success: true,
      data: {
        id: portalAccountId,
        username: portalAccount?.email || '',
        emailNotifications: portalAccount?.emailNotifications ?? true,
        smsNotifications: portalAccount?.smsNotifications ?? false,
        appointmentReminders: portalAccount?.appointmentReminders ?? true,
        billingReminders: portalAccount?.billingReminders ?? true,
        messageNotifications: portalAccount?.messageNotifications ?? true,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching account settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch account settings',
    });
  }
};

/**
 * Update notification preferences
 * PUT /api/v1/portal/account/notifications
 */
export const updateNotificationPreferences = async (req: Request, res: Response) => {
  try {
    const portalAccountId = (req as any).portalAccount?.id;
    const {
      emailNotifications,
      smsNotifications,
      appointmentReminders,
      billingReminders,
      messageNotifications,
    } = req.body;

    if (!portalAccountId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
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

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
    });
  } catch (error: any) {
    logger.error('Error updating notification preferences:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
    });
  }
};

/**
 * Change password
 * POST /api/v1/portal/account/change-password
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const portalAccountId = (req as any).portalAccount?.id;
    const { currentPassword, newPassword } = req.body;

    if (!portalAccountId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long',
      });
    }

    // Get portal account
    const portalAccount = await prisma.portalAccount.findUnique({
      where: { id: portalAccountId },
    });

    if (!portalAccount) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, portalAccount.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
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

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    logger.error('Error changing password:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
};
