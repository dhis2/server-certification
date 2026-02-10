import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { Certificate } from '../entities/certificate.entity';
import { Submission } from '../../submissions/entities/submission.entity';
import { SubmissionStatus, CertificationResult } from '../../../common/enums';
import { SubmissionResponse } from '../../submissions/entities/submission-response.entity';
import { AssessmentCategory } from '../../templates/entities/assessment-category.entity';
import { Implementation } from '../../implementations/entities/implementation.entity';
import { CredentialIssuanceService } from './credential-issuance.service';
import { StatusListCacheService } from './status-list-cache.service';
import { AuditService, AuditEventType, AuditAction } from '../../audit';
import { isUniqueViolation } from '../../../shared/utils/error.utils';
import {
  isValidVerificationCode,
  isValidCertificateNumber,
} from '../../../shared/validators';
import {
  Connection,
  CursorPaginationOptions,
  paginate,
} from 'src/shared/pagination';

export interface FindAllCertificatesOptions extends CursorPaginationOptions {
  implementationId?: string;
}

export type CertificatesConnection = Connection<Certificate>;

interface CertificateValidityConfig {
  validityDays: number;
  renewalReminderDays: number;
}

@Injectable()
export class CertificatesService implements OnModuleInit {
  private readonly logger = new Logger(CertificatesService.name);
  private readonly validityConfig: CertificateValidityConfig;

  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepo: Repository<Certificate>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(SubmissionResponse)
    private readonly responseRepo: Repository<SubmissionResponse>,
    @InjectRepository(AssessmentCategory)
    private readonly categoryRepo: Repository<AssessmentCategory>,
    @InjectRepository(Implementation)
    private readonly implementationRepo: Repository<Implementation>,
    private readonly credentialIssuance: CredentialIssuanceService,
    private readonly statusListCache: StatusListCacheService,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.validityConfig = {
      validityDays: this.configService.get<number>(
        'CERTIFICATE_VALIDITY_DAYS',
        730,
      ),
      renewalReminderDays: this.configService.get<number>(
        'CERTIFICATE_RENEWAL_REMINDER_DAYS',
        60,
      ),
    };
  }

  onModuleInit(): void {
    const { validityDays, renewalReminderDays } = this.validityConfig;

    if (validityDays < 30) {
      this.logger.warn(
        `Certificate validity period (${validityDays.toString()} days) is very short. ` +
          'Consider increasing for production use.',
      );
    }

    if (validityDays > 1095) {
      // > 3 years
      this.logger.warn(
        `Certificate validity period (${validityDays.toString()} days) exceeds 3 years. ` +
          'Per NIST SP 800-57, consider shorter validity periods for security.',
      );
    }

    if (renewalReminderDays >= validityDays) {
      this.logger.warn(
        'Renewal reminder days should be less than validity days.',
      );
    }

    this.logger.log(
      `Certificate validity configured: ${validityDays.toString()} days, ` +
        `renewal reminder: ${renewalReminderDays.toString()} days before expiry`,
    );
  }

  async issueCertificate(
    submissionId: string,
    issuerId: string,
  ): Promise<Certificate> {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['implementation'],
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${submissionId} not found`);
    }

    if (submission.status !== SubmissionStatus.PASSED) {
      throw new BadRequestException(
        'Can only issue certificates for passed submissions',
      );
    }

    if (!submission.certificationResult || submission.totalScore === null) {
      throw new BadRequestException(
        'Submission must have certification result and score',
      );
    }

    const implementation = await this.implementationRepo.findOne({
      where: { id: submission.implementationId },
    });

    if (!implementation) {
      throw new NotFoundException('Implementation not found');
    }

    const categoryScores = await this.calculateCategoryScores(submission);
    const validityPeriod = this.getValidityPeriod(
      submission.certificationResult,
    );

    try {
      const saved = await this.dataSource.transaction(
        'SERIALIZABLE',
        async (manager): Promise<Certificate> => {
          const certRepo = manager.getRepository(Certificate);
          const subRepo = manager.getRepository(Submission);

          const existingCert = await certRepo.findOne({
            where: { submissionId },
          });

          if (existingCert) {
            throw new ConflictException(
              'Certificate already issued for this submission',
            );
          }

          const statusListIndex =
            await this.getNextStatusListIndexWithManager(manager);

          const { credential, certificateHash, signature, keyVersion } =
            await this.credentialIssuance.issueCredential(
              {
                submissionId: submission.id,
                implementationId: implementation.id,
                implementationName: implementation.name,
                certificationResult: submission.certificationResult!,
                controlGroup: submission.targetControlGroup as 'DSCP1',
                finalScore: submission.totalScore!,
                categoryScores,
                validFrom: validityPeriod.validFrom,
                validUntil: validityPeriod.validUntil,
              },
              statusListIndex,
            );

          const certificate: Certificate = certRepo.create({
            submissionId: submission.id,
            implementationId: implementation.id,
            certificateNumber:
              this.credentialIssuance.generateCertificateNumber(
                submission.certificationResult!,
              ),
            certificationResult: submission.certificationResult!,
            controlGroup: submission.targetControlGroup,
            finalScore: submission.totalScore!,
            validFrom: validityPeriod.validFrom,
            validUntil: validityPeriod.validUntil,
            certificateHash,
            signature,
            signingKeyVersion: keyVersion,
            verificationCode:
              this.credentialIssuance.generateVerificationCode(),
            vcJson: credential,
            statusListIndex,
            issuedById: issuerId,
          } as Partial<Certificate>);

          const savedCert: Certificate = await certRepo.save(certificate);

          await subRepo.update(submissionId, {
            certificateNumber: savedCert.certificateNumber,
          });

          return savedCert;
        },
      );

      await this.auditService.log(
        {
          eventType: AuditEventType.CERTIFICATE_ISSUED,
          entityType: 'Certificate',
          entityId: saved.id,
          action: AuditAction.ISSUE,
          newValues: {
            certificateNumber: saved.certificateNumber,
            implementationId: saved.implementationId,
            certificationResult: saved.certificationResult,
            finalScore: saved.finalScore,
            validFrom: saved.validFrom,
            validUntil: saved.validUntil,
          },
        },
        { actorId: issuerId },
      );

      this.logger.log(
        `Certificate ${saved.certificateNumber} issued for submission ${submissionId}`,
      );

      return saved;
    } catch (err) {
      if (err instanceof ConflictException) {
        throw err;
      }
      if (isUniqueViolation(err)) {
        throw new ConflictException(
          'Certificate already issued for this submission',
        );
      }
      throw err;
    }
  }

  async findAll(
    options: FindAllCertificatesOptions = {},
  ): Promise<CertificatesConnection> {
    const qb = this.certificateRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.implementation', 'impl');

    if (options.implementationId) {
      qb.where('c.implementationId = :implementationId', {
        implementationId: options.implementationId,
      });
    }

    return paginate(qb, 'c', {
      first: options.first,
      after: options.after,
      sortDirection: 'DESC',
    });
  }

  async findOne(id: string): Promise<Certificate> {
    const certificate = await this.certificateRepo.findOne({
      where: { id },
      relations: ['implementation', 'submission', 'issuedBy'],
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate ${id} not found`);
    }

    return certificate;
  }

  /**
   * Retrieves a certificate by ID with cryptographic integrity verification.
   *
   * Per NIST SP 800-53 SI-7 (Software, Firmware, and Information Integrity):
   * - Verifies hash integrity to detect unauthorized modifications
   * - Verifies cryptographic signature to ensure authenticity
   * - Logs security events on verification failures
   *
   * This provides defense-in-depth against database tampering attacks.
   * The certificate is returned even if verification fails, with the
   * integrity status included for the client to handle appropriately.
   *
   * @param id - Certificate UUID
   * @returns Certificate with integrity verification status
   * @throws NotFoundException if certificate not found
   */
  async findOneWithVerification(id: string): Promise<{
    certificate: Certificate;
    integrityStatus: {
      verified: boolean;
      integrityValid?: boolean;
      signatureValid?: boolean;
      error?: string;
    };
  }> {
    const certificate = await this.findOne(id);

    if (!certificate.vcJson || !certificate.certificateHash) {
      return {
        certificate,
        integrityStatus: {
          verified: false,
          error: 'Certificate missing required data for verification',
        },
      };
    }

    try {
      const verificationResult =
        await this.credentialIssuance.verifyCredentialFull(
          certificate.vcJson,
          certificate.certificateHash,
        );

      const integrityStatus = {
        verified: true,
        integrityValid: verificationResult.integrityValid,
        signatureValid: verificationResult.signatureValid,
        error: verificationResult.error,
      };

      if (!verificationResult.valid) {
        this.logger.warn(
          `Certificate ${certificate.certificateNumber} failed integrity verification: ` +
            `integrity=${verificationResult.integrityValid.toString()}, ` +
            `signature=${verificationResult.signatureValid.toString()}`,
        );

        await this.auditService.log(
          {
            eventType: AuditEventType.INTEGRITY_CHECK_FAILED,
            entityType: 'Certificate',
            entityId: certificate.id,
            action: AuditAction.VERIFY,
            newValues: {
              certificateNumber: certificate.certificateNumber,
              integrityValid: verificationResult.integrityValid,
              signatureValid: verificationResult.signatureValid,
              error: verificationResult.error,
            },
          },
          {},
        );
      }

      return { certificate, integrityStatus };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown verification error';
      this.logger.error(
        `Verification error for certificate ${id}: ${errorMessage}`,
      );

      return {
        certificate,
        integrityStatus: {
          verified: false,
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Finds a certificate by its verification code.
   *
   * Defense-in-depth validation per NIST SP 800-53 SI-10:
   * Validates input format even when controller has already validated,
   * protecting against direct service method calls.
   *
   * @param code - The verification code (11-char base64url)
   * @throws BadRequestException if code format is invalid
   * @throws NotFoundException if certificate not found
   */
  async findByVerificationCode(code: string): Promise<Certificate> {
    if (!isValidVerificationCode(code)) {
      throw new BadRequestException('Invalid verification code format');
    }

    const certificate = await this.certificateRepo.findOne({
      where: { verificationCode: code },
      relations: ['implementation'],
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return certificate;
  }

  async findByCertificateNumber(number: string): Promise<Certificate> {
    const normalized = number.toUpperCase();

    if (!isValidCertificateNumber(normalized)) {
      throw new BadRequestException('Invalid certificate number format');
    }

    const certificate = await this.certificateRepo.findOne({
      where: { certificateNumber: normalized },
      relations: ['implementation'],
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return certificate;
  }

  async findBySubmissionId(submissionId: string): Promise<Certificate> {
    const certificate = await this.certificateRepo.findOne({
      where: { submissionId },
      relations: ['implementation'],
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found for this submission');
    }

    return certificate;
  }

  /**
   * Revokes a certificate and invalidates related caches.
   *
   * Per W3C VC Status List 2021 and OWASP Security Guidelines:
   * - Revocation status must be reflected immediately in status lists
   * - Cache invalidation happens synchronously with revocation
   * - Audit trail is maintained for all revocation events
   *
   * @param id - Certificate ID to revoke
   * @param reason - Reason for revocation
   * @param revokerId - ID of user performing revocation
   * @throws NotFoundException if certificate not found
   * @throws BadRequestException if certificate already revoked
   */
  async revoke(
    id: string,
    reason: string,
    revokerId: string,
  ): Promise<Certificate> {
    const certificate = await this.findOne(id);

    if (certificate.isRevoked) {
      throw new BadRequestException('Certificate is already revoked');
    }

    const previousState = {
      isRevoked: certificate.isRevoked,
      revokedAt: certificate.revokedAt,
      revokedById: certificate.revokedById,
      revocationReason: certificate.revocationReason,
    };

    certificate.isRevoked = true;
    certificate.revokedAt = new Date();
    certificate.revokedById = revokerId;
    certificate.revocationReason = reason;

    const saved = await this.certificateRepo.save(certificate);

    const issuedYear = new Date(saved.issuedAt).getFullYear();
    await this.statusListCache.invalidate(issuedYear);

    await this.auditService.log(
      {
        eventType: AuditEventType.CERTIFICATE_REVOKED,
        entityType: 'Certificate',
        entityId: saved.id,
        action: AuditAction.REVOKE,
        oldValues: previousState,
        newValues: {
          isRevoked: saved.isRevoked,
          revokedAt: saved.revokedAt,
          revokedById: saved.revokedById,
          revocationReason: saved.revocationReason,
          certificateNumber: saved.certificateNumber,
          implementationId: saved.implementationId,
        },
      },
      { actorId: revokerId },
    );

    this.logger.log(
      `Certificate ${certificate.certificateNumber} revoked, status list cache invalidated for year ${issuedYear.toString()}`,
    );

    return saved;
  }

  /**
   * Verifies a certificate by its verification code.
   *
   * Performs the following checks per W3C VC verification requirements:
   * 1. Certificate exists in database
   * 2. Certificate is not revoked
   * 3. Certificate has not expired
   * 4. Hash integrity check (data hasn't been tampered)
   * 5. Cryptographic signature verification (Ed25519/Data Integrity)
   *
   * @param code - The verification code
   * @returns Verification result with detailed check status
   */
  async verify(code: string): Promise<{
    valid: boolean;
    certificate?: Certificate;
    checks: {
      found: boolean;
      notRevoked: boolean;
      notExpired: boolean;
      integrityValid: boolean;
      signatureValid: boolean;
    };
    error?: string;
  }> {
    try {
      const certificate = await this.findByVerificationCode(code);

      const now = new Date();
      const notExpired = new Date(certificate.validUntil) > now;
      const notRevoked = !certificate.isRevoked;

      const verificationResult =
        await this.credentialIssuance.verifyCredentialFull(
          certificate.vcJson,
          certificate.certificateHash,
        );

      const allValid =
        notExpired &&
        notRevoked &&
        verificationResult.integrityValid &&
        verificationResult.signatureValid;

      return {
        valid: allValid,
        certificate,
        checks: {
          found: true,
          notRevoked,
          notExpired,
          integrityValid: verificationResult.integrityValid,
          signatureValid: verificationResult.signatureValid,
        },
        error: verificationResult.error,
      };
    } catch {
      return {
        valid: false,
        checks: {
          found: false,
          notRevoked: false,
          notExpired: false,
          integrityValid: false,
          signatureValid: false,
        },
      };
    }
  }

  private async calculateCategoryScores(
    submission: Submission,
  ): Promise<{ name: string; score: number }[]> {
    const responses = await this.responseRepo.find({
      where: { submissionId: submission.id },
    });

    const categories = await this.categoryRepo.find({
      where: { templateId: submission.templateId },
      relations: ['criteria'],
      order: { sortOrder: 'ASC' },
    });

    const responseMap = new Map(responses.map((r) => [r.criterionId, r]));

    const categoryScores: { name: string; score: number }[] = [];

    for (const category of categories) {
      const criteria = category.criteria;

      let totalWeight = 0;
      let weightedScore = 0;

      for (const criterion of criteria) {
        const response = responseMap.get(criterion.id);
        if (response?.score !== null && response?.score !== undefined) {
          const normalizedScore = (response.score / criterion.maxScore) * 100;
          weightedScore += normalizedScore * criterion.weight;
          totalWeight += criterion.weight;
        }
      }

      const categoryScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
      categoryScores.push({
        name: category.name,
        score: Math.round(categoryScore * 100) / 100,
      });
    }

    return categoryScores;
  }

  private async getNextStatusListIndex(): Promise<number> {
    const result = await this.certificateRepo
      .createQueryBuilder('c')
      .select('MAX(c.statusListIndex)', 'max')
      .getRawOne<{ max: number | null }>();

    return (result?.max ?? 0) + 1;
  }

  private async getNextStatusListIndexWithManager(
    manager: import('typeorm').EntityManager,
  ): Promise<number> {
    const result = await manager
      .getRepository(Certificate)
      .createQueryBuilder('c')
      .select('MAX(c.statusListIndex)', 'max')
      .getRawOne<{ max: number | null }>();

    return (result?.max ?? 0) + 1;
  }

  private getValidityPeriod(result: CertificationResult): {
    validFrom: Date;
    validUntil: Date;
  } {
    const validFrom = new Date();
    const validUntil = new Date();

    if (result === CertificationResult.PASS) {
      validUntil.setDate(
        validUntil.getDate() + this.validityConfig.validityDays,
      );
    }

    return { validFrom, validUntil };
  }

  async findExpiringCertificates(): Promise<Certificate[]> {
    const reminderDate = new Date();
    reminderDate.setDate(
      reminderDate.getDate() + this.validityConfig.renewalReminderDays,
    );

    return this.certificateRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.implementation', 'impl')
      .where('c.validUntil <= :reminderDate', { reminderDate })
      .andWhere('c.validUntil > :now', { now: new Date() })
      .andWhere('c.isRevoked = false')
      .orderBy('c.validUntil', 'ASC')
      .getMany();
  }

  getValidityConfig(): CertificateValidityConfig {
    return { ...this.validityConfig };
  }
}
