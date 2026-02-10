import { ConfigService } from '@nestjs/config';
import { CredentialIssuanceService } from '../services/credential-issuance.service';
import {
  CanonicalizationService,
  SoftwareSigningService,
} from '../../signing/services';

describe('CredentialIssuanceService', () => {
  let service: CredentialIssuanceService;
  let canonicalizationService: CanonicalizationService;
  let mockSigningService: {
    createDataIntegrityProof: jest.Mock;
    getKeyVersion: jest.Mock;
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string | undefined> = {
        ISSUER_DID: 'did:web:test.example.com',
        ISSUER_NAME: 'Test Certification Authority',
        APP_BASE_URL: 'https://test.example.com',
        NODE_ENV: 'test',
      };
      return config[key];
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    canonicalizationService = new CanonicalizationService();
    mockSigningService = {
      createDataIntegrityProof: jest.fn().mockResolvedValue({
        type: 'DataIntegrityProof',
        cryptosuite: 'eddsa-rdfc-2022',
        created: '2026-01-13T12:00:00Z',
        verificationMethod: 'did:web:test.example.com#signing-key-2026-v1',
        proofPurpose: 'assertionMethod',
        proofValue: 'zMockSignatureValue',
      }),
      getKeyVersion: jest.fn().mockReturnValue(1),
    };

    service = new CredentialIssuanceService(
      mockConfigService,
      mockSigningService as unknown as SoftwareSigningService,
      canonicalizationService,
    );
  });

  describe('issueCredential', () => {
    const mockInput = {
      submissionId: '01234567-89ab-cdef-0123-456789abcdef',
      implementationId: 'impl-123',
      implementationName: 'Test Implementation',
      certificationResult: 'pass' as const,
      controlGroup: 'DSCP1' as const,
      finalScore: 94.5,
      categoryScores: [
        { name: 'Infrastructure', score: 92 },
        { name: 'Security', score: 96 },
      ],
      validFrom: new Date('2026-01-13'),
      validUntil: new Date('2028-01-13'),
    };

    it('should issue a valid W3C Verifiable Credential', async () => {
      const result = await service.issueCredential(mockInput, 1);

      expect(result.credential['@context']).toContain(
        'https://www.w3.org/ns/credentials/v2',
      );
      expect(result.credential['@context']).toContain(
        'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
      );
      expect(result.credential.type).toContain('VerifiableCredential');
      expect(result.credential.type).toContain('OpenBadgeCredential');
      expect(result.credential.type).toContain('DHIS2ServerCertification');
    });

    it('should set correct issuer information', async () => {
      const result = await service.issueCredential(mockInput, 1);

      expect(result.credential.issuer.id).toBe('did:web:test.example.com');
      expect(result.credential.issuer.name).toBe(
        'Test Certification Authority',
      );
      expect(result.credential.issuer.type).toBe('Profile');
    });

    it('should set correct credential subject', async () => {
      const result = await service.issueCredential(mockInput, 1);

      const subject = result.credential.credentialSubject;
      expect(subject.type).toBe('AchievementSubject');
      expect(subject.id).toBe('urn:uuid:impl-123');
      expect(subject.achievement.name).toBe(
        'DHIS2 Server Certification - DSCP1',
      );
      expect(subject.achievement.achievementType).toBe('Certificate');
    });

    it('should include CG level in achievement ID', async () => {
      const result = await service.issueCredential(mockInput, 1);

      const subject = result.credential.credentialSubject;
      expect(subject.achievement.id).toBe(
        'https://test.example.com/achievements/server-certification-dscp1',
      );
    });

    it('should include CG level in achievement description', async () => {
      const result = await service.issueCredential(mockInput, 1);

      const subject = result.credential.credentialSubject;
      expect(subject.achievement.description).toBe(
        'Certified DHIS2 server deployment meeting DSCP1 security requirements',
      );
    });

    it('should include CG-specific criteria narrative', async () => {
      const result = await service.issueCredential(mockInput, 1);

      const subject = result.credential.credentialSubject;
      expect(subject.achievement.criteria.narrative).toBe(
        'All required technical controls for DSCP1 Control Group are compliant',
      );
    });

    it('should include category scores in results', async () => {
      const result = await service.issueCredential(mockInput, 1);

      const results = result.credential.credentialSubject.result;
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        type: 'Result',
        resultDescription: 'Overall Score',
        value: '95%',
      });
      expect(results[1]).toEqual({
        type: 'Result',
        resultDescription: 'Infrastructure',
        value: '92%',
      });
    });

    it('should set correct validity dates', async () => {
      const result = await service.issueCredential(mockInput, 1);

      expect(result.credential.validFrom).toBe('2026-01-13T00:00:00.000Z');
      expect(result.credential.validUntil).toBe('2028-01-13T00:00:00.000Z');
    });

    it('should include credential status for revocation', async () => {
      const result = await service.issueCredential(mockInput, 1);

      const status = result.credential.credentialStatus;
      expect(status.type).toBe('BitstringStatusListEntry');
      expect(status.statusPurpose).toBe('revocation');
      expect(status.statusListIndex).toBe('1');
    });

    it('should include proof from signing service', async () => {
      const result = await service.issueCredential(mockInput, 1);

      expect(result.credential.proof).toBeDefined();
      expect(result.credential.proof?.type).toBe('DataIntegrityProof');
      expect(result.credential.proof?.cryptosuite).toBe('eddsa-rdfc-2022');
    });

    it('should return certificate hash', async () => {
      const result = await service.issueCredential(mockInput, 1);

      expect(result.certificateHash).toBeDefined();
      expect(result.certificateHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should return key version', async () => {
      const result = await service.issueCredential(mockInput, 1);
      expect(result.keyVersion).toBe(1);
    });
  });

  describe('generateCertificateNumber', () => {
    it('should generate certificate number with correct format for pass', () => {
      const number = service.generateCertificateNumber('pass');
      expect(number).toMatch(/^DHIS2-\d{4}-P-[A-F0-9]{8}$/);
    });

    it('should generate certificate number with correct format for fail', () => {
      const number = service.generateCertificateNumber('fail');
      expect(number).toMatch(/^DHIS2-\d{4}-F-[A-F0-9]{8}$/);
    });

    it('should use correct result code', () => {
      const pass = service.generateCertificateNumber('pass');
      const fail = service.generateCertificateNumber('fail');

      expect(pass).toContain('-P-');
      expect(fail).toContain('-F-');
    });

    it('should generate unique numbers', () => {
      const numbers = new Set<string>();
      for (let i = 0; i < 100; i++) {
        numbers.add(service.generateCertificateNumber('pass'));
      }
      expect(numbers.size).toBe(100);
    });
  });

  describe('generateVerificationCode', () => {
    it('should generate verification code', () => {
      const code = service.generateVerificationCode();
      expect(code).toBeDefined();
      expect(code.length).toBeGreaterThan(0);
    });

    it('should generate unique codes', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(service.generateVerificationCode());
      }
      expect(codes.size).toBe(100);
    });
  });

  describe('computeHash', () => {
    it('should compute consistent hash for same credential', async () => {
      const result = await service.issueCredential(
        {
          submissionId: 'test-id',
          implementationId: 'impl-id',
          implementationName: 'Test Implementation',
          certificationResult: 'pass',
          controlGroup: 'DSCP1',
          finalScore: 90,
          categoryScores: [],
          validFrom: new Date('2026-01-01'),
          validUntil: new Date('2028-01-01'),
        },
        1,
      );

      const hash1 = await service.computeHash(result.credential);
      const hash2 = await service.computeHash(result.credential);

      expect(hash1).toBe(hash2);
    });
  });

  describe('verifyCredentialIntegrity', () => {
    it('should return true for valid hash', async () => {
      const result = await service.issueCredential(
        {
          submissionId: 'test-id',
          implementationId: 'impl-id',
          implementationName: 'Test Implementation',
          certificationResult: 'pass',
          controlGroup: 'DSCP1',
          finalScore: 90,
          categoryScores: [],
          validFrom: new Date('2026-01-01'),
          validUntil: new Date('2028-01-01'),
        },
        1,
      );

      const isValid = await service.verifyCredentialIntegrity(
        result.credential,
        result.certificateHash,
      );
      expect(isValid).toBe(true);
    });

    it('should return false for invalid hash', async () => {
      const result = await service.issueCredential(
        {
          submissionId: 'test-id',
          implementationId: 'impl-id',
          implementationName: 'Test Implementation',
          certificationResult: 'pass',
          controlGroup: 'DSCP1',
          finalScore: 90,
          categoryScores: [],
          validFrom: new Date('2026-01-01'),
          validUntil: new Date('2028-01-01'),
        },
        1,
      );

      const isValid = await service.verifyCredentialIntegrity(
        result.credential,
        'invalid-hash',
      );
      expect(isValid).toBe(false);
    });
  });

  describe('getIssuerConfig', () => {
    it('should return current issuer configuration', () => {
      const config = service.getIssuerConfig();

      expect(config).toHaveProperty('did');
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('usingDefaults');
    });

    it('should return configured values when provided', () => {
      const config = service.getIssuerConfig();

      expect(config.did).toBe('did:web:test.example.com');
      expect(config.name).toBe('Test Certification Authority');
      expect(config.baseUrl).toBe('https://test.example.com');
      expect(config.usingDefaults).toBe(false);
    });

    it('should use development defaults when not configured', () => {
      const devConfigService = {
        get: jest.fn((_key: string) => undefined),
      } as unknown as ConfigService;

      const devService = new CredentialIssuanceService(
        devConfigService,
        mockSigningService as unknown as SoftwareSigningService,
        canonicalizationService,
      );

      const config = devService.getIssuerConfig();

      expect(config.did).toBe('did:web:localhost');
      expect(config.name).toBe('DHIS2 Server Certification (Development)');
      expect(config.baseUrl).toBe('http://localhost:3001');
      expect(config.usingDefaults).toBe(true);
    });
  });

  describe('issuer configuration validation', () => {
    it('should use did:web or did:key format', () => {
      const config = service.getIssuerConfig();

      expect(
        config.did.startsWith('did:web:') || config.did.startsWith('did:key:'),
      ).toBe(true);
    });

    it('should use HTTPS base URL in configured environments', () => {
      const config = service.getIssuerConfig();

      // Our mock configures https://test.example.com
      expect(config.baseUrl.startsWith('https://')).toBe(true);
    });
  });
});
