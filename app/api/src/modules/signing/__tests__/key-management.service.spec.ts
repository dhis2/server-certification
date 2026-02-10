import type { ConfigService } from '@nestjs/config';
import { KeyManagementService } from '../services/key-management.service';

describe('KeyManagementService', () => {
  let service: KeyManagementService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new KeyManagementService(mockConfigService);
  });

  describe('onModuleInit', () => {
    it('should generate ephemeral keys when no key paths configured', async () => {
      await service.onModuleInit();
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('sign and verify', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should sign data and verify signature', () => {
      const data = new TextEncoder().encode('test data');
      const signature = service.sign(data);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);

      const isValid = service.verify(data, signature);
      expect(isValid).toBe(true);
    });

    it('should fail verification with tampered data', () => {
      const data = new TextEncoder().encode('test data');
      const signature = service.sign(data);

      const tamperedData = new TextEncoder().encode('tampered data');
      const isValid = service.verify(tamperedData, signature);
      expect(isValid).toBe(false);
    });

    it('should fail verification with invalid signature', () => {
      const data = new TextEncoder().encode('test data');
      const invalidSignature = new Uint8Array(64).fill(0);

      const isValid = service.verify(data, invalidSignature);
      expect(isValid).toBe(false);
    });
  });

  describe('getPublicKeyRaw', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return 32-byte raw public key', () => {
      const publicKey = service.getPublicKeyRaw();
      expect(publicKey).toBeInstanceOf(Uint8Array);
      expect(publicKey.length).toBe(32);
    });
  });

  describe('getPublicKeyMultibase', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should return multibase-encoded public key starting with z', () => {
      const multibase = service.getPublicKeyMultibase();
      expect(multibase).toMatch(
        /^z[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/,
      );
    });
  });

  describe('getKeyVersion', () => {
    it('should return key version', () => {
      const version = service.getKeyVersion();
      expect(version).toBe(1);
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await service.onModuleInit();
      expect(service.isInitialized()).toBe(true);
    });
  });
});
