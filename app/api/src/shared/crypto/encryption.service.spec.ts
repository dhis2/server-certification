import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import encryptionConfig from './encryption.config';
import { randomBytes } from 'crypto';

describe('EncryptionService', () => {
  let service: EncryptionService;
  const testKey = randomBytes(32);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: encryptionConfig.KEY,
          useValue: { key: testKey },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext (unique IV)', () => {
      const plaintext = 'test-secret';
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Secret with émojis and spëcial çhars!';
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw on tampered ciphertext', () => {
      const encrypted = service.encrypt('secret');
      const tampered = encrypted.slice(0, -2) + 'XX';

      expect(() => service.decrypt(tampered)).toThrow();
    });

    it('should throw on invalid base64', () => {
      expect(() => service.decrypt('not-valid-base64!!!')).toThrow();
    });

    it('should produce base64 output', () => {
      const encrypted = service.encrypt('test');
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
    });
  });
});
