import { Throttle, SkipThrottle } from '@nestjs/throttler';

// 100 req/60s
export const StandardThrottle = () =>
  Throttle({ default: { limit: 100, ttl: 60000 } });

// 5 req/60s — login, password reset
export const StrictThrottle = () =>
  Throttle({ default: { limit: 5, ttl: 60000 } });

// 3 req/60s — 2FA setup
export const VeryStrictThrottle = () =>
  Throttle({ default: { limit: 3, ttl: 60000 } });

// 10 req/60s — public endpoints (verification, etc.)
export const PublicApiThrottle = () =>
  Throttle({ default: { limit: 10, ttl: 60000 } });

// 200 req/60s
export const RelaxedThrottle = () =>
  Throttle({ default: { limit: 200, ttl: 60000 } });

export const NoThrottle = () => SkipThrottle();
