import * as crypto from 'crypto';
import {
  VerificationCodeConstraint,
  CertificateNumberConstraint,
  isValidVerificationCode,
  isValidCertificateNumber,
} from '../verification.validator';

describe('Verification Validators', () => {
  describe('VerificationCodeConstraint', () => {
    let constraint: VerificationCodeConstraint;

    beforeEach(() => {
      constraint = new VerificationCodeConstraint();
    });

    describe('valid verification codes', () => {
      it('should accept valid base64url verification code', () => {
        // Generate real verification code like the app does
        const code = crypto.randomBytes(8).toString('base64url');
        expect(constraint.validate(code)).toBe(true);
      });

      it('should accept exactly 11 character base64url strings', () => {
        const validCodes = [
          'ABCDEFGHIJK', // All uppercase
          'abcdefghijk', // All lowercase
          '01234567890', // All digits (11 chars starting with 0)
          'Abc123-_XYZ', // Mixed with special chars
          'aaaaaaaaaaA', // Repeated chars
        ];

        for (const code of validCodes) {
          expect(constraint.validate(code)).toBe(true);
        }
      });

      it('should accept codes with hyphen and underscore (base64url)', () => {
        expect(constraint.validate('abc-def_123')).toBe(true);
        expect(constraint.validate('-----------')).toBe(true);
        expect(constraint.validate('___________')).toBe(true);
      });
    });

    describe('invalid verification codes', () => {
      it('should reject codes with wrong length', () => {
        expect(constraint.validate('')).toBe(false);
        expect(constraint.validate('short')).toBe(false);
        expect(constraint.validate('exactly10c')).toBe(false); // 10 chars
        expect(constraint.validate('toolongcode1')).toBe(false); // 12 chars
        expect(constraint.validate('waytoolongcodestring')).toBe(false); // 20 chars
      });

      it('should reject codes with invalid characters', () => {
        // Standard base64 chars + and / are NOT valid in base64url
        expect(constraint.validate('abc+def/123')).toBe(false);
        expect(constraint.validate('abc=def=123')).toBe(false);
        // Other invalid chars
        expect(constraint.validate('abc def 123')).toBe(false);
        expect(constraint.validate('abc!def@123')).toBe(false);
        expect(constraint.validate('abc#def$123')).toBe(false);
      });

      it('should reject non-string values', () => {
        expect(constraint.validate(null)).toBe(false);
        expect(constraint.validate(undefined)).toBe(false);
        expect(constraint.validate(12345678901)).toBe(false);
        expect(constraint.validate({ code: 'test' })).toBe(false);
        expect(constraint.validate(['a', 'b', 'c'])).toBe(false);
      });

      it('should reject codes with unicode characters', () => {
        expect(constraint.validate('abcdefghijé')).toBe(false);
        expect(constraint.validate('abc日本語defg')).toBe(false);
        expect(constraint.validate('🔐🔐🔐🔐🔐🔐')).toBe(false);
      });

      it('should reject SQL injection attempts', () => {
        expect(constraint.validate("'; DROP--11")).toBe(false);
        expect(constraint.validate("1' OR '1'='1")).toBe(false);
        expect(constraint.validate('1; SELECT *')).toBe(false);
      });

      it('should reject null bytes and control characters', () => {
        expect(constraint.validate('abc\x00def1234')).toBe(false);
        expect(constraint.validate('abc\x0adef1234')).toBe(false);
        expect(constraint.validate('abc\x0ddef1234')).toBe(false);
      });
    });

    it('should return correct error message', () => {
      expect(constraint.defaultMessage({} as never)).toBe(
        'Invalid verification code format',
      );
    });
  });

  describe('CertificateNumberConstraint', () => {
    let constraint: CertificateNumberConstraint;

    beforeEach(() => {
      constraint = new CertificateNumberConstraint();
    });

    describe('valid certificate numbers', () => {
      it('should accept valid PASS certificate numbers', () => {
        const validNumbers = [
          'DHIS2-2026-P-12345678',
          'DHIS2-2025-P-ABCDEF01',
          'DHIS2-2024-P-00000000',
          'DHIS2-2030-P-FFFFFFFF',
        ];

        for (const num of validNumbers) {
          expect(constraint.validate(num)).toBe(true);
        }
      });

      it('should accept valid FAIL certificate numbers', () => {
        const validNumbers = [
          'DHIS2-2026-F-12345678',
          'DHIS2-2025-F-ABCDEF01',
          'DHIS2-2024-F-00000000',
        ];

        for (const num of validNumbers) {
          expect(constraint.validate(num)).toBe(true);
        }
      });

      it('should accept generated certificate numbers', () => {
        // Simulate the actual generation
        const year = new Date().getFullYear();
        const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
        const certNum = `DHIS2-${year}-P-${randomPart}`;
        expect(constraint.validate(certNum)).toBe(true);
      });
    });

    describe('invalid certificate numbers', () => {
      it('should reject wrong prefix', () => {
        expect(constraint.validate('DHIS3-2026-P-12345678')).toBe(false);
        expect(constraint.validate('dhis2-2026-P-12345678')).toBe(false);
        expect(constraint.validate('OTHER-2026-P-12345678')).toBe(false);
      });

      it('should reject invalid year format', () => {
        expect(constraint.validate('DHIS2-26-P-123456789')).toBe(false);
        expect(constraint.validate('DHIS2-20260-P-1234567')).toBe(false);
        expect(constraint.validate('DHIS2-XXXX-P-12345678')).toBe(false);
      });

      it('should reject invalid result codes', () => {
        expect(constraint.validate('DHIS2-2026-X-12345678')).toBe(false);
        expect(constraint.validate('DHIS2-2026-A-12345678')).toBe(false);
        expect(constraint.validate('DHIS2-2026-p-12345678')).toBe(false);
        expect(constraint.validate('DHIS2-2026-f-12345678')).toBe(false);
      });

      it('should reject invalid hex part', () => {
        expect(constraint.validate('DHIS2-2026-P-1234567')).toBe(false); // Too short
        expect(constraint.validate('DHIS2-2026-P-123456789')).toBe(false); // Too long
        expect(constraint.validate('DHIS2-2026-P-1234567G')).toBe(false); // Invalid char
        expect(constraint.validate('DHIS2-2026-P-abcdef12')).toBe(false); // Lowercase
      });

      it('should reject wrong length', () => {
        expect(constraint.validate('')).toBe(false);
        expect(constraint.validate('DHIS2-2026-P-1234567')).toBe(false);
        expect(constraint.validate('DHIS2-2026-P-123456789')).toBe(false);
      });

      it('should reject non-string values', () => {
        expect(constraint.validate(null)).toBe(false);
        expect(constraint.validate(undefined)).toBe(false);
        expect(constraint.validate(123456789012345678901)).toBe(false);
      });

      it('should reject SQL injection attempts', () => {
        expect(constraint.validate("'; DROP TABLE--")).toBe(false);
        expect(constraint.validate("1' OR '1'='1' --")).toBe(false);
      });
    });

    it('should return correct error message', () => {
      expect(constraint.defaultMessage({} as never)).toBe(
        'Invalid certificate number format',
      );
    });
  });

  describe('isValidVerificationCode utility', () => {
    it('should work as a type guard', () => {
      const code: unknown = crypto.randomBytes(8).toString('base64url');
      if (isValidVerificationCode(code)) {
        // TypeScript should recognize code as string here
        expect(typeof code).toBe('string');
        expect(code.length).toBe(11);
      }
    });

    it('should return false for invalid codes', () => {
      expect(isValidVerificationCode(null)).toBe(false);
      expect(isValidVerificationCode(undefined)).toBe(false);
      expect(isValidVerificationCode('short')).toBe(false);
      expect(isValidVerificationCode('invalid+char')).toBe(false);
    });
  });

  describe('isValidCertificateNumber utility', () => {
    it('should work as a type guard', () => {
      const num: unknown = 'DHIS2-2026-P-12345678';
      if (isValidCertificateNumber(num)) {
        // TypeScript should recognize num as string here
        expect(typeof num).toBe('string');
        expect(num.length).toBe(21);
      }
    });

    it('should return false for invalid numbers', () => {
      expect(isValidCertificateNumber(null)).toBe(false);
      expect(isValidCertificateNumber(undefined)).toBe(false);
      expect(isValidCertificateNumber('INVALID')).toBe(false);
    });
  });
});
