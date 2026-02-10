import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { UsersModule } from './modules/users/users.module';
import { IamModule } from './modules/iam/iam.module';
import { RedisModule } from './shared/redis';
import { configuration } from './config/configuration';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health';
import { DatabaseModule } from './database/database.module';
import { SigningModule } from './modules/signing';
import { AuditModule } from './modules/audit/audit.module';
import { ImplementationsModule } from './modules/implementations';
import { SubmissionsModule } from './modules/submissions';
import { TemplatesModule } from './modules/templates';
import { CertificatesModule } from './modules/certificates';
import { MailModule } from './modules/mail';
import { MonitoringModule } from './modules/monitoring';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: envValidationSchema,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),
    DatabaseModule,
    HealthModule,
    RedisModule,
    UsersModule,
    IamModule,
    AuditModule,
    ImplementationsModule,
    SubmissionsModule,
    TemplatesModule,
    CertificatesModule,
    SigningModule,
    MailModule,
    MonitoringModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
