import type { ConfigService } from '@nestjs/config';
import { SigningController } from '../signing.controller';
import type { SoftwareSigningService } from '../services/software-signing.service';

describe('SigningController', () => {
  let controller: SigningController;
  let mockSigningService: { getVerificationMethod: jest.Mock };

  const mockVerificationMethod = {
    id: 'did:web:certification.dhis2.org#signing-key-2026-v1',
    type: 'Ed25519VerificationKey2020' as const,
    controller: 'did:web:certification.dhis2.org',
    publicKeyMultibase: 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        ISSUER_DID: 'did:web:certification.dhis2.org',
        ISSUER_NAME: 'DHIS2 Server Certification Authority',
      };
      return config[key];
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSigningService = {
      getVerificationMethod: jest
        .fn()
        .mockResolvedValue(mockVerificationMethod),
    };
    controller = new SigningController(
      mockConfigService,
      mockSigningService as unknown as SoftwareSigningService,
    );
  });

  describe('getDidDocument', () => {
    it('should return valid DID document', async () => {
      const didDoc = await controller.getDidDocument();

      expect(didDoc['@context']).toContain('https://www.w3.org/ns/did/v1');
      expect(didDoc['@context']).toContain(
        'https://w3id.org/security/suites/ed25519-2020/v1',
      );
      expect(didDoc.id).toBe('did:web:certification.dhis2.org');
      expect(didDoc.verificationMethod).toHaveLength(1);
      expect(didDoc.verificationMethod[0]).toEqual(mockVerificationMethod);
      expect(didDoc.assertionMethod).toContain(mockVerificationMethod.id);
      expect(didDoc.authentication).toContain(mockVerificationMethod.id);
    });

    it('should call signing service to get verification method', async () => {
      await controller.getDidDocument();
      expect(mockSigningService.getVerificationMethod).toHaveBeenCalled();
    });
  });

  describe('getDidConfiguration', () => {
    it('should return DID configuration', () => {
      const config = controller.getDidConfiguration();

      expect(config['@context']).toBe(
        'https://identity.foundation/.well-known/did-configuration/v1',
      );
      expect(config.linked_dids).toContain('did:web:certification.dhis2.org');
    });
  });
});
