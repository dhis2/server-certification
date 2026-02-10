import {
  welcomeEmail,
  passwordResetEmail,
  accountLockedEmail,
  accountUnlockedEmail,
  tfaEnabledEmail,
  tfaDisabledEmail,
} from '../templates';

describe('Email Templates', () => {
  describe('welcomeEmail', () => {
    it('should generate welcome email with user data', () => {
      const html = welcomeEmail({
        firstName: 'John',
        email: 'john@example.com',
        temporaryPassword: 'TempPass123',
        loginUrl: 'https://example.com/login',
      });

      expect(html).toContain('Hello John,');
      expect(html).toContain('john@example.com');
      expect(html).toContain('TempPass123');
      expect(html).toContain('https://example.com/login');
      expect(html).toContain('Welcome to DHIS2 Server Certification');
    });

    it('should use generic greeting when firstName is not provided', () => {
      const html = welcomeEmail({
        email: 'user@example.com',
        temporaryPassword: 'TempPass123',
        loginUrl: 'https://example.com/login',
      });

      expect(html).toContain('Hello,');
      expect(html).not.toContain('Hello undefined');
    });

    it('should escape user input to prevent XSS', () => {
      const html = welcomeEmail({
        firstName: '<script>alert("xss")</script>',
        email: 'test@example.com',
        temporaryPassword: 'pass',
        loginUrl: 'https://example.com',
      });

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('passwordResetEmail', () => {
    it('should generate password reset email', () => {
      const html = passwordResetEmail({
        firstName: 'Jane',
        resetUrl: 'https://example.com/reset?token=abc123',
        expiresInMinutes: 60,
      });

      expect(html).toContain('Hello Jane,');
      expect(html).toContain('https://example.com/reset?token=abc123');
      expect(html).toContain('60 minutes');
      expect(html).toContain('Password Reset Request');
    });
  });

  describe('accountLockedEmail', () => {
    it('should generate account locked email', () => {
      const html = accountLockedEmail({
        firstName: 'Bob',
        email: 'bob@example.com',
        lockReason: 'Too many failed login attempts',
      });

      expect(html).toContain('Hello Bob,');
      expect(html).toContain('bob@example.com');
      expect(html).toContain('Too many failed login attempts');
      expect(html).toContain('contact your administrator');
      expect(html).toContain('Account Locked');
    });
  });

  describe('accountUnlockedEmail', () => {
    it('should generate account unlocked email', () => {
      const html = accountUnlockedEmail({
        firstName: 'Alice',
        email: 'alice@example.com',
        loginUrl: 'https://example.com/login',
      });

      expect(html).toContain('Hello Alice,');
      expect(html).toContain('https://example.com/login');
      expect(html).toContain('Account Unlocked');
      expect(html).toContain('unlocked');
    });
  });

  describe('tfaEnabledEmail', () => {
    it('should generate TFA enabled email', () => {
      const html = tfaEnabledEmail({
        firstName: 'Chris',
      });

      expect(html).toContain('Hello Chris,');
      expect(html).toContain('Two-Factor Authentication Enabled');
      expect(html).toContain('recovery codes');
    });
  });

  describe('tfaDisabledEmail', () => {
    it('should generate TFA disabled email', () => {
      const html = tfaDisabledEmail({
        firstName: 'Dana',
      });

      expect(html).toContain('Hello Dana,');
      expect(html).toContain('Two-Factor Authentication Disabled');
      expect(html).toContain('protected only by your password');
    });
  });
});
