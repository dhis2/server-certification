import { registerAs } from '@nestjs/config';

const KEY_LENGTH = 32; // 256 bits for AES-256

function validateKey(key: string | undefined): Buffer {
  if (!key) {
    throw new Error(
      'OTP_ENCRYPTION_KEY is required. Generate with: ' +
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
  }

  const buffer = Buffer.from(key, 'hex');
  if (buffer.length !== KEY_LENGTH) {
    throw new Error(
      `OTP_ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes). ` +
        `Current: ${key.length} characters.`,
    );
  }

  return buffer;
}

export interface EncryptionConfig {
  key: Buffer;
}

export default registerAs(
  'encryption',
  (): EncryptionConfig => ({
    key: validateKey(process.env.OTP_ENCRYPTION_KEY),
  }),
);
