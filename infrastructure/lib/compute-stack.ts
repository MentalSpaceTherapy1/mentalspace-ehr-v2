import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface ComputeStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.Vpc;
  appSecurityGroup: ec2.SecurityGroup;
  targetGroup: elbv2.ApplicationTargetGroup;
  httpsListener: elbv2.ApplicationListener;
  databaseSecret: secretsmanager.ISecret;
  repository: ecr.IRepository;
}

export class ComputeStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ComputeStackProps) {
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
    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
    );
    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'ses:SendEmail',
          'ses:SendRawEmail',
          'sns:Publish',
          'chime:CreateMeeting',
          'chime:CreateAttendee',
          'chime:DeleteMeeting',
        ],
        resources: ['*'],
      })
    );

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
        // TODO: Move JWT_SECRET to Secrets Manager in production
        JWT_SECRET: environment === 'prod'
          ? 'CHANGE_THIS_IN_PRODUCTION_USE_SECRETS_MANAGER'
          : 'dev-jwt-secret-key-not-for-production-use-2024',
        AWS_REGION: 'us-east-1',
        DYNAMODB_SESSIONS_TABLE: `mentalspace-sessions-${environment}`,
      },
      secrets: {
        // Inject DATABASE_URL from dedicated secret
        DATABASE_URL: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(
            this,
            'DatabaseUrlSecret',
            'mentalspace/dev/database-url'
          )
        ),
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

    // Auto Scaling (Production only)
    if (environment === 'prod') {
      const scaling = this.service.autoScaleTaskCount({
        minCapacity: 2,
        maxCapacity: 10,
      });

      scaling.scaleOnCpuUtilization('CpuScaling', {
        targetUtilizationPercent: 70,
        scaleInCooldown: cdk.Duration.seconds(60),
        scaleOutCooldown: cdk.Duration.seconds(60),
      });

      scaling.scaleOnMemoryUtilization('MemoryScaling', {
        targetUtilizationPercent: 80,
        scaleInCooldown: cdk.Duration.seconds(60),
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
