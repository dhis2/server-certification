import { Button, Card, CircularLoader, NoticeBox } from '@dhis2/ui'
import { Heading } from '../../components/index.ts'
import { useSigningKeys } from '../../hooks/use-signing-keys.ts'
import { formatDateTime } from '../../utils/format.ts'
import styles from './signing-keys.module.css'

export const SigningKeys = () => {
    const { health, policy, report, loading, error, refetch } = useSigningKeys()

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'compliant':
                return <span className={`${styles.badge} ${styles.badgeHealthy}`}>{status}</span>
            case 'warning':
                return <span className={`${styles.badge} ${styles.badgeWarning}`}>{status}</span>
            case 'critical':
            case 'non-compliant':
                return <span className={`${styles.badge} ${styles.badgeCritical}`}>{status}</span>
            default:
                return <span className={styles.badge}>{status}</span>
        }
    }

    const getRotationProgress = () => {
        if (!health || health.ageDays === null) {
            return <span style={{ color: 'var(--colors-grey600)' }}>-</span>
        }
        const used = health.ageDays
        const total = health.maxAgeDays
        const pct = Math.min(100, Math.round((used / total) * 100))
        let colorClass = styles.progressGreen
        if (pct >= 80) {
            colorClass = styles.progressRed
        } else if (pct >= 60) {
            colorClass = styles.progressYellow
        }

        return (
            <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--colors-grey600)', marginBottom: '4px' }}>
                    {used} / {total} days ({pct}%)
                </div>
                <div className={styles.progressContainer}>
                    <div className={`${styles.progressBar} ${colorClass}`} style={{ width: `${pct}%` }} />
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <CircularLoader />
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <Heading title="Signing Key Management">
                <Button small onClick={refetch}>
                    Refresh
                </Button>
            </Heading>

            {error && (
                <NoticeBox warning title="Data may be incomplete">
                    {error.message}
                </NoticeBox>
            )}

            {health && (
                <Card className={styles.card}>
                    <h3>Key Health</h3>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Status</span>
                            <span className={styles.infoValue}>{getStatusBadge(health.status)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Key ID</span>
                            <span className={styles.infoValue}>{health.keyId ?? '-'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Version</span>
                            <span className={styles.infoValue}>{health.version || '-'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Age</span>
                            <span className={styles.infoValue}>{health.ageDays !== null ? `${health.ageDays} days` : '-'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Days Until Rotation</span>
                            <span className={styles.infoValue}>{health.daysUntilRotation !== null ? `${health.daysUntilRotation} days` : '-'}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Key Age Progress</span>
                            <span className={styles.infoValue}>{getRotationProgress()}</span>
                        </div>
                    </div>
                    {health.recommendations?.length > 0 && (
                        <div>
                            <strong style={{ fontSize: '0.8125rem', display: 'block', marginTop: '12px' }}>Recommendations:</strong>
                            <ul className={styles.recommendations}>
                                {health.recommendations.map((rec, i) => (
                                    <li key={i}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Card>
            )}

            {policy && (
                <Card className={styles.card}>
                    <h3>Rotation Policy</h3>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Max Age</span>
                            <span className={styles.infoValue}>{policy.maxAgeDays} days</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Warning Threshold</span>
                            <span className={styles.infoValue}>{policy.warningThresholdDays} days</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Check on Startup</span>
                            <span className={styles.infoValue}>{policy.checkOnStartup ? 'Enabled' : 'Disabled'}</span>
                        </div>
                    </div>
                </Card>
            )}

            {report && (
                <Card className={styles.card}>
                    <h3>Compliance Status</h3>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Compliance</span>
                            <span className={styles.infoValue}>{getStatusBadge(report.complianceStatus)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Key Version</span>
                            <span className={styles.infoValue}>{report.version}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Last Rotated</span>
                            <span className={styles.infoValue}>{formatDateTime(report.lastRotatedAt)}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Next Rotation</span>
                            <span className={styles.infoValue}>{formatDateTime(report.nextRotationAt)}</span>
                        </div>
                    </div>
                </Card>
            )}

            {!health && !policy && !report && !error && (
                <NoticeBox title="No Data">Signing key information is not available. The key management service may not be configured.</NoticeBox>
            )}
        </div>
    )
}
