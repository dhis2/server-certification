import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsService, AlertingService } from './services';
import { MonitoringController } from './monitoring.controller';
import { Certificate } from '../certificates/entities/certificate.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

/**
 * MonitoringModule provides system monitoring and alerting capabilities.
 *
 * Implements NIST SP 800-137 (Information Security Continuous Monitoring):
 * - Ongoing awareness of information security, vulnerabilities, and threats
 * - Supports organizational risk management decisions
 * - Automated metrics collection and alerting
 *
 * Implements NIST SP 800-53 controls:
 * - CA-7: Continuous Monitoring
 * - SI-4: Information System Monitoring
 * - AU-6: Audit Review, Analysis, and Reporting
 *
 * Features:
 * - System metrics (memory, CPU, uptime)
 * - Request metrics (throughput, latency, error rates)
 * - Certificate metrics (issued, revoked, expiring)
 * - Security metrics (auth failures, rate limiting)
 * - Database health monitoring
 * - Configurable alerting with multiple channels (log, webhook, Slack)
 *
 * @see https://csrc.nist.gov/publications/detail/sp/800-137/final
 */
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Certificate, AuditLog]),
  ],
  controllers: [MonitoringController],
  providers: [MetricsService, AlertingService],
  exports: [MetricsService, AlertingService],
})
export class MonitoringModule {}
