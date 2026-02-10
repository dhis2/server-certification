import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from '../services/mail.service';
import mailConfig from '../mail.config';

describe('MailService', () => {
  let service: MailService;

  const mockConfig = {
    enabled: false,
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    fromName: 'DHIS2 Server Certification',
    fromAddress: 'no-reply@dhis2.org',
    replyTo: 'support@dhis2.org',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: mailConfig.KEY,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should return false when mail is disabled', async () => {
      const result = await service.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result).toBe(false);
    });
  });

  describe('sendWelcome', () => {
    it('should return false when mail is disabled', async () => {
      const result = await service.sendWelcome('test@example.com', {
        firstName: 'John',
        email: 'test@example.com',
        temporaryPassword: 'TempPass123',
        loginUrl: 'https://example.com/login',
      });
      expect(result).toBe(false);
    });
  });

  describe('sendPasswordReset', () => {
    it('should return false when mail is disabled', async () => {
      const result = await service.sendPasswordReset('test@example.com', {
        firstName: 'John',
        resetUrl: 'https://example.com/reset?token=abc123',
        expiresInMinutes: 60,
      });
      expect(result).toBe(false);
    });
  });

  describe('sendAccountLocked', () => {
    it('should return false when mail is disabled', async () => {
      const result = await service.sendAccountLocked('test@example.com', {
        firstName: 'John',
        email: 'test@example.com',
        lockReason: 'Too many failed login attempts',
      });
      expect(result).toBe(false);
    });
  });

  describe('sendAccountUnlocked', () => {
    it('should return false when mail is disabled', async () => {
      const result = await service.sendAccountUnlocked('test@example.com', {
        firstName: 'John',
        email: 'test@example.com',
        loginUrl: 'https://example.com/login',
      });
      expect(result).toBe(false);
    });
  });

  describe('sendTfaEnabled', () => {
    it('should return false when mail is disabled', async () => {
      const result = await service.sendTfaEnabled('test@example.com', {
        firstName: 'John',
      });
      expect(result).toBe(false);
    });
  });

  describe('sendTfaDisabled', () => {
    it('should return false when mail is disabled', async () => {
      const result = await service.sendTfaDisabled('test@example.com', {
        firstName: 'John',
      });
      expect(result).toBe(false);
    });
  });

  describe('verifyConnection', () => {
    it('should return false when transporter is not configured', async () => {
      const result = await service.verifyConnection();
      expect(result).toBe(false);
    });
  });
});
