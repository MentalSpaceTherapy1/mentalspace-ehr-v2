import prisma from './database';
import { BadRequestError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Module 9: Staff Management - Onboarding Service
 * Manages employee onboarding checklists, task tracking, and document collection
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  description?: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  dueDate?: Date;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  documentRequired?: boolean;
  documentUrl?: string;
}

export interface CreateOnboardingChecklistDto {
  userId: string;
  startDate: Date;
  mentorId?: string;
  items?: ChecklistItem[];
}

export interface UpdateOnboardingChecklistDto {
  items?: ChecklistItem[];
  firstDayComplete?: boolean;
  firstWeekComplete?: boolean;
  thirtyDayComplete?: boolean;
  sixtyDayComplete?: boolean;
  ninetyDayComplete?: boolean;
  mentorId?: string;
  completionDate?: Date;
}

export interface UpdateChecklistItemDto {
  completed: boolean;
  completedBy?: string;
  notes?: string;
  documentUrl?: string;
}

export interface OnboardingFilters {
  mentorId?: string;
  completed?: boolean;
  page?: number;
  limit?: number;
}

// ============================================================================
// DEFAULT CHECKLIST ITEMS
// ============================================================================

/**
 * Default onboarding checklist items for new employees
 * Organized by category and priority
 */
const DEFAULT_ONBOARDING_ITEMS: Omit<ChecklistItem, 'id' | 'completed' | 'completedAt' | 'completedBy'>[] = [
  // Day 1 - Administrative Setup
  {
    category: 'Administrative',
    task: 'Complete new hire paperwork',
    description: 'W-4, I-9, direct deposit forms',
    priority: 'HIGH',
    documentRequired: true,
  },
  {
    category: 'Administrative',
    task: 'Review and sign employee handbook',
    description: 'Acknowledge receipt and understanding of policies',
    priority: 'HIGH',
    documentRequired: true,
  },
  {
    category: 'Administrative',
    task: 'Complete emergency contact form',
    description: 'Provide emergency contact information',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'Administrative',
    task: 'Submit professional licenses and credentials',
    description: 'Upload copies of licenses, certifications, and insurance',
    priority: 'HIGH',
    documentRequired: true,
  },

  // Day 1 - IT & Access
  {
    category: 'IT Setup',
    task: 'Receive work equipment',
    description: 'Computer, phone, access badge',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'IT Setup',
    task: 'Set up email and system accounts',
    description: 'Create login credentials for all systems',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'IT Setup',
    task: 'Complete EHR system training',
    description: 'Basic navigation and clinical documentation',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'IT Setup',
    task: 'Review HIPAA and data security policies',
    description: 'Understand privacy and security requirements',
    priority: 'HIGH',
    documentRequired: false,
  },

  // Week 1 - Orientation
  {
    category: 'Orientation',
    task: 'Office tour and introductions',
    description: 'Meet team members and learn office layout',
    priority: 'MEDIUM',
    documentRequired: false,
  },
  {
    category: 'Orientation',
    task: 'Review practice policies and procedures',
    description: 'Clinical protocols, scheduling, documentation standards',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'Orientation',
    task: 'Meet with supervisor for goal setting',
    description: 'Discuss expectations and performance goals',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'Orientation',
    task: 'Shadow experienced clinician',
    description: 'Observe sessions and documentation workflow',
    priority: 'MEDIUM',
    documentRequired: false,
  },

  // Week 1 - Training
  {
    category: 'Training',
    task: 'Complete mandatory compliance training',
    description: 'HIPAA, safety, harassment prevention',
    priority: 'HIGH',
    documentRequired: true,
  },
  {
    category: 'Training',
    task: 'Review crisis intervention protocols',
    description: 'Emergency procedures and safety planning',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'Training',
    task: 'Learn scheduling and calendar management',
    description: 'Appointment booking, cancellations, waitlist',
    priority: 'MEDIUM',
    documentRequired: false,
  },
  {
    category: 'Training',
    task: 'Review billing and insurance procedures',
    description: 'Session notes, diagnosis codes, authorization',
    priority: 'MEDIUM',
    documentRequired: false,
  },

  // 30 Days - Clinical Integration
  {
    category: 'Clinical',
    task: 'Complete first client session',
    description: 'Conduct initial assessment with supervision',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'Clinical',
    task: 'Submit first clinical note for review',
    description: 'Complete documentation within required timeframe',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'Clinical',
    task: 'Attend first supervision session',
    description: 'Discuss cases and receive feedback',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'Clinical',
    task: 'Join team meeting or case consultation',
    description: 'Participate in clinical discussions',
    priority: 'MEDIUM',
    documentRequired: false,
  },

  // 60 Days - Professional Development
  {
    category: 'Professional Development',
    task: '60-day performance review',
    description: 'Meet with supervisor to review progress',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'Professional Development',
    task: 'Identify continuing education opportunities',
    description: 'Plan for professional development and CEUs',
    priority: 'MEDIUM',
    documentRequired: false,
  },
  {
    category: 'Professional Development',
    task: 'Review and update professional profile',
    description: 'Client-facing bio and treatment approach',
    priority: 'MEDIUM',
    documentRequired: false,
  },

  // 90 Days - Full Integration
  {
    category: 'Milestone',
    task: '90-day comprehensive review',
    description: 'Final onboarding evaluation and feedback',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'Milestone',
    task: 'Complete full caseload transition',
    description: 'Accept new clients independently',
    priority: 'HIGH',
    documentRequired: false,
  },
  {
    category: 'Milestone',
    task: 'Set annual performance goals',
    description: 'Establish objectives for the year',
    priority: 'HIGH',
    documentRequired: false,
  },
];

// ============================================================================
// SERVICE CLASS
// ============================================================================

class OnboardingService {
  /**
   * Create a new onboarding checklist for a user
   * Automatically generates default checklist items if not provided
   */
  async createOnboardingChecklist(data: CreateOnboardingChecklistDto) {
    const { userId, startDate, mentorId, items } = data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if checklist already exists for this user
    const existingChecklist = await prisma.onboardingChecklist.findUnique({
      where: { userId },
    });

    if (existingChecklist) {
      throw new BadRequestError('Onboarding checklist already exists for this user');
    }

    // Validate mentor if provided
    if (mentorId) {
      const mentor = await prisma.user.findUnique({
        where: { id: mentorId },
      });

      if (!mentor) {
        throw new NotFoundError('Mentor user not found');
      }
    }

    // Generate checklist items
    const checklistItems: ChecklistItem[] = items || this.generateDefaultChecklistItems();

    // Create checklist
    const checklist = await prisma.onboardingChecklist.create({
      data: {
        userId,
        startDate: new Date(startDate),
        mentorId,
        items: checklistItems as any,
        completionPercentage: 0,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            department: true,
          },
        },
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Onboarding checklist created for user ${userId}`);

    return checklist;
  }

  /**
   * Get onboarding checklist by user ID
   */
  async getOnboardingChecklistByUserId(userId: string) {
    const checklist = await prisma.onboardingChecklist.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            department: true,
            hireDate: true,
          },
        },
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!checklist) {
      throw new NotFoundError('Onboarding checklist not found for this user');
    }

    return checklist;
  }

  /**
   * Get onboarding checklist by checklist ID
   */
  async getOnboardingChecklistById(checklistId: string) {
    const checklist = await prisma.onboardingChecklist.findUnique({
      where: { id: checklistId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            department: true,
            hireDate: true,
          },
        },
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!checklist) {
      throw new NotFoundError('Onboarding checklist not found');
    }

    return checklist;
  }

  /**
   * Get all onboarding checklists with filters and pagination
   */
  async getOnboardingChecklists(filters: OnboardingFilters) {
    const { mentorId, completed, page = 1, limit = 20 } = filters;

    const where: any = {};

    if (mentorId) {
      where.mentorId = mentorId;
    }

    if (completed !== undefined) {
      if (completed) {
        where.completionDate = { not: null };
      } else {
        where.completionDate = null;
      }
    }

    const total = await prisma.onboardingChecklist.count({ where });

    const checklists = await prisma.onboardingChecklist.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            department: true,
            hireDate: true,
          },
        },
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      checklists,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update onboarding checklist
   */
  async updateOnboardingChecklist(checklistId: string, data: UpdateOnboardingChecklistDto) {
    // Check if checklist exists
    const existingChecklist = await prisma.onboardingChecklist.findUnique({
      where: { id: checklistId },
    });

    if (!existingChecklist) {
      throw new NotFoundError('Onboarding checklist not found');
    }

    // Validate mentor if provided
    if (data.mentorId) {
      const mentor = await prisma.user.findUnique({
        where: { id: data.mentorId },
      });

      if (!mentor) {
        throw new NotFoundError('Mentor user not found');
      }
    }

    // Calculate completion percentage if items are updated
    let completionPercentage = existingChecklist.completionPercentage;
    if (data.items) {
      completionPercentage = this.calculateCompletionPercentage(data.items);
    }

    // Update checklist
    const updatedChecklist = await prisma.onboardingChecklist.update({
      where: { id: checklistId },
      data: {
        ...data,
        items: data.items as any,
        completionPercentage,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
            department: true,
          },
        },
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Onboarding checklist ${checklistId} updated`);

    return updatedChecklist;
  }

  /**
   * Update a specific checklist item
   */
  async updateChecklistItem(
    checklistId: string,
    itemId: string,
    data: UpdateChecklistItemDto,
    updatedBy: string
  ) {
    const checklist = await this.getOnboardingChecklistById(checklistId);

    const items = checklist.items as unknown as ChecklistItem[];
    const itemIndex = items.findIndex((item) => item.id === itemId);

    if (itemIndex === -1) {
      throw new NotFoundError('Checklist item not found');
    }

    // Update the item
    items[itemIndex] = {
      ...items[itemIndex],
      ...data,
      completedAt: data.completed ? new Date() : undefined,
      completedBy: data.completed ? updatedBy : undefined,
    };

    // Calculate new completion percentage
    const completionPercentage = this.calculateCompletionPercentage(items);

    // Check if all items are completed
    const allCompleted = items.every((item) => item.completed);
    const completionDate = allCompleted ? new Date() : null;

    // Update checklist
    const updatedChecklist = await prisma.onboardingChecklist.update({
      where: { id: checklistId },
      data: {
        items: items as any,
        completionPercentage,
        completionDate,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Checklist item ${itemId} updated in checklist ${checklistId}`);

    return updatedChecklist;
  }

  /**
   * Add a custom checklist item
   */
  async addChecklistItem(checklistId: string, item: Omit<ChecklistItem, 'id' | 'completed'>) {
    const checklist = await this.getOnboardingChecklistById(checklistId);

    const items = checklist.items as unknown as ChecklistItem[];

    // Generate new item ID
    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      ...item,
      completed: false,
    };

    items.push(newItem);

    // Calculate new completion percentage
    const completionPercentage = this.calculateCompletionPercentage(items);

    // Update checklist
    const updatedChecklist = await prisma.onboardingChecklist.update({
      where: { id: checklistId },
      data: {
        items: items as any,
        completionPercentage,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Custom item added to checklist ${checklistId}`);

    return updatedChecklist;
  }

  /**
   * Remove a checklist item
   */
  async removeChecklistItem(checklistId: string, itemId: string) {
    const checklist = await this.getOnboardingChecklistById(checklistId);

    let items = checklist.items as unknown as ChecklistItem[];
    const itemExists = items.some((item) => item.id === itemId);

    if (!itemExists) {
      throw new NotFoundError('Checklist item not found');
    }

    // Remove the item
    items = items.filter((item) => item.id !== itemId);

    // Calculate new completion percentage
    const completionPercentage = this.calculateCompletionPercentage(items);

    // Update checklist
    const updatedChecklist = await prisma.onboardingChecklist.update({
      where: { id: checklistId },
      data: {
        items: items as any,
        completionPercentage,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Item ${itemId} removed from checklist ${checklistId}`);

    return updatedChecklist;
  }

  /**
   * Delete onboarding checklist
   */
  async deleteOnboardingChecklist(checklistId: string) {
    const checklist = await prisma.onboardingChecklist.findUnique({
      where: { id: checklistId },
    });

    if (!checklist) {
      throw new NotFoundError('Onboarding checklist not found');
    }

    await prisma.onboardingChecklist.delete({
      where: { id: checklistId },
    });

    logger.info(`Onboarding checklist ${checklistId} deleted`);

    return { message: 'Onboarding checklist deleted successfully' };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Generate default checklist items with unique IDs
   */
  private generateDefaultChecklistItems(): ChecklistItem[] {
    return DEFAULT_ONBOARDING_ITEMS.map((item, index) => ({
      id: `default-${index + 1}`,
      ...item,
      completed: false,
    }));
  }

  /**
   * Calculate completion percentage based on completed items
   */
  private calculateCompletionPercentage(items: ChecklistItem[]): number {
    if (items.length === 0) return 0;

    const completedCount = items.filter((item) => item.completed).length;
    return Math.round((completedCount / items.length) * 100);
  }

  /**
   * Get onboarding statistics for a mentor
   */
  async getMentorStatistics(mentorId: string) {
    const checklists = await prisma.onboardingChecklist.findMany({
      where: { mentorId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            hireDate: true,
          },
        },
      },
    });

    const totalMentees = checklists.length;
    const completedOnboarding = checklists.filter((c) => c.completionDate !== null).length;
    const inProgress = totalMentees - completedOnboarding;

    const averageCompletion =
      totalMentees > 0
        ? Math.round(
            checklists.reduce((sum, c) => sum + c.completionPercentage, 0) / totalMentees
          )
        : 0;

    return {
      mentorId,
      totalMentees,
      completedOnboarding,
      inProgress,
      averageCompletion,
      checklists: checklists.map((c) => ({
        id: c.id,
        user: c.user,
        completionPercentage: c.completionPercentage,
        startDate: c.startDate,
        completionDate: c.completionDate,
      })),
    };
  }

  /**
   * Get overall onboarding statistics
   */
  async getOnboardingStatistics() {
    const allChecklists = await prisma.onboardingChecklist.findMany({
      select: {
        completionPercentage: true,
        completionDate: true,
        startDate: true,
      },
    });

    const total = allChecklists.length;
    const completed = allChecklists.filter((c) => c.completionDate !== null).length;
    const inProgress = total - completed;

    const averageCompletion =
      total > 0
        ? Math.round(
            allChecklists.reduce((sum, c) => sum + c.completionPercentage, 0) / total
          )
        : 0;

    return {
      total,
      completed,
      inProgress,
      averageCompletion,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}

export default new OnboardingService();
