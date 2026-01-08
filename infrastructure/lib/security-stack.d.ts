import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
export interface SecurityStackProps extends cdk.StackProps {
    environment: string;
    vpc: ec2.Vpc;
}
export declare class SecurityStack extends cdk.Stack {
    readonly kmsKey: kms.Key;
    readonly dbCredentialsSecret: secretsmanager.Secret;
    constructor(scope: Construct, id: string, props: SecurityStackProps);
}
