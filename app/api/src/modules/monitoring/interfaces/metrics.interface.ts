/**
 * Metrics interfaces for the monitoring system.
 *
 * Implements NIST SP 800-137 (Information Security Continuous Monitoring)
 * and NIST SP 800-53 (Security and Privacy Controls) guidelines for:
 * - CA-7: Continuous Monitoring
 * - SI-4: Information System Monitoring
 * - AU-6: Audit Review, Analysis, and Reporting
 *
 * @see https://csrc.nist.gov/publications/detail/sp/800-137/final
 * @see https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
 */

export interface SystemMetrics {
  memoryUsage: {
    heapTotal: number;
    heapUsed: number;
    external: number;
    rss: number;
  };
  cpuUsage: number;
  uptime: number;
  nodeVersion: string;
  timestamp: Date;
}

export interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  clientErrors: number;
  serverErrors: number;
  averageResponseTimeMs: number;
  p95ResponseTimeMs: number;
  p99ResponseTimeMs: number;
  requestsPerSecond: number;
}

export interface CertificateMetrics {
  totalIssued: number;
  totalRevoked: number;
  activeCertificates: number;
  expiringCertificates: number;
  expiredCertificates: number;
  issuedLast24Hours: number;
  revokedLast24Hours: number;
  verificationsLast24Hours: number;
}

export interface SecurityMetrics {
  failedAuthAttemptsLastHour: number;
  rateLimitHitsLastHour: number;
  uniqueRateLimitedIPs: number;
  suspiciousActivityCount: number;
  lastSecurityScanAt: Date | null;
  auditLogIntegrityValid: boolean;
}

export interface DatabaseMetrics {
  connectionPool: {
    active: number;
    idle: number;
    waiting: number;
    total: number;
  };
  averageQueryTimeMs: number;
  slowQueriesLastHour: number;
  databaseSizeBytes: number | null;
  connected: boolean;
}

export interface MetricsSnapshot {
  system: SystemMetrics;
  requests: RequestMetrics;
  certificates: CertificateMetrics;
  security: SecurityMetrics;
  database: DatabaseMetrics;
  collectedAt: Date;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

export interface MetricTrend {
  metricName: string;
  period: 'hour' | 'day' | 'week';
  dataPoints: MetricDataPoint[];
  average: number;
  min: number;
  max: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}
