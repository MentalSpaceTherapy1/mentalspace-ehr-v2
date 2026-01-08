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
export declare class DatabaseStack extends cdk.Stack {
    readonly rdsInstance: rds.DatabaseInstance;
    readonly databaseSecret: cdk.aws_secretsmanager.ISecret;
    readonly sessionsTable: dynamodb.Table;
    readonly cacheTable: dynamodb.Table;
    constructor(scope: Construct, id: string, props: DatabaseStackProps);
}
