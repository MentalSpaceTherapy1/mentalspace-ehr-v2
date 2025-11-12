import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface QueryField {
  source: string;
  field: string;
  alias?: string;
}

export interface QueryFilter {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'BETWEEN' | 'IS_NULL' | 'IS_NOT_NULL';
  values?: any[];
}

export interface QueryAggregation {
  field: string;
  function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
  alias: string;
}

export interface QuerySort {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface QueryConfig {
  dataSources: string[];
  fields: QueryField[];
  filters?: QueryFilter[];
  groupBy?: string[];
  aggregations?: QueryAggregation[];
  orderBy?: QuerySort[];
  limit?: number;
  offset?: number;
}

// ============================================================================
// DATA SOURCE METADATA
// ============================================================================

interface FieldMetadata {
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  isArray?: boolean;
  enumValues?: string[];
}

interface RelationMetadata {
  model: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one';
  foreignKey?: string;
}

interface DataSourceMetadata {
  fields: Record<string, FieldMetadata>;
  relations: Record<string, RelationMetadata>;
}

const DATA_SOURCE_METADATA: Record<string, DataSourceMetadata> = {
  Client: {
    fields: {
      id: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      dateOfBirth: { type: 'date' },
      status: { type: 'enum', enumValues: ['ACTIVE', 'INACTIVE', 'DISCHARGED'] },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' }
    },
    relations: {
      appointments: { model: 'Appointment', type: 'one-to-many' },
      clinicalNotes: { model: 'ClinicalNote', type: 'one-to-many' },
      charges: { model: 'Charge', type: 'one-to-many' },
      insurance: { model: 'Insurance', type: 'one-to-many' }
    }
  },
  Appointment: {
    fields: {
      id: { type: 'string' },
      clientId: { type: 'string' },
      clinicianId: { type: 'string' },
      appointmentDate: { type: 'date' },
      startTime: { type: 'string' },
      endTime: { type: 'string' },
      duration: { type: 'number' },
      status: { type: 'enum', enumValues: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
      appointmentType: { type: 'string' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' }
    },
    relations: {
      client: { model: 'Client', type: 'many-to-one', foreignKey: 'clientId' },
      clinician: { model: 'User', type: 'many-to-one', foreignKey: 'clinicianId' },
      clinicalNote: { model: 'ClinicalNote', type: 'one-to-one' },
      charges: { model: 'Charge', type: 'one-to-many' }
    }
  },
  ClinicalNote: {
    fields: {
      id: { type: 'string' },
      clientId: { type: 'string' },
      clinicianId: { type: 'string' },
      appointmentId: { type: 'string' },
      noteDate: { type: 'date' },
      serviceDate: { type: 'date' },
      status: { type: 'enum', enumValues: ['DRAFT', 'LOCKED', 'SIGNED', 'AMENDED'] },
      isSigned: { type: 'boolean' },
      signedAt: { type: 'date' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' }
    },
    relations: {
      client: { model: 'Client', type: 'many-to-one', foreignKey: 'clientId' },
      clinician: { model: 'User', type: 'many-to-one', foreignKey: 'clinicianId' },
      appointment: { model: 'Appointment', type: 'one-to-one', foreignKey: 'appointmentId' }
    }
  },
  Charge: {
    fields: {
      id: { type: 'string' },
      clientId: { type: 'string' },
      appointmentId: { type: 'string' },
      serviceCodeId: { type: 'string' },
      serviceDate: { type: 'date' },
      billingStatus: { type: 'enum', enumValues: ['PENDING', 'READY', 'SUBMITTED', 'PAID', 'DENIED', 'ON_HOLD'] },
      chargeAmount: { type: 'number' },
      paidAmount: { type: 'number' },
      submittedAt: { type: 'date' },
      paidAt: { type: 'date' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' }
    },
    relations: {
      client: { model: 'Client', type: 'many-to-one', foreignKey: 'clientId' },
      appointment: { model: 'Appointment', type: 'many-to-one', foreignKey: 'appointmentId' },
      serviceCode: { model: 'ServiceCode', type: 'many-to-one', foreignKey: 'serviceCodeId' }
    }
  },
  ServiceCode: {
    fields: {
      id: { type: 'string' },
      code: { type: 'string' },
      description: { type: 'string' },
      defaultRate: { type: 'number' },
      serviceType: { type: 'string' },
      isActive: { type: 'boolean' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' }
    },
    relations: {
      charges: { model: 'Charge', type: 'one-to-many' }
    }
  },
  User: {
    fields: {
      id: { type: 'string' },
      email: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      role: { type: 'enum', enumValues: ['ADMIN', 'CLINICIAN', 'BILLING', 'SUPPORT'] },
      isActive: { type: 'boolean' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' }
    },
    relations: {
      appointments: { model: 'Appointment', type: 'one-to-many' },
      clinicalNotes: { model: 'ClinicalNote', type: 'one-to-many' }
    }
  },
  Insurance: {
    fields: {
      id: { type: 'string' },
      clientId: { type: 'string' },
      payerId: { type: 'string' },
      policyNumber: { type: 'string' },
      isPrimary: { type: 'boolean' },
      isActive: { type: 'boolean' },
      effectiveDate: { type: 'date' },
      terminationDate: { type: 'date' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' }
    },
    relations: {
      client: { model: 'Client', type: 'many-to-one', foreignKey: 'clientId' },
      payer: { model: 'Payer', type: 'many-to-one', foreignKey: 'payerId' }
    }
  },
  Payer: {
    fields: {
      id: { type: 'string' },
      name: { type: 'string' },
      type: { type: 'enum', enumValues: ['COMMERCIAL', 'MEDICARE', 'MEDICAID', 'SELF_PAY'] },
      isActive: { type: 'boolean' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' }
    },
    relations: {
      insurance: { model: 'Insurance', type: 'one-to-many' }
    }
  }
};

// ============================================================================
// QUERY BUILDER SERVICE
// ============================================================================

class QueryBuilderService {
  /**
   * Get available data sources with metadata
   */
  getAvailableDataSources() {
    return Object.keys(DATA_SOURCE_METADATA).map(name => ({
      name,
      fields: Object.keys(DATA_SOURCE_METADATA[name].fields),
      relations: Object.keys(DATA_SOURCE_METADATA[name].relations)
    }));
  }

  /**
   * Get field metadata for a data source
   */
  getFieldMetadata(dataSource: string, field: string): FieldMetadata | null {
    const metadata = DATA_SOURCE_METADATA[dataSource];
    if (!metadata) return null;
    return metadata.fields[field] || null;
  }

  /**
   * Validate query configuration
   */
  validateQueryConfig(config: QueryConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate data sources
    if (!config.dataSources || config.dataSources.length === 0) {
      errors.push('At least one data source is required');
    }

    config.dataSources?.forEach(ds => {
      if (!DATA_SOURCE_METADATA[ds]) {
        errors.push(`Invalid data source: ${ds}`);
      }
    });

    // Validate fields
    if (!config.fields || config.fields.length === 0) {
      errors.push('At least one field is required');
    }

    config.fields?.forEach(field => {
      if (!DATA_SOURCE_METADATA[field.source]) {
        errors.push(`Invalid field source: ${field.source}`);
      } else if (!DATA_SOURCE_METADATA[field.source].fields[field.field]) {
        errors.push(`Invalid field: ${field.source}.${field.field}`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Execute a query based on configuration
   */
  async executeQuery(config: QueryConfig): Promise<any[]> {
    const validation = this.validateQueryConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid query configuration: ${validation.errors.join(', ')}`);
    }

    // Determine primary data source (first one)
    const primarySource = config.dataSources[0];

    // Build Prisma query
    const prismaQuery = this.buildPrismaQuery(config);

    // Execute query based on primary data source
    const model = (prisma as any)[primarySource.toLowerCase()];
    if (!model) {
      throw new Error(`Data source ${primarySource} not found in Prisma client`);
    }

    // Execute query
    const results = await model.findMany(prismaQuery);

    // Transform results based on selected fields
    return this.transformResults(results, config);
  }

  /**
   * Build Prisma query from configuration
   */
  private buildPrismaQuery(config: QueryConfig): any {
    const query: any = {};

    // Build select clause
    query.select = this.buildSelectClause(config);

    // Build where clause
    if (config.filters && config.filters.length > 0) {
      query.where = this.buildWhereClause(config.filters);
    }

    // Build orderBy clause
    if (config.orderBy && config.orderBy.length > 0) {
      query.orderBy = this.buildOrderByClause(config.orderBy);
    }

    // Add pagination
    if (config.limit) {
      query.take = config.limit;
    }
    if (config.offset) {
      query.skip = config.offset;
    }

    return query;
  }

  /**
   * Build select clause with relations
   */
  private buildSelectClause(config: QueryConfig): any {
    const primarySource = config.dataSources[0];
    const select: any = {};
    const relations: Record<string, any> = {};

    config.fields.forEach(field => {
      if (field.source === primarySource) {
        // Direct field on primary source
        select[field.field] = true;
      } else {
        // Field from related model
        const relationName = this.findRelation(primarySource, field.source);
        if (relationName) {
          if (!relations[relationName]) {
            relations[relationName] = { select: {} };
          }
          relations[relationName].select[field.field] = true;
        }
      }
    });

    // Merge relations into select
    Object.keys(relations).forEach(relationName => {
      select[relationName] = relations[relationName];
    });

    return select;
  }

  /**
   * Build where clause from filters
   */
  private buildWhereClause(filters: QueryFilter[]): any {
    const where: any = { AND: [] };

    filters.forEach(filter => {
      const condition = this.buildFilterCondition(filter);
      if (condition) {
        where.AND.push(condition);
      }
    });

    return where.AND.length > 0 ? where : undefined;
  }

  /**
   * Build single filter condition
   */
  private buildFilterCondition(filter: QueryFilter): any {
    const [source, field] = filter.field.includes('.')
      ? filter.field.split('.')
      : [null, filter.field];

    const condition: any = {};

    switch (filter.operator) {
      case 'EQUALS':
        condition[field] = filter.values?.[0];
        break;
      case 'NOT_EQUALS':
        condition[field] = { not: filter.values?.[0] };
        break;
      case 'IN':
        condition[field] = { in: filter.values };
        break;
      case 'NOT_IN':
        condition[field] = { notIn: filter.values };
        break;
      case 'CONTAINS':
        condition[field] = { contains: filter.values?.[0], mode: 'insensitive' };
        break;
      case 'STARTS_WITH':
        condition[field] = { startsWith: filter.values?.[0], mode: 'insensitive' };
        break;
      case 'ENDS_WITH':
        condition[field] = { endsWith: filter.values?.[0], mode: 'insensitive' };
        break;
      case 'GT':
        condition[field] = { gt: filter.values?.[0] };
        break;
      case 'GTE':
        condition[field] = { gte: filter.values?.[0] };
        break;
      case 'LT':
        condition[field] = { lt: filter.values?.[0] };
        break;
      case 'LTE':
        condition[field] = { lte: filter.values?.[0] };
        break;
      case 'BETWEEN':
        condition[field] = {
          gte: filter.values?.[0],
          lte: filter.values?.[1]
        };
        break;
      case 'IS_NULL':
        condition[field] = null;
        break;
      case 'IS_NOT_NULL':
        condition[field] = { not: null };
        break;
    }

    // Wrap in relation if needed
    if (source) {
      return { [source]: condition };
    }

    return condition;
  }

  /**
   * Build orderBy clause
   */
  private buildOrderByClause(sorts: QuerySort[]): any {
    return sorts.map(sort => {
      const [source, field] = sort.field.includes('.')
        ? sort.field.split('.')
        : [null, sort.field];

      if (source) {
        return { [source]: { [field]: sort.direction.toLowerCase() } };
      }

      return { [field]: sort.direction.toLowerCase() };
    });
  }

  /**
   * Transform results to flatten related data
   */
  private transformResults(results: any[], config: QueryConfig): any[] {
    return results.map(row => {
      const transformed: any = {};

      config.fields.forEach(field => {
        const key = field.alias || `${field.source}_${field.field}`;

        // Navigate nested objects for related data
        if (field.source !== config.dataSources[0]) {
          const relationName = this.findRelation(config.dataSources[0], field.source);
          if (relationName && row[relationName]) {
            transformed[key] = row[relationName][field.field];
          }
        } else {
          transformed[key] = row[field.field];
        }
      });

      return transformed;
    });
  }

  /**
   * Find relation name between two models
   */
  private findRelation(sourceModel: string, targetModel: string): string | null {
    const metadata = DATA_SOURCE_METADATA[sourceModel];
    if (!metadata) return null;

    for (const [relationName, relation] of Object.entries(metadata.relations)) {
      if (relation.model === targetModel) {
        return relationName;
      }
    }

    return null;
  }

  /**
   * Execute aggregation query
   */
  async executeAggregationQuery(config: QueryConfig): Promise<any> {
    if (!config.aggregations || config.aggregations.length === 0) {
      throw new Error('Aggregations required for aggregation query');
    }

    const primarySource = config.dataSources[0];
    const model = (prisma as any)[primarySource.toLowerCase()];

    if (!model) {
      throw new Error(`Data source ${primarySource} not found`);
    }

    // Build aggregation query
    const aggregateQuery: any = {};

    // Add where clause if filters exist
    if (config.filters && config.filters.length > 0) {
      aggregateQuery.where = this.buildWhereClause(config.filters);
    }

    // Build aggregation operations
    const aggregations: any = {};
    config.aggregations.forEach(agg => {
      const operation = agg.function.toLowerCase();
      if (!aggregations[operation]) {
        aggregations[operation] = {};
      }
      aggregations[operation][agg.field] = true;
    });

    // Execute aggregate
    const result = await model.aggregate({
      ...aggregateQuery,
      ...aggregations
    });

    // Transform result
    const transformed: any = {};
    config.aggregations.forEach(agg => {
      const operation = agg.function.toLowerCase();
      transformed[agg.alias] = result[operation][agg.field];
    });

    return transformed;
  }

  /**
   * Execute grouped aggregation query
   */
  async executeGroupedAggregationQuery(config: QueryConfig): Promise<any[]> {
    if (!config.groupBy || config.groupBy.length === 0) {
      throw new Error('GroupBy required for grouped aggregation');
    }

    const primarySource = config.dataSources[0];
    const model = (prisma as any)[primarySource.toLowerCase()];

    if (!model) {
      throw new Error(`Data source ${primarySource} not found`);
    }

    // Build group by query
    const groupByQuery: any = {
      by: config.groupBy
    };

    // Add where clause
    if (config.filters && config.filters.length > 0) {
      groupByQuery.where = this.buildWhereClause(config.filters);
    }

    // Add aggregations
    if (config.aggregations && config.aggregations.length > 0) {
      groupByQuery._count = {};
      groupByQuery._sum = {};
      groupByQuery._avg = {};
      groupByQuery._min = {};
      groupByQuery._max = {};

      config.aggregations.forEach(agg => {
        const operation = `_${agg.function.toLowerCase()}`;
        if (!groupByQuery[operation]) {
          groupByQuery[operation] = {};
        }
        groupByQuery[operation][agg.field] = true;
      });
    }

    // Add orderBy
    if (config.orderBy && config.orderBy.length > 0) {
      groupByQuery.orderBy = this.buildOrderByClause(config.orderBy);
    }

    // Execute groupBy
    const results = await model.groupBy(groupByQuery);

    return results;
  }
}

export default new QueryBuilderService();
