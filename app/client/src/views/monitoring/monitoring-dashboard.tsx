import { Button, Card, CircularLoader, NoticeBox } from '@dhis2/ui'
import { useState } from 'react'
import { Heading } from '../../components/index.ts'
import { MetricCard } from '../../components/monitoring/index.ts'
import { useMetrics, useAlerts } from '../../hooks/monitoring/index.ts'
import { formatDateTime } from '../../utils/format.ts'
import styles from './monitoring-dashboard.module.css'

type Tab = 'overview' | 'alerts' | 'security'

const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) {
        return `${days}d ${hours}h`
    }
    if (hours > 0) {
        return `${hours}h ${mins}m`
    }
    return `${mins}m`
}

const formatBytes = (bytes: number | undefined): string => {
    if (bytes === undefined || bytes === null) {
        return '0 MB'
    }
    const mb = bytes / (1024 * 1024)
    if (mb >= 1024) {
        return `${(mb / 1024).toFixed(1)} GB`
    }
    return `${mb.toFixed(0)} MB`
}

const formatPercent = (value: number | undefined): string => {
    if (value === undefined || value === null) {
        return '0'
    }
    return value.toFixed(1)
}

export const MonitoringDashboard = () => {
    const [activeTab, setActiveTab] = useState<Tab>('overview')
    const { metrics, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useMetrics({ autoRefresh: true })
    const { alerts, summary, loading: alertsLoading, error: alertsError, refetch: refetchAlerts } = useAlerts()

    const loading = metricsLoading || alertsLoading
    const error = metricsError || alertsError

    const handleRefresh = () => {
        refetchMetrics()
        refetchAlerts()
    }

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <span className={`${styles.badge} ${styles.badgeCritical}`}>Critical</span>
            case 'warning':
                return <span className={`${styles.badge} ${styles.badgeWarning}`}>Warning</span>
            default:
                return <span className={`${styles.badge} ${styles.badgeInfo}`}>Info</span>
        }
    }

    return (
        <div className={styles.container}>
            <Heading title="System Monitoring">
                <Button small onClick={handleRefresh} loading={loading}>
                    Refresh
                </Button>
            </Heading>

            {error && (
                <NoticeBox warning title="Data may be incomplete">
                    {error.message}
                </NoticeBox>
            )}

            <div className={styles.tabs}>
                <button className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`} onClick={() => setActiveTab('overview')} type="button">
                    Overview
                </button>
                <button className={`${styles.tab} ${activeTab === 'alerts' ? styles.active : ''}`} onClick={() => setActiveTab('alerts')} type="button">
                    Alerts{summary && summary.totalActive > 0 ? ` (${summary.totalActive})` : ''}
                </button>
                <button className={`${styles.tab} ${activeTab === 'security' ? styles.active : ''}`} onClick={() => setActiveTab('security')} type="button">
                    Security
                </button>
            </div>

            {activeTab === 'overview' && (
                <>
                    {loading && !metrics ? (
                        <div className={styles.loadingContainer}>
                            <CircularLoader />
                        </div>
                    ) : metrics ? (
                        <>
                            <h4 className={styles.sectionTitle}>System</h4>
                            <div className={styles.metricsGrid}>
                                <MetricCard
                                    label="Memory Usage"
                                    value={formatBytes(metrics.system.heapUsed)}
                                    unit={`/ ${formatBytes(metrics.system.heapTotal)}`}
                                    progress={Math.round(metrics.system.memoryUsagePercent)}
                                />
                                <MetricCard label="Uptime" value={formatUptime(metrics.system.uptime)} />
                                <MetricCard label="Node Version" value={metrics.system.nodeVersion} />
                                <MetricCard
                                    label="DB Pool"
                                    value={`${metrics.database.activeConnections}/${metrics.database.totalConnections}`}
                                    progress={
                                        metrics.database.totalConnections > 0 ? Math.round((metrics.database.activeConnections / metrics.database.totalConnections) * 100) : 0
                                    }
                                />
                            </div>

                            <h4 className={styles.sectionTitle}>Requests</h4>
                            <div className={styles.metricsGrid}>
                                <MetricCard label="Requests/sec" value={formatPercent(metrics.requests.requestsPerSecond)} />
                                <MetricCard label="Error Rate" value={`${formatPercent(metrics.requests.errorRatePercent)}%`} />
                                <MetricCard label="Avg Response" value={`${Math.round(metrics.requests.averageResponseTimeMs ?? 0)}`} unit="ms" />
                            </div>

                            <h4 className={styles.sectionTitle}>Certificates</h4>
                            <div className={styles.metricsGrid}>
                                <MetricCard label="Active" value={metrics.certificates.activeCertificates} />
                                <MetricCard label="Issued" value={metrics.certificates.totalIssued} />
                                <MetricCard label="Revoked" value={metrics.certificates.totalRevoked} />
                                <MetricCard label="Expiring Soon" value={metrics.certificates.expiringCertificates} />
                            </div>
                        </>
                    ) : (
                        <div className={styles.emptyState}>No metrics data available</div>
                    )}
                </>
            )}

            {activeTab === 'alerts' && (
                <>
                    {summary && summary.totalActive > 0 && (
                        <div className={styles.alertsSummary}>
                            {(summary.bySeverity.critical ?? 0) > 0 && <span className={`${styles.summaryBadge} ${styles.critical}`}>{summary.bySeverity.critical} Critical</span>}
                            {(summary.bySeverity.warning ?? 0) > 0 && <span className={`${styles.summaryBadge} ${styles.warning}`}>{summary.bySeverity.warning} Warning</span>}
                            {(summary.bySeverity.info ?? 0) > 0 && <span className={`${styles.summaryBadge} ${styles.info}`}>{summary.bySeverity.info} Info</span>}
                        </div>
                    )}

                    <Card className={styles.tableCard}>
                        {alertsLoading ? (
                            <div className={styles.loadingContainer}>
                                <CircularLoader />
                            </div>
                        ) : alerts.length === 0 ? (
                            <div className={styles.emptyState}>No active alerts</div>
                        ) : (
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Severity</th>
                                        <th>Category</th>
                                        <th>Title</th>
                                        <th>Message</th>
                                        <th>Triggered</th>
                                        <th>Value / Threshold</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.map((alert) => (
                                        <tr key={alert.id}>
                                            <td>{getSeverityBadge(alert.severity)}</td>
                                            <td>{alert.category}</td>
                                            <td>{alert.title}</td>
                                            <td>{alert.message}</td>
                                            <td>{formatDateTime(alert.triggeredAt)}</td>
                                            <td>{alert.currentValue !== undefined && alert.threshold !== undefined ? `${alert.currentValue} / ${alert.threshold}` : '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </Card>
                </>
            )}

            {activeTab === 'security' && (
                <>
                    {loading && !metrics ? (
                        <div className={styles.loadingContainer}>
                            <CircularLoader />
                        </div>
                    ) : metrics ? (
                        <div className={styles.securityGrid}>
                            <MetricCard label="Failed Auth Attempts (Last Hour)" value={metrics.security.failedAuthAttemptsLastHour} />
                            <MetricCard label="Rate Limit Hits" value={metrics.security.rateLimitHitsLastHour} />
                            <MetricCard label="Unique Rate-Limited IPs" value={metrics.security.uniqueRateLimitedIPs} />
                        </div>
                    ) : (
                        <div className={styles.emptyState}>No security metrics available</div>
                    )}
                </>
            )}
        </div>
    )
}
