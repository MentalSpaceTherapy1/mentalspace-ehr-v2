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
exports.AlbStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const elbv2 = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const wafv2 = __importStar(require("aws-cdk-lib/aws-wafv2"));
class AlbStack extends cdk.Stack {
    alb;
    httpsListener;
    targetGroup;
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment, vpc, albSecurityGroup, domainName, hostedZoneId, certificateArn } = props;
        // Application Load Balancer
        this.alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
            vpc,
            internetFacing: true,
            loadBalancerName: `mentalspace-ehr-${environment}`,
            securityGroup: albSecurityGroup,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC,
            },
            deletionProtection: environment === 'prod',
            http2Enabled: true,
            idleTimeout: cdk.Duration.seconds(60),
        });
        // Access Logs (Optional but recommended for production)
        if (environment === 'prod') {
            // TODO: Create S3 bucket for ALB access logs
            // this.alb.logAccessLogs(accessLogsBucket);
        }
        // SSL Certificate (Optional for initial setup)
        let certificate;
        if (certificateArn) {
            // Use existing certificate
            certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', certificateArn);
        }
        else if (hostedZoneId) {
            // Create new certificate
            // Note: This requires DNS validation via Route 53
            const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
                hostedZoneId,
                zoneName: domainName,
            });
            certificate = new acm.Certificate(this, 'Certificate', {
                domainName: environment === 'prod' ? domainName : `${environment}.${domainName}`,
                validation: acm.CertificateValidation.fromDns(hostedZone),
            });
        }
        // If no certificate available, we'll create HTTP-only listener for initial setup
        // Target Group
        this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
            vpc,
            port: 3001,
            protocol: elbv2.ApplicationProtocol.HTTP,
            targetType: elbv2.TargetType.IP,
            healthCheck: {
                enabled: true,
                path: '/api/v1/health/live',
                protocol: elbv2.Protocol.HTTP,
                healthyThresholdCount: 2,
                unhealthyThresholdCount: 3,
                timeout: cdk.Duration.seconds(5),
                interval: cdk.Duration.seconds(30),
                healthyHttpCodes: '200',
            },
            deregistrationDelay: cdk.Duration.seconds(30),
            targetGroupName: `mentalspace-tg-${environment}`,
        });
        // HTTPS Listener (if certificate available)
        if (certificate) {
            this.httpsListener = this.alb.addListener('HttpsListener', {
                port: 443,
                protocol: elbv2.ApplicationProtocol.HTTPS,
                certificates: [certificate],
                sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS,
                defaultTargetGroups: [this.targetGroup],
            });
            // HTTP Listener (Redirect to HTTPS)
            this.alb.addListener('HttpListener', {
                port: 80,
                protocol: elbv2.ApplicationProtocol.HTTP,
                defaultAction: elbv2.ListenerAction.redirect({
                    protocol: 'HTTPS',
                    port: '443',
                    permanent: true,
                }),
            });
        }
        else {
            // HTTP-only listener for initial setup (no certificate yet)
            this.httpsListener = this.alb.addListener('HttpListener', {
                port: 80,
                protocol: elbv2.ApplicationProtocol.HTTP,
                defaultTargetGroups: [this.targetGroup],
            });
            new cdk.CfnOutput(this, 'NoCertificateWarning', {
                value: 'WARNING: ALB is HTTP-only. Add certificate for production!',
                description: 'Certificate Warning',
            });
        }
        // WAF Web ACL for ALB
        const webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
            scope: 'REGIONAL',
            defaultAction: { allow: {} },
            name: `mentalspace-waf-${environment}`,
            description: 'WAF rules for MentalSpace EHR API',
            rules: [
                // Rate limiting rule
                {
                    name: 'RateLimit',
                    priority: 1,
                    statement: {
                        rateBasedStatement: {
                            limit: 2000, // 2000 requests per 5 minutes per IP
                            aggregateKeyType: 'IP',
                        },
                    },
                    action: { block: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'RateLimit',
                    },
                },
                // AWS Managed Rules - Core Rule Set
                {
                    name: 'AWSManagedRulesCommonRuleSet',
                    priority: 2,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesCommonRuleSet',
                            excludedRules: [],
                        },
                    },
                    overrideAction: { none: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWSManagedRulesCommonRuleSetMetric',
                    },
                },
                // AWS Managed Rules - Known Bad Inputs
                {
                    name: 'AWSManagedRulesKnownBadInputsRuleSet',
                    priority: 3,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesKnownBadInputsRuleSet',
                        },
                    },
                    overrideAction: { none: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWSManagedRulesKnownBadInputsRuleSetMetric',
                    },
                },
                // AWS Managed Rules - SQL Injection
                {
                    name: 'AWSManagedRulesSQLiRuleSet',
                    priority: 4,
                    statement: {
                        managedRuleGroupStatement: {
                            vendorName: 'AWS',
                            name: 'AWSManagedRulesSQLiRuleSet',
                        },
                    },
                    overrideAction: { none: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWSManagedRulesSQLiRuleSetMetric',
                    },
                },
                // Block requests without User-Agent header
                {
                    name: 'BlockMissingUserAgent',
                    priority: 5,
                    statement: {
                        notStatement: {
                            statement: {
                                sizeConstraintStatement: {
                                    fieldToMatch: {
                                        singleHeader: { name: 'user-agent' },
                                    },
                                    comparisonOperator: 'GT',
                                    size: 0,
                                    textTransformations: [{ priority: 0, type: 'NONE' }],
                                },
                            },
                        },
                    },
                    action: { block: {} },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'BlockMissingUserAgent',
                    },
                },
                // Geo-blocking (example: allow only US)
                // Uncomment if needed
                // {
                //   name: 'GeoBlocking',
                //   priority: 6,
                //   statement: {
                //     notStatement: {
                //       statement: {
                //         geoMatchStatement: {
                //           countryCodes: ['US'],
                //         },
                //       },
                //     },
                //   },
                //   action: { block: {} },
                //   visibilityConfig: {
                //     sampledRequestsEnabled: true,
                //     cloudWatchMetricsEnabled: true,
                //     metricName: 'GeoBlocking',
                //   },
                // },
            ],
            visibilityConfig: {
                sampledRequestsEnabled: true,
                cloudWatchMetricsEnabled: true,
                metricName: `mentalspace-waf-${environment}`,
            },
        });
        // Associate WAF with ALB
        new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
            resourceArn: this.alb.loadBalancerArn,
            webAclArn: webAcl.attrArn,
        });
        // Route 53 Alias Record (if hosted zone provided)
        if (hostedZoneId) {
            const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZoneForAlias', {
                hostedZoneId,
                zoneName: domainName,
            });
            new route53.ARecord(this, 'AliasRecord', {
                zone: hostedZone,
                recordName: environment === 'prod' ? domainName : `${environment}.${domainName}`,
                target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(this.alb)),
            });
        }
        // Outputs
        new cdk.CfnOutput(this, 'LoadBalancerDNS', {
            value: this.alb.loadBalancerDnsName,
            description: 'Load Balancer DNS Name',
            exportName: `MentalSpace-ALB-DNS-${environment}`,
        });
        new cdk.CfnOutput(this, 'LoadBalancerArn', {
            value: this.alb.loadBalancerArn,
            description: 'Load Balancer ARN',
            exportName: `MentalSpace-ALB-ARN-${environment}`,
        });
        new cdk.CfnOutput(this, 'TargetGroupArn', {
            value: this.targetGroup.targetGroupArn,
            description: 'Target Group ARN',
            exportName: `MentalSpace-TG-ARN-${environment}`,
        });
        new cdk.CfnOutput(this, 'ALBSecurityGroupId', {
            value: albSecurityGroup.securityGroupId,
            description: 'ALB Security Group ID',
            exportName: `MentalSpace-ALB-SG-${environment}`,
        });
        new cdk.CfnOutput(this, 'WebACLArn', {
            value: webAcl.attrArn,
            description: 'WAF Web ACL ARN',
            exportName: `MentalSpace-WAF-ARN-${environment}`,
        });
        if (hostedZoneId) {
            const recordName = environment === 'prod' ? domainName : `${environment}.${domainName}`;
            new cdk.CfnOutput(this, 'DomainName', {
                value: `https://${recordName}`,
                description: 'Application URL',
            });
        }
    }
}
exports.AlbStack = AlbStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxiLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYWxiLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5REFBMkM7QUFDM0MsOEVBQWdFO0FBQ2hFLHdFQUEwRDtBQUMxRCxpRUFBbUQ7QUFDbkQseUVBQTJEO0FBQzNELDZEQUErQztBQVkvQyxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNyQixHQUFHLENBQWdDO0lBQ25DLGFBQWEsQ0FBNEI7SUFDekMsV0FBVyxDQUErQjtJQUUxRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW9CO1FBQzVELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBRS9GLDRCQUE0QjtRQUM1QixJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7WUFDeEQsR0FBRztZQUNILGNBQWMsRUFBRSxJQUFJO1lBQ3BCLGdCQUFnQixFQUFFLG1CQUFtQixXQUFXLEVBQUU7WUFDbEQsYUFBYSxFQUFFLGdCQUFnQjtZQUMvQixVQUFVLEVBQUU7Z0JBQ1YsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTTthQUNsQztZQUNELGtCQUFrQixFQUFFLFdBQVcsS0FBSyxNQUFNO1lBQzFDLFlBQVksRUFBRSxJQUFJO1lBQ2xCLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDdEMsQ0FBQyxDQUFDO1FBRUgsd0RBQXdEO1FBQ3hELElBQUksV0FBVyxLQUFLLE1BQU0sRUFB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QXVCLFdBQVcsRUFBRTtTQUNqRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3hDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWM7WUFDdEMsV0FBVyxFQUFFLGtCQUFrQjtZQUMvQixVQUFVLEVBQUUsc0JBQXNCLFdBQVcsRUFBRTtTQUNoRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxlQUFlO1lBQ3ZDLFdBQVcsRUFBRSx1QkFBdUI7WUFDcEMsVUFBVSxFQUFFLHNCQUFzQixXQUFXLEVBQUU7U0FDaEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDbkMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1lBQ3JCLFdBQVcsRUFBRSxpQkFBaUI7WUFDOUIsVUFBVSxFQUFFLHVCQUF1QixXQUFXLEVBQUU7U0FDakQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNqQixNQUFNLFVBQVUsR0FBRyxXQUFXLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsV0FBVyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ3hGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO2dCQUNwQyxLQUFLLEVBQUUsV0FBVyxVQUFVLEVBQUU7Z0JBQzlCLFdBQVcsRUFBRSxpQkFBaUI7YUFDL0IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7Q0FDRjtBQXBURCw0QkFvVEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgZWxidjIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNsb2FkYmFsYW5jaW5ndjInO1xuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xuaW1wb3J0ICogYXMgd2FmdjIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXdhZnYyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFsYlN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIHZwYzogZWMyLlZwYztcbiAgYWxiU2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXA7XG4gIGRvbWFpbk5hbWU6IHN0cmluZztcbiAgaG9zdGVkWm9uZUlkPzogc3RyaW5nO1xuICBjZXJ0aWZpY2F0ZUFybj86IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIEFsYlN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGFsYjogZWxidjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXI7XG4gIHB1YmxpYyByZWFkb25seSBodHRwc0xpc3RlbmVyOiBlbGJ2Mi5BcHBsaWNhdGlvbkxpc3RlbmVyO1xuICBwdWJsaWMgcmVhZG9ubHkgdGFyZ2V0R3JvdXA6IGVsYnYyLkFwcGxpY2F0aW9uVGFyZ2V0R3JvdXA7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFsYlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQsIHZwYywgYWxiU2VjdXJpdHlHcm91cCwgZG9tYWluTmFtZSwgaG9zdGVkWm9uZUlkLCBjZXJ0aWZpY2F0ZUFybiB9ID0gcHJvcHM7XG5cbiAgICAvLyBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyXG4gICAgdGhpcy5hbGIgPSBuZXcgZWxidjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXIodGhpcywgJ0FMQicsIHtcbiAgICAgIHZwYyxcbiAgICAgIGludGVybmV0RmFjaW5nOiB0cnVlLFxuICAgICAgbG9hZEJhbGFuY2VyTmFtZTogYG1lbnRhbHNwYWNlLWVoci0ke2Vudmlyb25tZW50fWAsXG4gICAgICBzZWN1cml0eUdyb3VwOiBhbGJTZWN1cml0eUdyb3VwLFxuICAgICAgdnBjU3VibmV0czoge1xuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICB9LFxuICAgICAgZGVsZXRpb25Qcm90ZWN0aW9uOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxuICAgICAgaHR0cDJFbmFibGVkOiB0cnVlLFxuICAgICAgaWRsZVRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcbiAgICB9KTtcblxuICAgIC8vIEFjY2VzcyBMb2dzIChPcHRpb25hbCBidXQgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb24pXG4gICAgaWYgKGVudmlyb25tZW50ID09PSAncHJvZCcpIHtcbiAgICAgIC8vIFRPRE86IENyZWF0ZSBTMyBidWNrZXQgZm9yIEFMQiBhY2Nlc3MgbG9nc1xuICAgICAgLy8gdGhpcy5hbGIubG9nQWNjZXNzTG9ncyhhY2Nlc3NMb2dzQnVja2V0KTtcbiAgICB9XG5cbiAgICAvLyBTU0wgQ2VydGlmaWNhdGUgKE9wdGlvbmFsIGZvciBpbml0aWFsIHNldHVwKVxuICAgIGxldCBjZXJ0aWZpY2F0ZTogYWNtLklDZXJ0aWZpY2F0ZSB8IHVuZGVmaW5lZDtcblxuICAgIGlmIChjZXJ0aWZpY2F0ZUFybikge1xuICAgICAgLy8gVXNlIGV4aXN0aW5nIGNlcnRpZmljYXRlXG4gICAgICBjZXJ0aWZpY2F0ZSA9IGFjbS5DZXJ0aWZpY2F0ZS5mcm9tQ2VydGlmaWNhdGVBcm4oXG4gICAgICAgIHRoaXMsXG4gICAgICAgICdDZXJ0aWZpY2F0ZScsXG4gICAgICAgIGNlcnRpZmljYXRlQXJuXG4gICAgICApO1xuICAgIH0gZWxzZSBpZiAoaG9zdGVkWm9uZUlkKSB7XG4gICAgICAvLyBDcmVhdGUgbmV3IGNlcnRpZmljYXRlXG4gICAgICAvLyBOb3RlOiBUaGlzIHJlcXVpcmVzIEROUyB2YWxpZGF0aW9uIHZpYSBSb3V0ZSA1M1xuICAgICAgY29uc3QgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tSG9zdGVkWm9uZUF0dHJpYnV0ZXMoXG4gICAgICAgIHRoaXMsXG4gICAgICAgICdIb3N0ZWRab25lJyxcbiAgICAgICAge1xuICAgICAgICAgIGhvc3RlZFpvbmVJZCxcbiAgICAgICAgICB6b25lTmFtZTogZG9tYWluTmFtZSxcbiAgICAgICAgfVxuICAgICAgKTtcblxuICAgICAgY2VydGlmaWNhdGUgPSBuZXcgYWNtLkNlcnRpZmljYXRlKHRoaXMsICdDZXJ0aWZpY2F0ZScsIHtcbiAgICAgICAgZG9tYWluTmFtZTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IGRvbWFpbk5hbWUgOiBgJHtlbnZpcm9ubWVudH0uJHtkb21haW5OYW1lfWAsXG4gICAgICAgIHZhbGlkYXRpb246IGFjbS5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucyhob3N0ZWRab25lKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgICAvLyBJZiBubyBjZXJ0aWZpY2F0ZSBhdmFpbGFibGUsIHdlJ2xsIGNyZWF0ZSBIVFRQLW9ubHkgbGlzdGVuZXIgZm9yIGluaXRpYWwgc2V0dXBcblxuICAgIC8vIFRhcmdldCBHcm91cFxuICAgIHRoaXMudGFyZ2V0R3JvdXAgPSBuZXcgZWxidjIuQXBwbGljYXRpb25UYXJnZXRHcm91cCh0aGlzLCAnVGFyZ2V0R3JvdXAnLCB7XG4gICAgICB2cGMsXG4gICAgICBwb3J0OiAzMDAxLFxuICAgICAgcHJvdG9jb2w6IGVsYnYyLkFwcGxpY2F0aW9uUHJvdG9jb2wuSFRUUCxcbiAgICAgIHRhcmdldFR5cGU6IGVsYnYyLlRhcmdldFR5cGUuSVAsXG4gICAgICBoZWFsdGhDaGVjazoge1xuICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICBwYXRoOiAnL2FwaS92MS9oZWFsdGgvbGl2ZScsXG4gICAgICAgIHByb3RvY29sOiBlbGJ2Mi5Qcm90b2NvbC5IVFRQLFxuICAgICAgICBoZWFsdGh5VGhyZXNob2xkQ291bnQ6IDIsXG4gICAgICAgIHVuaGVhbHRoeVRocmVzaG9sZENvdW50OiAzLFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcbiAgICAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgICAgaGVhbHRoeUh0dHBDb2RlczogJzIwMCcsXG4gICAgICB9LFxuICAgICAgZGVyZWdpc3RyYXRpb25EZWxheTogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgdGFyZ2V0R3JvdXBOYW1lOiBgbWVudGFsc3BhY2UtdGctJHtlbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuXG4gICAgLy8gSFRUUFMgTGlzdGVuZXIgKGlmIGNlcnRpZmljYXRlIGF2YWlsYWJsZSlcbiAgICBpZiAoY2VydGlmaWNhdGUpIHtcbiAgICAgIHRoaXMuaHR0cHNMaXN0ZW5lciA9IHRoaXMuYWxiLmFkZExpc3RlbmVyKCdIdHRwc0xpc3RlbmVyJywge1xuICAgICAgICBwb3J0OiA0NDMsXG4gICAgICAgIHByb3RvY29sOiBlbGJ2Mi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFBTLFxuICAgICAgICBjZXJ0aWZpY2F0ZXM6IFtjZXJ0aWZpY2F0ZV0sXG4gICAgICAgIHNzbFBvbGljeTogZWxidjIuU3NsUG9saWN5LlJFQ09NTUVOREVEX1RMUyxcbiAgICAgICAgZGVmYXVsdFRhcmdldEdyb3VwczogW3RoaXMudGFyZ2V0R3JvdXBdLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEhUVFAgTGlzdGVuZXIgKFJlZGlyZWN0IHRvIEhUVFBTKVxuICAgICAgdGhpcy5hbGIuYWRkTGlzdGVuZXIoJ0h0dHBMaXN0ZW5lcicsIHtcbiAgICAgICAgcG9ydDogODAsXG4gICAgICAgIHByb3RvY29sOiBlbGJ2Mi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFAsXG4gICAgICAgIGRlZmF1bHRBY3Rpb246IGVsYnYyLkxpc3RlbmVyQWN0aW9uLnJlZGlyZWN0KHtcbiAgICAgICAgICBwcm90b2NvbDogJ0hUVFBTJyxcbiAgICAgICAgICBwb3J0OiAnNDQzJyxcbiAgICAgICAgICBwZXJtYW5lbnQ6IHRydWUsXG4gICAgICAgIH0pLFxuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEhUVFAtb25seSBsaXN0ZW5lciBmb3IgaW5pdGlhbCBzZXR1cCAobm8gY2VydGlmaWNhdGUgeWV0KVxuICAgICAgdGhpcy5odHRwc0xpc3RlbmVyID0gdGhpcy5hbGIuYWRkTGlzdGVuZXIoJ0h0dHBMaXN0ZW5lcicsIHtcbiAgICAgICAgcG9ydDogODAsXG4gICAgICAgIHByb3RvY29sOiBlbGJ2Mi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFAsXG4gICAgICAgIGRlZmF1bHRUYXJnZXRHcm91cHM6IFt0aGlzLnRhcmdldEdyb3VwXSxcbiAgICAgIH0pO1xuXG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTm9DZXJ0aWZpY2F0ZVdhcm5pbmcnLCB7XG4gICAgICAgIHZhbHVlOiAnV0FSTklORzogQUxCIGlzIEhUVFAtb25seS4gQWRkIGNlcnRpZmljYXRlIGZvciBwcm9kdWN0aW9uIScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQ2VydGlmaWNhdGUgV2FybmluZycsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBXQUYgV2ViIEFDTCBmb3IgQUxCXG4gICAgY29uc3Qgd2ViQWNsID0gbmV3IHdhZnYyLkNmbldlYkFDTCh0aGlzLCAnV2ViQUNMJywge1xuICAgICAgc2NvcGU6ICdSRUdJT05BTCcsXG4gICAgICBkZWZhdWx0QWN0aW9uOiB7IGFsbG93OiB7fSB9LFxuICAgICAgbmFtZTogYG1lbnRhbHNwYWNlLXdhZi0ke2Vudmlyb25tZW50fWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1dBRiBydWxlcyBmb3IgTWVudGFsU3BhY2UgRUhSIEFQSScsXG4gICAgICBydWxlczogW1xuICAgICAgICAvLyBSYXRlIGxpbWl0aW5nIHJ1bGVcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6ICdSYXRlTGltaXQnLFxuICAgICAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgICAgIHN0YXRlbWVudDoge1xuICAgICAgICAgICAgcmF0ZUJhc2VkU3RhdGVtZW50OiB7XG4gICAgICAgICAgICAgIGxpbWl0OiAyMDAwLCAvLyAyMDAwIHJlcXVlc3RzIHBlciA1IG1pbnV0ZXMgcGVyIElQXG4gICAgICAgICAgICAgIGFnZ3JlZ2F0ZUtleVR5cGU6ICdJUCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYWN0aW9uOiB7IGJsb2NrOiB7fSB9LFxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnUmF0ZUxpbWl0JyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICAvLyBBV1MgTWFuYWdlZCBSdWxlcyAtIENvcmUgUnVsZSBTZXRcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNDb21tb25SdWxlU2V0JyxcbiAgICAgICAgICBwcmlvcml0eTogMixcbiAgICAgICAgICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgIG1hbmFnZWRSdWxlR3JvdXBTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgdmVuZG9yTmFtZTogJ0FXUycsXG4gICAgICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNDb21tb25SdWxlU2V0JyxcbiAgICAgICAgICAgICAgZXhjbHVkZWRSdWxlczogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgb3ZlcnJpZGVBY3Rpb246IHsgbm9uZToge30gfSxcbiAgICAgICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgICAgICBzYW1wbGVkUmVxdWVzdHNFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgY2xvdWRXYXRjaE1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0FXU01hbmFnZWRSdWxlc0NvbW1vblJ1bGVTZXRNZXRyaWMnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIC8vIEFXUyBNYW5hZ2VkIFJ1bGVzIC0gS25vd24gQmFkIElucHV0c1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ0FXU01hbmFnZWRSdWxlc0tub3duQmFkSW5wdXRzUnVsZVNldCcsXG4gICAgICAgICAgcHJpb3JpdHk6IDMsXG4gICAgICAgICAgc3RhdGVtZW50OiB7XG4gICAgICAgICAgICBtYW5hZ2VkUnVsZUdyb3VwU3RhdGVtZW50OiB7XG4gICAgICAgICAgICAgIHZlbmRvck5hbWU6ICdBV1MnLFxuICAgICAgICAgICAgICBuYW1lOiAnQVdTTWFuYWdlZFJ1bGVzS25vd25CYWRJbnB1dHNSdWxlU2V0JyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBvdmVycmlkZUFjdGlvbjogeyBub25lOiB7fSB9LFxuICAgICAgICAgIHZpc2liaWxpdHlDb25maWc6IHtcbiAgICAgICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBjbG91ZFdhdGNoTWV0cmljc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQVdTTWFuYWdlZFJ1bGVzS25vd25CYWRJbnB1dHNSdWxlU2V0TWV0cmljJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICAvLyBBV1MgTWFuYWdlZCBSdWxlcyAtIFNRTCBJbmplY3Rpb25cbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6ICdBV1NNYW5hZ2VkUnVsZXNTUUxpUnVsZVNldCcsXG4gICAgICAgICAgcHJpb3JpdHk6IDQsXG4gICAgICAgICAgc3RhdGVtZW50OiB7XG4gICAgICAgICAgICBtYW5hZ2VkUnVsZUdyb3VwU3RhdGVtZW50OiB7XG4gICAgICAgICAgICAgIHZlbmRvck5hbWU6ICdBV1MnLFxuICAgICAgICAgICAgICBuYW1lOiAnQVdTTWFuYWdlZFJ1bGVzU1FMaVJ1bGVTZXQnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIG92ZXJyaWRlQWN0aW9uOiB7IG5vbmU6IHt9IH0sXG4gICAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdBV1NNYW5hZ2VkUnVsZXNTUUxpUnVsZVNldE1ldHJpYycsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgLy8gQmxvY2sgcmVxdWVzdHMgd2l0aG91dCBVc2VyLUFnZW50IGhlYWRlclxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogJ0Jsb2NrTWlzc2luZ1VzZXJBZ2VudCcsXG4gICAgICAgICAgcHJpb3JpdHk6IDUsXG4gICAgICAgICAgc3RhdGVtZW50OiB7XG4gICAgICAgICAgICBub3RTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgc3RhdGVtZW50OiB7XG4gICAgICAgICAgICAgICAgc2l6ZUNvbnN0cmFpbnRTdGF0ZW1lbnQ6IHtcbiAgICAgICAgICAgICAgICAgIGZpZWxkVG9NYXRjaDoge1xuICAgICAgICAgICAgICAgICAgICBzaW5nbGVIZWFkZXI6IHsgbmFtZTogJ3VzZXItYWdlbnQnIH0sXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiAnR1QnLFxuICAgICAgICAgICAgICAgICAgc2l6ZTogMCxcbiAgICAgICAgICAgICAgICAgIHRleHRUcmFuc2Zvcm1hdGlvbnM6IFt7IHByaW9yaXR5OiAwLCB0eXBlOiAnTk9ORScgfV0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICBhY3Rpb246IHsgYmxvY2s6IHt9IH0sXG4gICAgICAgICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgICAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdCbG9ja01pc3NpbmdVc2VyQWdlbnQnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIC8vIEdlby1ibG9ja2luZyAoZXhhbXBsZTogYWxsb3cgb25seSBVUylcbiAgICAgICAgLy8gVW5jb21tZW50IGlmIG5lZWRlZFxuICAgICAgICAvLyB7XG4gICAgICAgIC8vICAgbmFtZTogJ0dlb0Jsb2NraW5nJyxcbiAgICAgICAgLy8gICBwcmlvcml0eTogNixcbiAgICAgICAgLy8gICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgLy8gICAgIG5vdFN0YXRlbWVudDoge1xuICAgICAgICAvLyAgICAgICBzdGF0ZW1lbnQ6IHtcbiAgICAgICAgLy8gICAgICAgICBnZW9NYXRjaFN0YXRlbWVudDoge1xuICAgICAgICAvLyAgICAgICAgICAgY291bnRyeUNvZGVzOiBbJ1VTJ10sXG4gICAgICAgIC8vICAgICAgICAgfSxcbiAgICAgICAgLy8gICAgICAgfSxcbiAgICAgICAgLy8gICAgIH0sXG4gICAgICAgIC8vICAgfSxcbiAgICAgICAgLy8gICBhY3Rpb246IHsgYmxvY2s6IHt9IH0sXG4gICAgICAgIC8vICAgdmlzaWJpbGl0eUNvbmZpZzoge1xuICAgICAgICAvLyAgICAgc2FtcGxlZFJlcXVlc3RzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgLy8gICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgLy8gICAgIG1ldHJpY05hbWU6ICdHZW9CbG9ja2luZycsXG4gICAgICAgIC8vICAgfSxcbiAgICAgICAgLy8gfSxcbiAgICAgIF0sXG4gICAgICB2aXNpYmlsaXR5Q29uZmlnOiB7XG4gICAgICAgIHNhbXBsZWRSZXF1ZXN0c0VuYWJsZWQ6IHRydWUsXG4gICAgICAgIGNsb3VkV2F0Y2hNZXRyaWNzRW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgbWV0cmljTmFtZTogYG1lbnRhbHNwYWNlLXdhZi0ke2Vudmlyb25tZW50fWAsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQXNzb2NpYXRlIFdBRiB3aXRoIEFMQlxuICAgIG5ldyB3YWZ2Mi5DZm5XZWJBQ0xBc3NvY2lhdGlvbih0aGlzLCAnV2ViQUNMQXNzb2NpYXRpb24nLCB7XG4gICAgICByZXNvdXJjZUFybjogdGhpcy5hbGIubG9hZEJhbGFuY2VyQXJuLFxuICAgICAgd2ViQWNsQXJuOiB3ZWJBY2wuYXR0ckFybixcbiAgICB9KTtcblxuICAgIC8vIFJvdXRlIDUzIEFsaWFzIFJlY29yZCAoaWYgaG9zdGVkIHpvbmUgcHJvdmlkZWQpXG4gICAgaWYgKGhvc3RlZFpvbmVJZCkge1xuICAgICAgY29uc3QgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tSG9zdGVkWm9uZUF0dHJpYnV0ZXMoXG4gICAgICAgIHRoaXMsXG4gICAgICAgICdIb3N0ZWRab25lRm9yQWxpYXMnLFxuICAgICAgICB7XG4gICAgICAgICAgaG9zdGVkWm9uZUlkLFxuICAgICAgICAgIHpvbmVOYW1lOiBkb21haW5OYW1lLFxuICAgICAgICB9XG4gICAgICApO1xuXG4gICAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdBbGlhc1JlY29yZCcsIHtcbiAgICAgICAgem9uZTogaG9zdGVkWm9uZSxcbiAgICAgICAgcmVjb3JkTmFtZTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IGRvbWFpbk5hbWUgOiBgJHtlbnZpcm9ubWVudH0uJHtkb21haW5OYW1lfWAsXG4gICAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKFxuICAgICAgICAgIG5ldyB0YXJnZXRzLkxvYWRCYWxhbmNlclRhcmdldCh0aGlzLmFsYilcbiAgICAgICAgKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTG9hZEJhbGFuY2VyRE5TJywge1xuICAgICAgdmFsdWU6IHRoaXMuYWxiLmxvYWRCYWxhbmNlckRuc05hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0xvYWQgQmFsYW5jZXIgRE5TIE5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYE1lbnRhbFNwYWNlLUFMQi1ETlMtJHtlbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xvYWRCYWxhbmNlckFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmFsYi5sb2FkQmFsYW5jZXJBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0xvYWQgQmFsYW5jZXIgQVJOJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBNZW50YWxTcGFjZS1BTEItQVJOLSR7ZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUYXJnZXRHcm91cEFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnRhcmdldEdyb3VwLnRhcmdldEdyb3VwQXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgR3JvdXAgQVJOJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBNZW50YWxTcGFjZS1URy1BUk4tJHtlbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FMQlNlY3VyaXR5R3JvdXBJZCcsIHtcbiAgICAgIHZhbHVlOiBhbGJTZWN1cml0eUdyb3VwLnNlY3VyaXR5R3JvdXBJZCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQUxCIFNlY3VyaXR5IEdyb3VwIElEJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBNZW50YWxTcGFjZS1BTEItU0ctJHtlbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dlYkFDTEFybicsIHtcbiAgICAgIHZhbHVlOiB3ZWJBY2wuYXR0ckFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnV0FGIFdlYiBBQ0wgQVJOJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBNZW50YWxTcGFjZS1XQUYtQVJOLSR7ZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIGlmIChob3N0ZWRab25lSWQpIHtcbiAgICAgIGNvbnN0IHJlY29yZE5hbWUgPSBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gZG9tYWluTmFtZSA6IGAke2Vudmlyb25tZW50fS4ke2RvbWFpbk5hbWV9YDtcbiAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEb21haW5OYW1lJywge1xuICAgICAgICB2YWx1ZTogYGh0dHBzOi8vJHtyZWNvcmROYW1lfWAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQXBwbGljYXRpb24gVVJMJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuIl19