import { registerAs } from '@nestjs/config';

export interface OtpConfig {
  appName: string;
  epochTolerance: number;
  codeWindowSeconds: number;
  maxFailures: number;
  lockoutSeconds: number;
  pendingSecretTtlSeconds: number;
  recoveryCodeCount: number;
}

export default registerAs(
  'otp',
  (): OtpConfig => ({
    appName: process.env.OTP_APP_NAME ?? 'App',
    epochTolerance: parseInt(process.env.OTP_EPOCH_TOLERANCE ?? '1', 10),
    codeWindowSeconds: parseInt(
      process.env.OTP_CODE_WINDOW_SECONDS ?? '30',
      10,
    ),
    maxFailures: parseInt(process.env.OTP_MAX_FAILURES ?? '3', 10),
    lockoutSeconds: parseInt(process.env.OTP_LOCKOUT_SECONDS ?? '300', 10),
    pendingSecretTtlSeconds: parseInt(
      process.env.OTP_PENDING_SECRET_TTL ?? '600',
      10,
    ),
    recoveryCodeCount: parseInt(
      process.env.OTP_RECOVERY_CODE_COUNT ?? '10',
      10,
    ),
  }),
);
