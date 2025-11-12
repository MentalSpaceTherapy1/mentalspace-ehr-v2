import prisma from './database';
import logger from '../utils/logger';

export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  userId?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

class AuditLogService {
  /**
   * Create an audit log entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Check if AuditLog table exists, if not we'll just log to console
      const tableExists = await this.checkAuditTableExists();

      if (!tableExists) {
        logger.warn('AuditLog table does not exist, logging to console only');
        logger.info('Audit log entry:', entry);
        return;
      }

      await prisma.$executeRaw`
        INSERT INTO "AuditLog" (
          "id",
          "userId",
          "action",
          "resource",
          "resourceId",
          "metadata",
          "ipAddress",
          "userAgent",
          "createdAt"
        ) VALUES (
          gen_random_uuid(),
          ${entry.userId},
          ${entry.action},
          ${entry.resource},
          ${entry.resourceId},
          ${entry.metadata ? JSON.stringify(entry.metadata) : null}::jsonb,
          ${entry.ipAddress || null},
          ${entry.userAgent || null},
          NOW()
        )
      `;

      logger.info('Audit log created', {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
      });
    } catch (error) {
      // Don't fail the operation if audit logging fails
      logger.error('Error creating audit log:', error);
      logger.info('Audit log entry (fallback):', entry);
    }
  }

  /**
   * Log guardian access to minor records
   */
  async logGuardianAccess(
    guardianId: string,
    minorId: string,
    relationshipId: string,
    action: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId: guardianId,
      action,
      resource: 'GuardianAccess',
      resourceId: minorId,
      metadata: {
        relationshipId,
        ...details,
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log document access
   */
  async logDocumentAccess(
    userId: string,
    documentId: string,
    action: 'VIEW' | 'DOWNLOAD' | 'UPLOAD',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'Document',
      resourceId: documentId,
      metadata,
    });
  }

  /**
   * Log relationship verification events
   */
  async logRelationshipVerification(
    adminId: string,
    relationshipId: string,
    action: 'VERIFY' | 'REJECT' | 'REVOKE',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId: adminId,
      action,
      resource: 'GuardianRelationship',
      resourceId: relationshipId,
      metadata,
    });
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters: AuditLogFilters) {
    try {
      const tableExists = await this.checkAuditTableExists();

      if (!tableExists) {
        logger.warn('AuditLog table does not exist');
        return {
          logs: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        };
      }

      const {
        userId,
        resource,
        resourceId,
        action,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      } = filters;

      // Build where clause dynamically
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (userId) {
        conditions.push(`"userId" = $${paramIndex++}`);
        params.push(userId);
      }

      if (resource) {
        conditions.push(`"resource" = $${paramIndex++}`);
        params.push(resource);
      }

      if (resourceId) {
        conditions.push(`"resourceId" = $${paramIndex++}`);
        params.push(resourceId);
      }

      if (action) {
        conditions.push(`"action" = $${paramIndex++}`);
        params.push(action);
      }

      if (startDate) {
        conditions.push(`"createdAt" >= $${paramIndex++}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`"createdAt" <= $${paramIndex++}`);
        params.push(endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as count
        FROM "AuditLog"
        ${whereClause}
      `;

      const countResult: any = await prisma.$queryRawUnsafe(countQuery, ...params);
      const total = parseInt(countResult[0]?.count || '0', 10);

      // Get paginated logs
      const offset = (page - 1) * limit;
      const logsQuery = `
        SELECT *
        FROM "AuditLog"
        ${whereClause}
        ORDER BY "createdAt" DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const logs = await prisma.$queryRawUnsafe(logsQuery, ...params, limit, offset);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * Get guardian access history for a minor
   */
  async getGuardianAccessHistory(minorId: string, page = 1, limit = 50) {
    return this.getAuditLogs({
      resource: 'GuardianAccess',
      resourceId: minorId,
      page,
      limit,
    });
  }

  /**
   * Get access history for a specific guardian
   */
  async getAccessHistoryByGuardian(guardianId: string, page = 1, limit = 50) {
    return this.getAuditLogs({
      userId: guardianId,
      resource: 'GuardianAccess',
      page,
      limit,
    });
  }

  /**
   * Check if AuditLog table exists
   */
  private async checkAuditTableExists(): Promise<boolean> {
    try {
      const result: any = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'AuditLog'
        ) as exists
      `;

      return result[0]?.exists || false;
    } catch (error) {
      logger.error('Error checking AuditLog table existence:', error);
      return false;
    }
  }

  /**
   * Create AuditLog table if it doesn't exist
   */
  async ensureAuditTable(): Promise<void> {
    try {
      const exists = await this.checkAuditTableExists();

      if (!exists) {
        logger.info('Creating AuditLog table...');

        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "AuditLog" (
            "id" TEXT PRIMARY KEY,
            "userId" TEXT NOT NULL,
            "action" TEXT NOT NULL,
            "resource" TEXT NOT NULL,
            "resourceId" TEXT NOT NULL,
            "metadata" JSONB,
            "ipAddress" TEXT,
            "userAgent" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `;

        // Create indexes
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId")
        `;

        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "AuditLog_resource_resourceId_idx"
          ON "AuditLog"("resource", "resourceId")
        `;

        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt")
        `;

        logger.info('AuditLog table created successfully');
      }
    } catch (error) {
      logger.error('Error creating AuditLog table:', error);
      throw error;
    }
  }

  /**
   * Export audit logs for compliance (CSV format)
   */
  async exportAuditLogs(filters: AuditLogFilters): Promise<string> {
    try {
      const result = await this.getAuditLogs({ ...filters, limit: 10000 });
      const logs: any[] = result.logs;

      if (logs.length === 0) {
        return 'No audit logs found for the specified filters';
      }

      // Create CSV header
      const headers = ['ID', 'User ID', 'Action', 'Resource', 'Resource ID', 'Metadata', 'IP Address', 'User Agent', 'Created At'];
      let csv = headers.join(',') + '\n';

      // Add rows
      logs.forEach((log) => {
        const row = [
          log.id,
          log.userId,
          log.action,
          log.resource,
          log.resourceId,
          JSON.stringify(log.metadata || {}),
          log.ipAddress || '',
          log.userAgent || '',
          log.createdAt,
        ];

        csv += row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
      });

      return csv;
    } catch (error) {
      logger.error('Error exporting audit logs:', error);
      throw error;
    }
  }
}

export default new AuditLogService();
