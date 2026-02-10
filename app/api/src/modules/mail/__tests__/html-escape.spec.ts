import {
  escapeHtml,
  escapeAttribute,
  escapeUrl,
  escapeEmail,
  safeMailtoHref,
} from '../utils';

describe('HTML Escape Utilities', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape single quotes', () => {
      expect(escapeHtml("it's")).toBe('it&apos;s');
    });

    it('should handle null input', () => {
      expect(escapeHtml(null)).toBe('');
    });

    it('should handle undefined input', () => {
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should return same string when no special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });

    it('should handle unicode characters', () => {
      expect(escapeHtml('Hello 你好 مرحبا')).toBe('Hello 你好 مرحبا');
    });

    it('should handle multiple special characters', () => {
      expect(escapeHtml('<div class="test">A & B</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;A &amp; B&lt;/div&gt;',
      );
    });
  });

  describe('escapeAttribute', () => {
    it('should encode for attribute context', () => {
      const result = escapeAttribute('test"value');
      expect(result).toContain('&quot;');
      expect(result).not.toContain('"');
    });

    it('should handle null input', () => {
      expect(escapeAttribute(null)).toBe('');
    });

    it('should handle undefined input', () => {
      expect(escapeAttribute(undefined)).toBe('');
    });
  });

  describe('escapeUrl', () => {
    it('should allow https URLs', () => {
      const url = 'https://example.com/path?query=test';
      expect(escapeUrl(url)).toBe(url);
    });

    it('should allow http URLs', () => {
      const url = 'http://example.com/path';
      expect(escapeUrl(url)).toBe(url);
    });

    it('should allow mailto URLs', () => {
      const url = 'mailto:test@example.com';
      expect(escapeUrl(url)).toBe(url);
    });

    it('should block javascript: protocol', () => {
      expect(escapeUrl('javascript:alert(1)')).toBe('');
    });

    it('should block data: protocol', () => {
      expect(escapeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should block vbscript: protocol', () => {
      expect(escapeUrl('vbscript:msgbox(1)')).toBe('');
    });

    it('should handle null input', () => {
      expect(escapeUrl(null)).toBe('');
    });

    it('should handle undefined input', () => {
      expect(escapeUrl(undefined)).toBe('');
    });

    it('should handle empty string', () => {
      expect(escapeUrl('')).toBe('');
    });

    it('should escape HTML entities in URL', () => {
      const url = 'https://example.com/path?foo=bar&baz=qux';
      const result = escapeUrl(url);
      expect(result).toContain('&amp;');
    });

    it('should handle URL with special characters', () => {
      const url = 'https://example.com/search?q=<script>';
      const result = escapeUrl(url);
      expect(result).toContain('&lt;');
    });
  });

  describe('escapeEmail', () => {
    it('should escape valid email', () => {
      expect(escapeEmail('test@example.com')).toBe('test@example.com');
    });

    it('should escape email with special characters in local part', () => {
      expect(escapeEmail('test+tag@example.com')).toBe('test+tag@example.com');
    });

    it('should handle null input', () => {
      expect(escapeEmail(null)).toBe('');
    });

    it('should handle undefined input', () => {
      expect(escapeEmail(undefined)).toBe('');
    });

    it('should still escape invalid email format', () => {
      const result = escapeEmail('<script>');
      expect(result).toContain('&lt;');
    });
  });

  describe('safeMailtoHref', () => {
    it('should create mailto link for valid email', () => {
      expect(safeMailtoHref('test@example.com')).toBe(
        'mailto:test@example.com',
      );
    });

    it('should return empty string for null', () => {
      expect(safeMailtoHref(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(safeMailtoHref(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(safeMailtoHref('')).toBe('');
    });
  });
});
