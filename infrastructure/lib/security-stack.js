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
exports.SecurityStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
class SecurityStack extends cdk.Stack {
    kmsKey;
    dbCredentialsSecret;
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment } = props;
        // KMS Key for encryption at rest
        this.kmsKey = new kms.Key(this, 'MentalSpaceKMSKey', {
            alias: `mentalspace-${environment}`,
            description: `KMS key for MentalSpace EHR ${environment} environment`,
            enableKeyRotation: true,
            removalPolicy: environment === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        });
        // Grant CloudWatch Logs access to KMS key
        this.kmsKey.grantEncryptDecrypt(new cdk.aws_iam.ServicePrincipal('logs.amazonaws.com'));
        // Database credentials secret
        this.dbCredentialsSecret = new secretsmanager.Secret(this, 'DBCredentials', {
            secretName: `mentalspace/db/credentials-${environment}`,
            description: 'RDS PostgreSQL database credentials',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'mentalspace_admin' }),
                generateStringKey: 'password',
                excludePunctuation: true,
                includeSpace: false,
                passwordLength: 32,
            },
            encryptionKey: this.kmsKey,
        });
        // External API Keys placeholder secrets (will be populated manually or via CI/CD)
        const apiSecrets = [
            {
                name: 'openai-api-key',
                description: 'OpenAI API Key for clinical note generation',
            },
            {
                name: 'anthropic-api-key',
                description: 'Anthropic Claude API Key for billing analytics',
            },
            {
                name: 'advancedmd-credentials',
                description: 'AdvancedMD API credentials',
            },
            {
                name: 'stripe-keys',
                description: 'Stripe payment processing keys',
            },
            {
                name: 'twilio-credentials',
                description: 'Twilio SMS service credentials',
            },
            {
                name: 'sendgrid-api-key',
                description: 'SendGrid email service API key',
            },
        ];
        apiSecrets.forEach((secretConfig) => {
            new secretsmanager.Secret(this, `${secretConfig.name}-secret`, {
                secretName: `mentalspace/${environment}/${secretConfig.name}`,
                description: secretConfig.description,
                encryptionKey: this.kmsKey,
            });
        });
        // JWT Secret for authentication
        new secretsmanager.Secret(this, 'JWTSecret', {
            secretName: `mentalspace/${environment}/jwt-secret`,
            description: 'JWT secret for token signing',
            generateSecretString: {
                passwordLength: 64,
                excludePunctuation: true,
            },
            encryptionKey: this.kmsKey,
        });
        // Session Secret
        new secretsmanager.Secret(this, 'SessionSecret', {
            secretName: `mentalspace/${environment}/session-secret`,
            description: 'Session secret for express-session',
            generateSecretString: {
                passwordLength: 64,
                excludePunctuation: true,
            },
            encryptionKey: this.kmsKey,
        });
        // Outputs
        new cdk.CfnOutput(this, 'KMSKeyId', {
            value: this.kmsKey.keyId,
            description: 'KMS Key ID',
            exportName: `MentalSpace-KMS-KeyID-${environment}`,
        });
        new cdk.CfnOutput(this, 'KMSKeyArn', {
            value: this.kmsKey.keyArn,
            description: 'KMS Key ARN',
            exportName: `MentalSpace-KMS-KeyARN-${environment}`,
        });
        new cdk.CfnOutput(this, 'DBCredentialsSecretArn', {
            value: this.dbCredentialsSecret.secretArn,
            description: 'Database Credentials Secret ARN',
            exportName: `MentalSpace-DB-SecretARN-${environment}`,
        });
    }
}
exports.SecurityStack = SecurityStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdXJpdHktc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZWN1cml0eS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMseURBQTJDO0FBQzNDLCtFQUFpRTtBQVNqRSxNQUFhLGFBQWMsU0FBUSxHQUFHLENBQUMsS0FBSztJQUMxQixNQUFNLENBQVU7SUFDaEIsbUJBQW1CLENBQXdCO0lBRTNELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBeUI7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxFQUFFLFdBQVcsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUU5QixpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ25ELEtBQUssRUFBRSxlQUFlLFdBQVcsRUFBRTtZQUNuQyxXQUFXLEVBQUUsK0JBQStCLFdBQVcsY0FBYztZQUNyRSxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGFBQWEsRUFBRSxXQUFXLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQzdGLENBQUMsQ0FBQztRQUVILDBDQUEwQztRQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFFeEYsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUMxRSxVQUFVLEVBQUUsOEJBQThCLFdBQVcsRUFBRTtZQUN2RCxXQUFXLEVBQUUscUNBQXFDO1lBQ2xELG9CQUFvQixFQUFFO2dCQUNwQixvQkFBb0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsUUFBUSxFQUFFLG1CQUFtQixFQUFFLENBQUM7Z0JBQ3ZFLGlCQUFpQixFQUFFLFVBQVU7Z0JBQzdCLGtCQUFrQixFQUFFLElBQUk7Z0JBQ3hCLFlBQVksRUFBRSxLQUFLO2dCQUNuQixjQUFjLEVBQUUsRUFBRTthQUNuQjtZQUNELGFBQWEsRUFBRSxJQUFJLENBQUMsTUFBTTtTQUMzQixDQUFDLENBQUM7UUFFSCxrRkFBa0Y7UUFDbEYsTUFBTSxVQUFVLEdBQUc7WUFDakI7Z0JBQ0UsSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsV0FBVyxFQUFFLDZDQUE2QzthQUMzRDtZQUNEO2dCQUNFLElBQUksRUFBRSxtQkFBbUI7Z0JBQ3pCLFdBQVcsRUFBRSxnREFBZ0Q7YUFDOUQ7WUFDRDtnQkFDRSxJQUFJLEVBQUUsd0JBQXdCO2dCQUM5QixXQUFXLEVBQUUsNEJBQTRCO2FBQzFDO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLFdBQVcsRUFBRSxnQ0FBZ0M7YUFDOUM7WUFDRDtnQkFDRSxJQUFJLEVBQUUsb0JBQW9CO2dCQUMxQixXQUFXLEVBQUUsZ0NBQWdDO2FBQzlDO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsV0FBVyxFQUFFLGdDQUFnQzthQUM5QztTQUNGLENBQUM7UUFFRixVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxFQUFFLEVBQUU7WUFDbEMsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLFlBQVksQ0FBQyxJQUFJLFNBQVMsRUFBRTtnQkFDN0QsVUFBVSxFQUFFLGVBQWUsV0FBVyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUU7Z0JBQzdELFdBQVcsRUFBRSxZQUFZLENBQUMsV0FBVztnQkFDckMsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNO2FBQzNCLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsZ0NBQWdDO1FBQ2hDLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQzNDLFVBQVUsRUFBRSxlQUFlLFdBQVcsYUFBYTtZQUNuRCxXQUFXLEVBQUUsOEJBQThCO1lBQzNDLG9CQUFvQixFQUFFO2dCQUNwQixjQUFjLEVBQUUsRUFBRTtnQkFDbEIsa0JBQWtCLEVBQUUsSUFBSTthQUN6QjtZQUNELGFBQWEsRUFBRSxJQUFJLENBQUMsTUFBTTtTQUMzQixDQUFDLENBQUM7UUFFSCxpQkFBaUI7UUFDakIsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDL0MsVUFBVSxFQUFFLGVBQWUsV0FBVyxpQkFBaUI7WUFDdkQsV0FBVyxFQUFFLG9DQUFvQztZQUNqRCxvQkFBb0IsRUFBRTtnQkFDcEIsY0FBYyxFQUFFLEVBQUU7Z0JBQ2xCLGtCQUFrQixFQUFFLElBQUk7YUFDekI7WUFDRCxhQUFhLEVBQUUsSUFBSSxDQUFDLE1BQU07U0FDM0IsQ0FBQyxDQUFDO1FBRUgsVUFBVTtRQUNWLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ2xDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDeEIsV0FBVyxFQUFFLFlBQVk7WUFDekIsVUFBVSxFQUFFLHlCQUF5QixXQUFXLEVBQUU7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTTtZQUN6QixXQUFXLEVBQUUsYUFBYTtZQUMxQixVQUFVLEVBQUUsMEJBQTBCLFdBQVcsRUFBRTtTQUNwRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ2hELEtBQUssRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUztZQUN6QyxXQUFXLEVBQUUsaUNBQWlDO1lBQzlDLFVBQVUsRUFBRSw0QkFBNEIsV0FBVyxFQUFFO1NBQ3RELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQS9HRCxzQ0ErR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMga21zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1rbXMnO1xuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlY3VyaXR5U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgZW52aXJvbm1lbnQ6IHN0cmluZztcbiAgdnBjOiBlYzIuVnBjO1xufVxuXG5leHBvcnQgY2xhc3MgU2VjdXJpdHlTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBrbXNLZXk6IGttcy5LZXk7XG4gIHB1YmxpYyByZWFkb25seSBkYkNyZWRlbnRpYWxzU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFNlY3VyaXR5U3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgeyBlbnZpcm9ubWVudCB9ID0gcHJvcHM7XG5cbiAgICAvLyBLTVMgS2V5IGZvciBlbmNyeXB0aW9uIGF0IHJlc3RcbiAgICB0aGlzLmttc0tleSA9IG5ldyBrbXMuS2V5KHRoaXMsICdNZW50YWxTcGFjZUtNU0tleScsIHtcbiAgICAgIGFsaWFzOiBgbWVudGFsc3BhY2UtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246IGBLTVMga2V5IGZvciBNZW50YWxTcGFjZSBFSFIgJHtlbnZpcm9ubWVudH0gZW52aXJvbm1lbnRgLFxuICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IENsb3VkV2F0Y2ggTG9ncyBhY2Nlc3MgdG8gS01TIGtleVxuICAgIHRoaXMua21zS2V5LmdyYW50RW5jcnlwdERlY3J5cHQobmV3IGNkay5hd3NfaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xvZ3MuYW1hem9uYXdzLmNvbScpKTtcblxuICAgIC8vIERhdGFiYXNlIGNyZWRlbnRpYWxzIHNlY3JldFxuICAgIHRoaXMuZGJDcmVkZW50aWFsc1NlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0RCQ3JlZGVudGlhbHMnLCB7XG4gICAgICBzZWNyZXROYW1lOiBgbWVudGFsc3BhY2UvZGIvY3JlZGVudGlhbHMtJHtlbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdSRFMgUG9zdGdyZVNRTCBkYXRhYmFzZSBjcmVkZW50aWFscycsXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoeyB1c2VybmFtZTogJ21lbnRhbHNwYWNlX2FkbWluJyB9KSxcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdwYXNzd29yZCcsXG4gICAgICAgIGV4Y2x1ZGVQdW5jdHVhdGlvbjogdHJ1ZSxcbiAgICAgICAgaW5jbHVkZVNwYWNlOiBmYWxzZSxcbiAgICAgICAgcGFzc3dvcmRMZW5ndGg6IDMyLFxuICAgICAgfSxcbiAgICAgIGVuY3J5cHRpb25LZXk6IHRoaXMua21zS2V5LFxuICAgIH0pO1xuXG4gICAgLy8gRXh0ZXJuYWwgQVBJIEtleXMgcGxhY2Vob2xkZXIgc2VjcmV0cyAod2lsbCBiZSBwb3B1bGF0ZWQgbWFudWFsbHkgb3IgdmlhIENJL0NEKVxuICAgIGNvbnN0IGFwaVNlY3JldHMgPSBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdvcGVuYWktYXBpLWtleScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnT3BlbkFJIEFQSSBLZXkgZm9yIGNsaW5pY2FsIG5vdGUgZ2VuZXJhdGlvbicsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnYW50aHJvcGljLWFwaS1rZXknLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0FudGhyb3BpYyBDbGF1ZGUgQVBJIEtleSBmb3IgYmlsbGluZyBhbmFseXRpY3MnLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgbmFtZTogJ2FkdmFuY2VkbWQtY3JlZGVudGlhbHMnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0FkdmFuY2VkTUQgQVBJIGNyZWRlbnRpYWxzJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdzdHJpcGUta2V5cycsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnU3RyaXBlIHBheW1lbnQgcHJvY2Vzc2luZyBrZXlzJyxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICd0d2lsaW8tY3JlZGVudGlhbHMnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1R3aWxpbyBTTVMgc2VydmljZSBjcmVkZW50aWFscycsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiAnc2VuZGdyaWQtYXBpLWtleScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnU2VuZEdyaWQgZW1haWwgc2VydmljZSBBUEkga2V5JyxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIGFwaVNlY3JldHMuZm9yRWFjaCgoc2VjcmV0Q29uZmlnKSA9PiB7XG4gICAgICBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsIGAke3NlY3JldENvbmZpZy5uYW1lfS1zZWNyZXRgLCB7XG4gICAgICAgIHNlY3JldE5hbWU6IGBtZW50YWxzcGFjZS8ke2Vudmlyb25tZW50fS8ke3NlY3JldENvbmZpZy5uYW1lfWAsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBzZWNyZXRDb25maWcuZGVzY3JpcHRpb24sXG4gICAgICAgIGVuY3J5cHRpb25LZXk6IHRoaXMua21zS2V5LFxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBKV1QgU2VjcmV0IGZvciBhdXRoZW50aWNhdGlvblxuICAgIG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0pXVFNlY3JldCcsIHtcbiAgICAgIHNlY3JldE5hbWU6IGBtZW50YWxzcGFjZS8ke2Vudmlyb25tZW50fS9qd3Qtc2VjcmV0YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnSldUIHNlY3JldCBmb3IgdG9rZW4gc2lnbmluZycsXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xuICAgICAgICBwYXNzd29yZExlbmd0aDogNjQsXG4gICAgICAgIGV4Y2x1ZGVQdW5jdHVhdGlvbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBlbmNyeXB0aW9uS2V5OiB0aGlzLmttc0tleSxcbiAgICB9KTtcblxuICAgIC8vIFNlc3Npb24gU2VjcmV0XG4gICAgbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnU2Vzc2lvblNlY3JldCcsIHtcbiAgICAgIHNlY3JldE5hbWU6IGBtZW50YWxzcGFjZS8ke2Vudmlyb25tZW50fS9zZXNzaW9uLXNlY3JldGAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1Nlc3Npb24gc2VjcmV0IGZvciBleHByZXNzLXNlc3Npb24nLFxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcbiAgICAgICAgcGFzc3dvcmRMZW5ndGg6IDY0LFxuICAgICAgICBleGNsdWRlUHVuY3R1YXRpb246IHRydWUsXG4gICAgICB9LFxuICAgICAgZW5jcnlwdGlvbktleTogdGhpcy5rbXNLZXksXG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXRzXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0tNU0tleUlkJywge1xuICAgICAgdmFsdWU6IHRoaXMua21zS2V5LmtleUlkLFxuICAgICAgZGVzY3JpcHRpb246ICdLTVMgS2V5IElEJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBNZW50YWxTcGFjZS1LTVMtS2V5SUQtJHtlbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0tNU0tleUFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmttc0tleS5rZXlBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0tNUyBLZXkgQVJOJyxcbiAgICAgIGV4cG9ydE5hbWU6IGBNZW50YWxTcGFjZS1LTVMtS2V5QVJOLSR7ZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEQkNyZWRlbnRpYWxzU2VjcmV0QXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMuZGJDcmVkZW50aWFsc1NlY3JldC5zZWNyZXRBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ0RhdGFiYXNlIENyZWRlbnRpYWxzIFNlY3JldCBBUk4nLFxuICAgICAgZXhwb3J0TmFtZTogYE1lbnRhbFNwYWNlLURCLVNlY3JldEFSTi0ke2Vudmlyb25tZW50fWAsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==