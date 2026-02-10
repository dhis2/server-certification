jest.mock('bcrypt', () => ({
  default: {
    hash: jest.fn().mockResolvedValue('hashedpassword'),
    compare: jest.fn().mockResolvedValue(true),
  },
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

import * as zlib from 'node:zlib';
import { promisify } from 'node:util';
import type { Repository } from 'typeorm';
import { StatusListService } from '../services/status-list.service';
import type { Certificate } from '../entities/certificate.entity';

const gunzip = promisify(zlib.gunzip);

describe('StatusListService', () => {
  let service: StatusListService;
  let mockCertificateRepo: Partial<Repository<Certificate>>;
  let mockConfigService: { get: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCertificateRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 0 }),
      }),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'app.baseUrl') return 'https://certification.dhis2.org';
        if (key === 'app.issuerDid') return 'did:web:certification.dhis2.org';
        return undefined;
      }),
    };

    service = new StatusListService(
      mockCertificateRepo as Repository<Certificate>,
      mockConfigService as never,
    );
  });

  describe('generateStatusList', () => {
    it('should generate a valid BitstringStatusList credential', async () => {
      const result = await service.generateStatusList(2026);

      expect(result['@context']).toContain(
        'https://www.w3.org/ns/credentials/v2',
      );
      expect(result.type).toContain('VerifiableCredential');
      expect(result.type).toContain('BitstringStatusListCredential');
      expect(result.issuer).toBe('did:web:certification.dhis2.org');
      expect(result.id).toBe(
        'https://certification.dhis2.org/status-list/2026',
      );
      expect(result.credentialSubject.type).toBe('BitstringStatusList');
      expect(result.credentialSubject.statusPurpose).toBe('revocation');
      expect(result.credentialSubject.encodedList).toBeDefined();
    });

    it('should include revoked certificates in the bitstring', async () => {
      // Mock revoked certificates at indices 5, 100, 1000
      jest
        .mocked(mockCertificateRepo.find!)
        .mockResolvedValue([
          { statusListIndex: 5 },
          { statusListIndex: 100 },
          { statusListIndex: 1000 },
        ] as Certificate[]);

      const result = await service.generateStatusList(2026);

      // Decode the bitstring to verify
      const compressed = Buffer.from(
        result.credentialSubject.encodedList,
        'base64',
      );
      const bitstring = await gunzip(compressed);

      // Check that the correct bits are set
      // Bit 5: byte 0, bit 2 (7 - 5 = 2, so mask is 0b00000100)
      expect(bitstring[0] & 0b00000100).toBe(0b00000100);

      // Bit 100: byte 12, bit 4 (100 / 8 = 12, 100 % 8 = 4, so mask is 0b00001000)
      expect(bitstring[12] & 0b00001000).toBe(0b00001000);

      // Bit 1000: byte 125, bit 0 (1000 / 8 = 125, 1000 % 8 = 0, so mask is 0b10000000)
      expect(bitstring[125] & 0b10000000).toBe(0b10000000);
    });

    it('should produce an all-zeros bitstring for no revoked certificates', async () => {
      jest.mocked(mockCertificateRepo.find!).mockResolvedValue([]);

      const result = await service.generateStatusList(2026);

      // Decode and verify all zeros
      const compressed = Buffer.from(
        result.credentialSubject.encodedList,
        'base64',
      );
      const bitstring = await gunzip(compressed);

      const allZeros = bitstring.every((byte) => byte === 0);
      expect(allZeros).toBe(true);
    });
  });

  describe('createEncodedBitstring', () => {
    it('should create a valid gzipped base64 encoded bitstring', async () => {
      const revokedIndices = [0, 7, 8, 15];
      const result = await service.createEncodedBitstring(revokedIndices);

      // Should be base64 encoded
      expect(() => Buffer.from(result, 'base64')).not.toThrow();

      // Should be gzip compressed
      const compressed = Buffer.from(result, 'base64');
      const decompressed = await gunzip(compressed);

      // Verify specific bits are set
      expect(decompressed[0] & 0b10000000).toBe(0b10000000); // Index 0
      expect(decompressed[0] & 0b00000001).toBe(0b00000001); // Index 7
      expect(decompressed[1] & 0b10000000).toBe(0b10000000); // Index 8
      expect(decompressed[1] & 0b00000001).toBe(0b00000001); // Index 15
    });

    it('should handle empty indices array', async () => {
      const result = await service.createEncodedBitstring([]);

      const compressed = Buffer.from(result, 'base64');
      const decompressed = await gunzip(compressed);

      // All bytes should be zero
      expect(decompressed.every((b) => b === 0)).toBe(true);
    });

    it('should ignore indices outside valid range', async () => {
      const revokedIndices = [
        -1,
        StatusListService.MAX_ENTRIES,
        StatusListService.MAX_ENTRIES + 1,
      ];
      const result = await service.createEncodedBitstring(revokedIndices);

      const compressed = Buffer.from(result, 'base64');
      const decompressed = await gunzip(compressed);

      // All should be zeros since all indices are out of range
      expect(decompressed.every((b) => b === 0)).toBe(true);
    });
  });

  describe('isIndexRevoked', () => {
    it('should return true for revoked certificate', async () => {
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue({
        id: 'cert-123',
        isRevoked: true,
        statusListIndex: 42,
      } as Certificate);

      const result = await service.isIndexRevoked(2026, 42);

      expect(result).toBe(true);
      expect(mockCertificateRepo.findOne).toHaveBeenCalledWith({
        where: {
          statusListIndex: 42,
          isRevoked: true,
        },
      });
    });

    it('should return false for non-revoked or non-existent certificate', async () => {
      jest.mocked(mockCertificateRepo.findOne!).mockResolvedValue(null);

      const result = await service.isIndexRevoked(2026, 42);

      expect(result).toBe(false);
    });
  });

  describe('createStatusListEntry', () => {
    it('should create a valid BitstringStatusListEntry', () => {
      const result = service.createStatusListEntry(123, 2026);

      expect(result).toEqual({
        id: 'https://certification.dhis2.org/status-list/2026#123',
        type: 'BitstringStatusListEntry',
        statusPurpose: 'revocation',
        statusListIndex: '123',
        statusListCredential:
          'https://certification.dhis2.org/status-list/2026',
      });
    });
  });

  describe('getNextStatusListIndex', () => {
    it('should return 1 when no certificates exist', async () => {
      const result = await service.getNextStatusListIndex();

      expect(result).toBe(1);
    });

    it('should return max + 1 when certificates exist', async () => {
      jest.mocked(mockCertificateRepo.createQueryBuilder!).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 100 }),
      } as never);

      const result = await service.getNextStatusListIndex();

      expect(result).toBe(101);
    });
  });

  describe('getCurrentYear', () => {
    it('should return current year', () => {
      const expectedYear = new Date().getFullYear();
      const result = service.getCurrentYear();

      expect(result).toBe(expectedYear);
    });
  });
});
