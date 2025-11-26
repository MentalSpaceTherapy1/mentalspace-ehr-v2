/**
 * Vendor & Financial Monitoring Cron Job
 *
 * Scheduled tasks for monitoring vendor contracts, insurance expiration,
 * budget utilization alerts, overdue purchase orders, and financial health.
 *
 * Schedule: Daily at 8:00 AM
 *
 * @module jobs/vendor-financial-monitoring
 */

import * as vendorService from '../services/vendor.service';
import * as budgetService from '../services/budget.service';
import * as poService from '../services/purchase-order.service';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Main monitoring job function
 */
export async function monitorVendorFinancial(): Promise<void> {
  logger.info('Starting vendor & financial monitoring job');

  try {
    await Promise.all([
      checkVendorContractsExpiringSoon(),
      checkVendorInsuranceExpiringSoon(),
      checkExpiredVendorContracts(),
      checkExpiredVendorInsurance(),
      checkBudgetUtilization(),
      checkOverduePurchaseOrders(),
      checkPendingApprovals(),
    ]);

    logger.info('Vendor & financial monitoring job completed successfully');
  } catch (error) {
    logger.error('Error during vendor & financial monitoring job', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}

/**
 * Check for vendor contracts expiring within 90 days
 */
async function checkVendorContractsExpiringSoon(): Promise<void> {
  try {
    const vendorsRequiringAttention = await vendorService.getVendorsRequiringAttention();
    const { contractsExpiringSoon } = vendorsRequiringAttention;

    if (contractsExpiringSoon.length > 0) {
      const vendorDetails = contractsExpiringSoon.map(vendor => {
        const daysUntilExpiration = vendor.contractEnd
          ? Math.ceil(
              (vendor.contractEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;
        return {
          companyName: vendor.companyName,
          daysUntilExpiration,
          contractEnd: vendor.contractEnd?.toISOString().split('T')[0]
        };
      });

      logger.warn('Vendor contracts expiring within 90 days', {
        count: contractsExpiringSoon.length,
        vendors: vendorDetails
      });

      // TODO: Send email notification to procurement team
      // await sendContractExpirationAlert(vendor, daysUntilExpiration);
    } else {
      logger.info('No vendor contracts expiring soon');
    }
  } catch (error) {
    logger.error('Error checking contracts expiring soon', { error: error instanceof Error ? error.message : error });
  }
}

/**
 * Check for vendor insurance expiring within 30 days
 */
async function checkVendorInsuranceExpiringSoon(): Promise<void> {
  try {
    const vendorsRequiringAttention = await vendorService.getVendorsRequiringAttention();
    const { insuranceExpiringSoon } = vendorsRequiringAttention;

    if (insuranceExpiringSoon.length > 0) {
      const vendorDetails = insuranceExpiringSoon.map(vendor => {
        const daysUntilExpiration = vendor.insuranceExpiration
          ? Math.ceil(
              (vendor.insuranceExpiration.getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;
        return {
          companyName: vendor.companyName,
          daysUntilExpiration,
          insuranceExpiration: vendor.insuranceExpiration?.toISOString().split('T')[0]
        };
      });

      logger.warn('Vendor insurance expiring within 30 days', {
        count: insuranceExpiringSoon.length,
        vendors: vendorDetails
      });

      // TODO: Send email notification to risk management
      // await sendInsuranceExpirationAlert(vendor, daysUntilExpiration);
    } else {
      logger.info('No vendor insurance certificates expiring soon');
    }
  } catch (error) {
    logger.error('Error checking insurance expiring soon', { error: error instanceof Error ? error.message : error });
  }
}

/**
 * Check for expired vendor contracts
 */
async function checkExpiredVendorContracts(): Promise<void> {
  try {
    const vendorsRequiringAttention = await vendorService.getVendorsRequiringAttention();
    const { expiredContracts } = vendorsRequiringAttention;

    if (expiredContracts.length > 0) {
      const vendorDetails = expiredContracts.map(vendor => {
        const daysExpired = vendor.contractEnd
          ? Math.ceil(
              (new Date().getTime() - vendor.contractEnd.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;
        return {
          companyName: vendor.companyName,
          daysExpired,
          contractEnd: vendor.contractEnd?.toISOString().split('T')[0]
        };
      });

      logger.error('Expired vendor contracts', {
        count: expiredContracts.length,
        vendors: vendorDetails
      });

      // TODO: Send urgent notification to procurement team
      // await sendExpiredContractAlert(vendor, daysExpired);
    } else {
      logger.info('No expired vendor contracts');
    }
  } catch (error) {
    logger.error('Error checking expired contracts', { error: error instanceof Error ? error.message : error });
  }
}

/**
 * Check for expired vendor insurance
 */
async function checkExpiredVendorInsurance(): Promise<void> {
  try {
    const vendorsRequiringAttention = await vendorService.getVendorsRequiringAttention();
    const { expiredInsurance } = vendorsRequiringAttention;

    if (expiredInsurance.length > 0) {
      const vendorDetails = expiredInsurance.map(vendor => {
        const daysExpired = vendor.insuranceExpiration
          ? Math.ceil(
              (new Date().getTime() - vendor.insuranceExpiration.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;
        return {
          companyName: vendor.companyName,
          daysExpired,
          insuranceExpiration: vendor.insuranceExpiration?.toISOString().split('T')[0]
        };
      });

      logger.error('Expired vendor insurance certificates', {
        count: expiredInsurance.length,
        vendors: vendorDetails
      });

      // TODO: Send urgent notification to risk management
      // await sendExpiredInsuranceAlert(vendor, daysExpired);
    } else {
      logger.info('No expired vendor insurance certificates');
    }
  } catch (error) {
    logger.error('Error checking expired insurance', { error: error instanceof Error ? error.message : error });
  }
}

/**
 * Check budget utilization across all active budgets
 */
async function checkBudgetUtilization(): Promise<void> {
  try {
    const currentYear = new Date().getFullYear();
    const { budgets } = await budgetService.listBudgets({
      fiscalYear: currentYear,
      limit: 1000,
    });

    const warningBudgets: any[] = [];
    const criticalBudgets: any[] = [];
    const overBudgets: any[] = [];

    for (const budget of budgets) {
      const utilization = await budgetService.getBudgetUtilization(budget.id);

      if (utilization.status === 'over_budget') {
        overBudgets.push({ budget, utilization });
      } else if (utilization.status === 'critical') {
        criticalBudgets.push({ budget, utilization });
      } else if (utilization.status === 'warning') {
        warningBudgets.push({ budget, utilization });
      }
    }

    // Log over-budget alerts
    if (overBudgets.length > 0) {
      const budgetDetails = overBudgets.map(({ budget, utilization }) => ({
        name: budget.name,
        category: budget.category,
        percentSpent: utilization.percentSpent.toFixed(1),
        spentAmount: utilization.spentAmount.toFixed(2),
        allocatedAmount: utilization.allocatedAmount.toFixed(2)
      }));
      logger.error('Budgets OVER BUDGET', { count: overBudgets.length, budgets: budgetDetails });
      // TODO: Send urgent alert to budget owner and finance team
      // await sendOverBudgetAlert(budget, utilization);
    }

    // Log critical budget alerts (>90% spent)
    if (criticalBudgets.length > 0) {
      const budgetDetails = criticalBudgets.map(({ budget, utilization }) => ({
        name: budget.name,
        category: budget.category,
        percentSpent: utilization.percentSpent.toFixed(1),
        spentAmount: utilization.spentAmount.toFixed(2),
        allocatedAmount: utilization.allocatedAmount.toFixed(2)
      }));
      logger.warn('Budgets in CRITICAL status', { count: criticalBudgets.length, budgets: budgetDetails });
      // TODO: Send alert to budget owner
      // await sendCriticalBudgetAlert(budget, utilization);
    }

    // Log warning budget alerts (>80% spent)
    if (warningBudgets.length > 0) {
      const budgetDetails = warningBudgets.map(({ budget, utilization }) => ({
        name: budget.name,
        category: budget.category,
        percentSpent: utilization.percentSpent.toFixed(1),
        spentAmount: utilization.spentAmount.toFixed(2),
        allocatedAmount: utilization.allocatedAmount.toFixed(2)
      }));
      logger.warn('Budgets in WARNING status', { count: warningBudgets.length, budgets: budgetDetails });
    }

    if (
      overBudgets.length === 0 &&
      criticalBudgets.length === 0 &&
      warningBudgets.length === 0
    ) {
      logger.info('All budgets in healthy status');
    }
  } catch (error) {
    logger.error('Error checking budget utilization', { error: error instanceof Error ? error.message : error });
  }
}

/**
 * Check for overdue purchase orders
 */
async function checkOverduePurchaseOrders(): Promise<void> {
  try {
    const overduePOs = await poService.getOverduePurchaseOrders();

    if (overduePOs.length > 0) {
      const poDetails = overduePOs.map(po => {
        const daysOverdue = po.expectedDate
          ? Math.ceil(
              (new Date().getTime() - po.expectedDate.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;
        return {
          poNumber: po.poNumber,
          vendor: po.vendor.companyName,
          daysOverdue,
          expectedDate: po.expectedDate?.toISOString().split('T')[0]
        };
      });

      logger.warn('Overdue purchase orders', { count: overduePOs.length, purchaseOrders: poDetails });

      // TODO: Send notification to requester and procurement
      // await sendOverduePOAlert(po, daysOverdue);
    } else {
      logger.info('No overdue purchase orders');
    }
  } catch (error) {
    logger.error('Error checking overdue purchase orders', { error: error instanceof Error ? error.message : error });
  }
}

/**
 * Check for pending approvals (expenses and purchase orders)
 */
async function checkPendingApprovals(): Promise<void> {
  try {
    const [pendingPOs, pendingExpenses] = await Promise.all([
      poService.getPendingApprovals(),
      prisma.expense.findMany({
        where: { status: 'PENDING' },
        include: {
          submittedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (pendingPOs.length > 0) {
      const totalPOValue = pendingPOs.reduce((sum, po) => sum + Number(po.total), 0);

      // Check for old pending POs (>7 days)
      const oldPendingPOs = pendingPOs.filter((po) => {
        const daysOld = Math.ceil(
          (new Date().getTime() - po.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysOld > 7;
      });

      logger.info('Purchase orders pending approval', {
        count: pendingPOs.length,
        totalValue: totalPOValue.toFixed(2),
        pendingOver7Days: oldPendingPOs.length
      });

      if (oldPendingPOs.length > 0) {
        // TODO: Send reminder to approvers
        // await sendPendingPOReminder(oldPendingPOs);
      }
    }

    if (pendingExpenses.length > 0) {
      const totalExpenseValue = pendingExpenses.reduce(
        (sum, exp) => sum + Number(exp.totalAmount),
        0
      );

      // Check for old pending expenses (>7 days)
      const oldPendingExpenses = pendingExpenses.filter((exp) => {
        const daysOld = Math.ceil(
          (new Date().getTime() - exp.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysOld > 7;
      });

      logger.info('Expenses pending approval', {
        count: pendingExpenses.length,
        totalValue: totalExpenseValue.toFixed(2),
        pendingOver7Days: oldPendingExpenses.length
      });

      if (oldPendingExpenses.length > 0) {
        // TODO: Send reminder to approvers
        // await sendPendingExpenseReminder(oldPendingExpenses);
      }
    }

    if (pendingPOs.length === 0 && pendingExpenses.length === 0) {
      logger.info('No pending approvals');
    }
  } catch (error) {
    logger.error('Error checking pending approvals', { error: error instanceof Error ? error.message : error });
  }
}

/**
 * Schedule the monitoring job
 * Runs daily at 8:00 AM
 */
export function scheduleVendorFinancialMonitoring(): void {
  const cron = require('node-cron');

  // Run daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    logger.info('Running scheduled vendor & financial monitoring job');
    await monitorVendorFinancial();
  });

  logger.info('Vendor & financial monitoring scheduled (daily at 8:00 AM)');
}
