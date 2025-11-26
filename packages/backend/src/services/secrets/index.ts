/**
 * Secrets Manager Module
 *
 * HIPAA Security: Centralized secrets management with AWS Secrets Manager
 */

export {
  secretsManager,
  initializeSecrets,
  setupSecretRotation,
  getRotationStatus,
  SecretNames,
  type SecretsConfig,
  type DatabaseCredentials,
  type EncryptionKeys,
  type ThirdPartyApiKeys,
  type RotationSchedule,
} from './secretsManager';

export { default } from './secretsManager';
