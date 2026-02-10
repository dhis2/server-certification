import type { ExecutionContext } from '@nestjs/common';
import { ThrottlerBehindProxyGuard } from '../throttler-behind-proxy.guard';
import type { Request } from 'express';

jest.mock('@nestjs/throttler', () => ({
  ThrottlerGuard: class {
    canActivate(_context: ExecutionContext): Promise<boolean> {
      return Promise.resolve(true);
    }
  },
}));

describe('ThrottlerBehindProxyGuard', () => {
  let guard: ThrottlerBehindProxyGuard;

  beforeEach(() => {
    guard = new ThrottlerBehindProxyGuard(
      {} as never,
      {} as never,
      {} as never,
    );
  });

  describe('getTracker', () => {
    it('should extract IP from x-forwarded-for header', async () => {
      const req = {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1',
        },
        ip: '127.0.0.1',
      } as unknown as Request;

      const tracker = await (
        guard as unknown as { getTracker: (req: Request) => Promise<string> }
      ).getTracker(req);
      expect(tracker).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header when x-forwarded-for is absent', async () => {
      const req = {
        headers: {
          'x-real-ip': '10.0.0.1',
        },
        ip: '127.0.0.1',
      } as unknown as Request;

      const tracker = await (
        guard as unknown as { getTracker: (req: Request) => Promise<string> }
      ).getTracker(req);
      expect(tracker).toBe('10.0.0.1');
    });

    it('should fall back to req.ip when no proxy headers', async () => {
      const req = {
        headers: {},
        ip: '192.168.1.100',
      } as unknown as Request;

      const tracker = await (
        guard as unknown as { getTracker: (req: Request) => Promise<string> }
      ).getTracker(req);
      expect(tracker).toBe('192.168.1.100');
    });

    it('should return unknown when no IP available', async () => {
      const req = {
        headers: {},
        ip: undefined,
      } as unknown as Request;

      const tracker = await (
        guard as unknown as { getTracker: (req: Request) => Promise<string> }
      ).getTracker(req);
      expect(tracker).toBe('unknown');
    });
  });

  describe('canActivate', () => {
    it('should skip throttling in test environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });
  });
});
