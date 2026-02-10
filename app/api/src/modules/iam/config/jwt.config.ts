import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  secret: string;
  audience: string;
  issuer: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
  algorithm: 'HS256';
}

const MIN_SECRET_LENGTH = 32; // 256 bits minimum for HS256

function validateSecret(secret: string | undefined): string {
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`,
    );
  }

  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters. ` +
        `Current length: ${secret.length}. ` +
        `Generate a secure secret with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`,
    );
  }

  return secret;
}

/**
 * Parse a time duration string (e.g., '15m', '7d', '1h') or number into seconds.
 * Supported units: s (seconds), m (minutes), h (hours), d (days)
 * If no unit is provided, the value is treated as seconds.
 */
function parseDuration(
  value: string | undefined,
  defaultSeconds: number,
): number {
  if (!value) {
    return defaultSeconds;
  }

  // If it's just a number, return it as seconds
  const numericValue = parseInt(value, 10);
  if (value === String(numericValue)) {
    return numericValue;
  }

  const match = value.match(/^(\d+)([smhd])$/i);
  if (!match) {
    console.warn(
      `Invalid duration format: "${value}". Expected format like "15m", "1h", "7d". Falling back to ${defaultSeconds} seconds.`,
    );
    return defaultSeconds;
  }

  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 60 * 60 * 24;
    default:
      return defaultSeconds;
  }
}

export default registerAs(
  'jwt',
  (): JwtConfig => ({
    secret: validateSecret(process.env.JWT_SECRET),
    audience: process.env.JWT_TOKEN_AUDIENCE || 'localhost',
    issuer: process.env.JWT_TOKEN_ISSUER || 'localhost',
    accessTokenTtl: parseDuration(process.env.JWT_ACCESS_TOKEN_TTL, 900), // Default: 15 minutes
    refreshTokenTtl: parseDuration(process.env.JWT_REFRESH_TOKEN_TTL, 604800), // Default: 7 days
    algorithm: 'HS256',
  }),
);
