import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { KeyManagementService, KeyMetadata } from './key-management.service';

export enum KeyHealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}

export interface KeyRotationCheckResult {
  status: KeyHealthStatus;
  keyId: string | null;
  keyVersion: number;
  createdAt: string | null;
  ageInDays: number | null;
  maxAgeDays: number;
  warningThresholdDays: number;
  daysUntilRotation: number | null;
  message: string;
  recommendations: string[];
}

export interface KeyRotationPolicy {
  maxAgeDays: number;
  warningThresholdDays: number;
  checkOnStartup: boolean;
}

/**
 * Service for monitoring and managing cryptographic key rotation.
 *
 * Implements NIST SP 800-57 Key Management Guidelines:
 * - Cryptoperiod enforcement (key lifetime limits)
 * - Key state tracking (operational, deactivated, compromised)
 * - Rotation scheduling and warnings
 *
 * Per NIST SP 800-57 Part 1 Rev. 5:
 * - Originator usage period: time during which new signatures can be created
 * - Recipient usage period: time during which signatures remain verifiable
 * - Keys should be rotated before the end of their cryptoperiod
 *
 * For Ed25519 digital signatures (our use case):
 * - Recommended originator cryptoperiod: 1-3 years
 * - Recipient usage period: indefinite (for signature verification)
 *
 * @see NIST SP 800-57 Part 1 Rev. 5 - Recommendation for Key Management
 * @see https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final
 */
@Injectable()
export class KeyRotationService implements OnModuleInit {
  private readonly logger = new Logger(KeyRotationService.name);
  private readonly policy: KeyRotationPolicy;

  constructor(
    private readonly keyManagement: KeyManagementService,
    private readonly configService: ConfigService,
  ) {
    this.policy = {
      maxAgeDays: this.configService.get<number>('KEY_MAX_AGE_DAYS', 365),
      warningThresholdDays: this.configService.get<number>(
        'KEY_ROTATION_WARNING_DAYS',
        30,
      ),
      checkOnStartup: true,
    };
  }

  async onModuleInit(): Promise<void> {
    if (!this.policy.checkOnStartup) {
      return;
    }

    // Wait a short time for KeyManagementService to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await this.checkKeyRotation();
    this.logHealthStatus(result);
  }

  async checkKeyRotation(): Promise<KeyRotationCheckResult> {
    if (!this.keyManagement.isInitialized()) {
      return {
        status: KeyHealthStatus.UNKNOWN,
        keyId: null,
        keyVersion: 0,
        createdAt: null,
        ageInDays: null,
        maxAgeDays: this.policy.maxAgeDays,
        warningThresholdDays: this.policy.warningThresholdDays,
        daysUntilRotation: null,
        message: 'Signing keys not initialized',
        recommendations: ['Configure signing keys before production use'],
      };
    }

    const metadata = this.keyManagement.getKeyMetadata();
    const keyId = this.keyManagement.getKeyId();
    const keyVersion = this.keyManagement.getKeyVersion();

    if (!metadata?.createdAt) {
      return {
        status: KeyHealthStatus.WARNING,
        keyId,
        keyVersion,
        createdAt: null,
        ageInDays: null,
        maxAgeDays: this.policy.maxAgeDays,
        warningThresholdDays: this.policy.warningThresholdDays,
        daysUntilRotation: null,
        message:
          'Key creation date unknown - unable to determine rotation status',
        recommendations: [
          'Create key metadata file with creation timestamp',
          'Consider rotating to a new key with proper metadata',
        ],
      };
    }

    const createdAt = new Date(metadata.createdAt);
    const now = new Date();
    const ageInMs = now.getTime() - createdAt.getTime();
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    const daysUntilRotation = this.policy.maxAgeDays - ageInDays;

    if (ageInDays >= this.policy.maxAgeDays) {
      return {
        status: KeyHealthStatus.CRITICAL,
        keyId,
        keyVersion,
        createdAt: metadata.createdAt,
        ageInDays,
        maxAgeDays: this.policy.maxAgeDays,
        warningThresholdDays: this.policy.warningThresholdDays,
        daysUntilRotation,
        message: `Signing key has exceeded maximum age (${ageInDays.toString()} days > ${this.policy.maxAgeDays.toString()} days)`,
        recommendations: [
          'IMMEDIATE ACTION REQUIRED: Rotate signing key immediately',
          'Generate new Ed25519 key pair with proper metadata',
          'Archive the old key for signature verification',
          'Update SIGNING_KEY_PATH and related configuration',
        ],
      };
    }

    if (daysUntilRotation <= this.policy.warningThresholdDays) {
      return {
        status: KeyHealthStatus.WARNING,
        keyId,
        keyVersion,
        createdAt: metadata.createdAt,
        ageInDays,
        maxAgeDays: this.policy.maxAgeDays,
        warningThresholdDays: this.policy.warningThresholdDays,
        daysUntilRotation,
        message: `Signing key rotation due in ${daysUntilRotation.toString()} days`,
        recommendations: [
          'Schedule key rotation during next maintenance window',
          'Prepare new Ed25519 key pair',
          'Test rotation procedure in staging environment',
          'Review key rotation documentation',
        ],
      };
    }

    return {
      status: KeyHealthStatus.HEALTHY,
      keyId,
      keyVersion,
      createdAt: metadata.createdAt,
      ageInDays,
      maxAgeDays: this.policy.maxAgeDays,
      warningThresholdDays: this.policy.warningThresholdDays,
      daysUntilRotation,
      message: `Signing key is healthy (${daysUntilRotation.toString()} days until rotation)`,
      recommendations: [],
    };
  }

  getPolicy(): KeyRotationPolicy {
    return { ...this.policy };
  }

  async validateKeyMetadata(keyPath: string): Promise<{
    valid: boolean;
    metadata: KeyMetadata | null;
    issues: string[];
  }> {
    const metadataPath = keyPath + '.meta.json';
    const issues: string[] = [];

    try {
      const content = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content) as KeyMetadata;

      if (!metadata.version || typeof metadata.version !== 'number') {
        issues.push('Missing or invalid version field');
      }

      if (!metadata.createdAt) {
        issues.push('Missing createdAt timestamp');
      } else {
        const date = new Date(metadata.createdAt);
        if (isNaN(date.getTime())) {
          issues.push('Invalid createdAt timestamp format');
        }
      }

      if (!metadata.algorithm) {
        issues.push('Missing algorithm field');
      } else if (metadata.algorithm !== 'Ed25519') {
        issues.push(`Unexpected algorithm: ${metadata.algorithm}`);
      }

      if (!metadata.keyId) {
        issues.push('Missing keyId field');
      }

      return {
        valid: issues.length === 0,
        metadata: issues.length === 0 ? metadata : null,
        issues,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          valid: false,
          metadata: null,
          issues: [
            `Metadata file not found: ${metadataPath}`,
            'Create metadata file using: npm run keys:generate',
          ],
        };
      }

      return {
        valid: false,
        metadata: null,
        issues: [`Failed to read metadata file: ${(error as Error).message}`],
      };
    }
  }

  async generateRotationReport(): Promise<{
    currentKey: KeyRotationCheckResult;
    policy: KeyRotationPolicy;
    nextRotationDate: string | null;
    complianceStatus: 'compliant' | 'non-compliant' | 'unknown';
  }> {
    const checkResult = await this.checkKeyRotation();

    let nextRotationDate: string | null = null;
    if (checkResult.createdAt && checkResult.daysUntilRotation !== null) {
      const created = new Date(checkResult.createdAt);
      created.setDate(created.getDate() + this.policy.maxAgeDays);
      nextRotationDate = created.toISOString().split('T')[0];
    }

    let complianceStatus: 'compliant' | 'non-compliant' | 'unknown' = 'unknown';
    if (checkResult.status === KeyHealthStatus.HEALTHY) {
      complianceStatus = 'compliant';
    } else if (checkResult.status === KeyHealthStatus.CRITICAL) {
      complianceStatus = 'non-compliant';
    } else if (checkResult.status === KeyHealthStatus.WARNING) {
      complianceStatus = 'compliant';
    }

    return {
      currentKey: checkResult,
      policy: this.getPolicy(),
      nextRotationDate,
      complianceStatus,
    };
  }

  private logHealthStatus(result: KeyRotationCheckResult): void {
    const logData = {
      status: result.status,
      keyId: result.keyId,
      keyVersion: result.keyVersion,
      ageInDays: result.ageInDays,
      daysUntilRotation: result.daysUntilRotation,
    };

    switch (result.status) {
      case KeyHealthStatus.CRITICAL:
        this.logger.error(result.message, logData);
        this.logger.error('Recommendations:');
        for (const rec of result.recommendations) {
          this.logger.error(`  - ${rec}`);
        }
        break;

      case KeyHealthStatus.WARNING:
        this.logger.warn(result.message, logData);
        this.logger.warn('Recommendations:');
        for (const rec of result.recommendations) {
          this.logger.warn(`  - ${rec}`);
        }
        break;

      case KeyHealthStatus.UNKNOWN:
        this.logger.warn(result.message);
        break;

      case KeyHealthStatus.HEALTHY:
        this.logger.log(result.message);
        break;
    }
  }
}
