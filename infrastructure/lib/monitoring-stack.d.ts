import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
export interface MonitoringStackProps extends cdk.StackProps {
    environment: string;
    rdsInstance: rds.DatabaseInstance;
    apiLambda?: lambda.Function;
    alertEmail: string;
}
export declare class MonitoringStack extends cdk.Stack {
    readonly alarmTopic: sns.Topic;
    constructor(scope: Construct, id: string, props: MonitoringStackProps);
}
