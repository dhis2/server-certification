import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { MetricsService } from './metrics.service';
import {
  Alert,
  AlertCategory,
  AlertChannel,
  AlertNotification,
  AlertRule,
  AlertSeverity,
  AlertSummary,
  AlertThresholds,
  NotificationResult,
} from '../interfaces';

/**
 * AlertingService monitors metrics and triggers alerts when thresholds are exceeded.
 *
 * Implements NIST SP 800-137 (Information Security Continuous Monitoring):
 * - Automated alerting on security-relevant events
 * - Configurable thresholds based on organizational requirements
 * - Multiple notification channels for operational awareness
 *
 * Implements NIST SP 800-53 SI-4 (Information System Monitoring):
 * - Monitoring for attacks and indicators of potential attacks
 * - Monitoring for unauthorized connections and activities
 * - Alerting on detected events
 *
 * @see https://csrc.nist.gov/publications/detail/sp/800-137/final
 * @see https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
 */
@Injectable()
export class AlertingService implements OnModuleInit {
  private readonly logger = new Logger(AlertingService.name);
  private readonly enabled: boolean;
  private readonly environment: string;
  private readonly webhookUrl: string | null;
  private readonly slackWebhookUrl: string | null;
  private readonly thresholds: AlertThresholds;

  private readonly activeAlerts = new Map<string, Alert>();
  private readonly alertCooldowns = new Map<string, number>();
  private readonly alertRules: AlertRule[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {
    this.enabled = this.configService.get<boolean>('MONITORING_ENABLED', true);
    this.environment =
      this.configService.get<string>('NODE_ENV') ?? 'development';
    this.webhookUrl =
      this.configService.get<string>('MONITORING_ALERT_WEBHOOK_URL') ?? null;
    this.slackWebhookUrl =
      this.configService.get<string>('MONITORING_SLACK_WEBHOOK_URL') ?? null;

    this.thresholds = {
      errorRatePercent: this.configService.get<number>(
        'MONITORING_ERROR_RATE_THRESHOLD',
        5,
      ),
      memoryUsagePercent: 85, // Alert at 85% memory usage
      responseTimeMs: 5000, // Alert if avg response > 5s
      failedAuthAttemptsPerHour: 100, // Alert on brute force attempts
      certificateExpiryDays: this.configService.get<number>(
        'MONITORING_CERT_EXPIRY_WARNING_DAYS',
        30,
      ),
      dbConnectionPoolPercent: 90, // Alert at 90% pool usage
    };

    this.initializeAlertRules();
  }

  onModuleInit(): void {
    if (this.enabled) {
      this.logger.log('Alerting service initialized');
      if (this.webhookUrl) {
        this.logger.log('Webhook alerting configured');
      }
      if (this.slackWebhookUrl) {
        this.logger.log('Slack alerting configured');
      }
      if (!this.webhookUrl && !this.slackWebhookUrl) {
        this.logger.warn(
          'No external alerting channels configured. Alerts will only be logged.',
        );
      }
    }
  }

  private initializeAlertRules(): void {
    this.alertRules.push(
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Memory usage exceeds threshold',
        category: AlertCategory.SYSTEM,
        severity: AlertSeverity.WARNING,
        enabled: true,
        metric: 'system.memoryUsagePercent',
        operator: 'gt',
        threshold: this.thresholds.memoryUsagePercent,
        cooldownSeconds: 300, // 5 minutes
        channels: [AlertChannel.LOG, AlertChannel.SLACK],
      },
      {
        id: 'high-failed-auth',
        name: 'High Failed Authentication Rate',
        description:
          'Potential brute force attack - high number of failed auth attempts',
        category: AlertCategory.SECURITY,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        metric: 'security.failedAuthAttemptsLastHour',
        operator: 'gt',
        threshold: this.thresholds.failedAuthAttemptsPerHour,
        cooldownSeconds: 900, // 15 minutes
        channels: [AlertChannel.LOG, AlertChannel.SLACK, AlertChannel.WEBHOOK],
      },
      {
        id: 'rate-limit-abuse',
        name: 'Rate Limit Abuse Detected',
        description: 'High number of rate limit violations',
        category: AlertCategory.SECURITY,
        severity: AlertSeverity.WARNING,
        enabled: true,
        metric: 'security.rateLimitHitsLastHour',
        operator: 'gt',
        threshold: 500,
        cooldownSeconds: 600, // 10 minutes
        channels: [AlertChannel.LOG, AlertChannel.SLACK],
      },
      {
        id: 'certificates-expiring',
        name: 'Certificates Expiring Soon',
        description: 'Certificates approaching expiration date',
        category: AlertCategory.CERTIFICATE,
        severity: AlertSeverity.WARNING,
        enabled: true,
        metric: 'certificates.expiringCertificates',
        operator: 'gt',
        threshold: 0,
        cooldownSeconds: 86400, // 24 hours
        channels: [AlertChannel.LOG, AlertChannel.SLACK],
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Application error rate exceeds threshold',
        category: AlertCategory.APPLICATION,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        metric: 'requests.errorRatePercent',
        operator: 'gt',
        threshold: this.thresholds.errorRatePercent,
        cooldownSeconds: 300, // 5 minutes
        channels: [AlertChannel.LOG, AlertChannel.SLACK, AlertChannel.WEBHOOK],
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        description: 'Average response time exceeds threshold',
        category: AlertCategory.APPLICATION,
        severity: AlertSeverity.WARNING,
        enabled: true,
        metric: 'requests.averageResponseTimeMs',
        operator: 'gt',
        threshold: this.thresholds.responseTimeMs,
        cooldownSeconds: 300, // 5 minutes
        channels: [AlertChannel.LOG, AlertChannel.SLACK],
      },
      {
        id: 'db-connection-error',
        name: 'Database Connection Error',
        description: 'Database connection is unavailable',
        category: AlertCategory.DATABASE,
        severity: AlertSeverity.EMERGENCY,
        enabled: true,
        metric: 'database.connected',
        operator: 'eq',
        threshold: 0, // false = 0
        cooldownSeconds: 60, // 1 minute
        channels: [AlertChannel.LOG, AlertChannel.SLACK, AlertChannel.WEBHOOK],
      },
      {
        id: 'audit-log-integrity',
        name: 'Audit Log Integrity Failure',
        description: 'Audit log integrity check failed - potential tampering',
        category: AlertCategory.COMPLIANCE,
        severity: AlertSeverity.EMERGENCY,
        enabled: true,
        metric: 'security.auditLogIntegrityValid',
        operator: 'eq',
        threshold: 0, // false = 0
        cooldownSeconds: 300, // 5 minutes
        channels: [AlertChannel.LOG, AlertChannel.SLACK, AlertChannel.WEBHOOK],
      },
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateAlerts(): Promise<void> {
    if (!this.enabled) return;

    try {
      const snapshot = await this.metricsService.getSnapshot();
      const metrics = this.flattenMetrics(snapshot);

      for (const rule of this.alertRules) {
        if (!rule.enabled) continue;

        const currentValue = metrics[rule.metric];
        if (currentValue === undefined) continue;

        const shouldTrigger = this.evaluateRule(rule, currentValue);
        const existingAlert = this.activeAlerts.get(rule.id);

        if (shouldTrigger && !existingAlert) {
          const lastTriggered = this.alertCooldowns.get(rule.id) ?? 0;
          const now = Date.now();
          if (now - lastTriggered < rule.cooldownSeconds * 1000) {
            continue;
          }

          await this.triggerAlert(rule, currentValue);
        } else if (!shouldTrigger && existingAlert) {
          await this.resolveAlert(rule.id);
        }
      }
    } catch (error) {
      this.logger.error('Failed to evaluate alerts', error);
    }
  }

  private flattenMetrics(
    snapshot: object,
    prefix = '',
  ): Record<string, number> {
    const result: Record<string, number> = {};

    for (const [key, value] of Object.entries(snapshot)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'number') {
        result[fullKey] = value;
      } else if (typeof value === 'boolean') {
        result[fullKey] = value ? 1 : 0;
      } else if (
        value &&
        typeof value === 'object' &&
        !(value instanceof Date)
      ) {
        Object.assign(
          result,
          this.flattenMetrics(value as Record<string, unknown>, fullKey),
        );
      }
    }

    if (result['requests.totalRequests'] > 0) {
      result['requests.errorRatePercent'] =
        (result['requests.serverErrors'] / result['requests.totalRequests']) *
        100;
    } else {
      result['requests.errorRatePercent'] = 0;
    }

    const heapTotal = result['system.memoryUsage.heapTotal'] ?? 0;
    const heapUsed = result['system.memoryUsage.heapUsed'] ?? 0;
    result['system.memoryUsagePercent'] =
      heapTotal > 0 ? (heapUsed / heapTotal) * 100 : 0;

    return result;
  }

  private evaluateRule(rule: AlertRule, value: number): boolean {
    switch (rule.operator) {
      case 'gt':
        return value > rule.threshold;
      case 'lt':
        return value < rule.threshold;
      case 'gte':
        return value >= rule.threshold;
      case 'lte':
        return value <= rule.threshold;
      case 'eq':
        return value === rule.threshold;
      case 'ne':
        return value !== rule.threshold;
      default:
        return false;
    }
  }

  private async triggerAlert(
    rule: AlertRule,
    currentValue: number,
  ): Promise<void> {
    const alert: Alert = {
      id: crypto.randomUUID(),
      ruleId: rule.id,
      category: rule.category,
      severity: rule.severity,
      title: rule.name,
      message: `${rule.description}. Current value: ${currentValue.toFixed(2)}, Threshold: ${rule.threshold.toString()}`,
      currentValue,
      thresholdValue: rule.threshold,
      triggeredAt: new Date(),
      resolvedAt: null,
      isActive: true,
      metadata: {
        environment: this.environment,
        metric: rule.metric,
        operator: rule.operator,
      },
    };

    this.activeAlerts.set(rule.id, alert);
    this.alertCooldowns.set(rule.id, Date.now());

    this.logger.warn(
      `[ALERT] ${alert.severity.toUpperCase()}: ${alert.title} - ${alert.message}`,
    );

    await this.sendNotifications(alert, rule);
  }

  private async resolveAlert(ruleId: string): Promise<void> {
    const alert = this.activeAlerts.get(ruleId);
    if (!alert) return;

    alert.resolvedAt = new Date();
    alert.isActive = false;

    this.activeAlerts.delete(ruleId);

    this.logger.log(
      `[ALERT RESOLVED] ${alert.title} - Alert has been resolved`,
    );
  }

  private async sendNotifications(
    alert: Alert,
    rule: AlertRule,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const notification: AlertNotification = {
      alert,
      ruleName: rule.name,
      environment: this.environment,
      timestamp: new Date().toISOString(),
    };

    for (const channel of rule.channels) {
      try {
        switch (channel) {
          case AlertChannel.LOG:
            // Already logged above
            results.push({ channel, success: true });
            break;
          case AlertChannel.WEBHOOK:
            if (this.webhookUrl) {
              await this.sendWebhook(this.webhookUrl, notification);
              results.push({ channel, success: true });
            }
            break;
          case AlertChannel.SLACK:
            if (this.slackWebhookUrl) {
              await this.sendSlackNotification(notification);
              results.push({ channel, success: true });
            }
            break;
          default:
            results.push({
              channel,
              success: false,
              error: 'Channel not implemented',
            });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        results.push({ channel, success: false, error: errorMessage });
        this.logger.error(
          `Failed to send ${channel} notification: ${errorMessage}`,
        );
      }
    }

    return results;
  }

  private async sendWebhook(
    url: string,
    notification: AlertNotification,
  ): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status.toString()}`);
    }
  }

  private async sendSlackNotification(
    notification: AlertNotification,
  ): Promise<void> {
    if (!this.slackWebhookUrl) return;

    const color = this.getSeverityColor(notification.alert.severity);
    const slackPayload = {
      attachments: [
        {
          color,
          title: `${this.getSeverityEmoji(notification.alert.severity)} ${notification.alert.title}`,
          text: notification.alert.message,
          fields: [
            {
              title: 'Environment',
              value: notification.environment,
              short: true,
            },
            {
              title: 'Severity',
              value: notification.alert.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Category',
              value: notification.alert.category,
              short: true,
            },
            {
              title: 'Time',
              value: notification.timestamp,
              short: true,
            },
          ],
          footer: 'DHIS2 Server Certification Monitoring',
        },
      ],
    };

    const response = await fetch(this.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status.toString()}`);
    }
  }

  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.EMERGENCY:
        return '#8B0000'; // Dark red
      case AlertSeverity.CRITICAL:
        return '#FF0000'; // Red
      case AlertSeverity.WARNING:
        return '#FFA500'; // Orange
      case AlertSeverity.INFO:
        return '#0000FF'; // Blue
      default:
        return '#808080'; // Gray
    }
  }

  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.EMERGENCY:
        return '🚨';
      case AlertSeverity.CRITICAL:
        return '🔴';
      case AlertSeverity.WARNING:
        return '⚠️';
      case AlertSeverity.INFO:
        return 'ℹ️';
      default:
        return '📋';
    }
  }

  getAlertSummary(): AlertSummary {
    const bySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.INFO]: 0,
      [AlertSeverity.WARNING]: 0,
      [AlertSeverity.CRITICAL]: 0,
      [AlertSeverity.EMERGENCY]: 0,
    };

    const byCategory: Record<AlertCategory, number> = {
      [AlertCategory.SYSTEM]: 0,
      [AlertCategory.SECURITY]: 0,
      [AlertCategory.CERTIFICATE]: 0,
      [AlertCategory.DATABASE]: 0,
      [AlertCategory.APPLICATION]: 0,
      [AlertCategory.COMPLIANCE]: 0,
    };

    let mostRecent: Alert | null = null;

    for (const alert of this.activeAlerts.values()) {
      bySeverity[alert.severity]++;
      byCategory[alert.category]++;

      if (!mostRecent || alert.triggeredAt > mostRecent.triggeredAt) {
        mostRecent = alert;
      }
    }

    return {
      bySeverity,
      byCategory,
      totalActive: this.activeAlerts.size,
      mostRecent,
      lastCheckedAt: new Date(),
    };
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  getThresholds(): AlertThresholds {
    return { ...this.thresholds };
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  async triggerManualAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    category: AlertCategory,
  ): Promise<Alert> {
    const alert: Alert = {
      id: crypto.randomUUID(),
      ruleId: 'manual',
      category,
      severity,
      title,
      message,
      currentValue: 0,
      thresholdValue: 0,
      triggeredAt: new Date(),
      resolvedAt: null,
      isActive: true,
      metadata: {
        manual: true,
        environment: this.environment,
      },
    };

    this.logger.warn(
      `[MANUAL ALERT] ${severity.toUpperCase()}: ${title} - ${message}`,
    );

    // Send to all channels except LOG (already logged)
    const rule: AlertRule = {
      id: 'manual',
      name: title,
      description: message,
      category,
      severity,
      enabled: true,
      metric: 'manual',
      operator: 'eq',
      threshold: 0,
      cooldownSeconds: 0,
      channels: [AlertChannel.SLACK, AlertChannel.WEBHOOK],
    };

    await this.sendNotifications(alert, rule);

    return alert;
  }
}
