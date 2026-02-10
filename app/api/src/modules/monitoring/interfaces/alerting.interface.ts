/**
 * Alerting interfaces for the monitoring system.
 *
 * Implements NIST SP 800-137 alerting requirements:
 * - Automated alerting on security-relevant events
 * - Configurable thresholds and notification channels
 * - Alert correlation and aggregation
 *
 * @see https://csrc.nist.gov/publications/detail/sp/800-137/final
 */

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

export enum AlertCategory {
  SYSTEM = 'system',
  SECURITY = 'security',
  CERTIFICATE = 'certificate',
  DATABASE = 'database',
  APPLICATION = 'application',
  COMPLIANCE = 'compliance',
}

export enum AlertChannel {
  LOG = 'log',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  EMAIL = 'email',
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: AlertCategory;
  severity: AlertSeverity;
  enabled: boolean;
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne';
  threshold: number;
  cooldownSeconds: number;
  channels: AlertChannel[];
}

export interface Alert {
  id: string;
  ruleId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  currentValue: number;
  thresholdValue: number;
  triggeredAt: Date;
  resolvedAt: Date | null;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export interface AlertNotification {
  alert: Alert;
  ruleName: string;
  environment: string;
  timestamp: string;
  actionUrl?: string;
}

export interface AlertThresholds {
  errorRatePercent: number;
  memoryUsagePercent: number;
  responseTimeMs: number;
  failedAuthAttemptsPerHour: number;
  certificateExpiryDays: number;
  dbConnectionPoolPercent: number;
}

export interface AlertSummary {
  bySeverity: Record<AlertSeverity, number>;
  byCategory: Record<AlertCategory, number>;
  totalActive: number;
  mostRecent: Alert | null;
  lastCheckedAt: Date;
}

export interface NotificationResult {
  channel: AlertChannel;
  success: boolean;
  error?: string;
  responseTime?: number;
}
