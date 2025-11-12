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

const prisma = new PrismaClient();

/**
 * Main monitoring job function
 */
export async function monitorVendorFinancial(): Promise<void> {
  console.log('[VENDOR-FINANCIAL-MONITOR] Starting vendor & financial monitoring job...');

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

    console.log('[VENDOR-FINANCIAL-MONITOR] Monitoring job completed successfully');
  } catch (error) {
    console.error('[VENDOR-FINANCIAL-MONITOR] Error during monitoring job:', error);
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
      console.log(
        `[VENDOR-MONITOR] ${contractsExpiringSoon.length} vendor contract(s) expiring within 90 days:`
      );

      for (const vendor of contractsExpiringSoon) {
        const daysUntilExpiration = vendor.contractEnd
          ? Math.ceil(
              (vendor.contractEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        console.log(
          `  - ${vendor.companyName}: Expires in ${daysUntilExpiration} days (${vendor.contractEnd?.toISOString().split('T')[0]})`
        );

        // TODO: Send email notification to procurement team
        // await sendContractExpirationAlert(vendor, daysUntilExpiration);
      }
    } else {
      console.log('[VENDOR-MONITOR] No vendor contracts expiring soon');
    }
  } catch (error) {
    console.error('[VENDOR-MONITOR] Error checking contracts expiring soon:', error);
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
      console.log(
        `[VENDOR-MONITOR] ${insuranceExpiringSoon.length} vendor insurance certificate(s) expiring within 30 days:`
      );

      for (const vendor of insuranceExpiringSoon) {
        const daysUntilExpiration = vendor.insuranceExpiration
          ? Math.ceil(
              (vendor.insuranceExpiration.getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;

        console.log(
          `  - ${vendor.companyName}: Insurance expires in ${daysUntilExpiration} days (${vendor.insuranceExpiration?.toISOString().split('T')[0]})`
        );

        // TODO: Send email notification to risk management
        // await sendInsuranceExpirationAlert(vendor, daysUntilExpiration);
      }
    } else {
      console.log('[VENDOR-MONITOR] No vendor insurance certificates expiring soon');
    }
  } catch (error) {
    console.error('[VENDOR-MONITOR] Error checking insurance expiring soon:', error);
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
      console.log(`[VENDOR-MONITOR] ${expiredContracts.length} vendor contract(s) EXPIRED:`);

      for (const vendor of expiredContracts) {
        const daysExpired = vendor.contractEnd
          ? Math.ceil(
              (new Date().getTime() - vendor.contractEnd.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        console.log(
          `  - ${vendor.companyName}: Expired ${daysExpired} days ago (${vendor.contractEnd?.toISOString().split('T')[0]})`
        );

        // TODO: Send urgent notification to procurement team
        // await sendExpiredContractAlert(vendor, daysExpired);
      }
    } else {
      console.log('[VENDOR-MONITOR] No expired vendor contracts');
    }
  } catch (error) {
    console.error('[VENDOR-MONITOR] Error checking expired contracts:', error);
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
      console.log(
        `[VENDOR-MONITOR] ${expiredInsurance.length} vendor insurance certificate(s) EXPIRED:`
      );

      for (const vendor of expiredInsurance) {
        const daysExpired = vendor.insuranceExpiration
          ? Math.ceil(
              (new Date().getTime() - vendor.insuranceExpiration.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;

        console.log(
          `  - ${vendor.companyName}: Insurance expired ${daysExpired} days ago (${vendor.insuranceExpiration?.toISOString().split('T')[0]})`
        );

        // TODO: Send urgent notification to risk management
        // await sendExpiredInsuranceAlert(vendor, daysExpired);
      }
    } else {
      console.log('[VENDOR-MONITOR] No expired vendor insurance certificates');
    }
  } catch (error) {
    console.error('[VENDOR-MONITOR] Error checking expired insurance:', error);
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
      console.log(`[BUDGET-MONITOR] ${overBudgets.length} budget(s) OVER BUDGET:`);
      for (const { budget, utilization } of overBudgets) {
        console.log(
          `  - ${budget.name} (${budget.category}): ${utilization.percentSpent.toFixed(1)}% spent ($${utilization.spentAmount.toFixed(2)} / $${utilization.allocatedAmount.toFixed(2)})`
        );
        // TODO: Send urgent alert to budget owner and finance team
        // await sendOverBudgetAlert(budget, utilization);
      }
    }

    // Log critical budget alerts (>90% spent)
    if (criticalBudgets.length > 0) {
      console.log(`[BUDGET-MONITOR] ${criticalBudgets.length} budget(s) in CRITICAL status:`);
      for (const { budget, utilization } of criticalBudgets) {
        console.log(
          `  - ${budget.name} (${budget.category}): ${utilization.percentSpent.toFixed(1)}% spent ($${utilization.spentAmount.toFixed(2)} / $${utilization.allocatedAmount.toFixed(2)})`
        );
        // TODO: Send alert to budget owner
        // await sendCriticalBudgetAlert(budget, utilization);
      }
    }

    // Log warning budget alerts (>80% spent)
    if (warningBudgets.length > 0) {
      console.log(`[BUDGET-MONITOR] ${warningBudgets.length} budget(s) in WARNING status:`);
      for (const { budget, utilization } of warningBudgets) {
        console.log(
          `  - ${budget.name} (${budget.category}): ${utilization.percentSpent.toFixed(1)}% spent ($${utilization.spentAmount.toFixed(2)} / $${utilization.allocatedAmount.toFixed(2)})`
        );
      }
    }

    if (
      overBudgets.length === 0 &&
      criticalBudgets.length === 0 &&
      warningBudgets.length === 0
    ) {
      console.log('[BUDGET-MONITOR] All budgets in healthy status');
    }
  } catch (error) {
    console.error('[BUDGET-MONITOR] Error checking budget utilization:', error);
  }
}

/**
 * Check for overdue purchase orders
 */
async function checkOverduePurchaseOrders(): Promise<void> {
  try {
    const overduePOs = await poService.getOverduePurchaseOrders();

    if (overduePOs.length > 0) {
      console.log(`[PO-MONITOR] ${overduePOs.length} purchase order(s) OVERDUE:`);

      for (const po of overduePOs) {
        const daysOverdue = po.expectedDate
          ? Math.ceil(
              (new Date().getTime() - po.expectedDate.getTime()) / (1000 * 60 * 60 * 24)
            )
          : 0;

        console.log(
          `  - PO ${po.poNumber} (${po.vendor.companyName}): ${daysOverdue} days overdue (Expected: ${po.expectedDate?.toISOString().split('T')[0]})`
        );

        // TODO: Send notification to requester and procurement
        // await sendOverduePOAlert(po, daysOverdue);
      }
    } else {
      console.log('[PO-MONITOR] No overdue purchase orders');
    }
  } catch (error) {
    console.error('[PO-MONITOR] Error checking overdue purchase orders:', error);
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
      console.log(`[APPROVAL-MONITOR] ${pendingPOs.length} purchase order(s) pending approval`);

      const totalPOValue = pendingPOs.reduce((sum, po) => sum + Number(po.total), 0);
      console.log(`  Total pending PO value: $${totalPOValue.toFixed(2)}`);

      // Check for old pending POs (>7 days)
      const oldPendingPOs = pendingPOs.filter((po) => {
        const daysOld = Math.ceil(
          (new Date().getTime() - po.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysOld > 7;
      });

      if (oldPendingPOs.length > 0) {
        console.log(`  - ${oldPendingPOs.length} PO(s) pending for >7 days`);
        // TODO: Send reminder to approvers
        // await sendPendingPOReminder(oldPendingPOs);
      }
    }

    if (pendingExpenses.length > 0) {
      console.log(`[APPROVAL-MONITOR] ${pendingExpenses.length} expense(s) pending approval`);

      const totalExpenseValue = pendingExpenses.reduce(
        (sum, exp) => sum + Number(exp.totalAmount),
        0
      );
      console.log(`  Total pending expense value: $${totalExpenseValue.toFixed(2)}`);

      // Check for old pending expenses (>7 days)
      const oldPendingExpenses = pendingExpenses.filter((exp) => {
        const daysOld = Math.ceil(
          (new Date().getTime() - exp.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysOld > 7;
      });

      if (oldPendingExpenses.length > 0) {
        console.log(`  - ${oldPendingExpenses.length} expense(s) pending for >7 days`);
        // TODO: Send reminder to approvers
        // await sendPendingExpenseReminder(oldPendingExpenses);
      }
    }

    if (pendingPOs.length === 0 && pendingExpenses.length === 0) {
      console.log('[APPROVAL-MONITOR] No pending approvals');
    }
  } catch (error) {
    console.error('[APPROVAL-MONITOR] Error checking pending approvals:', error);
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
    console.log('[VENDOR-FINANCIAL-MONITOR] Running scheduled monitoring job');
    await monitorVendorFinancial();
  });

  console.log('[VENDOR-FINANCIAL-MONITOR] Scheduled to run daily at 8:00 AM');
}
