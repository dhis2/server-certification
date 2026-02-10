import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuditLog } from './entities/audit-log.entity';
import { AuditService } from './services/audit.service';
import { AuditIntegrityService } from './services/audit-integrity.service';
import { AuditRetentionService } from './services/audit-retention.service';
import { AuditController } from './audit.controller';

/**
 * AuditModule provides comprehensive audit logging with security controls.
 *
 * Features per NIST SP 800-92 and OWASP Logging Cheat Sheet:
 * - Hash chain integrity (tamper detection)
 * - HMAC signatures (cryptographic integrity verification)
 * - Configurable retention policies
 * - Automatic archival and cleanup
 *
 * @see https://csrc.nist.gov/publications/detail/sp/800-92/final
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  providers: [AuditService, AuditIntegrityService, AuditRetentionService],
  controllers: [AuditController],
  exports: [AuditService, AuditIntegrityService, AuditRetentionService],
})
export class AuditModule {}
