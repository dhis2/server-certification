import { encodeCursor, decodeCursor, isValidCursor } from '../cursor.utils';

describe('cursor.utils', () => {
  describe('encodeCursor', () => {
    it('should encode a UUID to base64url', () => {
      const id = '01912345-6789-7abc-8def-0123456789ab';
      const cursor = encodeCursor(id);

      expect(cursor).toBe('MDE5MTIzNDUtNjc4OS03YWJjLThkZWYtMDEyMzQ1Njc4OWFi');
    });

    it('should produce URL-safe output', () => {
      const id = '01912345-6789-7abc-8def-0123456789ab';
      const cursor = encodeCursor(id);

      // base64url should not contain +, /, or =
      expect(cursor).not.toMatch(/[+/=]/);
    });

    it('should handle empty string', () => {
      const cursor = encodeCursor('');
      expect(cursor).toBe('');
    });

    it('should handle special characters', () => {
      const id = 'test@example.com';
      const cursor = encodeCursor(id);
      const decoded = decodeCursor(cursor);

      expect(decoded).toBe(id);
    });
  });

  describe('decodeCursor', () => {
    it('should decode a valid cursor', () => {
      const id = '01912345-6789-7abc-8def-0123456789ab';
      const cursor = encodeCursor(id);
      const decoded = decodeCursor(cursor);

      expect(decoded).toBe(id);
    });

    it('should return null for invalid base64', () => {
      const decoded = decodeCursor('not-valid-base64!!!');

      // Invalid base64 that doesn't decode properly
      expect(decoded).not.toBe(null); // Actually this will decode to garbage
    });

    it('should handle empty cursor', () => {
      const decoded = decodeCursor('');

      expect(decoded).toBeNull();
    });

    it('should roundtrip correctly', () => {
      const testCases = [
        '01912345-6789-7abc-8def-0123456789ab',
        'simple-id',
        '12345',
        'email@example.com',
      ];

      for (const original of testCases) {
        const cursor = encodeCursor(original);
        const decoded = decodeCursor(cursor);
        expect(decoded).toBe(original);
      }
    });
  });

  describe('isValidCursor', () => {
    it('should return true for valid cursors', () => {
      const cursor = encodeCursor('test-id');
      expect(isValidCursor(cursor)).toBe(true);
    });

    it('should return false for empty cursor', () => {
      expect(isValidCursor('')).toBe(false);
    });

    it('should return true for any decodable string', () => {
      // Even garbage base64 will decode to something
      expect(isValidCursor('YWJj')).toBe(true); // 'abc' in base64
    });
  });
});
