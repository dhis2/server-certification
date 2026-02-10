import { z } from 'zod';

/**
 * Environment variable validation schema.
 *
 * Implements NIST SP 800-123 and OWASP Configuration guidelines:
 * - All secrets must be explicitly configured in production
 * - No default values for sensitive credentials
 * - Strict validation of security-critical parameters
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Configuration_Cheat_Sheet.html
 * @see NIST SP 800-123 - Guide to General Server Security
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3001),

  // Database configuration
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('dhis2_certification'),
  DB_SSL: z.coerce.boolean().default(false),

  // JWT configuration
  JWT_SECRET: z.string().min(32).optional(),
  JWT_ACCESS_TOKEN_TTL: z.string().default('15m'),
  JWT_REFRESH_TOKEN_TTL: z.string().default('7d'),
  JWT_TOKEN_AUDIENCE: z.string().default('localhost'),
  JWT_TOKEN_ISSUER: z.string().default('localhost'),
  JWT_ALGORITHM: z.enum(['HS256', 'RS256']).default('HS256'),

  // Application configuration
  APP_BASE_URL: z.string().url().optional(),
  ISSUER_DID: z.string().optional(),
  ISSUER_NAME: z.string().optional(),

  // Signing key configuration (critical for certificate issuance)
  SIGNING_KEY_PATH: z.string().optional(),
  SIGNING_PUBLIC_KEY_PATH: z.string().optional(),
  SIGNING_KEY_PASSPHRASE: z.string().optional(),
  SIGNING_KEY_VERSION: z.coerce.number().optional(),

  // Key rotation configuration (NIST SP 800-57 compliance)
  KEY_ROTATION_WARNING_DAYS: z.coerce.number().default(30),
  KEY_MAX_AGE_DAYS: z.coerce.number().default(365),

  // Upload configuration
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(10485760), // 10MB
  ALLOWED_MIME_TYPES: z.string().optional(),

  // Rate limiting configuration
  THROTTLE_TTL: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(100),
  THROTTLE_AUTH_LIMIT: z.coerce.number().default(5),

  // Mail configuration
  MAIL_ENABLED: z.coerce.boolean().default(true),
  MAIL_HOST: z.string().optional(),
  MAIL_PORT: z.coerce.number().default(587),
  MAIL_SECURE: z.coerce.boolean().default(false),
  MAIL_USER: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),
  MAIL_FROM_NAME: z.string().default('DHIS2 Server Certification'),
  MAIL_FROM_ADDRESS: z.string().email().default('no-reply@dhis2.org'),

  // Redis configuration
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // Status list cache configuration (W3C VC Status List 2021)
  STATUS_LIST_CACHE_TTL: z.coerce.number().default(300), // 5 minutes default

  // Audit log configuration (NIST SP 800-92 compliance)
  // HMAC key for signing audit log entries (base64-encoded, 256+ bits recommended)
  AUDIT_LOG_HMAC_KEY: z.string().optional(),

  // Retention policy configuration
  AUDIT_RETENTION_DEFAULT_DAYS: z.coerce.number().default(90), // NIST minimum
  AUDIT_RETENTION_SECURITY_DAYS: z.coerce.number().default(365), // Auth events
  AUDIT_RETENTION_CERTIFICATE_DAYS: z.coerce.number().default(730), // 2 years
  AUDIT_RETENTION_ARCHIVE: z.coerce.boolean().default(true),
  AUDIT_RETENTION_BATCH_SIZE: z.coerce.number().default(1000),
  AUDIT_RETENTION_AUTO_CLEANUP: z.coerce.boolean().default(true),

  // Certificate validity configuration (NIST SP 800-57 key validity periods)
  // Validity period for passing certificates in days (default: 730 = 2 years)
  CERTIFICATE_VALIDITY_DAYS: z.coerce.number().min(30).max(1825).default(730),
  // Grace period for certificate renewal reminders in days
  CERTIFICATE_RENEWAL_REMINDER_DAYS: z.coerce.number().default(60),

  // Monitoring and alerting configuration (NIST SP 800-137 continuous monitoring)
  MONITORING_ENABLED: z.coerce.boolean().default(true),
  // Threshold for certificate expiration warnings (days before expiry)
  MONITORING_CERT_EXPIRY_WARNING_DAYS: z.coerce.number().default(30),
  // Threshold for high error rate alerting (percentage)
  MONITORING_ERROR_RATE_THRESHOLD: z.coerce.number().min(0).max(100).default(5),
  // Interval for metrics collection in milliseconds
  MONITORING_METRICS_INTERVAL_MS: z.coerce.number().default(60000),
  // Alerting webhook URL (optional, for external alerting systems)
  MONITORING_ALERT_WEBHOOK_URL: z.string().url().optional(),
  // Slack webhook URL for alerts (optional)
  MONITORING_SLACK_WEBHOOK_URL: z.string().url().optional(),
});

interface ProductionValidationError {
  field: string;
  message: string;
  reference?: string;
}

function validateProductionSecrets(
  config: z.infer<typeof envSchema>,
): ProductionValidationError[] {
  const errors: ProductionValidationError[] = [];

  // JWT Secret (OWASP Session Management)
  if (!config.JWT_SECRET) {
    errors.push({
      field: 'JWT_SECRET',
      message: 'JWT_SECRET must be set in production (min 32 characters)',
      reference: 'OWASP Session Management Cheat Sheet',
    });
  } else if (config.JWT_SECRET.length < 64) {
    errors.push({
      field: 'JWT_SECRET',
      message:
        'JWT_SECRET should be at least 64 characters for production security',
      reference: 'NIST SP 800-132',
    });
  }

  // Application Base URL (required for credential issuance)
  if (!config.APP_BASE_URL) {
    errors.push({
      field: 'APP_BASE_URL',
      message:
        'APP_BASE_URL must be set in production for proper credential issuance',
      reference: 'W3C Verifiable Credentials Data Model',
    });
  } else if (!config.APP_BASE_URL.startsWith('https://')) {
    errors.push({
      field: 'APP_BASE_URL',
      message: 'APP_BASE_URL must use HTTPS in production',
      reference: 'OWASP Transport Layer Security Cheat Sheet',
    });
  }

  // Issuer DID (required for W3C VC compliance)
  if (!config.ISSUER_DID) {
    errors.push({
      field: 'ISSUER_DID',
      message:
        'ISSUER_DID must be set in production for W3C Verifiable Credentials',
      reference: 'W3C DID Core Specification',
    });
  } else if (
    !config.ISSUER_DID.startsWith('did:web:') &&
    !config.ISSUER_DID.startsWith('did:key:')
  ) {
    errors.push({
      field: 'ISSUER_DID',
      message:
        'ISSUER_DID should use did:web: or did:key: method in production',
      reference: 'W3C DID Core Specification',
    });
  }

  // Signing Keys (NIST SP 800-57)
  if (!config.SIGNING_KEY_PATH || !config.SIGNING_PUBLIC_KEY_PATH) {
    errors.push({
      field: 'SIGNING_KEY_PATH / SIGNING_PUBLIC_KEY_PATH',
      message:
        'Signing keys must be configured in production (SIGNING_KEY_PATH and SIGNING_PUBLIC_KEY_PATH)',
      reference: 'NIST SP 800-57 Key Management',
    });
  }

  if (config.SIGNING_KEY_PATH && !config.SIGNING_KEY_PASSPHRASE) {
    errors.push({
      field: 'SIGNING_KEY_PASSPHRASE',
      message:
        'Signing key passphrase should be set when using file-based keys',
      reference: 'NIST SP 800-57 Key Management',
    });
  }

  // Database Security (OWASP Database Security)
  if (config.DB_PASSWORD === 'postgres' || config.DB_PASSWORD === '') {
    errors.push({
      field: 'DB_PASSWORD',
      message: 'DB_PASSWORD must not use default or empty value in production',
      reference: 'OWASP Database Security Cheat Sheet',
    });
  }

  if (!config.DB_SSL) {
    errors.push({
      field: 'DB_SSL',
      message:
        'DB_SSL should be enabled in production for encrypted connections',
      reference: 'OWASP Database Security Cheat Sheet',
    });
  }

  // Mail Configuration (if enabled)
  if (config.MAIL_ENABLED) {
    if (!config.MAIL_HOST) {
      errors.push({
        field: 'MAIL_HOST',
        message: 'MAIL_HOST must be set when mail is enabled in production',
        reference: 'OWASP Secure Configuration',
      });
    }
    if (!config.MAIL_USER || !config.MAIL_PASSWORD) {
      errors.push({
        field: 'MAIL_USER / MAIL_PASSWORD',
        message:
          'Mail credentials should be configured when mail is enabled in production',
        reference: 'OWASP Secure Configuration',
      });
    }
    if (!config.MAIL_SECURE && config.MAIL_PORT !== 587) {
      errors.push({
        field: 'MAIL_SECURE',
        message: 'MAIL_SECURE should be true or use port 587 with STARTTLS',
        reference: 'OWASP Transport Layer Security',
      });
    }
  }

  // Audit Log HMAC Key (NIST SP 800-92)
  if (!config.AUDIT_LOG_HMAC_KEY) {
    errors.push({
      field: 'AUDIT_LOG_HMAC_KEY',
      message:
        'AUDIT_LOG_HMAC_KEY must be set in production for audit log integrity (base64-encoded, 256+ bits)',
      reference: 'NIST SP 800-92 - Guide to Computer Security Log Management',
    });
  } else {
    try {
      const keyBytes = Buffer.from(config.AUDIT_LOG_HMAC_KEY, 'base64');
      if (keyBytes.length < 32) {
        errors.push({
          field: 'AUDIT_LOG_HMAC_KEY',
          message:
            'AUDIT_LOG_HMAC_KEY should be at least 256 bits (32 bytes) for production security',
          reference: 'NIST SP 800-107 - Recommendation for Key Derivation',
        });
      }
    } catch {
      errors.push({
        field: 'AUDIT_LOG_HMAC_KEY',
        message: 'AUDIT_LOG_HMAC_KEY must be valid base64-encoded data',
        reference: 'NIST SP 800-92',
      });
    }
  }

  // Audit retention policy validation
  if (config.AUDIT_RETENTION_DEFAULT_DAYS < 90) {
    errors.push({
      field: 'AUDIT_RETENTION_DEFAULT_DAYS',
      message:
        'AUDIT_RETENTION_DEFAULT_DAYS should be at least 90 days per NIST SP 800-92',
      reference: 'NIST SP 800-92 - Guide to Computer Security Log Management',
    });
  }

  return errors;
}

function validateStagingSecrets(
  config: z.infer<typeof envSchema>,
): ProductionValidationError[] {
  const errors: ProductionValidationError[] = [];

  // JWT Secret is required in staging
  if (!config.JWT_SECRET) {
    errors.push({
      field: 'JWT_SECRET',
      message: 'JWT_SECRET must be set in staging environment',
      reference: 'OWASP Session Management',
    });
  }

  // Signing keys should be configured in staging
  if (!config.SIGNING_KEY_PATH || !config.SIGNING_PUBLIC_KEY_PATH) {
    console.warn(
      '[EnvValidation] WARNING: Signing keys not configured in staging. ' +
        'Using ephemeral keys which is not recommended.',
    );
  }

  return errors;
}

export function envValidationSchema(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.format();
    console.error('[EnvValidation] Environment validation failed:');
    console.error(JSON.stringify(errors, null, 2));
    throw new Error('Invalid environment configuration');
  }

  const data = result.data;

  // Production environment validation
  if (data.NODE_ENV === 'production') {
    const productionErrors = validateProductionSecrets(data);

    if (productionErrors.length > 0) {
      console.error('[EnvValidation] Production secrets validation failed:');
      console.error('');
      for (const error of productionErrors) {
        console.error(`  ✗ ${error.field}: ${error.message}`);
        if (error.reference) {
          console.error(`    Reference: ${error.reference}`);
        }
      }
      console.error('');
      console.error(
        'For production deployment guidance, see: docs/deployment/production-secrets.md',
      );

      throw new Error(
        `Production configuration invalid: ${productionErrors.length.toString()} secret(s) missing or insecure. ` +
          'See error log above for details.',
      );
    }

    console.log('[EnvValidation] Production secrets validation passed');
  }

  // Staging environment validation
  if (data.NODE_ENV === 'staging') {
    const stagingErrors = validateStagingSecrets(data);

    if (stagingErrors.length > 0) {
      console.error('[EnvValidation] Staging secrets validation failed:');
      for (const error of stagingErrors) {
        console.error(`  ✗ ${error.field}: ${error.message}`);
      }
      throw new Error(
        `Staging configuration invalid: ${stagingErrors.length.toString()} issue(s) found.`,
      );
    }
  }

  // Development environment warnings
  if (data.NODE_ENV === 'development') {
    if (!data.SIGNING_KEY_PATH) {
      console.warn(
        '[EnvValidation] Development mode: Using ephemeral signing keys. ' +
          'Certificates will not persist across restarts.',
      );
    }
  }

  return data;
}

export { envSchema };

export type ValidatedEnvConfig = z.infer<typeof envSchema>;
