jest.mock('bcrypt', () => ({
  default: {
    hash: jest.fn().mockResolvedValue('hashedpassword'),
    compare: jest.fn().mockResolvedValue(true),
  },
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource } from 'typeorm';
import { CertificatesService } from '../services/certificates.service';
import { Certificate } from '../entities/certificate.entity';
import {
  SubmissionStatus,
  CertificationResult,
  ControlGroup,
} from '../../../common/enums';
import { Submission } from '../../submissions/entities/submission.entity';
import { SubmissionResponse } from '../../submissions/entities/submission-response.entity';
import { AssessmentCategory } from '../../templates/entities/assessment-category.entity';
import { Implementation } from '../../implementations/entities/implementation.entity';
import { CredentialIssuanceService } from '../services/credential-issuance.service';
import { StatusListCacheService } from '../services/status-list-cache.service';
import { AuditService } from '../../audit';

describe('CertificatesService', () => {
  let service: CertificatesService;
  let mockCertificateRepo: Partial<Repository<Certificate>>;
  let mockSubmissionRepo: Partial<Repository<Submission>>;
  let mockResponseRepo: Partial<Repository<SubmissionResponse>>;
  let mockCategoryRepo: Partial<Repository<AssessmentCategory>>;
  let mockImplementationRepo: Partial<Repository<Implementation>>;
  let mockCredentialIssuance: Partial<CredentialIssuanceService>;
  let mockStatusListCache: Partial<StatusListCacheService>;
  let mockAuditService: Partial<AuditService>;
  let mockDataSource: Partial<DataSource>;
  let mockConfigService: Partial<ConfigService>;

  const mockSubmission: Submission = {
    id: 'submission-123',
    implementationId: 'impl-123',
    templateId: 'template-123',
    status: SubmissionStatus.PASSED,
    certificationResult: CertificationResult.PASS,
    targetControlGroup: ControlGroup.DSCP1,
    totalScore: 94.5,
    implementation: { id: 'impl-123', name: 'Test Implementation' },
  } as Submission;

  const mockCertificate: Certificate = {
    id: 'cert-123',
    submissionId: 'submission-123',
    implementationId: 'impl-123',
    certificateNumber: 'DHIS2-2026-P-12345678',
    certificationResult: CertificationResult.PASS,
    controlGroup: ControlGroup.DSCP1,
    finalScore: 94.5,
    validFrom: new Date('2026-01-13'),
    validUntil: new Date('2028-01-13'),
    certificateHash: 'abc123',
    signature: 'zMockSignature',
    signingKeyVersion: 1,
    verificationCode: 'AbCd1234_-X',
    vcJson: { '@context': [], type: [] },
    isRevoked: false,
    revokedAt: null,
    revokedById: null,
    revocationReason: null,
    statusListIndex: 1,
    issuedAt: new Date(),
    issuedById: 'user-123',
    implementation: { id: 'impl-123', name: 'Test Implementation' },
  } as unknown as Certificate;

  const createQueryBuilder = jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
    getManyAndCount: jest.fn().mockResolvedValue([[mockCertificate], 1]),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockCertificateRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockImplementation((data: Partial<Certificate>) =>
          Object.assign({}, data, { id: 'new-cert-id' }),
        ),
      save: jest.fn().mockImplementation((data: Certificate) =>
        Promise.resolve(
          Object.assign({}, data, {
            id: data.id || 'new-cert-id',
          }) as Certificate,
        ),
      ),
      createQueryBuilder,
    };

    mockSubmissionRepo = {
      findOne: jest.fn().mockResolvedValue(mockSubmission),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockResponseRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockCategoryRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockImplementationRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'impl-123', name: 'Test Implementation' }),
    };

    mockCredentialIssuance = {
      issueCredential: jest.fn().mockResolvedValue({
        credential: { '@context': [], type: [], proof: {} },
        certificateHash: 'hash123',
        signature: 'zSig',
        keyVersion: 1,
      }),
      generateCertificateNumber: jest
        .fn()
        .mockReturnValue('DHIS2-2026-P-12345678'),
      generateVerificationCode: jest.fn().mockReturnValue('AbCd1234_-X'),
      verifyCredentialIntegrity: jest.fn().mockResolvedValue(true),
      verifyCredentialFull: jest.fn().mockResolvedValue({
        valid: true,
        integrityValid: true,
        signatureValid: true,
      }),
    };

    mockStatusListCache = {
      invalidate: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('"etag123"'),
      validateETag: jest.fn().mockResolvedValue(false),
      getCacheTtl: jest.fn().mockReturnValue(300),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue({ id: '1', currHash: 'hash' }),
    };

    mockDataSource = {
      transaction: jest
        .fn()
        .mockImplementation(
          async (
            _isolationLevel: string,
            callback: (manager: unknown) => Promise<Certificate>,
          ) => {
            const mockManager = {
              getRepository: jest.fn().mockImplementation((entity: unknown) => {
                if (entity === Certificate) {
                  return mockCertificateRepo;
                }
                if (entity === Submission) {
                  return mockSubmissionRepo;
                }
                return {};
              }),
            };
            return callback(mockManager);
          },
        ),
    };

    mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: unknown) => {
          const configMap: Record<string, unknown> = {
            CERTIFICATE_VALIDITY_DAYS: 730,
            CERTIFICATE_RENEWAL_REMINDER_DAYS: 60,
          };
          return configMap[key] ?? defaultValue;
        }),
    };

    service = new CertificatesService(
      mockCertificateRepo as Repository<Certificate>,
      mockSubmissionRepo as Repository<Submission>,
      mockResponseRepo as Repository<SubmissionResponse>,
      mockCategoryRepo as Repository<AssessmentCategory>,
      mockImplementationRepo as Repository<Implementation>,
      mockCredentialIssuance as CredentialIssuanceService,
      mockStatusListCache as StatusListCacheService,
      mockAuditService as AuditService,
      mockDataSource as DataSource,
      mockConfigService as ConfigService,
    );
  });

  describe('issueCertificate', () => {
    it('should issue certificate for passed submission', async () => {
      const result = await service.issueCertificate(
        'submission-123',
        'user-123',
      );

      expect(mockSubmissionRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'submission-123' },
        relations: ['implementation'],
      });
      expect(mockCredentialIssuance.issueCredential).toHaveBeenCalled();
      expect(mockCertificateRepo.save).toHaveBeenCalled();
      expect(result.certificateNumber).toBe('DHIS2-2026-P-12345678');
    });

    it('should throw NotFoundException when submission not found', async () => {
      jest.mocked(mockSubmissionRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.issueCertificate('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when submission not passed', async () => {
      const inProgressSubmission: Submission = Object.assign(
        {},
        mockSubmission,
        {
          status: SubmissionStatus.IN_PROGRESS,
        },
      ) as unknown as Submission;
      jest
        .mocked(mockSubmissionRepo.findOne!)
        .mockResolvedValue(inProgressSubmission);

      await expect(
        service.issueCertificate('submission-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when certificate already exists', async () => {
      jest
        .mocked(mockCertificateRepo.findOne!)
        .mockResolvedValue(mockCertificate);

      await expect(
        service.issueCertificate('submission-123', 'user-123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return certificates with pagination', async () => {
      const result = await service.findAll({ first: 10 });

      expect(result.edges).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });

    it('should filter by implementationId', async () => {
      await service.findAll({ implementationId: 'impl-123', first: 10 });

      expect(createQueryBuilder().where).toHaveBeenCalledWith(
        'c.implementationId = :implementationId',
        { implementationId: 'impl-123' },
      );
    });
  });

  describe('findOne', () => {
    it('should return certificate by id', async () => {
      jest
        .mocked(mockCertificateRepo.findOne!)
        .mockResolvedValue(mockCertificate);

      const result = await service.findOne('cert-123');

      expect(result).toEqual(mockCertificate);
    });

    it('should throw NotFoundException when certificate not found', async () => {
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByVerificationCode', () => {
    it('should return certificate by verification code', async () => {
      jest
        .mocked(mockCertificateRepo.findOne!)
        .mockResolvedValue(mockCertificate);

      const result = await service.findByVerificationCode('AbCd1234_-X');

      expect(mockCertificateRepo.findOne).toHaveBeenCalledWith({
        where: { verificationCode: 'AbCd1234_-X' },
        relations: ['implementation'],
      });
      expect(result).toEqual(mockCertificate);
    });
  });

  describe('findBySubmissionId', () => {
    it('should return certificate by submission id', async () => {
      jest
        .mocked(mockCertificateRepo.findOne!)
        .mockResolvedValue(mockCertificate);

      const result = await service.findBySubmissionId('submission-123');

      expect(mockCertificateRepo.findOne).toHaveBeenCalledWith({
        where: { submissionId: 'submission-123' },
        relations: ['implementation'],
      });
      expect(result).toEqual(mockCertificate);
    });

    it('should throw NotFoundException when certificate not found for submission', async () => {
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(null);

      await expect(service.findBySubmissionId('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('revoke', () => {
    it('should revoke a certificate and invalidate status list cache', async () => {
      const notRevokedCert: Certificate = Object.assign({}, mockCertificate, {
        isRevoked: false,
        issuedAt: new Date('2026-01-15'),
      }) as unknown as Certificate;
      jest
        .mocked(mockCertificateRepo.findOne!)
        .mockResolvedValue(notRevokedCert);

      const result = await service.revoke(
        'cert-123',
        'Security violation',
        'admin-123',
      );

      expect(mockCertificateRepo.save).toHaveBeenCalled();
      expect(result.isRevoked).toBe(true);
      expect(result.revocationReason).toBe('Security violation');
      // Verify cache invalidation was called for the certificate's issuance year
      expect(mockStatusListCache.invalidate).toHaveBeenCalledWith(2026);
    });

    it('should throw BadRequestException when already revoked', async () => {
      const revokedCert: Certificate = Object.assign({}, mockCertificate, {
        isRevoked: true,
      }) as unknown as Certificate;
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(revokedCert);

      await expect(
        service.revoke('cert-123', 'Reason', 'admin-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verify', () => {
    it('should return valid result for valid certificate', async () => {
      const validCert: Certificate = Object.assign({}, mockCertificate, {
        validUntil: new Date(Date.now() + 86400000),
        isRevoked: false,
      }) as unknown as Certificate;
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(validCert);

      const result = await service.verify('AbCd1234_-X');

      expect(result.valid).toBe(true);
      expect(result.checks.found).toBe(true);
      expect(result.checks.notRevoked).toBe(true);
      expect(result.checks.notExpired).toBe(true);
      expect(result.checks.integrityValid).toBe(true);
      expect(result.checks.signatureValid).toBe(true);
    });

    it('should return invalid result for revoked certificate', async () => {
      const revokedCert: Certificate = Object.assign({}, mockCertificate, {
        validUntil: new Date(Date.now() + 86400000),
        isRevoked: true,
      }) as unknown as Certificate;
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(revokedCert);

      const result = await service.verify('AbCd1234_-X');

      expect(result.valid).toBe(false);
      expect(result.checks.notRevoked).toBe(false);
    });

    it('should return invalid result for expired certificate', async () => {
      const expiredCert: Certificate = Object.assign({}, mockCertificate, {
        validUntil: new Date(Date.now() - 86400000),
        isRevoked: false,
      }) as unknown as Certificate;
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(expiredCert);

      const result = await service.verify('AbCd1234_-X');

      expect(result.valid).toBe(false);
      expect(result.checks.notExpired).toBe(false);
    });

    it('should return invalid result for not found certificate', async () => {
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(null);

      const result = await service.verify('nonexistent');

      expect(result.valid).toBe(false);
      expect(result.checks.found).toBe(false);
      expect(result.checks.signatureValid).toBe(false);
    });

    it('should return invalid result when signature verification fails', async () => {
      const validCert: Certificate = Object.assign({}, mockCertificate, {
        validUntil: new Date(Date.now() + 86400000),
        isRevoked: false,
      }) as unknown as Certificate;
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(validCert);
      jest
        .mocked(mockCredentialIssuance.verifyCredentialFull!)
        .mockResolvedValue({
          valid: false,
          integrityValid: true,
          signatureValid: false,
          error: 'Signature verification failed',
        });

      const result = await service.verify('AbCd1234_-X');

      expect(result.valid).toBe(false);
      expect(result.checks.signatureValid).toBe(false);
      expect(result.error).toBe('Signature verification failed');
    });
  });

  describe('getValidityConfig', () => {
    it('should return current validity configuration', () => {
      const config = service.getValidityConfig();

      expect(config).toHaveProperty('validityDays');
      expect(config).toHaveProperty('renewalReminderDays');
      expect(config.validityDays).toBe(730); // Default 2 years
      expect(config.renewalReminderDays).toBe(60); // Default 60 days
    });

    it('should use configured validity days from environment', () => {
      // The mock returns 730, verify it's being used
      const config = service.getValidityConfig();
      expect(config.validityDays).toBe(730);
    });
  });

  describe('findExpiringCertificates', () => {
    it('should return certificates expiring within reminder period', async () => {
      const expiringCerts = [
        Object.assign({}, mockCertificate, {
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        }),
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(expiringCerts),
      };

      (mockCertificateRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.findExpiringCertificates();

      expect(result).toHaveLength(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'c.isRevoked = false',
      );
    });

    it('should exclude revoked certificates', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      (mockCertificateRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      await service.findExpiringCertificates();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'c.isRevoked = false',
      );
    });

    it('should order by validUntil ascending', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      (mockCertificateRepo.createQueryBuilder as jest.Mock).mockReturnValue(
        mockQueryBuilder,
      );

      await service.findExpiringCertificates();

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'c.validUntil',
        'ASC',
      );
    });
  });

  describe('certificate validity period calculation', () => {
    it('should have configured validity days in config', () => {
      const config = service.getValidityConfig();

      // The certificate validity should use configured default of 730 days
      expect(config.validityDays).toBe(730);
    });

    it('should use configured renewal reminder days', () => {
      const config = service.getValidityConfig();

      // The renewal reminder should use configured default of 60 days
      expect(config.renewalReminderDays).toBe(60);
    });
  });

  describe('findOneWithVerification', () => {
    it('should return certificate with successful verification status', async () => {
      const validCert: Certificate = Object.assign({}, mockCertificate, {
        vcJson: { '@context': [], type: [], proof: {} },
        certificateHash: 'validHash123',
      }) as unknown as Certificate;
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(validCert);
      jest
        .mocked(mockCredentialIssuance.verifyCredentialFull!)
        .mockResolvedValue({
          valid: true,
          integrityValid: true,
          signatureValid: true,
        });

      const result = await service.findOneWithVerification('cert-123');

      expect(result.certificate).toEqual(validCert);
      expect(result.integrityStatus.verified).toBe(true);
      expect(result.integrityStatus.integrityValid).toBe(true);
      expect(result.integrityStatus.signatureValid).toBe(true);
      expect(result.integrityStatus.error).toBeUndefined();
    });

    it('should return certificate with failed integrity status and log audit event', async () => {
      const tamperedCert: Certificate = Object.assign({}, mockCertificate, {
        vcJson: { '@context': [], type: [], proof: {} },
        certificateHash: 'validHash123',
      }) as unknown as Certificate;
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(tamperedCert);
      jest
        .mocked(mockCredentialIssuance.verifyCredentialFull!)
        .mockResolvedValue({
          valid: false,
          integrityValid: false,
          signatureValid: true,
          error: 'Hash mismatch',
        });

      const result = await service.findOneWithVerification('cert-123');

      expect(result.certificate).toEqual(tamperedCert);
      expect(result.integrityStatus.verified).toBe(true);
      expect(result.integrityStatus.integrityValid).toBe(false);
      expect(result.integrityStatus.signatureValid).toBe(true);
      expect(result.integrityStatus.error).toBe('Hash mismatch');
      // Verify audit log was called for security event
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'INTEGRITY_CHECK_FAILED',
          entityType: 'Certificate',
          action: 'VERIFY',
        }),
        expect.any(Object),
      );
    });

    it('should return certificate with failed signature status and log audit event', async () => {
      const invalidSignatureCert: Certificate = Object.assign(
        {},
        mockCertificate,
        {
          vcJson: { '@context': [], type: [], proof: {} },
          certificateHash: 'validHash123',
        },
      ) as unknown as Certificate;
      jest
        .mocked(mockCertificateRepo.findOne!)
        .mockResolvedValue(invalidSignatureCert);
      jest
        .mocked(mockCredentialIssuance.verifyCredentialFull!)
        .mockResolvedValue({
          valid: false,
          integrityValid: true,
          signatureValid: false,
          error: 'Signature verification failed',
        });

      const result = await service.findOneWithVerification('cert-123');

      expect(result.certificate).toEqual(invalidSignatureCert);
      expect(result.integrityStatus.verified).toBe(true);
      expect(result.integrityStatus.integrityValid).toBe(true);
      expect(result.integrityStatus.signatureValid).toBe(false);
      expect(result.integrityStatus.error).toBe(
        'Signature verification failed',
      );
      // Verify audit log was called
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should return unverified status when vcJson is missing', async () => {
      const legacyCert: Certificate = Object.assign({}, mockCertificate, {
        vcJson: null,
        certificateHash: 'hash123',
      }) as unknown as Certificate;
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(legacyCert);

      const result = await service.findOneWithVerification('cert-123');

      expect(result.certificate).toEqual(legacyCert);
      expect(result.integrityStatus.verified).toBe(false);
      expect(result.integrityStatus.error).toBe(
        'Certificate missing required data for verification',
      );
      // Should not call verifyCredentialFull for legacy certs
      expect(
        mockCredentialIssuance.verifyCredentialFull,
      ).not.toHaveBeenCalled();
    });

    it('should return unverified status when certificateHash is missing', async () => {
      const nohashCert: Certificate = Object.assign({}, mockCertificate, {
        vcJson: { '@context': [], type: [] },
        certificateHash: null,
      }) as unknown as Certificate;
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(nohashCert);

      const result = await service.findOneWithVerification('cert-123');

      expect(result.certificate).toEqual(nohashCert);
      expect(result.integrityStatus.verified).toBe(false);
      expect(result.integrityStatus.error).toBe(
        'Certificate missing required data for verification',
      );
    });

    it('should handle verification errors gracefully', async () => {
      const validCert: Certificate = Object.assign({}, mockCertificate, {
        vcJson: { '@context': [], type: [], proof: {} },
        certificateHash: 'validHash123',
      }) as unknown as Certificate;
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(validCert);
      jest
        .mocked(mockCredentialIssuance.verifyCredentialFull!)
        .mockRejectedValue(new Error('Crypto operation failed'));

      const result = await service.findOneWithVerification('cert-123');

      expect(result.certificate).toEqual(validCert);
      expect(result.integrityStatus.verified).toBe(false);
      expect(result.integrityStatus.error).toBe('Crypto operation failed');
    });

    it('should throw NotFoundException when certificate not found', async () => {
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(null);

      await expect(
        service.findOneWithVerification('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
