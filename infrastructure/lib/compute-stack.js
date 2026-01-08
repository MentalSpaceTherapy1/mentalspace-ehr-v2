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
exports.ComputeStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
class ComputeStack extends cdk.Stack {
    cluster;
    service;
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment, vpc, appSecurityGroup, targetGroup, httpsListener, databaseSecret, repository } = props;
        // ECS Cluster
        this.cluster = new ecs.Cluster(this, 'Cluster', {
            clusterName: `mentalspace-ehr-${environment}`,
            vpc,
            containerInsights: environment === 'prod',
        });
        // Task Execution Role (for pulling images, accessing secrets)
        const taskExecutionRole = new iam.Role(this, 'TaskExecutionRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
            ],
        });
        // Grant access to database secret
        databaseSecret.grantRead(taskExecutionRole);
        // Task Role (for application runtime permissions)
        const taskRole = new iam.Role(this, 'TaskRole', {
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
        });
        // Grant permissions for AWS services (S3, SES, SNS, etc.)
        taskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
        taskRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
                'sns:Publish',
                'chime:CreateMeeting',
                'chime:CreateAttendee',
                'chime:DeleteMeeting',
            ],
            resources: ['*'],
        }));
        // CloudWatch Log Group
        const logGroup = new logs.LogGroup(this, 'LogGroup', {
            logGroupName: `/ecs/mentalspace-ehr-${environment}`,
            retention: environment === 'prod'
                ? logs.RetentionDays.ONE_MONTH
                : logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Task Definition
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
            memoryLimitMiB: environment === 'prod' ? 2048 : 1024,
            cpu: environment === 'prod' ? 1024 : 512,
            executionRole: taskExecutionRole,
            taskRole: taskRole,
        });
        // Container Definition
        const container = taskDefinition.addContainer('BackendContainer', {
            containerName: 'mentalspace-backend',
            image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
            logging: ecs.LogDriver.awsLogs({
                logGroup,
                streamPrefix: 'backend',
            }),
            environment: {
                NODE_ENV: environment,
                PORT: '3001',
                LOG_LEVEL: environment === 'prod' ? 'info' : 'debug',
                FRONTEND_URL: environment === 'prod'
                    ? 'https://app.mentalspaceehr.com'
                    : `https://${environment}.app.mentalspaceehr.com`,
                // CORS Origins - allow S3 website and localhost for development
                CORS_ORIGINS: environment === 'prod'
                    ? 'https://app.mentalspaceehr.com'
                    : `http://mentalspace-ehr-frontend-${environment}.s3-website-us-east-1.amazonaws.com,http://localhost:5173`,
                AWS_REGION: 'us-east-1',
                DYNAMODB_SESSIONS_TABLE: `mentalspace-sessions-${environment}`,
            },
            secrets: {
                // SECURITY: All secrets injected from AWS Secrets Manager - no hardcoded values
                DATABASE_URL: ecs.Secret.fromSecretsManager(secretsmanager.Secret.fromSecretNameV2(this, 'DatabaseUrlSecret', `mentalspace/${environment}/database-url`)),
                // JWT_SECRET from Secrets Manager - CRITICAL for security
                JWT_SECRET: ecs.Secret.fromSecretsManager(secretsmanager.Secret.fromSecretNameV2(this, 'JwtSecret', `mentalspace/${environment}/jwt-secret`)),
                // PHI Encryption Key from Secrets Manager - HIPAA requirement
                PHI_ENCRYPTION_KEY: ecs.Secret.fromSecretsManager(secretsmanager.Secret.fromSecretNameV2(this, 'PhiEncryptionKey', `mentalspace/${environment}/phi-encryption-key`)),
                // CSRF Secret from Secrets Manager
                CSRF_SECRET: ecs.Secret.fromSecretsManager(secretsmanager.Secret.fromSecretNameV2(this, 'CsrfSecret', `mentalspace/${environment}/csrf-secret`)),
            },
            healthCheck: {
                command: ['CMD-SHELL', 'curl -f http://localhost:3001/api/v1/health/live || exit 1'],
                interval: cdk.Duration.seconds(30),
                timeout: cdk.Duration.seconds(5),
                retries: 3,
                startPeriod: cdk.Duration.seconds(60),
            },
        });
        container.addPortMappings({
            containerPort: 3001,
            protocol: ecs.Protocol.TCP,
        });
        // Fargate Service
        this.service = new ecs.FargateService(this, 'Service', {
            cluster: this.cluster,
            taskDefinition,
            serviceName: `mentalspace-backend-${environment}`,
            desiredCount: environment === 'prod' ? 2 : 1,
            minHealthyPercent: environment === 'prod' ? 50 : 0,
            maxHealthyPercent: 200,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            securityGroups: [appSecurityGroup],
            assignPublicIp: false,
            healthCheckGracePeriod: cdk.Duration.seconds(60),
            circuitBreaker: {
                rollback: true,
            },
            enableExecuteCommand: environment !== 'prod', // Allow debugging in non-prod
        });
        // Attach to Target Group
        this.service.attachToApplicationTargetGroup(targetGroup);
        // Auto Scaling - ENTERPRISE SCALE for 50,000+ users
        // Production: min 5, max 100 tasks for high availability
        // Dev/Staging: min 1, max 10 tasks for cost efficiency
        const scaling = this.service.autoScaleTaskCount({
            minCapacity: environment === 'prod' ? 5 : 1,
            maxCapacity: environment === 'prod' ? 100 : 10,
        });
        // CPU-based scaling - triggers at 60% to allow headroom
        scaling.scaleOnCpuUtilization('CpuScaling', {
            targetUtilizationPercent: 60,
            scaleInCooldown: cdk.Duration.seconds(300), // 5 min cooldown to prevent thrashing
            scaleOutCooldown: cdk.Duration.seconds(60), // Fast scale-out for responsiveness
        });
        // Memory-based scaling
        scaling.scaleOnMemoryUtilization('MemoryScaling', {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.seconds(300),
            scaleOutCooldown: cdk.Duration.seconds(60),
        });
        // Request count based scaling for production (handles burst traffic)
        if (environment === 'prod') {
            scaling.scaleOnRequestCount('RequestCountScaling', {
                targetGroup: targetGroup,
                requestsPerTarget: 1000, // Scale up when approaching 1000 requests/target
                scaleInCooldown: cdk.Duration.seconds(300),
                scaleOutCooldown: cdk.Duration.seconds(60),
            });
        }
        // Outputs
        new cdk.CfnOutput(this, 'ClusterName', {
            value: this.cluster.clusterName,
            description: 'ECS Cluster Name',
            exportName: `MentalSpace-Cluster-${environment}`,
        });
        new cdk.CfnOutput(this, 'ServiceName', {
            value: this.service.serviceName,
            description: 'ECS Service Name',
            exportName: `MentalSpace-Service-${environment}`,
        });
        new cdk.CfnOutput(this, 'LogGroupName', {
            value: logGroup.logGroupName,
            description: 'CloudWatch Log Group',
        });
    }
}
exports.ComputeStack = ComputeStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbXB1dGUtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQUMzQyx5REFBMkM7QUFJM0MseURBQTJDO0FBQzNDLDJEQUE2QztBQUM3QywrRUFBaUU7QUFhakUsTUFBYSxZQUFhLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDekIsT0FBTyxDQUFjO0lBQ3JCLE9BQU8sQ0FBcUI7SUFFNUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF3QjtRQUNoRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFN0csY0FBYztRQUNkLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDOUMsV0FBVyxFQUFFLG1CQUFtQixXQUFXLEVBQUU7WUFDN0MsR0FBRztZQUNILGlCQUFpQixFQUFFLFdBQVcsS0FBSyxNQUFNO1NBQzFDLENBQUMsQ0FBQztRQUVILDhEQUE4RDtRQUM5RCxNQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDaEUsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixDQUFDO1lBQzlELGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLCtDQUErQyxDQUFDO2FBQzVGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsa0NBQWtDO1FBQ2xDLGNB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QUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQy9CLFdBQVcsRUFBRSxrQkFBa0I7WUFDL0IsVUFBVSxFQUFFLHVCQUF1QixXQUFXLEVBQUU7U0FDakQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDdEMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxZQUFZO1lBQzVCLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbE5ELG9DQWtOQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgKiBhcyBlY3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcyc7XG5pbXBvcnQgKiBhcyBlY3NQYXR0ZXJucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzLXBhdHRlcm5zJztcbmltcG9ydCAqIGFzIGVsYnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lbGFzdGljbG9hZGJhbGFuY2luZ3YyJztcbmltcG9ydCAqIGFzIGVjciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNyJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbXB1dGVTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICB2cGM6IGVjMi5WcGM7XG4gIGFwcFNlY3VyaXR5R3JvdXA6IGVjMi5TZWN1cml0eUdyb3VwO1xuICB0YXJnZXRHcm91cDogZWxidjIuQXBwbGljYXRpb25UYXJnZXRHcm91cDtcbiAgaHR0cHNMaXN0ZW5lcjogZWxidjIuQXBwbGljYXRpb25MaXN0ZW5lcjtcbiAgZGF0YWJhc2VTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLklTZWNyZXQ7XG4gIHJlcG9zaXRvcnk6IGVjci5JUmVwb3NpdG9yeTtcbn1cblxuZXhwb3J0IGNsYXNzIENvbXB1dGVTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBjbHVzdGVyOiBlY3MuQ2x1c3RlcjtcbiAgcHVibGljIHJlYWRvbmx5IHNlcnZpY2U6IGVjcy5GYXJnYXRlU2VydmljZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ29tcHV0ZVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQsIHZwYywgYXBwU2VjdXJpdHlHcm91cCwgdGFyZ2V0R3JvdXAsIGh0dHBzTGlzdGVuZXIsIGRhdGFiYXNlU2VjcmV0LCByZXBvc2l0b3J5IH0gPSBwcm9wcztcblxuICAgIC8vIEVDUyBDbHVzdGVyXG4gICAgdGhpcy5jbHVzdGVyID0gbmV3IGVjcy5DbHVzdGVyKHRoaXMsICdDbHVzdGVyJywge1xuICAgICAgY2x1c3Rlck5hbWU6IGBtZW50YWxzcGFjZS1laHItJHtlbnZpcm9ubWVudH1gLFxuICAgICAgdnBjLFxuICAgICAgY29udGFpbmVySW5zaWdodHM6IGVudmlyb25tZW50ID09PSAncHJvZCcsXG4gICAgfSk7XG5cbiAgICAvLyBUYXNrIEV4ZWN1dGlvbiBSb2xlIChmb3IgcHVsbGluZyBpbWFnZXMsIGFjY2Vzc2luZyBzZWNyZXRzKVxuICAgIGNvbnN0IHRhc2tFeGVjdXRpb25Sb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdUYXNrRXhlY3V0aW9uUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FtYXpvbkVDU1Rhc2tFeGVjdXRpb25Sb2xlUG9saWN5JyksXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgYWNjZXNzIHRvIGRhdGFiYXNlIHNlY3JldFxuICAgIGRhdGFiYXNlU2VjcmV0LmdyYW50UmVhZCh0YXNrRXhlY3V0aW9uUm9sZSk7XG5cbiAgICAvLyBUYXNrIFJvbGUgKGZvciBhcHBsaWNhdGlvbiBydW50aW1lIHBlcm1pc3Npb25zKVxuICAgIGNvbnN0IHRhc2tSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdUYXNrUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxuICAgIH0pO1xuXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgZm9yIEFXUyBzZXJ2aWNlcyAoUzMsIFNFUywgU05TLCBldGMuKVxuICAgIHRhc2tSb2xlLmFkZE1hbmFnZWRQb2xpY3koXG4gICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ0FtYXpvblMzRnVsbEFjY2VzcycpXG4gICAgKTtcbiAgICB0YXNrUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdzZXM6U2VuZEVtYWlsJyxcbiAgICAgICAgICAnc2VzOlNlbmRSYXdFbWFpbCcsXG4gICAgICAgICAgJ3NuczpQdWJsaXNoJyxcbiAgICAgICAgICAnY2hpbWU6Q3JlYXRlTWVldGluZycsXG4gICAgICAgICAgJ2NoaW1lOkNyZWF0ZUF0dGVuZGVlJyxcbiAgICAgICAgICAnY2hpbWU6RGVsZXRlTWVldGluZycsXG4gICAgICAgIF0sXG4gICAgICAgIHJlc291cmNlczogWycqJ10sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBDbG91ZFdhdGNoIExvZyBHcm91cFxuICAgIGNvbnN0IGxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0xvZ0dyb3VwJywge1xuICAgICAgbG9nR3JvdXBOYW1lOiBgL2Vjcy9tZW50YWxzcGFjZS1laHItJHtlbnZpcm9ubWVudH1gLFxuICAgICAgcmV0ZW50aW9uOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnXG4gICAgICAgID8gbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USFxuICAgICAgICA6IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyBUYXNrIERlZmluaXRpb25cbiAgICBjb25zdCB0YXNrRGVmaW5pdGlvbiA9IG5ldyBlY3MuRmFyZ2F0ZVRhc2tEZWZpbml0aW9uKHRoaXMsICdUYXNrRGVmaW5pdGlvbicsIHtcbiAgICAgIG1lbW9yeUxpbWl0TWlCOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gMjA0OCA6IDEwMjQsXG4gICAgICBjcHU6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyAxMDI0IDogNTEyLFxuICAgICAgZXhlY3V0aW9uUm9sZTogdGFza0V4ZWN1dGlvblJvbGUsXG4gICAgICB0YXNrUm9sZTogdGFza1JvbGUsXG4gICAgfSk7XG5cbiAgICAvLyBDb250YWluZXIgRGVmaW5pdGlvblxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRhc2tEZWZpbml0aW9uLmFkZENvbnRhaW5lcignQmFja2VuZENvbnRhaW5lcicsIHtcbiAgICAgIGNvbnRhaW5lck5hbWU6ICdtZW50YWxzcGFjZS1iYWNrZW5kJyxcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbUVjclJlcG9zaXRvcnkocmVwb3NpdG9yeSwgJ2xhdGVzdCcpLFxuICAgICAgbG9nZ2luZzogZWNzLkxvZ0RyaXZlci5hd3NMb2dzKHtcbiAgICAgICAgbG9nR3JvdXAsXG4gICAgICAgIHN0cmVhbVByZWZpeDogJ2JhY2tlbmQnLFxuICAgICAgfSksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBOT0RFX0VOVjogZW52aXJvbm1lbnQsXG4gICAgICAgIFBPUlQ6ICczMDAxJyxcbiAgICAgICAgTE9HX0xFVkVMOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gJ2luZm8nIDogJ2RlYnVnJyxcbiAgICAgICAgRlJPTlRFTkRfVVJMOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnXG4gICAgICAgICAgPyAnaHR0cHM6Ly9hcHAubWVudGFsc3BhY2VlaHIuY29tJ1xuICAgICAgICAgIDogYGh0dHBzOi8vJHtlbnZpcm9ubWVudH0uYXBwLm1lbnRhbHNwYWNlZWhyLmNvbWAsXG4gICAgICAgIC8vIENPUlMgT3JpZ2lucyAtIGFsbG93IFMzIHdlYnNpdGUgYW5kIGxvY2FsaG9zdCBmb3IgZGV2ZWxvcG1lbnRcbiAgICAgICAgQ09SU19PUklHSU5TOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnXG4gICAgICAgICAgPyAnaHR0cHM6Ly9hcHAubWVudGFsc3BhY2VlaHIuY29tJ1xuICAgICAgICAgIDogYGh0dHA6Ly9tZW50YWxzcGFjZS1laHItZnJvbnRlbmQtJHtlbnZpcm9ubWVudH0uczMtd2Vic2l0ZS11cy1lYXN0LTEuYW1hem9uYXdzLmNvbSxodHRwOi8vbG9jYWxob3N0OjUxNzNgLFxuICAgICAgICBBV1NfUkVHSU9OOiAndXMtZWFzdC0xJyxcbiAgICAgICAgRFlOQU1PREJfU0VTU0lPTlNfVEFCTEU6IGBtZW50YWxzcGFjZS1zZXNzaW9ucy0ke2Vudmlyb25tZW50fWAsXG4gICAgICB9LFxuICAgICAgc2VjcmV0czoge1xuICAgICAgICAvLyBTRUNVUklUWTogQWxsIHNlY3JldHMgaW5qZWN0ZWQgZnJvbSBBV1MgU2VjcmV0cyBNYW5hZ2VyIC0gbm8gaGFyZGNvZGVkIHZhbHVlc1xuICAgICAgICBEQVRBQkFTRV9VUkw6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKFxuICAgICAgICAgIHNlY3JldHNtYW5hZ2VyLlNlY3JldC5mcm9tU2VjcmV0TmFtZVYyKFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgICdEYXRhYmFzZVVybFNlY3JldCcsXG4gICAgICAgICAgICBgbWVudGFsc3BhY2UvJHtlbnZpcm9ubWVudH0vZGF0YWJhc2UtdXJsYFxuICAgICAgICAgIClcbiAgICAgICAgKSxcbiAgICAgICAgLy8gSldUX1NFQ1JFVCBmcm9tIFNlY3JldHMgTWFuYWdlciAtIENSSVRJQ0FMIGZvciBzZWN1cml0eVxuICAgICAgICBKV1RfU0VDUkVUOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihcbiAgICAgICAgICBzZWNyZXRzbWFuYWdlci5TZWNyZXQuZnJvbVNlY3JldE5hbWVWMihcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICAnSnd0U2VjcmV0JyxcbiAgICAgICAgICAgIGBtZW50YWxzcGFjZS8ke2Vudmlyb25tZW50fS9qd3Qtc2VjcmV0YFxuICAgICAgICAgIClcbiAgICAgICAgKSxcbiAgICAgICAgLy8gUEhJIEVuY3J5cHRpb24gS2V5IGZyb20gU2VjcmV0cyBNYW5hZ2VyIC0gSElQQUEgcmVxdWlyZW1lbnRcbiAgICAgICAgUEhJX0VOQ1JZUFRJT05fS0VZOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihcbiAgICAgICAgICBzZWNyZXRzbWFuYWdlci5TZWNyZXQuZnJvbVNlY3JldE5hbWVWMihcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICAnUGhpRW5jcnlwdGlvbktleScsXG4gICAgICAgICAgICBgbWVudGFsc3BhY2UvJHtlbnZpcm9ubWVudH0vcGhpLWVuY3J5cHRpb24ta2V5YFxuICAgICAgICAgIClcbiAgICAgICAgKSxcbiAgICAgICAgLy8gQ1NSRiBTZWNyZXQgZnJvbSBTZWNyZXRzIE1hbmFnZXJcbiAgICAgICAgQ1NSRl9TRUNSRVQ6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKFxuICAgICAgICAgIHNlY3JldHNtYW5hZ2VyLlNlY3JldC5mcm9tU2VjcmV0TmFtZVYyKFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgICdDc3JmU2VjcmV0JyxcbiAgICAgICAgICAgIGBtZW50YWxzcGFjZS8ke2Vudmlyb25tZW50fS9jc3JmLXNlY3JldGBcbiAgICAgICAgICApXG4gICAgICAgICksXG4gICAgICB9LFxuICAgICAgaGVhbHRoQ2hlY2s6IHtcbiAgICAgICAgY29tbWFuZDogWydDTUQtU0hFTEwnLCAnY3VybCAtZiBodHRwOi8vbG9jYWxob3N0OjMwMDEvYXBpL3YxL2hlYWx0aC9saXZlIHx8IGV4aXQgMSddLFxuICAgICAgICBpbnRlcnZhbDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgICAgcmV0cmllczogMyxcbiAgICAgICAgc3RhcnRQZXJpb2Q6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb250YWluZXIuYWRkUG9ydE1hcHBpbmdzKHtcbiAgICAgIGNvbnRhaW5lclBvcnQ6IDMwMDEsXG4gICAgICBwcm90b2NvbDogZWNzLlByb3RvY29sLlRDUCxcbiAgICB9KTtcblxuICAgIC8vIEZhcmdhdGUgU2VydmljZVxuICAgIHRoaXMuc2VydmljZSA9IG5ldyBlY3MuRmFyZ2F0ZVNlcnZpY2UodGhpcywgJ1NlcnZpY2UnLCB7XG4gICAgICBjbHVzdGVyOiB0aGlzLmNsdXN0ZXIsXG4gICAgICB0YXNrRGVmaW5pdGlvbixcbiAgICAgIHNlcnZpY2VOYW1lOiBgbWVudGFsc3BhY2UtYmFja2VuZC0ke2Vudmlyb25tZW50fWAsXG4gICAgICBkZXNpcmVkQ291bnQ6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyAyIDogMSxcbiAgICAgIG1pbkhlYWx0aHlQZXJjZW50OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gNTAgOiAwLFxuICAgICAgbWF4SGVhbHRoeVBlcmNlbnQ6IDIwMCxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgIH0sXG4gICAgICBzZWN1cml0eUdyb3VwczogW2FwcFNlY3VyaXR5R3JvdXBdLFxuICAgICAgYXNzaWduUHVibGljSXA6IGZhbHNlLFxuICAgICAgaGVhbHRoQ2hlY2tHcmFjZVBlcmlvZDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxuICAgICAgY2lyY3VpdEJyZWFrZXI6IHtcbiAgICAgICAgcm9sbGJhY2s6IHRydWUsXG4gICAgICB9LFxuICAgICAgZW5hYmxlRXhlY3V0ZUNvbW1hbmQ6IGVudmlyb25tZW50ICE9PSAncHJvZCcsIC8vIEFsbG93IGRlYnVnZ2luZyBpbiBub24tcHJvZFxuICAgIH0pO1xuXG4gICAgLy8gQXR0YWNoIHRvIFRhcmdldCBHcm91cFxuICAgIHRoaXMuc2VydmljZS5hdHRhY2hUb0FwcGxpY2F0aW9uVGFyZ2V0R3JvdXAodGFyZ2V0R3JvdXApO1xuXG4gICAgLy8gQXV0byBTY2FsaW5nIC0gRU5URVJQUklTRSBTQ0FMRSBmb3IgNTAsMDAwKyB1c2Vyc1xuICAgIC8vIFByb2R1Y3Rpb246IG1pbiA1LCBtYXggMTAwIHRhc2tzIGZvciBoaWdoIGF2YWlsYWJpbGl0eVxuICAgIC8vIERldi9TdGFnaW5nOiBtaW4gMSwgbWF4IDEwIHRhc2tzIGZvciBjb3N0IGVmZmljaWVuY3lcbiAgICBjb25zdCBzY2FsaW5nID0gdGhpcy5zZXJ2aWNlLmF1dG9TY2FsZVRhc2tDb3VudCh7XG4gICAgICBtaW5DYXBhY2l0eTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IDUgOiAxLFxuICAgICAgbWF4Q2FwYWNpdHk6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyAxMDAgOiAxMCxcbiAgICB9KTtcblxuICAgIC8vIENQVS1iYXNlZCBzY2FsaW5nIC0gdHJpZ2dlcnMgYXQgNjAlIHRvIGFsbG93IGhlYWRyb29tXG4gICAgc2NhbGluZy5zY2FsZU9uQ3B1VXRpbGl6YXRpb24oJ0NwdVNjYWxpbmcnLCB7XG4gICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDYwLFxuICAgICAgc2NhbGVJbkNvb2xkb3duOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApLCAvLyA1IG1pbiBjb29sZG93biB0byBwcmV2ZW50IHRocmFzaGluZ1xuICAgICAgc2NhbGVPdXRDb29sZG93bjogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLCAvLyBGYXN0IHNjYWxlLW91dCBmb3IgcmVzcG9uc2l2ZW5lc3NcbiAgICB9KTtcblxuICAgIC8vIE1lbW9yeS1iYXNlZCBzY2FsaW5nXG4gICAgc2NhbGluZy5zY2FsZU9uTWVtb3J5VXRpbGl6YXRpb24oJ01lbW9yeVNjYWxpbmcnLCB7XG4gICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDcwLFxuICAgICAgc2NhbGVJbkNvb2xkb3duOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApLFxuICAgICAgc2NhbGVPdXRDb29sZG93bjogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxuICAgIH0pO1xuXG4gICAgLy8gUmVxdWVzdCBjb3VudCBiYXNlZCBzY2FsaW5nIGZvciBwcm9kdWN0aW9uIChoYW5kbGVzIGJ1cnN0IHRyYWZmaWMpXG4gICAgaWYgKGVudmlyb25tZW50ID09PSAncHJvZCcpIHtcbiAgICAgIHNjYWxpbmcuc2NhbGVPblJlcXVlc3RDb3VudCgnUmVxdWVzdENvdW50U2NhbGluZycsIHtcbiAgICAgICAgdGFyZ2V0R3JvdXA6IHRhcmdldEdyb3VwLFxuICAgICAgICByZXF1ZXN0c1BlclRhcmdldDogMTAwMCwgLy8gU2NhbGUgdXAgd2hlbiBhcHByb2FjaGluZyAxMDAwIHJlcXVlc3RzL3RhcmdldFxuICAgICAgICBzY2FsZUluQ29vbGRvd246IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMCksXG4gICAgICAgIHNjYWxlT3V0Q29vbGRvd246IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2x1c3Rlck5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5jbHVzdGVyLmNsdXN0ZXJOYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdFQ1MgQ2x1c3RlciBOYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBNZW50YWxTcGFjZS1DbHVzdGVyLSR7ZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZXJ2aWNlTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnNlcnZpY2Uuc2VydmljZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0VDUyBTZXJ2aWNlIE5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYE1lbnRhbFNwYWNlLVNlcnZpY2UtJHtlbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvZ0dyb3VwTmFtZScsIHtcbiAgICAgIHZhbHVlOiBsb2dHcm91cC5sb2dHcm91cE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkV2F0Y2ggTG9nIEdyb3VwJyxcbiAgICB9KTtcbiAgfVxufVxuIl19