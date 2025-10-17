import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface DatabaseStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.Vpc;
  dbSecurityGroup: ec2.SecurityGroup;
  kmsKey: kms.Key;
}

export class DatabaseStack extends cdk.Stack {
  public readonly rdsInstance: rds.DatabaseInstance;
  public readonly databaseSecret: cdk.aws_secretsmanager.ISecret;
  public readonly sessionsTable: dynamodb.Table;
  public readonly cacheTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { environment, vpc, dbSecurityGroup, kmsKey } = props;

    // RDS PostgreSQL Database
    const engine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.VER_16_6,
    });

    // Instance size based on environment
    const instanceType =
      environment === 'prod'
        ? ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.LARGE)
        : ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO);

    this.rdsInstance = new rds.DatabaseInstance(this, 'MentalSpaceDB', {
      instanceIdentifier: `mentalspace-db-${environment}`,
      engine,
      instanceType,
      vpc,
      vpcSubnets: {
        // Use PUBLIC subnets in dev for initial setup, then move to PRIVATE_WITH_EGRESS
        subnetType: environment === 'prod' ? ec2.SubnetType.PRIVATE_WITH_EGRESS : ec2.SubnetType.PUBLIC,
      },
      securityGroups: [dbSecurityGroup],
      publiclyAccessible: environment !== 'prod', // Allow public access in dev for setup
      databaseName: 'mentalspace_ehr',
      credentials: rds.Credentials.fromGeneratedSecret('mentalspace_admin'),
      allocatedStorage: environment === 'prod' ? 100 : 20,
      maxAllocatedStorage: environment === 'prod' ? 500 : 50,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      storageEncryptionKey: kmsKey,
      multiAz: environment === 'prod',
      autoMinorVersionUpgrade: true,
      backupRetention: environment === 'prod' ? cdk.Duration.days(30) : cdk.Duration.days(7),
      deleteAutomatedBackups: environment !== 'prod',
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.SNAPSHOT : cdk.RemovalPolicy.DESTROY,
      deletionProtection: environment === 'prod',
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: cdk.aws_logs.RetentionDays.ONE_MONTH,
      parameterGroup: new rds.ParameterGroup(this, 'DBParameterGroup', {
        engine,
        description: `PostgreSQL parameter group for MentalSpace ${environment}`,
        parameters: {
          'shared_preload_libraries': 'pg_stat_statements',
          'log_statement': 'all',
          'log_min_duration_statement': '1000', // Log queries > 1s
          'log_connections': '1',
          'log_disconnections': '1',
        },
      }),
      enablePerformanceInsights: environment === 'prod',
      performanceInsightRetention: environment === 'prod'
        ? rds.PerformanceInsightRetention.LONG_TERM
        : undefined,
      monitoringInterval: environment === 'prod' ? cdk.Duration.seconds(60) : undefined,
    });

    // Export the database secret for use by compute stack
    if (this.rdsInstance.secret) {
      this.databaseSecret = this.rdsInstance.secret;
    } else {
      throw new Error('Database secret was not created');
    }

    // DynamoDB Table for Sessions
    this.sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      tableName: `mentalspace-sessions-${environment}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: kmsKey,
      timeToLiveAttribute: 'TTL',
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI for user lookups
    this.sessionsTable.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // DynamoDB Table for Cache
    this.cacheTable = new dynamodb.Table(this, 'CacheTable', {
      tableName: `mentalspace-cache-${environment}`,
      partitionKey: {
        name: 'cacheKey',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: kmsKey,
      timeToLiveAttribute: 'expiresAt',
      pointInTimeRecovery: environment === 'prod',
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Outputs
    new cdk.CfnOutput(this, 'RDSEndpoint', {
      value: this.rdsInstance.dbInstanceEndpointAddress,
      description: 'RDS Database Endpoint',
      exportName: `MentalSpace-RDS-Endpoint-${environment}`,
    });

    new cdk.CfnOutput(this, 'RDSPort', {
      value: this.rdsInstance.dbInstanceEndpointPort,
      description: 'RDS Database Port',
    });

    new cdk.CfnOutput(this, 'RDSSecretArn', {
      value: this.rdsInstance.secret?.secretArn || 'N/A',
      description: 'RDS Credentials Secret ARN',
    });

    new cdk.CfnOutput(this, 'SessionsTableName', {
      value: this.sessionsTable.tableName,
      description: 'DynamoDB Sessions Table Name',
      exportName: `MentalSpace-Sessions-Table-${environment}`,
    });

    new cdk.CfnOutput(this, 'CacheTableName', {
      value: this.cacheTable.tableName,
      description: 'DynamoDB Cache Table Name',
      exportName: `MentalSpace-Cache-Table-${environment}`,
    });
  }
}
