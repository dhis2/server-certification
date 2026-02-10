import {
  sanitizeSearch,
  createLikePattern,
  isEmptySearch,
} from '../search.utils';

describe('search.utils', () => {
  describe('sanitizeSearch', () => {
    it('should trim whitespace', () => {
      expect(sanitizeSearch('  test  ')).toBe('test');
    });

    it('should escape percent signs', () => {
      expect(sanitizeSearch('test%injection')).toBe('test\\%injection');
    });

    it('should escape underscores', () => {
      expect(sanitizeSearch('user_name')).toBe('user\\_name');
    });

    it('should escape backslashes', () => {
      expect(sanitizeSearch('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should escape multiple special characters', () => {
      expect(sanitizeSearch('test%_\\')).toBe('test\\%\\_\\\\');
    });

    it('should truncate to max length', () => {
      const longString = 'a'.repeat(200);
      const result = sanitizeSearch(longString);

      expect(result.length).toBe(100);
    });

    it('should allow custom max length', () => {
      const longString = 'a'.repeat(100);
      const result = sanitizeSearch(longString, 50);

      expect(result.length).toBe(50);
    });

    it('should handle empty string', () => {
      expect(sanitizeSearch('')).toBe('');
    });

    it('should handle normal search terms unchanged', () => {
      expect(sanitizeSearch('john doe')).toBe('john doe');
      expect(sanitizeSearch('test@example.com')).toBe('test@example.com');
    });
  });

  describe('createLikePattern', () => {
    it('should wrap search term with wildcards', () => {
      expect(createLikePattern('test')).toBe('%test%');
    });

    it('should sanitize before wrapping', () => {
      expect(createLikePattern('test%name')).toBe('%test\\%name%');
    });

    it('should trim and wrap', () => {
      expect(createLikePattern('  search  ')).toBe('%search%');
    });

    it('should handle empty string', () => {
      expect(createLikePattern('')).toBe('%%');
    });
  });

  describe('isEmptySearch', () => {
    it('should return true for null', () => {
      expect(isEmptySearch(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(isEmptySearch(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(isEmptySearch('')).toBe(true);
    });

    it('should return true for whitespace only', () => {
      expect(isEmptySearch('   ')).toBe(true);
      expect(isEmptySearch('\t\n')).toBe(true);
    });

    it('should return false for non-empty search', () => {
      expect(isEmptySearch('test')).toBe(false);
      expect(isEmptySearch('  test  ')).toBe(false);
    });
  });
});
