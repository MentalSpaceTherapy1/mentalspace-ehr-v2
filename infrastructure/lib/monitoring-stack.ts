import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  environment: string;
  rdsInstance: rds.DatabaseInstance;
  apiLambda?: lambda.Function;
  alertEmail: string;
}

export class MonitoringStack extends cdk.Stack {
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { environment, rdsInstance, apiLambda, alertEmail } = props;

    // SNS Topic for alarms
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: `MentalSpace EHR ${environment} Alarms`,
      topicName: `mentalspace-alarms-${environment}`,
    });

    // Subscribe email to alarm topic
    this.alarmTopic.addSubscription(
      new subscriptions.EmailSubscription(alertEmail)
    );

    // Create CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `MentalSpace-EHR-${environment}`,
    });

    // ============================================================================
    // DATABASE MONITORING
    // ============================================================================

    // Database CPU Utilization
    const dbCpuAlarm = new cloudwatch.Alarm(this, 'DBCPUAlarm', {
      alarmName: `${environment}-db-cpu-high`,
      alarmDescription: 'Database CPU utilization is above 80%',
      metric: rdsInstance.metricCPUUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
    dbCpuAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Database Free Storage Space
    const dbStorageAlarm = new cloudwatch.Alarm(this, 'DBStorageAlarm', {
      alarmName: `${environment}-db-storage-low`,
      alarmDescription: 'Database free storage space is below 10GB',
      metric: rdsInstance.metricFreeStorageSpace(),
      threshold: 10 * 1024 * 1024 * 1024, // 10GB in bytes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    });
    dbStorageAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Database Connections
    const dbConnectionsAlarm = new cloudwatch.Alarm(this, 'DBConnectionsAlarm', {
      alarmName: `${environment}-db-connections-high`,
      alarmDescription: 'Database connections are above 80% of max',
      metric: rdsInstance.metricDatabaseConnections(),
      threshold: 80,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
    dbConnectionsAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

    // Add database metrics to dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Database CPU Utilization',
        left: [rdsInstance.metricCPUUtilization()],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Database Connections',
        left: [rdsInstance.metricDatabaseConnections()],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Database Free Storage Space (GB)',
        left: [rdsInstance.metricFreeStorageSpace({
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        })],
        width: 12,
      })
    );

    // ============================================================================
    // API/LAMBDA MONITORING (if Lambda provided)
    // ============================================================================

    if (apiLambda) {
      // Lambda Errors
      const lambdaErrorAlarm = new cloudwatch.Alarm(this, 'LambdaErrorAlarm', {
        alarmName: `${environment}-api-errors-high`,
        alarmDescription: 'API Lambda error rate is above 1%',
        metric: apiLambda.metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 10, // 10 errors in 5 minutes
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });
      lambdaErrorAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

      // Lambda Duration (P99)
      const lambdaDurationAlarm = new cloudwatch.Alarm(this, 'LambdaDurationAlarm', {
        alarmName: `${environment}-api-latency-high`,
        alarmDescription: 'API p99 latency is above 1 second',
        metric: apiLambda.metricDuration({
          statistic: 'p99',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1000, // 1 second
        evaluationPeriods: 2,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });
      lambdaDurationAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

      // Lambda Throttles
      const lambdaThrottleAlarm = new cloudwatch.Alarm(this, 'LambdaThrottleAlarm', {
        alarmName: `${environment}-api-throttles`,
        alarmDescription: 'API Lambda is being throttled',
        metric: apiLambda.metricThrottles({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      });
      lambdaThrottleAlarm.addAlarmAction(new actions.SnsAction(this.alarmTopic));

      // Add Lambda metrics to dashboard
      dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'API Invocations',
          left: [apiLambda.metricInvocations()],
          width: 8,
        }),
        new cloudwatch.GraphWidget({
          title: 'API Errors',
          left: [apiLambda.metricErrors()],
          width: 8,
        }),
        new cloudwatch.GraphWidget({
          title: 'API Throttles',
          left: [apiLambda.metricThrottles()],
          width: 8,
        })
      );

      dashboard.addWidgets(
        new cloudwatch.GraphWidget({
          title: 'API Duration (p50, p99, max)',
          left: [
            apiLambda.metricDuration({ statistic: 'p50' }),
            apiLambda.metricDuration({ statistic: 'p99' }),
            apiLambda.metricDuration({ statistic: 'Maximum' }),
          ],
          width: 12,
        })
      );
    }

    // ============================================================================
    // CUSTOM METRICS (Application-level)
    // ============================================================================

    // These would be published by the application
    const appointmentMetric = new cloudwatch.Metric({
      namespace: 'MentalSpaceEHR',
      metricName: 'AppointmentsCreated',
      dimensionsMap: { Environment: environment },
      statistic: 'Sum',
      period: cdk.Duration.hours(1),
    });

    const noteMetric = new cloudwatch.Metric({
      namespace: 'MentalSpaceEHR',
      metricName: 'NotesCreated',
      dimensionsMap: { Environment: environment },
      statistic: 'Sum',
      period: cdk.Duration.hours(1),
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Business Metrics - Appointments',
        left: [appointmentMetric],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Business Metrics - Clinical Notes',
        left: [noteMetric],
        width: 12,
      })
    );

    // ============================================================================
    // OUTPUTS
    // ============================================================================

    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS Topic ARN for alarms',
      exportName: `MentalSpace-Alarm-Topic-${environment}`,
    });
  }
}
