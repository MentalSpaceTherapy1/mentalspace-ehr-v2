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
exports.NetworkStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
class NetworkStack extends cdk.Stack {
    vpc;
    bastionSecurityGroup;
    albSecurityGroup;
    appSecurityGroup;
    dbSecurityGroup;
    constructor(scope, id, props) {
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
        this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS from internet');
        // HTTP (redirect to HTTPS)
        this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP from internet (redirect to HTTPS)');
        // Security Group for Application (Lambda/ECS)
        this.appSecurityGroup = new ec2.SecurityGroup(this, 'AppSecurityGroup', {
            vpc: this.vpc,
            securityGroupName: `MentalSpace-App-SG-${environment}`,
            description: 'Security group for application tier',
            allowAllOutbound: true,
        });
        // Allow inbound from ALB
        this.appSecurityGroup.addIngressRule(this.albSecurityGroup, ec2.Port.allTraffic(), 'Traffic from ALB');
        // Security Group for Database
        this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
            vpc: this.vpc,
            securityGroupName: `MentalSpace-DB-SG-${environment}`,
            description: 'Security group for RDS database',
            allowAllOutbound: false, // Restrict outbound for database
        });
        // Allow PostgreSQL from app security group
        this.dbSecurityGroup.addIngressRule(this.appSecurityGroup, ec2.Port.tcp(5432), 'PostgreSQL from application tier');
        // Allow PostgreSQL from bastion (for management)
        this.dbSecurityGroup.addIngressRule(this.bastionSecurityGroup, ec2.Port.tcp(5432), 'PostgreSQL from bastion host');
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
exports.NetworkStack = NetworkStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5ldHdvcmstc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHlEQUEyQztBQU8zQyxNQUFhLFlBQWEsU0FBUSxHQUFHLENBQUMsS0FBSztJQUN6QixHQUFHLENBQVU7SUFDYixvQkFBb0IsQ0FBb0I7SUFDeEMsZ0JBQWdCLENBQW9CO0lBQ3BDLGdCQUFnQixDQUFvQjtJQUNwQyxlQUFlLENBQW9CO0lBRW5ELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBd0I7UUFDaEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUU5Qiw2Q0FBNkM7UUFDN0MsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQzdDLE9BQU8sRUFBRSxtQkFBbUIsV0FBVyxFQUFFO1lBQ3pDLFdBQVcsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7WUFDaEQsTUFBTSxFQUFFLENBQUM7WUFDVCxXQUFXLEVBQUUsV0FBVyxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsNEJBQTRCO1lBQ3pFLG1CQUFtQixFQUFFO2dCQUNuQjtvQkFDRSxRQUFRLEVBQUUsRUFBRTtvQkFDWixJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNO2lCQUNsQztnQkFDRDtvQkFDRSxRQUFRLEVBQUUsRUFBRTtvQkFDWixJQUFJLEVBQUUsU0FBUztvQkFDZixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FB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Q0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBcktELG9DQXFLQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBOZXR3b3JrU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIE5ldHdvcmtTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSB2cGM6IGVjMi5WcGM7XG4gIHB1YmxpYyByZWFkb25seSBiYXN0aW9uU2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXA7XG4gIHB1YmxpYyByZWFkb25seSBhbGJTZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcbiAgcHVibGljIHJlYWRvbmx5IGFwcFNlY3VyaXR5R3JvdXA6IGVjMi5TZWN1cml0eUdyb3VwO1xuICBwdWJsaWMgcmVhZG9ubHkgZGJTZWN1cml0eUdyb3VwOiBlYzIuU2VjdXJpdHlHcm91cDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTmV0d29ya1N0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQgfSA9IHByb3BzO1xuXG4gICAgLy8gVlBDIHdpdGggMyBBWnMsIHB1YmxpYyBhbmQgcHJpdmF0ZSBzdWJuZXRzXG4gICAgdGhpcy52cGMgPSBuZXcgZWMyLlZwYyh0aGlzLCAnTWVudGFsU3BhY2VWUEMnLCB7XG4gICAgICB2cGNOYW1lOiBgTWVudGFsU3BhY2UtVlBDLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGlwQWRkcmVzc2VzOiBlYzIuSXBBZGRyZXNzZXMuY2lkcignMTAuMC4wLjAvMTYnKSxcbiAgICAgIG1heEF6czogMyxcbiAgICAgIG5hdEdhdGV3YXlzOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gMyA6IDEsIC8vIENvc3Qgb3B0aW1pemF0aW9uIGZvciBkZXZcbiAgICAgIHN1Ym5ldENvbmZpZ3VyYXRpb246IFtcbiAgICAgICAge1xuICAgICAgICAgIGNpZHJNYXNrOiAyNCxcbiAgICAgICAgICBuYW1lOiAnUHVibGljJyxcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBjaWRyTWFzazogMjQsXG4gICAgICAgICAgbmFtZTogJ1ByaXZhdGUnLFxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBjaWRyTWFzazogMjgsXG4gICAgICAgICAgbmFtZTogJ0lzb2xhdGVkJyxcbiAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICAgIGVuYWJsZURuc0hvc3RuYW1lczogdHJ1ZSxcbiAgICAgIGVuYWJsZURuc1N1cHBvcnQ6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBWUEMgRmxvdyBMb2dzIGZvciBzZWN1cml0eSBtb25pdG9yaW5nXG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgY2RrLmF3c19sb2dzLkxvZ0dyb3VwKHRoaXMsICdWUENGbG93TG9nR3JvdXAnLCB7XG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL3ZwYy9tZW50YWxzcGFjZS0ke2Vudmlyb25tZW50fWAsXG4gICAgICByZXRlbnRpb246IGNkay5hd3NfbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZmxvd0xvZ1JvbGUgPSBuZXcgY2RrLmF3c19pYW0uUm9sZSh0aGlzLCAnVlBDRmxvd0xvZ1JvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBjZGsuYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKCd2cGMtZmxvdy1sb2dzLmFtYXpvbmF3cy5jb20nKSxcbiAgICB9KTtcblxuICAgIG5ldyBlYzIuRmxvd0xvZyh0aGlzLCAnVlBDRmxvd0xvZycsIHtcbiAgICAgIHJlc291cmNlVHlwZTogZWMyLkZsb3dMb2dSZXNvdXJjZVR5cGUuZnJvbVZwYyh0aGlzLnZwYyksXG4gICAgICBkZXN0aW5hdGlvbjogZWMyLkZsb3dMb2dEZXN0aW5hdGlvbi50b0Nsb3VkV2F0Y2hMb2dzKGxvZ0dyb3VwLCBmbG93TG9nUm9sZSksXG4gICAgfSk7XG5cbiAgICAvLyBTZWN1cml0eSBHcm91cCBmb3IgQmFzdGlvbiBIb3N0IChvcHRpb25hbCAtIGZvciB0cm91Ymxlc2hvb3RpbmcpXG4gICAgdGhpcy5iYXN0aW9uU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnQmFzdGlvblNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICB2cGM6IHRoaXMudnBjLFxuICAgICAgc2VjdXJpdHlHcm91cE5hbWU6IGBNZW50YWxTcGFjZS1CYXN0aW9uLVNHLSR7ZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIGJhc3Rpb24gaG9zdCcsXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gUmVzdHJpY3QgU1NIIHRvIHNwZWNpZmljIElQICh1cGRhdGUgd2l0aCB5b3VyIElQKVxuICAgIC8vIHRoaXMuYmFzdGlvblNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgLy8gICBlYzIuUGVlci5pcHY0KCdZT1VSX0lQLzMyJyksXG4gICAgLy8gICBlYzIuUG9ydC50Y3AoMjIpLFxuICAgIC8vICAgJ1NTSCBhY2Nlc3MgZnJvbSBzcGVjaWZpYyBJUCdcbiAgICAvLyApO1xuXG4gICAgLy8gU2VjdXJpdHkgR3JvdXAgZm9yIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXJcbiAgICB0aGlzLmFsYlNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0FMQlNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICB2cGM6IHRoaXMudnBjLFxuICAgICAgc2VjdXJpdHlHcm91cE5hbWU6IGBNZW50YWxTcGFjZS1BTEItU0ctJHtlbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlcicsXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gSFRUUFMgZnJvbSBpbnRlcm5ldFxuICAgIHRoaXMuYWxiU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCg0NDMpLFxuICAgICAgJ0hUVFBTIGZyb20gaW50ZXJuZXQnXG4gICAgKTtcblxuICAgIC8vIEhUVFAgKHJlZGlyZWN0IHRvIEhUVFBTKVxuICAgIHRoaXMuYWxiU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCg4MCksXG4gICAgICAnSFRUUCBmcm9tIGludGVybmV0IChyZWRpcmVjdCB0byBIVFRQUyknXG4gICAgKTtcblxuICAgIC8vIFNlY3VyaXR5IEdyb3VwIGZvciBBcHBsaWNhdGlvbiAoTGFtYmRhL0VDUylcbiAgICB0aGlzLmFwcFNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0FwcFNlY3VyaXR5R3JvdXAnLCB7XG4gICAgICB2cGM6IHRoaXMudnBjLFxuICAgICAgc2VjdXJpdHlHcm91cE5hbWU6IGBNZW50YWxTcGFjZS1BcHAtU0ctJHtlbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgYXBwbGljYXRpb24gdGllcicsXG4gICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQWxsb3cgaW5ib3VuZCBmcm9tIEFMQlxuICAgIHRoaXMuYXBwU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgIHRoaXMuYWxiU2VjdXJpdHlHcm91cCxcbiAgICAgIGVjMi5Qb3J0LmFsbFRyYWZmaWMoKSxcbiAgICAgICdUcmFmZmljIGZyb20gQUxCJ1xuICAgICk7XG5cbiAgICAvLyBTZWN1cml0eSBHcm91cCBmb3IgRGF0YWJhc2VcbiAgICB0aGlzLmRiU2VjdXJpdHlHcm91cCA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCAnREJTZWN1cml0eUdyb3VwJywge1xuICAgICAgdnBjOiB0aGlzLnZwYyxcbiAgICAgIHNlY3VyaXR5R3JvdXBOYW1lOiBgTWVudGFsU3BhY2UtREItU0ctJHtlbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdTZWN1cml0eSBncm91cCBmb3IgUkRTIGRhdGFiYXNlJyxcbiAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IGZhbHNlLCAvLyBSZXN0cmljdCBvdXRib3VuZCBmb3IgZGF0YWJhc2VcbiAgICB9KTtcblxuICAgIC8vIEFsbG93IFBvc3RncmVTUUwgZnJvbSBhcHAgc2VjdXJpdHkgZ3JvdXBcbiAgICB0aGlzLmRiU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShcbiAgICAgIHRoaXMuYXBwU2VjdXJpdHlHcm91cCxcbiAgICAgIGVjMi5Qb3J0LnRjcCg1NDMyKSxcbiAgICAgICdQb3N0Z3JlU1FMIGZyb20gYXBwbGljYXRpb24gdGllcidcbiAgICApO1xuXG4gICAgLy8gQWxsb3cgUG9zdGdyZVNRTCBmcm9tIGJhc3Rpb24gKGZvciBtYW5hZ2VtZW50KVxuICAgIHRoaXMuZGJTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgdGhpcy5iYXN0aW9uU2VjdXJpdHlHcm91cCxcbiAgICAgIGVjMi5Qb3J0LnRjcCg1NDMyKSxcbiAgICAgICdQb3N0Z3JlU1FMIGZyb20gYmFzdGlvbiBob3N0J1xuICAgICk7XG5cbiAgICAvLyBWUEMgRW5kcG9pbnRzIGZvciBBV1Mgc2VydmljZXMgKHJlZHVjZSBOQVQgY29zdHMpXG4gICAgdGhpcy52cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoJ1NlY3JldHNNYW5hZ2VyRW5kcG9pbnQnLCB7XG4gICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLlNFQ1JFVFNfTUFOQUdFUixcbiAgICAgIHN1Ym5ldHM6IHsgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy52cGMuYWRkR2F0ZXdheUVuZHBvaW50KCdTM0VuZHBvaW50Jywge1xuICAgICAgc2VydmljZTogZWMyLkdhdGV3YXlWcGNFbmRwb2ludEF3c1NlcnZpY2UuUzMsXG4gICAgfSk7XG5cbiAgICB0aGlzLnZwYy5hZGRHYXRld2F5RW5kcG9pbnQoJ0R5bmFtb0RCRW5kcG9pbnQnLCB7XG4gICAgICBzZXJ2aWNlOiBlYzIuR2F0ZXdheVZwY0VuZHBvaW50QXdzU2VydmljZS5EWU5BTU9EQixcbiAgICB9KTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVnBjSWQnLCB7XG4gICAgICB2YWx1ZTogdGhpcy52cGMudnBjSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ1ZQQyBJRCcsXG4gICAgICBleHBvcnROYW1lOiBgTWVudGFsU3BhY2UtVlBDLUlELSR7ZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdWcGNDaWRyJywge1xuICAgICAgdmFsdWU6IHRoaXMudnBjLnZwY0NpZHJCbG9jayxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVlBDIENJRFIgQmxvY2snLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1ByaXZhdGVTdWJuZXRJZHMnLCB7XG4gICAgICB2YWx1ZTogdGhpcy52cGMucHJpdmF0ZVN1Ym5ldHMubWFwKHMgPT4gcy5zdWJuZXRJZCkuam9pbignLCcpLFxuICAgICAgZGVzY3JpcHRpb246ICdQcml2YXRlIFN1Ym5ldCBJRHMnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0lzb2xhdGVkU3VibmV0SWRzJywge1xuICAgICAgdmFsdWU6IHRoaXMudnBjLmlzb2xhdGVkU3VibmV0cy5tYXAocyA9PiBzLnN1Ym5ldElkKS5qb2luKCcsJyksXG4gICAgICBkZXNjcmlwdGlvbjogJ0lzb2xhdGVkIFN1Ym5ldCBJRHMnLFxuICAgIH0pO1xuICB9XG59XG4iXX0=