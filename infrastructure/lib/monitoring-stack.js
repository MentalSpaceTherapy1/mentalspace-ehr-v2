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
exports.MonitoringStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const subscriptions = __importStar(require("aws-cdk-lib/aws-sns-subscriptions"));
const actions = __importStar(require("aws-cdk-lib/aws-cloudwatch-actions"));
class MonitoringStack extends cdk.Stack {
    alarmTopic;
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment, rdsInstance, apiLambda, alertEmail } = props;
        // SNS Topic for alarms
        this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
            displayName: `MentalSpace EHR ${environment} Alarms`,
            topicName: `mentalspace-alarms-${environment}`,
        });
        // Subscribe email to alarm topic
        this.alarmTopic.addSubscription(new subscriptions.EmailSubscription(alertEmail));
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
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Database CPU Utilization',
            left: [rdsInstance.metricCPUUtilization()],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'Database Connections',
            left: [rdsInstance.metricDatabaseConnections()],
            width: 12,
        }));
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Database Free Storage Space (GB)',
            left: [rdsInstance.metricFreeStorageSpace({
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                })],
            width: 12,
        }));
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
            dashboard.addWidgets(new cloudwatch.GraphWidget({
                title: 'API Invocations',
                left: [apiLambda.metricInvocations()],
                width: 8,
            }), new cloudwatch.GraphWidget({
                title: 'API Errors',
                left: [apiLambda.metricErrors()],
                width: 8,
            }), new cloudwatch.GraphWidget({
                title: 'API Throttles',
                left: [apiLambda.metricThrottles()],
                width: 8,
            }));
            dashboard.addWidgets(new cloudwatch.GraphWidget({
                title: 'API Duration (p50, p99, max)',
                left: [
                    apiLambda.metricDuration({ statistic: 'p50' }),
                    apiLambda.metricDuration({ statistic: 'p99' }),
                    apiLambda.metricDuration({ statistic: 'Maximum' }),
                ],
                width: 12,
            }));
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
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Business Metrics - Appointments',
            left: [appointmentMetric],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'Business Metrics - Clinical Notes',
            left: [noteMetric],
            width: 12,
        }));
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
exports.MonitoringStack = MonitoringStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1vbml0b3Jpbmctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLHVFQUF5RDtBQUN6RCx5REFBMkM7QUFDM0MsaUZBQW1FO0FBQ25FLDRFQUE4RDtBQVk5RCxNQUFhLGVBQWdCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDNUIsVUFBVSxDQUFZO0lBRXRDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDbkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUVsRSx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNsRCxXQUFXLEVBQUUsbUJBQW1CLFdBQVcsU0FBUztZQUNwRCxTQUFTLEVBQUUsc0JBQXNCLFdBQVcsRUFBRTtTQUMvQyxDQUFDLENBQUM7UUFFSCxpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLENBQzdCLElBQUksYUFBYSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUNoRCxDQUFDO1FBRUYsOEJBQThCO1FBQzlCLE1BQU0sU0FBUyxHQUFHLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQzVELGFBQWEsRUFBRSxtQkFBbUIsV0FBVyxFQUFFO1NBQ2hELENBQUMsQ0FBQztRQUVILCtFQUErRTtRQUMvRSxzQkFBc0I7UUFDdEIsK0VBQStFO1FBRS9FLDJCQUEyQjtRQUMzQixNQUFNLFVBQVUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUMxRCxTQUFTLEVBQUUsR0FBRyxXQUFXLGNBQWM7WUFDdkMsZ0JBQWdCLEVBQUUsdUNBQXVDO1lBQ3pELE1BQU0sRUFBRSxXQUFXLENBQUMsb0JBQW9CLEVBQUU7WUFDMUMsU0FBUyxFQUFFLEVBQUU7WUFDYixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQjtTQUN6RSxDQUFDLENBQUM7UUFDSCxVQUFVLENBQUMsY0FBYyxDQUFDLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUVsRSw4QkFBOEI7UUFDOUIsTUFBTSxjQUFjLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNsRSxTQUFTLEVBQUUsR0FBRyxXQUFXLGlCQUFpQjtZQUMxQyxnQkFBZ0IsRUFBRSwyQ0FBMkM7WUFDN0QsTUFBTSxFQUFFLFdBQVcsQ0FBQyxzQkFBc0IsRUFBRTtZQUM1QyxTQUFTLEVBQUUsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFFLGdCQUFnQjtZQUNwRCxpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUI7U0FDdEUsQ0FBQyxDQUFDO1FBQ0gsY0FBYyxDQUFDLGNBQWMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFFdEUsdUJBQXVCO1FBQ3ZCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUMxRSxTQUFTLEVBQUUsR0FBRyxXQUFXLHNCQUFzQjtZQUMvQyxnQkFBZ0IsRUFBRSwyQ0FBMkM7WUFDN0QsTUFBTSxFQUFFLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRTtZQUMvQyxTQUFTLEVBQUUsRUFBRTtZQUNiLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQjtTQUN6RSxDQUFDLENBQUM7UUFDSCxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBRTFFLG9DQUFvQztRQUNwQyxTQUFTLENBQUMsVUFBVSxDQUNsQixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLDBCQUEwQjtZQUNqQyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMxQyxLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUMsRUFDRixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLHNCQUFzQjtZQUM3QixJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUMseUJBQXlCLEVBQUUsQ0FBQztZQUMvQyxLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUMsQ0FDSCxDQUFDO1FBRUYsU0FBUyxDQUFDLFVBQVUsQ0FDbEIsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSxrQ0FBa0M7WUFDekMsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDO29CQUN4QyxTQUFTLEVBQUUsU0FBUztvQkFDcEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDaEMsQ0FBQyxDQUFDO1lBQ0gsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDLENBQ0gsQ0FBQztRQUVGLCtFQUErRTtRQUMvRSw2Q0FBNkM7UUFDN0MsK0VBQStFO1FBRS9FLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZCxnQkFBZ0I7WUFDaEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO2dCQUN0RSxTQUFTLEVBQUUsR0FBRyxXQUFXLGtCQUFrQjtnQkFDM0MsZ0JBQWdCLEVBQUUsbUNBQW1DO2dCQUNyRCxNQUFNLEVBQUUsU0FBUyxDQUFDLFlBQVksQ0FBQztvQkFDN0IsU0FBUyxFQUFFLEtBQUs7b0JBQ2hCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBQ0YsU0FBUyxFQUFFLEVBQUUsRUFBRSx5QkFBeUI7Z0JBQ3hDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3BCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0I7YUFDekUsQ0FBQyxDQUFDO1lBQ0gsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUV4RSx3QkFBd0I7WUFDeEIsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO2dCQUM1RSxTQUFTLEVBQUUsR0FBRyxXQUFXLG1CQUFtQjtnQkFDNUMsZ0JBQWdCLEVBQUUsbUNBQW1DO2dCQUNyRCxNQUFNLEVBQUUsU0FBUyxDQUFDLGNBQWMsQ0FBQztvQkFDL0IsU0FBUyxFQUFFLEtBQUs7b0JBQ2hCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBQ0YsU0FBUyxFQUFFLElBQUksRUFBRSxXQUFXO2dCQUM1QixpQkFBaUIsRUFBRSxDQUFDO2dCQUNwQixrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCO2FBQ3pFLENBQUMsQ0FBQztZQUNILG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFFM0UsbUJBQW1CO1lBQ25CLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtnQkFDNUUsU0FBUyxFQUFFLEdBQUcsV0FBVyxnQkFBZ0I7Z0JBQ3pDLGdCQUFnQixFQUFFLCtCQUErQjtnQkFDakQsTUFBTSxFQUFFLFNBQVMsQ0FBQyxlQUFlLENBQUM7b0JBQ2hDLFNBQVMsRUFBRSxLQUFLO29CQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2dCQUNGLFNBQVMsRUFBRSxDQUFDO2dCQUNaLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3BCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0I7YUFDekUsQ0FBQyxDQUFDO1lBQ0gsbUJBQW1CLENBQUMsY0FBYyxDQUFDLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUUzRSxrQ0FBa0M7WUFDbEMsU0FBUyxDQUFDLFVBQVUsQ0FDbEIsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO2dCQUN6QixLQUFLLEVBQUUsaUJBQWlCO2dCQUN4QixJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDckMsS0FBSyxFQUFFLENBQUM7YUFDVCxDQUFDLEVBQ0YsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO2dCQUN6QixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNoQyxLQUFLLEVBQUUsQ0FBQzthQUNULENBQUMsRUFDRixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7Z0JBQ3pCLEtBQUssRUFBRSxlQUFlO2dCQUN0QixJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFLENBQUM7Z0JBQ25DLEtBQUssRUFBRSxDQUFDO2FBQ1QsQ0FBQyxDQUNILENBQUM7WUFFRixTQUFTLENBQUMsVUFBVSxDQUNsQixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7Z0JBQ3pCLEtBQUssRUFBRSw4QkFBOEI7Z0JBQ3JDLElBQUksRUFBRTtvQkFDSixTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO29CQUM5QyxTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDO29CQUM5QyxTQUFTLENBQUMsY0FBYyxDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxDQUFDO2lCQUNuRDtnQkFDRCxLQUFLLEVBQUUsRUFBRTthQUNWLENBQUMsQ0FDSCxDQUFDO1FBQ0osQ0FBQztRQUVELCtFQUErRTtRQUMvRSxxQ0FBcUM7UUFDckMsK0VBQStFO1FBRS9FLDhDQUE4QztRQUM5QyxNQUFNLGlCQUFpQixHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUM5QyxTQUFTLEVBQUUsZ0JBQWdCO1lBQzNCLFVBQVUsRUFBRSxxQkFBcUI7WUFDakMsYUFBYSxFQUFFLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRTtZQUMzQyxTQUFTLEVBQUUsS0FBSztZQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1NBQzlCLENBQUMsQ0FBQztRQUVILE1BQU0sVUFBVSxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUN2QyxTQUFTLEVBQUUsZ0JBQWdCO1lBQzNCLFVBQVUsRUFBRSxjQUFjO1lBQzFCLGFBQWEsRUFBRSxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUU7WUFDM0MsU0FBUyxFQUFFLEtBQUs7WUFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUM5QixDQUFDLENBQUM7UUFFSCxTQUFTLENBQUMsVUFBVSxDQUNsQixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLGlDQUFpQztZQUN4QyxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztZQUN6QixLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUMsRUFDRixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLG1DQUFtQztZQUMxQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUM7WUFDbEIsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDLENBQ0gsQ0FBQztRQUVGLCtFQUErRTtRQUMvRSxVQUFVO1FBQ1YsK0VBQStFO1FBRS9FLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RDLEtBQUssRUFBRSx5REFBeUQsSUFBSSxDQUFDLE1BQU0sb0JBQW9CLFNBQVMsQ0FBQyxhQUFhLEVBQUU7WUFDeEgsV0FBVyxFQUFFLDBCQUEwQjtTQUN4QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN2QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRO1lBQy9CLFdBQVcsRUFBRSwwQkFBMEI7WUFDdkMsVUFBVSxFQUFFLDJCQUEyQixXQUFXLEVBQUU7U0FDckQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdk5ELDBDQXVOQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcbmltcG9ydCAqIGFzIHNucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc25zJztcbmltcG9ydCAqIGFzIHN1YnNjcmlwdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucy1zdWJzY3JpcHRpb25zJztcbmltcG9ydCAqIGFzIGFjdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gtYWN0aW9ucyc7XG5pbXBvcnQgKiBhcyByZHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJkcyc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBNb25pdG9yaW5nU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcbiAgcmRzSW5zdGFuY2U6IHJkcy5EYXRhYmFzZUluc3RhbmNlO1xuICBhcGlMYW1iZGE/OiBsYW1iZGEuRnVuY3Rpb247XG4gIGFsZXJ0RW1haWw6IHN0cmluZztcbn1cblxuZXhwb3J0IGNsYXNzIE1vbml0b3JpbmdTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBhbGFybVRvcGljOiBzbnMuVG9waWM7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IE1vbml0b3JpbmdTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IGVudmlyb25tZW50LCByZHNJbnN0YW5jZSwgYXBpTGFtYmRhLCBhbGVydEVtYWlsIH0gPSBwcm9wcztcblxuICAgIC8vIFNOUyBUb3BpYyBmb3IgYWxhcm1zXG4gICAgdGhpcy5hbGFybVRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnQWxhcm1Ub3BpYycsIHtcbiAgICAgIGRpc3BsYXlOYW1lOiBgTWVudGFsU3BhY2UgRUhSICR7ZW52aXJvbm1lbnR9IEFsYXJtc2AsXG4gICAgICB0b3BpY05hbWU6IGBtZW50YWxzcGFjZS1hbGFybXMtJHtlbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuXG4gICAgLy8gU3Vic2NyaWJlIGVtYWlsIHRvIGFsYXJtIHRvcGljXG4gICAgdGhpcy5hbGFybVRvcGljLmFkZFN1YnNjcmlwdGlvbihcbiAgICAgIG5ldyBzdWJzY3JpcHRpb25zLkVtYWlsU3Vic2NyaXB0aW9uKGFsZXJ0RW1haWwpXG4gICAgKTtcblxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIERhc2hib2FyZFxuICAgIGNvbnN0IGRhc2hib2FyZCA9IG5ldyBjbG91ZHdhdGNoLkRhc2hib2FyZCh0aGlzLCAnRGFzaGJvYXJkJywge1xuICAgICAgZGFzaGJvYXJkTmFtZTogYE1lbnRhbFNwYWNlLUVIUi0ke2Vudmlyb25tZW50fWAsXG4gICAgfSk7XG5cbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy8gREFUQUJBU0UgTU9OSVRPUklOR1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAgIC8vIERhdGFiYXNlIENQVSBVdGlsaXphdGlvblxuICAgIGNvbnN0IGRiQ3B1QWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnREJDUFVBbGFybScsIHtcbiAgICAgIGFsYXJtTmFtZTogYCR7ZW52aXJvbm1lbnR9LWRiLWNwdS1oaWdoYCxcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdEYXRhYmFzZSBDUFUgdXRpbGl6YXRpb24gaXMgYWJvdmUgODAlJyxcbiAgICAgIG1ldHJpYzogcmRzSW5zdGFuY2UubWV0cmljQ1BVVXRpbGl6YXRpb24oKSxcbiAgICAgIHRocmVzaG9sZDogODAsXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcbiAgICAgIGRhdGFwb2ludHNUb0FsYXJtOiAyLFxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxuICAgIH0pO1xuICAgIGRiQ3B1QWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGFjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxhcm1Ub3BpYykpO1xuXG4gICAgLy8gRGF0YWJhc2UgRnJlZSBTdG9yYWdlIFNwYWNlXG4gICAgY29uc3QgZGJTdG9yYWdlQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnREJTdG9yYWdlQWxhcm0nLCB7XG4gICAgICBhbGFybU5hbWU6IGAke2Vudmlyb25tZW50fS1kYi1zdG9yYWdlLWxvd2AsXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnRGF0YWJhc2UgZnJlZSBzdG9yYWdlIHNwYWNlIGlzIGJlbG93IDEwR0InLFxuICAgICAgbWV0cmljOiByZHNJbnN0YW5jZS5tZXRyaWNGcmVlU3RvcmFnZVNwYWNlKCksXG4gICAgICB0aHJlc2hvbGQ6IDEwICogMTAyNCAqIDEwMjQgKiAxMDI0LCAvLyAxMEdCIGluIGJ5dGVzXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuTEVTU19USEFOX1RIUkVTSE9MRCxcbiAgICB9KTtcbiAgICBkYlN0b3JhZ2VBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgYWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKSk7XG5cbiAgICAvLyBEYXRhYmFzZSBDb25uZWN0aW9uc1xuICAgIGNvbnN0IGRiQ29ubmVjdGlvbnNBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdEQkNvbm5lY3Rpb25zQWxhcm0nLCB7XG4gICAgICBhbGFybU5hbWU6IGAke2Vudmlyb25tZW50fS1kYi1jb25uZWN0aW9ucy1oaWdoYCxcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdEYXRhYmFzZSBjb25uZWN0aW9ucyBhcmUgYWJvdmUgODAlIG9mIG1heCcsXG4gICAgICBtZXRyaWM6IHJkc0luc3RhbmNlLm1ldHJpY0RhdGFiYXNlQ29ubmVjdGlvbnMoKSxcbiAgICAgIHRocmVzaG9sZDogODAsXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcbiAgICB9KTtcbiAgICBkYkNvbm5lY3Rpb25zQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGFjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxhcm1Ub3BpYykpO1xuXG4gICAgLy8gQWRkIGRhdGFiYXNlIG1ldHJpY3MgdG8gZGFzaGJvYXJkXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XG4gICAgICAgIHRpdGxlOiAnRGF0YWJhc2UgQ1BVIFV0aWxpemF0aW9uJyxcbiAgICAgICAgbGVmdDogW3Jkc0luc3RhbmNlLm1ldHJpY0NQVVV0aWxpemF0aW9uKCldLFxuICAgICAgICB3aWR0aDogMTIsXG4gICAgICB9KSxcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgdGl0bGU6ICdEYXRhYmFzZSBDb25uZWN0aW9ucycsXG4gICAgICAgIGxlZnQ6IFtyZHNJbnN0YW5jZS5tZXRyaWNEYXRhYmFzZUNvbm5lY3Rpb25zKCldLFxuICAgICAgICB3aWR0aDogMTIsXG4gICAgICB9KVxuICAgICk7XG5cbiAgICBkYXNoYm9hcmQuYWRkV2lkZ2V0cyhcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgdGl0bGU6ICdEYXRhYmFzZSBGcmVlIFN0b3JhZ2UgU3BhY2UgKEdCKScsXG4gICAgICAgIGxlZnQ6IFtyZHNJbnN0YW5jZS5tZXRyaWNGcmVlU3RvcmFnZVNwYWNlKHtcbiAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcbiAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICB9KV0sXG4gICAgICAgIHdpZHRoOiAxMixcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBBUEkvTEFNQkRBIE1PTklUT1JJTkcgKGlmIExhbWJkYSBwcm92aWRlZClcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgICBpZiAoYXBpTGFtYmRhKSB7XG4gICAgICAvLyBMYW1iZGEgRXJyb3JzXG4gICAgICBjb25zdCBsYW1iZGFFcnJvckFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0xhbWJkYUVycm9yQWxhcm0nLCB7XG4gICAgICAgIGFsYXJtTmFtZTogYCR7ZW52aXJvbm1lbnR9LWFwaS1lcnJvcnMtaGlnaGAsXG4gICAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBUEkgTGFtYmRhIGVycm9yIHJhdGUgaXMgYWJvdmUgMSUnLFxuICAgICAgICBtZXRyaWM6IGFwaUxhbWJkYS5tZXRyaWNFcnJvcnMoe1xuICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgICAgfSksXG4gICAgICAgIHRocmVzaG9sZDogMTAsIC8vIDEwIGVycm9ycyBpbiA1IG1pbnV0ZXNcbiAgICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXG4gICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcbiAgICAgIH0pO1xuICAgICAgbGFtYmRhRXJyb3JBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgYWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKSk7XG5cbiAgICAgIC8vIExhbWJkYSBEdXJhdGlvbiAoUDk5KVxuICAgICAgY29uc3QgbGFtYmRhRHVyYXRpb25BbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdMYW1iZGFEdXJhdGlvbkFsYXJtJywge1xuICAgICAgICBhbGFybU5hbWU6IGAke2Vudmlyb25tZW50fS1hcGktbGF0ZW5jeS1oaWdoYCxcbiAgICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FQSSBwOTkgbGF0ZW5jeSBpcyBhYm92ZSAxIHNlY29uZCcsXG4gICAgICAgIG1ldHJpYzogYXBpTGFtYmRhLm1ldHJpY0R1cmF0aW9uKHtcbiAgICAgICAgICBzdGF0aXN0aWM6ICdwOTknLFxuICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIH0pLFxuICAgICAgICB0aHJlc2hvbGQ6IDEwMDAsIC8vIDEgc2Vjb25kXG4gICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxuICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXG4gICAgICB9KTtcbiAgICAgIGxhbWJkYUR1cmF0aW9uQWxhcm0uYWRkQWxhcm1BY3Rpb24obmV3IGFjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxhcm1Ub3BpYykpO1xuXG4gICAgICAvLyBMYW1iZGEgVGhyb3R0bGVzXG4gICAgICBjb25zdCBsYW1iZGFUaHJvdHRsZUFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0xhbWJkYVRocm90dGxlQWxhcm0nLCB7XG4gICAgICAgIGFsYXJtTmFtZTogYCR7ZW52aXJvbm1lbnR9LWFwaS10aHJvdHRsZXNgLFxuICAgICAgICBhbGFybURlc2NyaXB0aW9uOiAnQVBJIExhbWJkYSBpcyBiZWluZyB0aHJvdHRsZWQnLFxuICAgICAgICBtZXRyaWM6IGFwaUxhbWJkYS5tZXRyaWNUaHJvdHRsZXMoe1xuICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgICAgfSksXG4gICAgICAgIHRocmVzaG9sZDogMSxcbiAgICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXG4gICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcbiAgICAgIH0pO1xuICAgICAgbGFtYmRhVGhyb3R0bGVBbGFybS5hZGRBbGFybUFjdGlvbihuZXcgYWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKSk7XG5cbiAgICAgIC8vIEFkZCBMYW1iZGEgbWV0cmljcyB0byBkYXNoYm9hcmRcbiAgICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxuICAgICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XG4gICAgICAgICAgdGl0bGU6ICdBUEkgSW52b2NhdGlvbnMnLFxuICAgICAgICAgIGxlZnQ6IFthcGlMYW1iZGEubWV0cmljSW52b2NhdGlvbnMoKV0sXG4gICAgICAgICAgd2lkdGg6IDgsXG4gICAgICAgIH0pLFxuICAgICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XG4gICAgICAgICAgdGl0bGU6ICdBUEkgRXJyb3JzJyxcbiAgICAgICAgICBsZWZ0OiBbYXBpTGFtYmRhLm1ldHJpY0Vycm9ycygpXSxcbiAgICAgICAgICB3aWR0aDogOCxcbiAgICAgICAgfSksXG4gICAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgICB0aXRsZTogJ0FQSSBUaHJvdHRsZXMnLFxuICAgICAgICAgIGxlZnQ6IFthcGlMYW1iZGEubWV0cmljVGhyb3R0bGVzKCldLFxuICAgICAgICAgIHdpZHRoOiA4LFxuICAgICAgICB9KVxuICAgICAgKTtcblxuICAgICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXG4gICAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgICB0aXRsZTogJ0FQSSBEdXJhdGlvbiAocDUwLCBwOTksIG1heCknLFxuICAgICAgICAgIGxlZnQ6IFtcbiAgICAgICAgICAgIGFwaUxhbWJkYS5tZXRyaWNEdXJhdGlvbih7IHN0YXRpc3RpYzogJ3A1MCcgfSksXG4gICAgICAgICAgICBhcGlMYW1iZGEubWV0cmljRHVyYXRpb24oeyBzdGF0aXN0aWM6ICdwOTknIH0pLFxuICAgICAgICAgICAgYXBpTGFtYmRhLm1ldHJpY0R1cmF0aW9uKHsgc3RhdGlzdGljOiAnTWF4aW11bScgfSksXG4gICAgICAgICAgXSxcbiAgICAgICAgICB3aWR0aDogMTIsXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBDVVNUT00gTUVUUklDUyAoQXBwbGljYXRpb24tbGV2ZWwpXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgLy8gVGhlc2Ugd291bGQgYmUgcHVibGlzaGVkIGJ5IHRoZSBhcHBsaWNhdGlvblxuICAgIGNvbnN0IGFwcG9pbnRtZW50TWV0cmljID0gbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgIG5hbWVzcGFjZTogJ01lbnRhbFNwYWNlRUhSJyxcbiAgICAgIG1ldHJpY05hbWU6ICdBcHBvaW50bWVudHNDcmVhdGVkJyxcbiAgICAgIGRpbWVuc2lvbnNNYXA6IHsgRW52aXJvbm1lbnQ6IGVudmlyb25tZW50IH0sXG4gICAgICBzdGF0aXN0aWM6ICdTdW0nLFxuICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXG4gICAgfSk7XG5cbiAgICBjb25zdCBub3RlTWV0cmljID0gbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcbiAgICAgIG5hbWVzcGFjZTogJ01lbnRhbFNwYWNlRUhSJyxcbiAgICAgIG1ldHJpY05hbWU6ICdOb3Rlc0NyZWF0ZWQnLFxuICAgICAgZGltZW5zaW9uc01hcDogeyBFbnZpcm9ubWVudDogZW52aXJvbm1lbnQgfSxcbiAgICAgIHN0YXRpc3RpYzogJ1N1bScsXG4gICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcbiAgICB9KTtcblxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xuICAgICAgICB0aXRsZTogJ0J1c2luZXNzIE1ldHJpY3MgLSBBcHBvaW50bWVudHMnLFxuICAgICAgICBsZWZ0OiBbYXBwb2ludG1lbnRNZXRyaWNdLFxuICAgICAgICB3aWR0aDogMTIsXG4gICAgICB9KSxcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcbiAgICAgICAgdGl0bGU6ICdCdXNpbmVzcyBNZXRyaWNzIC0gQ2xpbmljYWwgTm90ZXMnLFxuICAgICAgICBsZWZ0OiBbbm90ZU1ldHJpY10sXG4gICAgICAgIHdpZHRoOiAxMixcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBPVVRQVVRTXG4gICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Rhc2hib2FyZFVSTCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly9jb25zb2xlLmF3cy5hbWF6b24uY29tL2Nsb3Vkd2F0Y2gvaG9tZT9yZWdpb249JHt0aGlzLnJlZ2lvbn0jZGFzaGJvYXJkczpuYW1lPSR7ZGFzaGJvYXJkLmRhc2hib2FyZE5hbWV9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRXYXRjaCBEYXNoYm9hcmQgVVJMJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBbGFybVRvcGljQXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMuYWxhcm1Ub3BpYy50b3BpY0FybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnU05TIFRvcGljIEFSTiBmb3IgYWxhcm1zJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBNZW50YWxTcGFjZS1BbGFybS1Ub3BpYy0ke2Vudmlyb25tZW50fWAsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==