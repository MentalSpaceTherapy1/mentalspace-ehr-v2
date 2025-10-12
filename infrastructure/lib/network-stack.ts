import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface NetworkStackProps extends cdk.StackProps {
  environment: string;
}

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly bastionSecurityGroup: ec2.SecurityGroup;
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly appSecurityGroup: ec2.SecurityGroup;
  public readonly dbSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // VPC with 3 AZs, public and private subnets
    this.vpc = new ec2.Vpc(this, 'MentalSpaceVPC', {
      vpcName: `MentalSpace-VPC-${environment}`,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 3,
      natGateways: environment === 'prod' ? 3 : 1, // Cost optimization for dev
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 28,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    // VPC Flow Logs for security monitoring
    const logGroup = new cdk.aws_logs.LogGroup(this, 'VPCFlowLogGroup', {
      logGroupName: `/aws/vpc/mentalspace-${environment}`,
      retention: cdk.aws_logs.RetentionDays.ONE_MONTH,
      removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const flowLogRole = new cdk.aws_iam.Role(this, 'VPCFlowLogRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
    });

    new ec2.FlowLog(this, 'VPCFlowLog', {
      resourceType: ec2.FlowLogResourceType.fromVpc(this.vpc),
      destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup, flowLogRole),
    });

    // Security Group for Bastion Host (optional - for troubleshooting)
    this.bastionSecurityGroup = new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `MentalSpace-Bastion-SG-${environment}`,
      description: 'Security group for bastion host',
      allowAllOutbound: true,
    });

    // Restrict SSH to specific IP (update with your IP)
    // this.bastionSecurityGroup.addIngressRule(
    //   ec2.Peer.ipv4('YOUR_IP/32'),
    //   ec2.Port.tcp(22),
    //   'SSH access from specific IP'
    // );

    // Security Group for Application Load Balancer
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `MentalSpace-ALB-SG-${environment}`,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    // HTTPS from internet
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'HTTPS from internet'
    );

    // HTTP (redirect to HTTPS)
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'HTTP from internet (redirect to HTTPS)'
    );

    // Security Group for Application (Lambda/ECS)
    this.appSecurityGroup = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `MentalSpace-App-SG-${environment}`,
      description: 'Security group for application tier',
      allowAllOutbound: true,
    });

    // Allow inbound from ALB
    this.appSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.allTraffic(),
      'Traffic from ALB'
    );

    // Security Group for Database
    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc: this.vpc,
      securityGroupName: `MentalSpace-DB-SG-${environment}`,
      description: 'Security group for RDS database',
      allowAllOutbound: false, // Restrict outbound for database
    });

    // Allow PostgreSQL from app security group
    this.dbSecurityGroup.addIngressRule(
      this.appSecurityGroup,
      ec2.Port.tcp(5432),
      'PostgreSQL from application tier'
    );

    // Allow PostgreSQL from bastion (for management)
    this.dbSecurityGroup.addIngressRule(
      this.bastionSecurityGroup,
      ec2.Port.tcp(5432),
      'PostgreSQL from bastion host'
    );

    // VPC Endpoints for AWS services (reduce NAT costs)
    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    this.vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    this.vpc.addGatewayEndpoint('DynamoDBEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
    });

    // Outputs
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: `MentalSpace-VPC-ID-${environment}`,
    });

    new cdk.CfnOutput(this, 'VpcCidr', {
      value: this.vpc.vpcCidrBlock,
      description: 'VPC CIDR Block',
    });

    new cdk.CfnOutput(this, 'PrivateSubnetIds', {
      value: this.vpc.privateSubnets.map(s => s.subnetId).join(','),
      description: 'Private Subnet IDs',
    });

    new cdk.CfnOutput(this, 'IsolatedSubnetIds', {
      value: this.vpc.isolatedSubnets.map(s => s.subnetId).join(','),
      description: 'Isolated Subnet IDs',
    });
  }
}
