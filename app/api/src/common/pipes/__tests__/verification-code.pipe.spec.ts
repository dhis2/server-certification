import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  ParseVerificationCodePipe,
  ParseCertificateNumberPipe,
} from '../verification-code.pipe';

describe('Verification Pipes', () => {
  describe('ParseVerificationCodePipe', () => {
    let pipe: ParseVerificationCodePipe;

    beforeEach(() => {
      pipe = new ParseVerificationCodePipe();
    });

    it('should pass through valid verification codes', () => {
      const validCode = crypto.randomBytes(8).toString('base64url');
      expect(pipe.transform(validCode, { type: 'param' })).toBe(validCode);
    });

    it('should pass through valid base64url strings of correct length', () => {
      const validCodes = ['ABCDEFGHIJK', 'abc-def_123', '01234567890'];

      for (const code of validCodes) {
        expect(pipe.transform(code, { type: 'param' })).toBe(code);
      }
    });

    it('should throw BadRequestException for invalid codes', () => {
      const invalidCodes = [
        '', // Empty
        'short', // Too short
        'waytoolongcode123', // Too long
        'abc+def/123', // Invalid base64 chars
        'abc def 123', // Spaces
      ];

      for (const code of invalidCodes) {
        expect(() => pipe.transform(code, { type: 'param' })).toThrow(
          BadRequestException,
        );
      }
    });

    it('should throw BadRequestException with correct message', () => {
      try {
        pipe.transform('invalid', { type: 'param' });
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).message).toBe(
          'Invalid verification code format',
        );
      }
    });

    it('should reject potential injection attempts', () => {
      const injectionAttempts = [
        "'; DROP--11", // SQL injection
        '<script>x</script>', // XSS
        '../../../etc', // Path traversal
        '${7*7}12345', // Template injection
      ];

      for (const attempt of injectionAttempts) {
        expect(() => pipe.transform(attempt, { type: 'param' })).toThrow(
          BadRequestException,
        );
      }
    });
  });

  describe('ParseCertificateNumberPipe', () => {
    let pipe: ParseCertificateNumberPipe;

    beforeEach(() => {
      pipe = new ParseCertificateNumberPipe();
    });

    it('should pass through valid certificate numbers', () => {
      const validNumbers = [
        'DHIS2-2026-P-12345678',
        'DHIS2-2025-F-ABCDEF01',
        'DHIS2-2024-P-00000000',
      ];

      for (const num of validNumbers) {
        expect(pipe.transform(num, { type: 'param' })).toBe(num);
      }
    });

    it('should normalize lowercase certificate numbers to uppercase', () => {
      const lowercaseCases = [
        { input: 'dhis2-2026-p-12345678', expected: 'DHIS2-2026-P-12345678' },
        { input: 'Dhis2-2026-P-abcdef01', expected: 'DHIS2-2026-P-ABCDEF01' },
        { input: 'DHIS2-2026-f-AbCdEf01', expected: 'DHIS2-2026-F-ABCDEF01' },
      ];

      for (const { input, expected } of lowercaseCases) {
        expect(pipe.transform(input, { type: 'param' })).toBe(expected);
      }
    });

    it('should throw BadRequestException for invalid numbers', () => {
      const invalidNumbers = [
        '', // Empty
        'INVALID', // Wrong format
        'DHIS2-2026-X-12345678', // Invalid result code (X is not P or F)
        'DHIS2-2026-P-1234567', // Too short hex
        'DHIS2-2026-P-123456789', // Too long hex
        'DHIS2-26-P-12345678', // 2-digit year
      ];

      for (const num of invalidNumbers) {
        expect(() => pipe.transform(num, { type: 'param' })).toThrow(
          BadRequestException,
        );
      }
    });

    it('should throw BadRequestException with correct message', () => {
      try {
        pipe.transform('INVALID', { type: 'param' });
        fail('Expected BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).message).toBe(
          'Invalid certificate number format',
        );
      }
    });

    it('should reject potential injection attempts', () => {
      const injectionAttempts = [
        "DHIS2-2026-P-'; DROP", // SQL injection in hex
        'DHIS2-2026-P-<script>', // XSS attempt
      ];

      for (const attempt of injectionAttempts) {
        expect(() => pipe.transform(attempt, { type: 'param' })).toThrow(
          BadRequestException,
        );
      }
    });
  });
});
