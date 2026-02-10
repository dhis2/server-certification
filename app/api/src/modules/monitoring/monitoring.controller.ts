import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { MetricsService, AlertingService } from './services';
import {
  MetricsSnapshotDto,
  AlertDto,
  AlertSummaryDto,
  AlertThresholdsDto,
  MonitoringStatusDto,
} from './dto';
import { AlertCategory, AlertSeverity } from './interfaces';

class TriggerAlertDto {
  title!: string;
  message!: string;
  severity!: AlertSeverity;
  category!: AlertCategory;
}

/**
 * MonitoringController provides endpoints for system monitoring and alerting.
 *
 * Implements NIST SP 800-137 (Information Security Continuous Monitoring):
 * - Administrative access only for security monitoring data
 * - Real-time metrics and alerting status
 * - Compliance with continuous monitoring requirements
 *
 * All endpoints require ADMIN role per principle of least privilege.
 *
 * @see https://csrc.nist.gov/publications/detail/sp/800-137/final
 */
@Controller('monitoring')
@ApiTags('Monitoring')
@ApiBearerAuth('bearer')
export class MonitoringController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertingService: AlertingService,
    private readonly configService: ConfigService,
  ) {}

  @Get('status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get monitoring status (admin only)',
    description:
      'Returns the current monitoring configuration, alert thresholds, and alert summary.',
  })
  @ApiResponse({ status: 200, type: MonitoringStatusDto })
  getStatus(): MonitoringStatusDto {
    const thresholds = this.alertingService.getThresholds();
    const alertSummary = this.alertingService.getAlertSummary();

    return {
      enabled: this.metricsService.isEnabled(),
      environment: this.configService.get<string>('NODE_ENV') ?? 'development',
      webhookConfigured: !!this.configService.get<string>(
        'MONITORING_ALERT_WEBHOOK_URL',
      ),
      slackConfigured: !!this.configService.get<string>(
        'MONITORING_SLACK_WEBHOOK_URL',
      ),
      thresholds: AlertThresholdsDto.fromThresholds(thresholds),
      alertSummary: AlertSummaryDto.fromSummary(alertSummary),
    };
  }

  @Get('metrics')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get current metrics (admin only)',
    description:
      'Returns a snapshot of all collected metrics including system, request, ' +
      'certificate, security, and database metrics.',
  })
  @ApiResponse({ status: 200, type: MetricsSnapshotDto })
  async getMetrics(): Promise<MetricsSnapshotDto> {
    const snapshot = await this.metricsService.getSnapshot();
    return MetricsSnapshotDto.fromSnapshot(snapshot);
  }

  @Get('alerts/summary')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get alert summary (admin only)',
    description:
      'Returns a summary of current alerts grouped by severity and category.',
  })
  @ApiResponse({ status: 200, type: AlertSummaryDto })
  getAlertSummary(): AlertSummaryDto {
    const summary = this.alertingService.getAlertSummary();
    return AlertSummaryDto.fromSummary(summary);
  }

  @Get('alerts')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get active alerts (admin only)',
    description: 'Returns all currently active alerts.',
  })
  @ApiResponse({ status: 200, type: [AlertDto] })
  getActiveAlerts(): AlertDto[] {
    const alerts = this.alertingService.getActiveAlerts();
    return alerts.map(AlertDto.fromAlert);
  }

  @Get('alerts/thresholds')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get alert thresholds (admin only)',
    description: 'Returns the currently configured alert threshold values.',
  })
  @ApiResponse({ status: 200, type: AlertThresholdsDto })
  getAlertThresholds(): AlertThresholdsDto {
    const thresholds = this.alertingService.getThresholds();
    return AlertThresholdsDto.fromThresholds(thresholds);
  }

  @Post('alerts/trigger')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Trigger manual alert (admin only)',
    description:
      'Manually triggers an alert for testing notification channels. ' +
      'This does not affect automatic alert rules.',
  })
  @ApiResponse({ status: 201, type: AlertDto })
  async triggerManualAlert(@Body() dto: TriggerAlertDto): Promise<AlertDto> {
    const alert = await this.alertingService.triggerManualAlert(
      dto.title,
      dto.message,
      dto.severity,
      dto.category,
    );
    return AlertDto.fromAlert(alert);
  }

  @Get('certificates')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get certificate metrics (admin only)',
    description:
      'Returns certificate-specific metrics including counts, expiration status, and activity.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        totalIssued: { type: 'number' },
        totalRevoked: { type: 'number' },
        activeCertificates: { type: 'number' },
        expiringCertificates: { type: 'number' },
        expiredCertificates: { type: 'number' },
        issuedLast24Hours: { type: 'number' },
        verificationsLast24Hours: { type: 'number' },
      },
    },
  })
  async getCertificateMetrics(): Promise<Record<string, number>> {
    const snapshot = await this.metricsService.getSnapshot();
    return {
      totalIssued: snapshot.certificates.totalIssued,
      totalRevoked: snapshot.certificates.totalRevoked,
      activeCertificates: snapshot.certificates.activeCertificates,
      expiringCertificates: snapshot.certificates.expiringCertificates,
      expiredCertificates: snapshot.certificates.expiredCertificates,
      issuedLast24Hours: snapshot.certificates.issuedLast24Hours,
      verificationsLast24Hours: snapshot.certificates.verificationsLast24Hours,
    };
  }

  @Get('security')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get security metrics (admin only)',
    description:
      'Returns security-specific metrics including auth failures, rate limiting, and audit status.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        failedAuthAttemptsLastHour: { type: 'number' },
        rateLimitHitsLastHour: { type: 'number' },
        uniqueRateLimitedIPs: { type: 'number' },
        auditLogIntegrityValid: { type: 'boolean' },
      },
    },
  })
  async getSecurityMetrics(): Promise<Record<string, number | boolean>> {
    const snapshot = await this.metricsService.getSnapshot();
    return {
      failedAuthAttemptsLastHour: snapshot.security.failedAuthAttemptsLastHour,
      rateLimitHitsLastHour: snapshot.security.rateLimitHitsLastHour,
      uniqueRateLimitedIPs: snapshot.security.uniqueRateLimitedIPs,
      auditLogIntegrityValid: snapshot.security.auditLogIntegrityValid,
    };
  }
}
