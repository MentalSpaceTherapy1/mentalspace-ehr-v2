import * as cdk from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface SecurityStackProps extends cdk.StackProps {
  environment: string;
  vpc: ec2.Vpc;
}

export class SecurityStack extends cdk.Stack {
  public readonly kmsKey: kms.Key;
  public readonly dbCredentialsSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: SecurityStackProps) {
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
