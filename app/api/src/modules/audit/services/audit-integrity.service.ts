import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { AuditLog } from '../entities/audit-log.entity';

export interface SignatureVerificationResult {
  valid: boolean;
  entryId: string;
  expectedSignature?: string;
  actualSignature?: string;
  errorMessage?: string;
}

export interface BatchVerificationResult {
  valid: boolean;
  entriesChecked: number;
  invalidEntries: SignatureVerificationResult[];
  errorMessage?: string;
}

/**
 * AuditIntegrityService provides cryptographic integrity protection for audit logs.
 *
 * Implements security controls per:
 *
 * **NIST SP 800-92 - Guide to Computer Security Log Management:**
 * - Section 4.3: Protecting Log Data - Log data should be protected from
 *   unauthorized access, modification, and deletion
 * - Integrity verification through cryptographic mechanisms
 *
 * **NIST SP 800-53 - Security and Privacy Controls:**
 * - AU-9: Protection of Audit Information
 * - AU-10: Non-repudiation
 *
 * **OWASP Logging Cheat Sheet:**
 * - Tamper detection through cryptographic signatures
 * - Defense-in-depth with multiple integrity mechanisms
 *
 * This service uses HMAC-SHA256 for audit log signatures:
 * - Provides message authentication and integrity verification
 * - Uses a server-side secret key that should be rotated periodically
 * - Complements the existing hash chain mechanism for defense-in-depth
 *
 * @see https://csrc.nist.gov/publications/detail/sp/800-92/final
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
 */
@Injectable()
export class AuditIntegrityService implements OnModuleInit {
  private readonly logger = new Logger(AuditIntegrityService.name);

  private hmacKey: Buffer | null = null;
  private readonly algorithm = 'sha256';
  // Per NIST SP 800-107, HMAC keys should be at least as long as the hash output
  private readonly minKeyLength = 32;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const keyBase64 = this.configService.get<string>('AUDIT_LOG_HMAC_KEY');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (keyBase64) {
      try {
        this.hmacKey = Buffer.from(keyBase64, 'base64');

        if (this.hmacKey.length < this.minKeyLength) {
          this.logger.warn(
            `AUDIT_LOG_HMAC_KEY is shorter than recommended ${this.minKeyLength.toString()} bytes. ` +
              'Consider using a longer key for production.',
          );
        }

        this.logger.log(
          'Audit log HMAC signing initialized with configured key',
        );
      } catch {
        this.logger.error(
          'Failed to decode AUDIT_LOG_HMAC_KEY - must be valid base64',
        );
        this.hmacKey = null;
      }
    } else if (nodeEnv === 'production') {
      this.logger.error(
        'AUDIT_LOG_HMAC_KEY not configured in production! ' +
          'Audit logs will not have cryptographic signatures. ' +
          'This is a security risk per NIST SP 800-92.',
      );
    } else {
      // Development/staging: generate ephemeral key with warning
      this.hmacKey = crypto.randomBytes(32);
      this.logger.warn(
        'AUDIT_LOG_HMAC_KEY not configured - using ephemeral key. ' +
          'Audit log signatures will not persist across restarts. ' +
          'Configure AUDIT_LOG_HMAC_KEY for production use.',
      );
    }
  }

  generateSignature(entry: Partial<AuditLog>): string {
    if (!this.hmacKey) {
      this.logger.warn('Cannot generate signature: HMAC key not available');
      return '';
    }

    const dataToSign = this.buildSignatureData(entry);
    const hmac = crypto.createHmac(this.algorithm, this.hmacKey);
    hmac.update(JSON.stringify(dataToSign));
    return hmac.digest('hex');
  }

  verifySignature(entry: AuditLog): SignatureVerificationResult {
    if (!this.hmacKey) {
      return {
        valid: false,
        entryId: entry.id,
        errorMessage: 'HMAC key not available for verification',
      };
    }

    if (!entry.signature) {
      return {
        valid: false,
        entryId: entry.id,
        errorMessage: 'Entry has no signature',
      };
    }

    const expectedSignature = this.generateSignature(entry);

    // Use timing-safe comparison to prevent timing attacks
    const isValid = this.timingSafeEqual(entry.signature, expectedSignature);

    return {
      valid: isValid,
      entryId: entry.id,
      expectedSignature: isValid ? undefined : expectedSignature,
      actualSignature: isValid ? undefined : entry.signature,
      errorMessage: isValid
        ? undefined
        : 'Signature mismatch - entry may have been tampered',
    };
  }

  verifyBatch(entries: AuditLog[]): BatchVerificationResult {
    if (!this.hmacKey) {
      return {
        valid: false,
        entriesChecked: 0,
        invalidEntries: [],
        errorMessage: 'HMAC key not available for verification',
      };
    }

    const invalidEntries: SignatureVerificationResult[] = [];

    for (const entry of entries) {
      const result = this.verifySignature(entry);
      if (!result.valid) {
        invalidEntries.push(result);
      }
    }

    return {
      valid: invalidEntries.length === 0,
      entriesChecked: entries.length,
      invalidEntries,
      errorMessage:
        invalidEntries.length > 0
          ? `${invalidEntries.length.toString()} of ${entries.length.toString()} entries have invalid signatures`
          : undefined,
    };
  }

  isConfigured(): boolean {
    return this.hmacKey !== null;
  }

  getKeyFingerprint(): string | null {
    if (!this.hmacKey) {
      return null;
    }

    return crypto
      .createHash('sha256')
      .update(this.hmacKey)
      .digest('hex')
      .substring(0, 16);
  }

  // Fields explicitly listed to ensure consistent signature computation
  private buildSignatureData(
    entry: Partial<AuditLog>,
  ): Record<string, unknown> {
    return {
      eventType: entry.eventType ?? null,
      action: entry.action ?? null,

      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,

      actorId: entry.actorId ?? null,
      actorIp: entry.actorIp ?? null,

      oldValues: entry.oldValues ?? null,
      newValues: entry.newValues ?? null,

      prevHash: entry.prevHash ?? null,
      currHash: entry.currHash ?? null,
    };
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');

    return crypto.timingSafeEqual(bufA, bufB);
  }
}
