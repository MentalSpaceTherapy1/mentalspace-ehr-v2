import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
export interface AlbStackProps extends cdk.StackProps {
    environment: string;
    vpc: ec2.Vpc;
    albSecurityGroup: ec2.SecurityGroup;
    domainName: string;
    hostedZoneId?: string;
    certificateArn?: string;
}
export declare class AlbStack extends cdk.Stack {
    readonly alb: elbv2.ApplicationLoadBalancer;
    readonly httpsListener: elbv2.ApplicationListener;
    readonly targetGroup: elbv2.ApplicationTargetGroup;
    constructor(scope: Construct, id: string, props: AlbStackProps);
}
