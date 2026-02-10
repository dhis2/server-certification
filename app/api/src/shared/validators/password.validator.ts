import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { createHash } from 'crypto';

const HIBP_API_URL = 'https://api.pwnedpasswords.com/range';
const HIBP_USER_AGENT = 'DHIS2-Server-Certification-API';
const HASH_PREFIX_LENGTH = 5;
const MIN_BREACH_COUNT = 1;
const API_TIMEOUT_MS = 5000;

export interface PasswordCheckResult {
  isPwned: boolean;
  count: number;
}

export async function checkPwnedPassword(
  password: string,
): Promise<PasswordCheckResult> {
  const hash = createHash('sha1').update(password).digest('hex').toUpperCase();

  const prefix = hash.substring(0, HASH_PREFIX_LENGTH);
  const suffix = hash.substring(HASH_PREFIX_LENGTH);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(`${HIBP_API_URL}/${prefix}`, {
      headers: {
        'User-Agent': HIBP_USER_AGENT,
        Accept: 'text/plain',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(
        `[PasswordValidator] HIBP API returned ${response.status}, failing open`,
      );
      return { isPwned: false, count: 0 };
    }

    const text = await response.text();

    // Response format: HASH_SUFFIX:COUNT\r\n per line
    // Example: 0018A45C4D1DEF81644B54AB7F969B88D65:1
    for (const line of text.split('\r\n')) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix?.toUpperCase() === suffix) {
        const count = parseInt(countStr ?? '0', 10);
        return { isPwned: count >= MIN_BREACH_COUNT, count };
      }
    }

    return { isPwned: false, count: 0 };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[PasswordValidator] HIBP API timeout, failing open');
    } else {
      console.warn('[PasswordValidator] HIBP API error, failing open:', error);
    }
    return { isPwned: false, count: 0 };
  }
}

const COMMON_PASSWORDS = new Set([
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'letmein',
  'admin',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'login',
  'passw0rd',
  'qwerty123',
  'admin123',
  'password123',
  'changeme',
  'test123',
]);

const WEAK_PATTERNS = [
  /^(.)\1+$/, // All same character
  /^(012345|123456|234567|345678|456789|567890|098765|987654)/,
  /^(qwerty|asdfgh|zxcvbn)/i,
];

@ValidatorConstraint({ name: 'isNotBreached', async: true })
export class PasswordBreachConstraint implements ValidatorConstraintInterface {
  private failureMessage = 'Password has been exposed in a data breach';

  async validate(password: string): Promise<boolean> {
    if (typeof password !== 'string' || password.length < 8) {
      return true;
    }

    const normalized = password.toLowerCase();

    if (COMMON_PASSWORDS.has(normalized)) {
      this.failureMessage =
        'This password is too common. Please choose a more unique password.';
      return false;
    }

    for (const pattern of WEAK_PATTERNS) {
      if (pattern.test(normalized)) {
        this.failureMessage =
          'Password contains a predictable pattern. Please choose a stronger password.';
        return false;
      }
    }

    const result = await checkPwnedPassword(password);
    if (result.isPwned) {
      if (result.count > 1000) {
        this.failureMessage = `This password has appeared in ${result.count.toLocaleString()} data breaches. Please choose a different password.`;
      } else if (result.count > 1) {
        this.failureMessage = `This password has been found in data breaches. Please choose a different password.`;
      } else {
        this.failureMessage =
          'This password has been exposed in a data breach. Please choose a different password.';
      }
      return false;
    }

    return true;
  }

  defaultMessage(_args: ValidationArguments): string {
    return this.failureMessage;
  }
}

/**
 * Password breach validator
 *
 * Uses the Have I Been Pwned Pwned Passwords API with k-anonymity
 *
 * Per NIST SP 800-63B Section 5.1.1.2:
 * - Checks against breached password lists
 * - Does NOT enforce composition rules (uppercase, special chars)
 * - Allows passphrases (up to 64 characters)
 *
 * The k-anonymity implementation ensures:
 * - User's password is never sent to the API
 * - Only the first 5 characters of the SHA-1 hash are transmitted
 * - Local comparison determines if password is breached
 *
 * @see https://haveibeenpwned.com/API/v3#PwnedPasswords
 * @see https://pages.nist.gov/800-63-3/sp800-63b.html#memsecretver
 * @see https://blog.cloudflare.com/validating-leaked-passwords-with-k-anonymity/
 */
export function IsNotBreached(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: {
        message:
          'This password has been exposed in a data breach. Please choose a different password.',
        ...validationOptions,
      },
      constraints: [],
      validator: PasswordBreachConstraint,
    });
  };
}

export { IsNotBreached as IsStrongPassword };
