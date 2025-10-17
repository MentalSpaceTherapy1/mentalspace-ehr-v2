import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface AlbStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.Vpc;
  albSecurityGroup: ec2.SecurityGroup;
  domainName: string;
  hostedZoneId?: string;
  certificateArn?: string;
}

export class AlbStack extends cdk.Stack {
  public readonly alb: elbv2.ApplicationLoadBalancer;
  public readonly httpsListener: elbv2.ApplicationListener;
  public readonly targetGroup: elbv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: AlbStackProps) {
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
    let certificate: acm.ICertificate | undefined;

    if (certificateArn) {
      // Use existing certificate
      certificate = acm.Certificate.fromCertificateArn(
        this,
        'Certificate',
        certificateArn
      );
    } else if (hostedZoneId) {
      // Create new certificate
      // Note: This requires DNS validation via Route 53
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
        this,
        'HostedZone',
        {
          hostedZoneId,
          zoneName: domainName,
        }
      );

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
    } else {
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
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
        this,
        'HostedZoneForAlias',
        {
          hostedZoneId,
          zoneName: domainName,
        }
      );

      new route53.ARecord(this, 'AliasRecord', {
        zone: hostedZone,
        recordName: environment === 'prod' ? domainName : `${environment}.${domainName}`,
        target: route53.RecordTarget.fromAlias(
          new targets.LoadBalancerTarget(this.alb)
        ),
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
