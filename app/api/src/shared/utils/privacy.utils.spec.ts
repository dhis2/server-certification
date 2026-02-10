import { maskEmail, maskUuid } from './privacy.utils';

describe('Privacy Utils', () => {
  describe('maskEmail', () => {
    it('should mask email with long local part', () => {
      expect(maskEmail('john.doe@example.com')).toBe('j***e@example.com');
    });

    it('should mask email with short local part', () => {
      expect(maskEmail('ab@example.com')).toBe('***@example.com');
    });

    it('should mask email with single character local part', () => {
      expect(maskEmail('a@example.com')).toBe('***@example.com');
    });

    it('should handle email without domain', () => {
      expect(maskEmail('nodomain')).toBe('***');
    });

    it('should handle empty string', () => {
      expect(maskEmail('')).toBe('***');
    });

    it('should preserve domain', () => {
      expect(maskEmail('test@subdomain.example.org')).toBe(
        't***t@subdomain.example.org',
      );
    });

    it('should handle exactly 3 character local part', () => {
      expect(maskEmail('abc@example.com')).toBe('a***c@example.com');
    });
  });

  describe('maskUuid', () => {
    it('should mask standard UUID', () => {
      expect(maskUuid('01912345-6789-7abc-8def-0123456789ab')).toBe(
        '01912***89ab',
      );
    });

    it('should handle short string', () => {
      expect(maskUuid('abc')).toBe('***');
    });

    it('should handle empty string', () => {
      expect(maskUuid('')).toBe('***');
    });

    it('should handle exactly 8 characters', () => {
      expect(maskUuid('12345678')).toBe('12345***5678');
    });
  });
});
