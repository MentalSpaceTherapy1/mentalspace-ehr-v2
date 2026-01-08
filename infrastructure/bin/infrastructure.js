#!/usr/bin/env node
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
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const network_stack_1 = require("../lib/network-stack");
const security_stack_1 = require("../lib/security-stack");
const database_stack_1 = require("../lib/database-stack");
const alb_stack_1 = require("../lib/alb-stack");
const ecr_stack_1 = require("../lib/ecr-stack");
const compute_stack_1 = require("../lib/compute-stack");
const monitoring_stack_1 = require("../lib/monitoring-stack");
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
const networkStack = new network_stack_1.NetworkStack(app, `MentalSpace-Network-${environment}`, {
    env,
    description: `MentalSpace EHR V2 - Network Infrastructure (${environment})`,
    tags,
    environment,
});
// Security Stack - WAF, Secrets Manager, KMS Keys
const securityStack = new security_stack_1.SecurityStack(app, `MentalSpace-Security-${environment}`, {
    env,
    description: `MentalSpace EHR V2 - Security Infrastructure (${environment})`,
    tags,
    environment,
    vpc: networkStack.vpc,
});
// Database Stack - RDS PostgreSQL, DynamoDB Tables
const databaseStack = new database_stack_1.DatabaseStack(app, `MentalSpace-Database-${environment}`, {
    env,
    description: `MentalSpace EHR V2 - Database Infrastructure (${environment})`,
    tags,
    environment,
    vpc: networkStack.vpc,
    dbSecurityGroup: networkStack.dbSecurityGroup,
    kmsKey: securityStack.kmsKey,
});
// ALB Stack - Application Load Balancer with HTTPS and WAF
const albStack = new alb_stack_1.AlbStack(app, `MentalSpace-ALB-${environment}`, {
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
const ecrStack = new ecr_stack_1.EcrStack(app, `MentalSpace-ECR-${environment}`, {
    env,
    description: `MentalSpace EHR V2 - Container Registry (${environment})`,
    tags,
    environment,
});
// Compute Stack - ECS Fargate for backend API (requires Docker image in ECR)
const computeStack = new compute_stack_1.ComputeStack(app, `MentalSpace-Compute-${environment}`, {
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
const monitoringStack = new monitoring_stack_1.MonitoringStack(app, `MentalSpace-Monitoring-${environment}`, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmFzdHJ1Y3R1cmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmZyYXN0cnVjdHVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBcUM7QUFDckMsaURBQW1DO0FBQ25DLHdEQUFvRDtBQUNwRCwwREFBc0Q7QUFDdEQsMERBQXNEO0FBQ3RELGdEQUE0QztBQUM1QyxnREFBNEM7QUFDNUMsd0RBQW9EO0FBQ3BELDhEQUEwRDtBQUMxRCw2RkFBNkY7QUFFN0YsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsbURBQW1EO0FBQ25ELE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssQ0FBQztBQUNuRSxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUM7QUFDL0IsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDO0FBRTNCLE1BQU0sR0FBRyxHQUFHO0lBQ1YsT0FBTztJQUNQLE1BQU07Q0FDUCxDQUFDO0FBRUYsZ0NBQWdDO0FBQ2hDLE1BQU0sSUFBSSxHQUFHO0lBQ1gsT0FBTyxFQUFFLGdCQUFnQjtJQUN6QixXQUFXLEVBQUUsV0FBVztJQUN4QixTQUFTLEVBQUUsS0FBSztJQUNoQixPQUFPLEVBQUUsS0FBSztDQUNmLENBQUM7QUFFRixnQ0FBZ0M7QUFDaEMsTUFBTSxVQUFVLEdBQUcsb0JBQW9CLENBQUMsQ0FBQywwQkFBMEI7QUFDbkUsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLENBQUMsMENBQTBDO0FBQzFFLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxDQUFDLHFDQUFxQztBQUV2RSw4REFBOEQ7QUFDOUQsTUFBTSxZQUFZLEdBQUcsSUFBSSw0QkFBWSxDQUFDLEdBQUcsRUFBRSx1QkFBdUIsV0FBVyxFQUFFLEVBQUU7SUFDL0UsR0FBRztJQUNILFdB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YSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3pDLFlBQVksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDMUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNyQyxZQUFZLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMscUNBQXFDO0FBQzNFLGVBQWUsQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDN0MsMEJBQTBCO0FBRTFCLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBOZXR3b3JrU3RhY2sgfSBmcm9tICcuLi9saWIvbmV0d29yay1zdGFjayc7XG5pbXBvcnQgeyBTZWN1cml0eVN0YWNrIH0gZnJvbSAnLi4vbGliL3NlY3VyaXR5LXN0YWNrJztcbmltcG9ydCB7IERhdGFiYXNlU3RhY2sgfSBmcm9tICcuLi9saWIvZGF0YWJhc2Utc3RhY2snO1xuaW1wb3J0IHsgQWxiU3RhY2sgfSBmcm9tICcuLi9saWIvYWxiLXN0YWNrJztcbmltcG9ydCB7IEVjclN0YWNrIH0gZnJvbSAnLi4vbGliL2Vjci1zdGFjayc7XG5pbXBvcnQgeyBDb21wdXRlU3RhY2sgfSBmcm9tICcuLi9saWIvY29tcHV0ZS1zdGFjayc7XG5pbXBvcnQgeyBNb25pdG9yaW5nU3RhY2sgfSBmcm9tICcuLi9saWIvbW9uaXRvcmluZy1zdGFjayc7XG4vLyBpbXBvcnQgeyBGcm9udGVuZFN0YWNrIH0gZnJvbSAnLi4vbGliL2Zyb250ZW5kLXN0YWNrJzsgLy8gRnJvbnRlbmQgZGVwbG95ZWQgbWFudWFsbHkgdG8gUzNcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuLy8gR2V0IGVudmlyb25tZW50IGZyb20gY29udGV4dCBvciBkZWZhdWx0IHRvICdkZXYnXG5jb25zdCBlbnZpcm9ubWVudCA9IGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgfHwgJ2Rldic7XG5jb25zdCBhY2NvdW50ID0gJzcwNjcwNDY2MDg4Nyc7XG5jb25zdCByZWdpb24gPSAndXMtZWFzdC0xJztcblxuY29uc3QgZW52ID0ge1xuICBhY2NvdW50LFxuICByZWdpb24sXG59O1xuXG4vLyBUYWdzIGFwcGxpZWQgdG8gYWxsIHJlc291cmNlc1xuY29uc3QgdGFncyA9IHtcbiAgUHJvamVjdDogJ01lbnRhbFNwYWNlRUhSJyxcbiAgRW52aXJvbm1lbnQ6IGVudmlyb25tZW50LFxuICBNYW5hZ2VkQnk6ICdDREsnLFxuICBWZXJzaW9uOiAnMi4wJyxcbn07XG5cbi8vIENvbmZpZ3VyYXRpb24gcGVyIGVudmlyb25tZW50XG5jb25zdCBkb21haW5OYW1lID0gJ21lbnRhbHNwYWNlZWhyLmNvbSc7IC8vIFVwZGF0ZSB3aXRoIHlvdXIgZG9tYWluXG5jb25zdCBob3N0ZWRab25lSWQgPSB1bmRlZmluZWQ7IC8vIFVwZGF0ZSBpZiB5b3UgaGF2ZSBSb3V0ZSA1MyBob3N0ZWQgem9uZVxuY29uc3QgY2VydGlmaWNhdGVBcm4gPSB1bmRlZmluZWQ7IC8vIFVwZGF0ZSBpZiB5b3UgaGF2ZSBBQ00gY2VydGlmaWNhdGVcblxuLy8gTmV0d29yayBTdGFjayAtIFZQQywgU3VibmV0cywgTkFUIEdhdGV3YXlzLCBTZWN1cml0eSBHcm91cHNcbmNvbnN0IG5ldHdvcmtTdGFjayA9IG5ldyBOZXR3b3JrU3RhY2soYXBwLCBgTWVudGFsU3BhY2UtTmV0d29yay0ke2Vudmlyb25tZW50fWAsIHtcbiAgZW52LFxuICBkZXNjcmlwdGlvbjogYE1lbnRhbFNwYWNlIEVIUiBWMiAtIE5ldHdvcmsgSW5mcmFzdHJ1Y3R1cmUgKCR7ZW52aXJvbm1lbnR9KWAsXG4gIHRhZ3MsXG4gIGVudmlyb25tZW50LFxufSk7XG5cbi8vIFNlY3VyaXR5IFN0YWNrIC0gV0FGLCBTZWNyZXRzIE1hbmFnZXIsIEtNUyBLZXlzXG5jb25zdCBzZWN1cml0eVN0YWNrID0gbmV3IFNlY3VyaXR5U3RhY2soYXBwLCBgTWVudGFsU3BhY2UtU2VjdXJpdHktJHtlbnZpcm9ubWVudH1gLCB7XG4gIGVudixcbiAgZGVzY3JpcHRpb246IGBNZW50YWxTcGFjZSBFSFIgVjIgLSBTZWN1cml0eSBJbmZyYXN0cnVjdHVyZSAoJHtlbnZpcm9ubWVudH0pYCxcbiAgdGFncyxcbiAgZW52aXJvbm1lbnQsXG4gIHZwYzogbmV0d29ya1N0YWNrLnZwYyxcbn0pO1xuXG4vLyBEYXRhYmFzZSBTdGFjayAtIFJEUyBQb3N0Z3JlU1FMLCBEeW5hbW9EQiBUYWJsZXNcbmNvbnN0IGRhdGFiYXNlU3RhY2sgPSBuZXcgRGF0YWJhc2VTdGFjayhhcHAsIGBNZW50YWxTcGFjZS1EYXRhYmFzZS0ke2Vudmlyb25tZW50fWAsIHtcbiAgZW52LFxuICBkZXNjcmlwdGlvbjogYE1lbnRhbFNwYWNlIEVIUiBWMiAtIERhdGFiYXNlIEluZnJhc3RydWN0dXJlICgke2Vudmlyb25tZW50fSlgLFxuICB0YWdzLFxuICBlbnZpcm9ubWVudCxcbiAgdnBjOiBuZXR3b3JrU3RhY2sudnBjLFxuICBkYlNlY3VyaXR5R3JvdXA6IG5ldHdvcmtTdGFjay5kYlNlY3VyaXR5R3JvdXAsXG4gIGttc0tleTogc2VjdXJpdHlTdGFjay5rbXNLZXksXG59KTtcblxuLy8gQUxCIFN0YWNrIC0gQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlciB3aXRoIEhUVFBTIGFuZCBXQUZcbmNvbnN0IGFsYlN0YWNrID0gbmV3IEFsYlN0YWNrKGFwcCwgYE1lbnRhbFNwYWNlLUFMQi0ke2Vudmlyb25tZW50fWAsIHtcbiAgZW52LFxuICBkZXNjcmlwdGlvbjogYE1lbnRhbFNwYWNlIEVIUiBWMiAtIExvYWQgQmFsYW5jZXIgKCR7ZW52aXJvbm1lbnR9KWAsXG4gIHRhZ3MsXG4gIGVudmlyb25tZW50LFxuICB2cGM6IG5ldHdvcmtTdGFjay52cGMsXG4gIGFsYlNlY3VyaXR5R3JvdXA6IG5ldHdvcmtTdGFjay5hbGJTZWN1cml0eUdyb3VwLFxuICBkb21haW5OYW1lLFxuICBob3N0ZWRab25lSWQsXG4gIGNlcnRpZmljYXRlQXJuLFxufSk7XG5cbi8vIEVDUiBTdGFjayAtIERvY2tlciBpbWFnZSByZXBvc2l0b3J5IChkZXBsb3kgZmlyc3QsIGJlZm9yZSBDb21wdXRlIHN0YWNrKVxuY29uc3QgZWNyU3RhY2sgPSBuZXcgRWNyU3RhY2soYXBwLCBgTWVudGFsU3BhY2UtRUNSLSR7ZW52aXJvbm1lbnR9YCwge1xuICBlbnYsXG4gIGRlc2NyaXB0aW9uOiBgTWVudGFsU3BhY2UgRUhSIFYyIC0gQ29udGFpbmVyIFJlZ2lzdHJ5ICgke2Vudmlyb25tZW50fSlgLFxuICB0YWdzLFxuICBlbnZpcm9ubWVudCxcbn0pO1xuXG4vLyBDb21wdXRlIFN0YWNrIC0gRUNTIEZhcmdhdGUgZm9yIGJhY2tlbmQgQVBJIChyZXF1aXJlcyBEb2NrZXIgaW1hZ2UgaW4gRUNSKVxuY29uc3QgY29tcHV0ZVN0YWNrID0gbmV3IENvbXB1dGVTdGFjayhhcHAsIGBNZW50YWxTcGFjZS1Db21wdXRlLSR7ZW52aXJvbm1lbnR9YCwge1xuICBlbnYsXG4gIGRlc2NyaXB0aW9uOiBgTWVudGFsU3BhY2UgRUhSIFYyIC0gQ29tcHV0ZSBJbmZyYXN0cnVjdHVyZSAoJHtlbnZpcm9ubWVudH0pYCxcbiAgdGFncyxcbiAgZW52aXJvbm1lbnQsXG4gIHZwYzogbmV0d29ya1N0YWNrLnZwYyxcbiAgYXBwU2VjdXJpdHlHcm91cDogbmV0d29ya1N0YWNrLmFwcFNlY3VyaXR5R3JvdXAsXG4gIHRhcmdldEdyb3VwOiBhbGJTdGFjay50YXJnZXRHcm91cCxcbiAgaHR0cHNMaXN0ZW5lcjogYWxiU3RhY2suaHR0cHNMaXN0ZW5lcixcbiAgZGF0YWJhc2VTZWNyZXQ6IGRhdGFiYXNlU3RhY2suZGF0YWJhc2VTZWNyZXQsXG4gIHJlcG9zaXRvcnk6IGVjclN0YWNrLnJlcG9zaXRvcnksXG59KTtcblxuLy8gTW9uaXRvcmluZyBTdGFjayAtIENsb3VkV2F0Y2ggRGFzaGJvYXJkcyBhbmQgQWxhcm1zXG5jb25zdCBtb25pdG9yaW5nU3RhY2sgPSBuZXcgTW9uaXRvcmluZ1N0YWNrKGFwcCwgYE1lbnRhbFNwYWNlLU1vbml0b3JpbmctJHtlbnZpcm9ubWVudH1gLCB7XG4gIGVudixcbiAgZGVzY3JpcHRpb246IGBNZW50YWxTcGFjZSBFSFIgVjIgLSBNb25pdG9yaW5nIEluZnJhc3RydWN0dXJlICgke2Vudmlyb25tZW50fSlgLFxuICB0YWdzLFxuICBlbnZpcm9ubWVudCxcbiAgcmRzSW5zdGFuY2U6IGRhdGFiYXNlU3RhY2sucmRzSW5zdGFuY2UsXG4gIGFsZXJ0RW1haWw6ICdhbGVydHNAbWVudGFsc3BhY2VlaHIuY29tJywgLy8gVXBkYXRlIHdpdGggeW91ciBlbWFpbFxufSk7XG5cbi8vIEZyb250ZW5kIFN0YWNrIC0gUzMgKyBDbG91ZEZyb250IGZvciBSZWFjdCBhcHBcbi8vIERlcGxveWVkIG1hbnVhbGx5IHRvIFMzLCBub3QgdXNpbmcgQ0RLIHN0YWNrIGZvciBub3dcbi8vIGNvbnN0IGZyb250ZW5kU3RhY2sgPSBuZXcgRnJvbnRlbmRTdGFjayhhcHAsIGBNZW50YWxTcGFjZS1Gcm9udGVuZC0ke2Vudmlyb25tZW50fWAsIHtcbi8vICAgZW52LFxuLy8gICBkZXNjcmlwdGlvbjogYE1lbnRhbFNwYWNlIEVIUiBWMiAtIEZyb250ZW5kIEluZnJhc3RydWN0dXJlICgke2Vudmlyb25tZW50fSlgLFxuLy8gICB0YWdzLFxuLy8gICBlbnZpcm9ubWVudCxcbi8vIH0pO1xuXG4vLyBBZGQgc3RhY2sgZGVwZW5kZW5jaWVzXG5zZWN1cml0eVN0YWNrLmFkZERlcGVuZGVuY3kobmV0d29ya1N0YWNrKTtcbmRhdGFiYXNlU3RhY2suYWRkRGVwZW5kZW5jeShuZXR3b3JrU3RhY2spO1xuZGF0YWJhc2VTdGFjay5hZGREZXBlbmRlbmN5KHNlY3VyaXR5U3RhY2spO1xuYWxiU3RhY2suYWRkRGVwZW5kZW5jeShuZXR3b3JrU3RhY2spO1xuLy8gRUNSIGlzIGluZGVwZW5kZW50LCBjYW4gZGVwbG95IGltbWVkaWF0ZWx5XG5jb21wdXRlU3RhY2suYWRkRGVwZW5kZW5jeShuZXR3b3JrU3RhY2spO1xuY29tcHV0ZVN0YWNrLmFkZERlcGVuZGVuY3koZGF0YWJhc2VTdGFjayk7XG5jb21wdXRlU3RhY2suYWRkRGVwZW5kZW5jeShhbGJTdGFjayk7XG5jb21wdXRlU3RhY2suYWRkRGVwZW5kZW5jeShlY3JTdGFjayk7IC8vIE5lZWQgRUNSIHJlcG8gYmVmb3JlIGRlcGxveWluZyBFQ1Ncbm1vbml0b3JpbmdTdGFjay5hZGREZXBlbmRlbmN5KGRhdGFiYXNlU3RhY2spO1xuLy8gRnJvbnRlbmQgaXMgaW5kZXBlbmRlbnRcblxuYXBwLnN5bnRoKCk7XG4iXX0=