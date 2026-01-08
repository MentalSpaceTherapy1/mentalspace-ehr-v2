import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
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
export declare class ComputeStack extends cdk.Stack {
    readonly cluster: ecs.Cluster;
    readonly service: ecs.FargateService;
    constructor(scope: Construct, id: string, props: ComputeStackProps);
}
