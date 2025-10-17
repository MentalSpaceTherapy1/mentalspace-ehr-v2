#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { SecurityStack } from '../lib/security-stack';
import { DatabaseStack } from '../lib/database-stack';
import { AlbStack } from '../lib/alb-stack';
import { EcrStack } from '../lib/ecr-stack';
import { ComputeStack } from '../lib/compute-stack';
import { MonitoringStack } from '../lib/monitoring-stack';
// import { FrontendStack } from '../lib/frontend-stack'; // Frontend deployed manually to S3

const app = new cdk.App();

// Get environment from context or default to 'dev'
const environment = app.node.tryGetContext('environment') || 'dev';
const account = '706704660887';
const region = 'us-east-1';

const env = {
  account,
  region,
};

// Tags applied to all resources
const tags = {
  Project: 'MentalSpaceEHR',
  Environment: environment,
  ManagedBy: 'CDK',
  Version: '2.0',
};

// Configuration per environment
const domainName = 'mentalspaceehr.com'; // Update with your domain
const hostedZoneId = undefined; // Update if you have Route 53 hosted zone
const certificateArn = undefined; // Update if you have ACM certificate

// Network Stack - VPC, Subnets, NAT Gateways, Security Groups
const networkStack = new NetworkStack(app, `MentalSpace-Network-${environment}`, {
  env,
  description: `MentalSpace EHR V2 - Network Infrastructure (${environment})`,
  tags,
  environment,
});

// Security Stack - WAF, Secrets Manager, KMS Keys
const securityStack = new SecurityStack(app, `MentalSpace-Security-${environment}`, {
  env,
  description: `MentalSpace EHR V2 - Security Infrastructure (${environment})`,
  tags,
  environment,
  vpc: networkStack.vpc,
});

// Database Stack - RDS PostgreSQL, DynamoDB Tables
const databaseStack = new DatabaseStack(app, `MentalSpace-Database-${environment}`, {
  env,
  description: `MentalSpace EHR V2 - Database Infrastructure (${environment})`,
  tags,
  environment,
  vpc: networkStack.vpc,
  dbSecurityGroup: networkStack.dbSecurityGroup,
  kmsKey: securityStack.kmsKey,
});

// ALB Stack - Application Load Balancer with HTTPS and WAF
const albStack = new AlbStack(app, `MentalSpace-ALB-${environment}`, {
  env,
  description: `MentalSpace EHR V2 - Load Balancer (${environment})`,
  tags,
  environment,
  vpc: networkStack.vpc,
  albSecurityGroup: networkStack.albSecurityGroup,
  domainName,
  hostedZoneId,
  certificateArn,
});

// ECR Stack - Docker image repository (deploy first, before Compute stack)
const ecrStack = new EcrStack(app, `MentalSpace-ECR-${environment}`, {
  env,
  description: `MentalSpace EHR V2 - Container Registry (${environment})`,
  tags,
  environment,
});

// Compute Stack - ECS Fargate for backend API (requires Docker image in ECR)
const computeStack = new ComputeStack(app, `MentalSpace-Compute-${environment}`, {
  env,
  description: `MentalSpace EHR V2 - Compute Infrastructure (${environment})`,
  tags,
  environment,
  vpc: networkStack.vpc,
  appSecurityGroup: networkStack.appSecurityGroup,
  targetGroup: albStack.targetGroup,
  httpsListener: albStack.httpsListener,
  databaseSecret: databaseStack.databaseSecret,
  repository: ecrStack.repository,
});

// Monitoring Stack - CloudWatch Dashboards and Alarms
const monitoringStack = new MonitoringStack(app, `MentalSpace-Monitoring-${environment}`, {
  env,
  description: `MentalSpace EHR V2 - Monitoring Infrastructure (${environment})`,
  tags,
  environment,
  rdsInstance: databaseStack.rdsInstance,
  alertEmail: 'alerts@mentalspaceehr.com', // Update with your email
});

// Frontend Stack - S3 + CloudFront for React app
// Deployed manually to S3, not using CDK stack for now
// const frontendStack = new FrontendStack(app, `MentalSpace-Frontend-${environment}`, {
//   env,
//   description: `MentalSpace EHR V2 - Frontend Infrastructure (${environment})`,
//   tags,
//   environment,
// });

// Add stack dependencies
securityStack.addDependency(networkStack);
databaseStack.addDependency(networkStack);
databaseStack.addDependency(securityStack);
albStack.addDependency(networkStack);
// ECR is independent, can deploy immediately
computeStack.addDependency(networkStack);
computeStack.addDependency(databaseStack);
computeStack.addDependency(albStack);
computeStack.addDependency(ecrStack); // Need ECR repo before deploying ECS
monitoringStack.addDependency(databaseStack);
// Frontend is independent

app.synth();
