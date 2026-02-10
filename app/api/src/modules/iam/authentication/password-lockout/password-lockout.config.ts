import { registerAs } from '@nestjs/config';

export interface PasswordLockoutConfig {
  maxFailures: number;
  lockoutSeconds: number;
  failureWindowSeconds: number;
}

export default registerAs(
  'passwordLockout',
  (): PasswordLockoutConfig => ({
    // Minimum of 1 to prevent immediate lockout with invalid config values
    maxFailures: Math.max(
      1,
      parseInt(process.env.PASSWORD_LOCKOUT_MAX_FAILURES ?? '5', 10),
    ),
    // Minimum of 1 second to ensure lockout has effect
    lockoutSeconds: Math.max(
      1,
      parseInt(process.env.PASSWORD_LOCKOUT_SECONDS ?? '900', 10),
    ),
    // Minimum of 1 second for failure window
    failureWindowSeconds: Math.max(
      1,
      parseInt(process.env.PASSWORD_LOCKOUT_FAILURE_WINDOW ?? '900', 10),
    ),
  }),
);
