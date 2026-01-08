"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
class DatabaseStack extends cdk.Stack {
    rdsInstance;
    databaseSecret;
    sessionsTable;
    cacheTable;
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment, vpc, dbSecurityGroup, kmsKey } = props;
        // RDS PostgreSQL Database
        const engine = rds.DatabaseInstanceEngine.postgres({
            version: rds.PostgresEngineVersion.VER_16_6,
        });
        // Instance size based on environment
        const instanceType = environment === 'prod'
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
            // HIPAA requires longer backup retention - 90 days minimum for production
            backupRetention: environment === 'prod' ? cdk.Duration.days(90) : cdk.Duration.days(7),
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
        }
        else {
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
exports.DatabaseStack = DatabaseStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YWJhc2Utc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRhYmFzZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQyxtRUFBcUQ7QUFXckQsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUIsV0FBVyxDQUF1QjtJQUNsQyxjQUFjLENBQWlDO0lBQy9DLGFBQWEsQ0FBaUI7SUFDOUIsVUFBVSxDQUFpQjtJQUUzQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXlCO1FBQ2pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxNQUFNLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFNUQsMEJBQTBCO1FBQzFCLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUM7WUFDakQsT0FBTyxFQUFFLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRO1NBQzVDLENBQUMsQ0FBQztRQUVILHFDQUFxQztRQUNyQyxNQUFNLFlBQVksR0FDaEIsV0FBVyxLQUFLLE1BQU07WUFDcEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1lBQ25FLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXhFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxHQUFHLENBQUMsZ0JBQWdC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LEtBQUssRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVM7WUFDbkMsV0FBVyxFQUFFLDhCQUE4QjtZQUMzQyxVQUFVLEVBQUUsOEJBQThCLFdBQVcsRUFBRTtTQUN4RCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3hDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVM7WUFDaEMsV0FBVyxFQUFFLDJCQUEyQjtZQUN4QyxVQUFVLEVBQUUsMkJBQTJCLFdBQVcsRUFBRTtTQUNyRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFuSkQsc0NBbUpDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIHJkcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtcmRzJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBrbXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWttcyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBEYXRhYmFzZVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIHZwYzogZWMyLlZwYztcbiAgZGJTZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcbiAga21zS2V5OiBrbXMuS2V5O1xufVxuXG5leHBvcnQgY2xhc3MgRGF0YWJhc2VTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSByZHNJbnN0YW5jZTogcmRzLkRhdGFiYXNlSW5zdGFuY2U7XG4gIHB1YmxpYyByZWFkb25seSBkYXRhYmFzZVNlY3JldDogY2RrLmF3c19zZWNyZXRzbWFuYWdlci5JU2VjcmV0O1xuICBwdWJsaWMgcmVhZG9ubHkgc2Vzc2lvbnNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSBjYWNoZVRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRGF0YWJhc2VTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IGVudmlyb25tZW50LCB2cGMsIGRiU2VjdXJpdHlHcm91cCwga21zS2V5IH0gPSBwcm9wcztcblxuICAgIC8vIFJEUyBQb3N0Z3JlU1FMIERhdGFiYXNlXG4gICAgY29uc3QgZW5naW5lID0gcmRzLkRhdGFiYXNlSW5zdGFuY2VFbmdpbmUucG9zdGdyZXMoe1xuICAgICAgdmVyc2lvbjogcmRzLlBvc3RncmVzRW5naW5lVmVyc2lvbi5WRVJfMTZfNixcbiAgICB9KTtcblxuICAgIC8vIEluc3RhbmNlIHNpemUgYmFzZWQgb24gZW52aXJvbm1lbnRcbiAgICBjb25zdCBpbnN0YW5jZVR5cGUgPVxuICAgICAgZW52aXJvbm1lbnQgPT09ICdwcm9kJ1xuICAgICAgICA/IGVjMi5JbnN0YW5jZVR5cGUub2YoZWMyLkluc3RhbmNlQ2xhc3MuVDMsIGVjMi5JbnN0YW5jZVNpemUuTEFSR0UpXG4gICAgICAgIDogZWMyLkluc3RhbmNlVHlwZS5vZihlYzIuSW5zdGFuY2VDbGFzcy5UMywgZWMyLkluc3RhbmNlU2l6ZS5NSUNSTyk7XG5cbiAgICB0aGlzLnJkc0luc3RhbmNlID0gbmV3IHJkcy5EYXRhYmFzZUluc3RhbmNlKHRoaXMsICdNZW50YWxTcGFjZURCJywge1xuICAgICAgaW5zdGFuY2VJZGVudGlmaWVyOiBgbWVudGFsc3BhY2UtZGItJHtlbnZpcm9ubWVudH1gLFxuICAgICAgZW5naW5lLFxuICAgICAgaW5zdGFuY2VUeXBlLFxuICAgICAgdnBjLFxuICAgICAgdnBjU3VibmV0czoge1xuICAgICAgICAvLyBVc2UgUFVCTElDIHN1Ym5ldHMgaW4gZGV2IGZvciBpbml0aWFsIHNldHVwLCB0aGVuIG1vdmUgdG8gUFJJVkFURV9XSVRIX0VHUkVTU1xuICAgICAgICBzdWJuZXRUeXBlOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyA6IGVjMi5TdWJuZXRUeXBlLlBVQkxJQyxcbiAgICAgIH0sXG4gICAgICBzZWN1cml0eUdyb3VwczogW2RiU2VjdXJpdHlHcm91cF0sXG4gICAgICBwdWJsaWNseUFjY2Vzc2libGU6IGVudmlyb25tZW50ICE9PSAncHJvZCcsIC8vIEFsbG93IHB1YmxpYyBhY2Nlc3MgaW4gZGV2IGZvciBzZXR1cFxuICAgICAgZGF0YWJhc2VOYW1lOiAnbWVudGFsc3BhY2VfZWhyJyxcbiAgICAgIGNyZWRlbnRpYWxzOiByZHMuQ3JlZGVudGlhbHMuZnJvbUdlbmVyYXRlZFNlY3JldCgnbWVudGFsc3BhY2VfYWRtaW4nKSxcbiAgICAgIGFsbG9jYXRlZFN0b3JhZ2U6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyAxMDAgOiAyMCxcbiAgICAgIG1heEFsbG9jYXRlZFN0b3JhZ2U6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyA1MDAgOiA1MCxcbiAgICAgIHN0b3JhZ2VUeXBlOiByZHMuU3RvcmFnZVR5cGUuR1AzLFxuICAgICAgc3RvcmFnZUVuY3J5cHRlZDogdHJ1ZSxcbiAgICAgIHN0b3JhZ2VFbmNyeXB0aW9uS2V5OiBrbXNLZXksXG4gICAgICBtdWx0aUF6OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxuICAgICAgYXV0b01pbm9yVmVyc2lvblVwZ3JhZGU6IHRydWUsXG4gICAgICAvLyBISVBBQSByZXF1aXJlcyBsb25nZXIgYmFja3VwIHJldGVudGlvbiAtIDkwIGRheXMgbWluaW11bSBmb3IgcHJvZHVjdGlvblxuICAgICAgYmFja3VwUmV0ZW50aW9uOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gY2RrLkR1cmF0aW9uLmRheXMoOTApIDogY2RrLkR1cmF0aW9uLmRheXMoNyksXG4gICAgICBkZWxldGVBdXRvbWF0ZWRCYWNrdXBzOiBlbnZpcm9ubWVudCAhPT0gJ3Byb2QnLFxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlNOQVBTSE9UIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGRlbGV0aW9uUHJvdGVjdGlvbjogZW52aXJvbm1lbnQgPT09ICdwcm9kJyxcbiAgICAgIGNsb3Vkd2F0Y2hMb2dzRXhwb3J0czogWydwb3N0Z3Jlc3FsJ10sXG4gICAgICBjbG91ZHdhdGNoTG9nc1JldGVudGlvbjogY2RrLmF3c19sb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRILFxuICAgICAgcGFyYW1ldGVyR3JvdXA6IG5ldyByZHMuUGFyYW1ldGVyR3JvdXAodGhpcywgJ0RCUGFyYW1ldGVyR3JvdXAnLCB7XG4gICAgICAgIGVuZ2luZSxcbiAgICAgICAgZGVzY3JpcHRpb246IGBQb3N0Z3JlU1FMIHBhcmFtZXRlciBncm91cCBmb3IgTWVudGFsU3BhY2UgJHtlbnZpcm9ubWVudH1gLFxuICAgICAgICBwYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgJ3NoYXJlZF9wcmVsb2FkX2xpYnJhcmllcyc6ICdwZ19zdGF0X3N0YXRlbWVudHMnLFxuICAgICAgICAgICdsb2dfc3RhdGVtZW50JzogJ2FsbCcsXG4gICAgICAgICAgJ2xvZ19taW5fZHVyYXRpb25fc3RhdGVtZW50JzogJzEwMDAnLCAvLyBMb2cgcXVlcmllcyA+IDFzXG4gICAgICAgICAgJ2xvZ19jb25uZWN0aW9ucyc6ICcxJyxcbiAgICAgICAgICAnbG9nX2Rpc2Nvbm5lY3Rpb25zJzogJzEnLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gICAgICBlbmFibGVQZXJmb3JtYW5jZUluc2lnaHRzOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxuICAgICAgcGVyZm9ybWFuY2VJbnNpZ2h0UmV0ZW50aW9uOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnXG4gICAgICAgID8gcmRzLlBlcmZvcm1hbmNlSW5zaWdodFJldGVudGlvbi5MT05HX1RFUk1cbiAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgICBtb25pdG9yaW5nSW50ZXJ2YWw6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCkgOiB1bmRlZmluZWQsXG4gICAgfSk7XG5cbiAgICAvLyBFeHBvcnQgdGhlIGRhdGFiYXNlIHNlY3JldCBmb3IgdXNlIGJ5IGNvbXB1dGUgc3RhY2tcbiAgICBpZiAodGhpcy5yZHNJbnN0YW5jZS5zZWNyZXQpIHtcbiAgICAgIHRoaXMuZGF0YWJhc2VTZWNyZXQgPSB0aGlzLnJkc0luc3RhbmNlLnNlY3JldDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdEYXRhYmFzZSBzZWNyZXQgd2FzIG5vdCBjcmVhdGVkJyk7XG4gICAgfVxuXG4gICAgLy8gRHluYW1vREIgVGFibGUgZm9yIFNlc3Npb25zXG4gICAgdGhpcy5zZXNzaW9uc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdTZXNzaW9uc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiBgbWVudGFsc3BhY2Utc2Vzc2lvbnMtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICdQSycsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ1NLJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5DVVNUT01FUl9NQU5BR0VELFxuICAgICAgZW5jcnlwdGlvbktleToga21zS2V5LFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ1RUTCcsXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBHU0kgZm9yIHVzZXIgbG9va3Vwc1xuICAgIHRoaXMuc2Vzc2lvbnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdVc2VySWRJbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogJ3VzZXJJZCcsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXG4gICAgfSk7XG5cbiAgICAvLyBEeW5hbW9EQiBUYWJsZSBmb3IgQ2FjaGVcbiAgICB0aGlzLmNhY2hlVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0NhY2hlVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGBtZW50YWxzcGFjZS1jYWNoZS0ke2Vudmlyb25tZW50fWAsXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogJ2NhY2hlS2V5JyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5DVVNUT01FUl9NQU5BR0VELFxuICAgICAgZW5jcnlwdGlvbktleToga21zS2V5LFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ2V4cGlyZXNBdCcsXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1JEU0VuZHBvaW50Jywge1xuICAgICAgdmFsdWU6IHRoaXMucmRzSW5zdGFuY2UuZGJJbnN0YW5jZUVuZHBvaW50QWRkcmVzcyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUkRTIERhdGFiYXNlIEVuZHBvaW50JyxcbiAgICAgIGV4cG9ydE5hbWU6IGBNZW50YWxTcGFjZS1SRFMtRW5kcG9pbnQtJHtlbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1JEU1BvcnQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5yZHNJbnN0YW5jZS5kYkluc3RhbmNlRW5kcG9pbnRQb3J0LFxuICAgICAgZGVzY3JpcHRpb246ICdSRFMgRGF0YWJhc2UgUG9ydCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUkRTU2VjcmV0QXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMucmRzSW5zdGFuY2Uuc2VjcmV0Py5zZWNyZXRBcm4gfHwgJ04vQScsXG4gICAgICBkZXNjcmlwdGlvbjogJ1JEUyBDcmVkZW50aWFscyBTZWNyZXQgQVJOJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZXNzaW9uc1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnNlc3Npb25zVGFibGUudGFibGVOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiBTZXNzaW9ucyBUYWJsZSBOYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBNZW50YWxTcGFjZS1TZXNzaW9ucy1UYWJsZS0ke2Vudmlyb25tZW50fWAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2FjaGVUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jYWNoZVRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgQ2FjaGUgVGFibGUgTmFtZScsXG4gICAgICBleHBvcnROYW1lOiBgTWVudGFsU3BhY2UtQ2FjaGUtVGFibGUtJHtlbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuICB9XG59XG4iXX0=