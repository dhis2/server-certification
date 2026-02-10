import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AlertCategory,
  AlertSeverity,
  MetricsSnapshot,
  AlertSummary,
  Alert,
  AlertThresholds,
} from '../interfaces';

export class SystemMetricsDto {
  @ApiProperty({ description: 'Heap memory total in bytes' })
  heapTotal!: number;

  @ApiProperty({ description: 'Heap memory used in bytes' })
  heapUsed!: number;

  @ApiProperty({ description: 'Memory usage percentage' })
  memoryUsagePercent!: number;

  @ApiProperty({ description: 'Process uptime in seconds' })
  uptime!: number;

  @ApiProperty({ description: 'Node.js version' })
  nodeVersion!: string;
}

export class RequestMetricsDto {
  @ApiProperty({ description: 'Total requests in last minute' })
  totalRequests!: number;

  @ApiProperty({ description: 'Successful requests (2xx)' })
  successfulRequests!: number;

  @ApiProperty({ description: 'Client errors (4xx)' })
  clientErrors!: number;

  @ApiProperty({ description: 'Server errors (5xx)' })
  serverErrors!: number;

  @ApiProperty({ description: 'Error rate percentage' })
  errorRatePercent!: number;

  @ApiProperty({ description: 'Average response time in ms' })
  averageResponseTimeMs!: number;

  @ApiProperty({ description: 'Requests per second' })
  requestsPerSecond!: number;
}

export class CertificateMetricsDto {
  @ApiProperty({ description: 'Total certificates issued' })
  totalIssued!: number;

  @ApiProperty({ description: 'Total certificates revoked' })
  totalRevoked!: number;

  @ApiProperty({ description: 'Active (valid, non-revoked) certificates' })
  activeCertificates!: number;

  @ApiProperty({
    description: 'Certificates expiring within warning threshold',
  })
  expiringCertificates!: number;

  @ApiProperty({ description: 'Expired certificates' })
  expiredCertificates!: number;

  @ApiProperty({ description: 'Certificates issued in last 24 hours' })
  issuedLast24Hours!: number;

  @ApiProperty({ description: 'Verification requests in last 24 hours' })
  verificationsLast24Hours!: number;
}

export class SecurityMetricsDto {
  @ApiProperty({ description: 'Failed authentication attempts in last hour' })
  failedAuthAttemptsLastHour!: number;

  @ApiProperty({ description: 'Rate limit hits in last hour' })
  rateLimitHitsLastHour!: number;

  @ApiProperty({ description: 'Unique IPs hitting rate limits' })
  uniqueRateLimitedIPs!: number;

  @ApiProperty({ description: 'Audit log integrity status' })
  auditLogIntegrityValid!: boolean;
}

export class DatabaseMetricsDto {
  @ApiProperty({ description: 'Database connection status' })
  connected!: boolean;

  @ApiProperty({ description: 'Active connections in pool' })
  activeConnections!: number;

  @ApiProperty({ description: 'Idle connections in pool' })
  idleConnections!: number;

  @ApiProperty({ description: 'Total connections in pool' })
  totalConnections!: number;
}

export class MetricsSnapshotDto {
  @ApiProperty({ type: SystemMetricsDto })
  system!: SystemMetricsDto;

  @ApiProperty({ type: RequestMetricsDto })
  requests!: RequestMetricsDto;

  @ApiProperty({ type: CertificateMetricsDto })
  certificates!: CertificateMetricsDto;

  @ApiProperty({ type: SecurityMetricsDto })
  security!: SecurityMetricsDto;

  @ApiProperty({ type: DatabaseMetricsDto })
  database!: DatabaseMetricsDto;

  @ApiProperty({ description: 'When the metrics were collected' })
  collectedAt!: Date;

  static fromSnapshot(snapshot: MetricsSnapshot): MetricsSnapshotDto {
    const dto = new MetricsSnapshotDto();

    const heapTotal = snapshot.system.memoryUsage.heapTotal;
    const heapUsed = snapshot.system.memoryUsage.heapUsed;

    dto.system = {
      heapTotal,
      heapUsed,
      memoryUsagePercent:
        heapTotal > 0 ? Math.round((heapUsed / heapTotal) * 10000) / 100 : 0,
      uptime: snapshot.system.uptime,
      nodeVersion: snapshot.system.nodeVersion,
    };

    const totalRequests = snapshot.requests.totalRequests;
    const serverErrors = snapshot.requests.serverErrors;

    dto.requests = {
      totalRequests,
      successfulRequests: snapshot.requests.successfulRequests,
      clientErrors: snapshot.requests.clientErrors,
      serverErrors,
      errorRatePercent:
        totalRequests > 0
          ? Math.round((serverErrors / totalRequests) * 10000) / 100
          : 0,
      averageResponseTimeMs: snapshot.requests.averageResponseTimeMs,
      requestsPerSecond: snapshot.requests.requestsPerSecond,
    };

    dto.certificates = {
      totalIssued: snapshot.certificates.totalIssued,
      totalRevoked: snapshot.certificates.totalRevoked,
      activeCertificates: snapshot.certificates.activeCertificates,
      expiringCertificates: snapshot.certificates.expiringCertificates,
      expiredCertificates: snapshot.certificates.expiredCertificates,
      issuedLast24Hours: snapshot.certificates.issuedLast24Hours,
      verificationsLast24Hours: snapshot.certificates.verificationsLast24Hours,
    };

    dto.security = {
      failedAuthAttemptsLastHour: snapshot.security.failedAuthAttemptsLastHour,
      rateLimitHitsLastHour: snapshot.security.rateLimitHitsLastHour,
      uniqueRateLimitedIPs: snapshot.security.uniqueRateLimitedIPs,
      auditLogIntegrityValid: snapshot.security.auditLogIntegrityValid,
    };

    dto.database = {
      connected: snapshot.database.connected,
      activeConnections: snapshot.database.connectionPool.active,
      idleConnections: snapshot.database.connectionPool.idle,
      totalConnections: snapshot.database.connectionPool.total,
    };

    dto.collectedAt = snapshot.collectedAt;

    return dto;
  }
}

export class AlertDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ruleId!: string;

  @ApiProperty({ enum: AlertCategory })
  category!: AlertCategory;

  @ApiProperty({ enum: AlertSeverity })
  severity!: AlertSeverity;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  currentValue!: number;

  @ApiProperty()
  thresholdValue!: number;

  @ApiProperty()
  triggeredAt!: Date;

  @ApiPropertyOptional()
  resolvedAt?: Date | null;

  @ApiProperty()
  isActive!: boolean;

  static fromAlert(alert: Alert): AlertDto {
    const dto = new AlertDto();
    dto.id = alert.id;
    dto.ruleId = alert.ruleId;
    dto.category = alert.category;
    dto.severity = alert.severity;
    dto.title = alert.title;
    dto.message = alert.message;
    dto.currentValue = alert.currentValue;
    dto.thresholdValue = alert.thresholdValue;
    dto.triggeredAt = alert.triggeredAt;
    dto.resolvedAt = alert.resolvedAt;
    dto.isActive = alert.isActive;
    return dto;
  }
}

export class AlertSummaryDto {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  bySeverity!: Record<AlertSeverity, number>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  byCategory!: Record<AlertCategory, number>;

  @ApiProperty()
  totalActive!: number;

  @ApiPropertyOptional({ type: AlertDto })
  mostRecent?: AlertDto | null;

  @ApiProperty()
  lastCheckedAt!: Date;

  static fromSummary(summary: AlertSummary): AlertSummaryDto {
    const dto = new AlertSummaryDto();
    dto.bySeverity = summary.bySeverity;
    dto.byCategory = summary.byCategory;
    dto.totalActive = summary.totalActive;
    dto.mostRecent = summary.mostRecent
      ? AlertDto.fromAlert(summary.mostRecent)
      : null;
    dto.lastCheckedAt = summary.lastCheckedAt;
    return dto;
  }
}

export class AlertThresholdsDto {
  @ApiProperty({ description: 'Error rate percentage threshold' })
  errorRatePercent!: number;

  @ApiProperty({ description: 'Memory usage percentage threshold' })
  memoryUsagePercent!: number;

  @ApiProperty({ description: 'Response time threshold in ms' })
  responseTimeMs!: number;

  @ApiProperty({ description: 'Failed auth attempts per hour threshold' })
  failedAuthAttemptsPerHour!: number;

  @ApiProperty({ description: 'Days before certificate expiry to warn' })
  certificateExpiryDays!: number;

  @ApiProperty({ description: 'Database connection pool usage threshold' })
  dbConnectionPoolPercent!: number;

  static fromThresholds(thresholds: AlertThresholds): AlertThresholdsDto {
    const dto = new AlertThresholdsDto();
    Object.assign(dto, thresholds);
    return dto;
  }
}

export class MonitoringStatusDto {
  @ApiProperty({ description: 'Whether monitoring is enabled' })
  enabled!: boolean;

  @ApiProperty({ description: 'Current environment' })
  environment!: string;

  @ApiProperty({ description: 'Webhook alerting configured' })
  webhookConfigured!: boolean;

  @ApiProperty({ description: 'Slack alerting configured' })
  slackConfigured!: boolean;

  @ApiProperty({ type: AlertThresholdsDto })
  thresholds!: AlertThresholdsDto;

  @ApiProperty({ type: AlertSummaryDto })
  alertSummary!: AlertSummaryDto;
}
