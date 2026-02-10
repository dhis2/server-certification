import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  CipherGCMTypes,
} from 'crypto';
import encryptionConfig from './encryption.config';

@Injectable()
export class EncryptionService {
  private readonly algorithm: CipherGCMTypes = 'aes-256-gcm';
  private readonly ivLength = 12; // NIST recommended for GCM
  private readonly authTagLength = 16;

  constructor(
    @Inject(encryptionConfig.KEY)
    private readonly config: ConfigType<typeof encryptionConfig>,
  ) {}

  encrypt(plaintext: string): string {
    const iv = randomBytes(this.ivLength);
    const cipher = createCipheriv(this.algorithm, this.config.key, iv, {
      authTagLength: this.authTagLength,
    });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    // Compact format: iv + authTag + ciphertext (all base64)
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
      'base64',
    );
  }

  decrypt(ciphertext: string): string {
    const data = Buffer.from(ciphertext, 'base64');

    const iv = data.subarray(0, this.ivLength);
    const authTag = data.subarray(
      this.ivLength,
      this.ivLength + this.authTagLength,
    );
    const encrypted = data.subarray(this.ivLength + this.authTagLength);

    const decipher = createDecipheriv(this.algorithm, this.config.key, iv, {
      authTagLength: this.authTagLength,
    });
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }
}
