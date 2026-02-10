import { registerAs } from '@nestjs/config';

export enum BlacklistFallbackMode {
  FAIL_OPEN = 'fail-open',
  FAIL_CLOSED = 'fail-closed',
}

export interface BlacklistConfig {
  fallbackMode: BlacklistFallbackMode;
  circuitBreaker: {
    failureThreshold: number;
    recoveryTimeoutMs: number;
  };
  localCache: {
    maxEntries: number;
    cleanupIntervalMs: number;
  };
}

export default registerAs(
  'blacklist',
  (): BlacklistConfig => ({
    fallbackMode:
      (process.env.BLACKLIST_FALLBACK_MODE as BlacklistFallbackMode) ||
      BlacklistFallbackMode.FAIL_CLOSED,
    circuitBreaker: {
      failureThreshold: parseInt(
        process.env.BLACKLIST_CIRCUIT_FAILURE_THRESHOLD ?? '5',
        10,
      ),
      recoveryTimeoutMs: parseInt(
        process.env.BLACKLIST_CIRCUIT_RECOVERY_MS ?? '30000',
        10,
      ),
    },
    localCache: {
      maxEntries: parseInt(
        process.env.BLACKLIST_LOCAL_CACHE_MAX ?? '10000',
        10,
      ),
      cleanupIntervalMs: parseInt(
        process.env.BLACKLIST_LOCAL_CACHE_CLEANUP_MS ?? '60000',
        10,
      ),
    },
  }),
);
