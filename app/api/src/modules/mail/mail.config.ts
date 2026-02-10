import { registerAs } from '@nestjs/config';

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromAddress: string;
  enabled: boolean;
}

export default registerAs(
  'mail',
  (): MailConfig => ({
    host: process.env.MAIL_HOST ?? 'localhost',
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER ?? '',
    password: process.env.MAIL_PASSWORD ?? '',
    fromName: process.env.MAIL_FROM_NAME ?? 'DHIS2 Server Certification',
    fromAddress: process.env.MAIL_FROM_ADDRESS ?? 'no-reply@dhis2.org',
    enabled: process.env.MAIL_ENABLED !== 'false',
  }),
);
