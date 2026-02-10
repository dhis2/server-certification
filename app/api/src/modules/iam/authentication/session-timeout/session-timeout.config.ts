import { registerAs } from '@nestjs/config';

export interface SessionTimeoutConfig {
  idleTimeoutSeconds: number;
  absoluteTimeoutSeconds: number;
}

export default registerAs(
  'sessionTimeout',
  (): SessionTimeoutConfig => ({
    idleTimeoutSeconds: Math.max(
      60,
      parseInt(process.env.SESSION_IDLE_TIMEOUT_SECONDS ?? '1800', 10),
    ),
    absoluteTimeoutSeconds: Math.max(
      60,
      parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT_SECONDS ?? '43200', 10),
    ),
  }),
);
