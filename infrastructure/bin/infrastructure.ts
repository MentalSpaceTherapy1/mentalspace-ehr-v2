#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { SecurityStack } from '../lib/security-stack';
import { DatabaseStack } from '../lib/database-stack';

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

// Add stack dependencies
securityStack.addDependency(networkStack);
databaseStack.addDependency(networkStack);
databaseStack.addDependency(securityStack);

app.synth();
