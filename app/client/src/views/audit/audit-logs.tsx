import { Button, Card, CircularLoader, InputField, NoticeBox, SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heading, ConfirmationModal, CursorPagination } from '../../components/index.ts'
import { useAuditLogs, useAuditActions, usePaginationNavigation, useDebounce } from '../../hooks/index.ts'
import type { IntegrityValidation, RetentionPolicy, RetentionComplianceReport } from '../../types/audit.ts'
import { formatDateTime, extractErrorMessage } from '../../utils/format.ts'
import styles from './audit-logs.module.css'

type Tab = 'logs' | 'integrity' | 'retention'

const PAGE_SIZE = 20

export const AuditLogs = () => {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<Tab>('logs')

    const [entityType, setEntityType] = useState('')
    const [eventType, setEventType] = useState('')
    const [action, setAction] = useState('')
    const [actorSearch, setActorSearch] = useState('')
    const debouncedActorSearch = useDebounce(actorSearch, 300)

    const pagination = usePaginationNavigation()
    const { afterCursor, cursorStack, goToNextPage, goToPreviousPage, resetPagination, getDisplayRange } = pagination

    const { logs, totalCount, pageInfo, loading } = useAuditLogs({
        entityType: entityType || undefined,
        eventType: eventType || undefined,
        action: action || undefined,
        actorId: debouncedActorSearch || undefined,
        first: PAGE_SIZE,
        after: afterCursor,
    })

    const { validateIntegrity, getRetentionPolicy, getComplianceReport, triggerCleanup, loading: actionLoading } = useAuditActions()

    const { start: displayStart, end: displayEnd } = getDisplayRange(PAGE_SIZE, totalCount)

    const [integrityResult, setIntegrityResult] = useState<IntegrityValidation | null>(null)
    const [integrityError, setIntegrityError] = useState('')

    const [retentionPolicy, setRetentionPolicy] = useState<RetentionPolicy | null>(null)
    const [complianceReport, setComplianceReport] = useState<RetentionComplianceReport | null>(null)
    const [retentionLoaded, setRetentionLoaded] = useState(false)
    const [cleanupResult, setCleanupResult] = useState<{ deleted: number; dryRun: boolean } | null>(null)
    const [showCleanupModal, setShowCleanupModal] = useState(false)
    const [retentionError, setRetentionError] = useState('')

    const handleValidateIntegrity = useCallback(async () => {
        setIntegrityError('')
        try {
            const result = await validateIntegrity()
            setIntegrityResult(result)
        } catch (err) {
            setIntegrityError(extractErrorMessage(err))
        }
    }, [validateIntegrity])

    const handleLoadRetention = useCallback(async () => {
        setRetentionError('')
        try {
            const [policy, report] = await Promise.all([getRetentionPolicy(), getComplianceReport()])
            setRetentionPolicy(policy)
            setComplianceReport(report)
            setRetentionLoaded(true)
        } catch (err) {
            setRetentionError(extractErrorMessage(err))
        }
    }, [getRetentionPolicy, getComplianceReport])

    const handleCleanup = useCallback(async () => {
        setRetentionError('')
        try {
            const result = await triggerCleanup(false)
            setCleanupResult(result)
            setShowCleanupModal(false)
        } catch (err) {
            setRetentionError(extractErrorMessage(err))
            setShowCleanupModal(false)
        }
    }, [triggerCleanup])

    const handleDryRun = useCallback(async () => {
        setRetentionError('')
        try {
            const result = await triggerCleanup(true)
            setCleanupResult(result)
        } catch (err) {
            setRetentionError(extractErrorMessage(err))
        }
    }, [triggerCleanup])

    const getActionBadge = (logAction: string) => {
        const lower = logAction?.toLowerCase() || ''
        if (lower.includes('create')) {
            return <span className={`${styles.badge} ${styles.badgeCreate}`}>{logAction}</span>
        }
        if (lower.includes('update')) {
            return <span className={`${styles.badge} ${styles.badgeUpdate}`}>{logAction}</span>
        }
        if (lower.includes('delete')) {
            return <span className={`${styles.badge} ${styles.badgeDelete}`}>{logAction}</span>
        }
        if (lower.includes('auth') || lower.includes('login')) {
            return <span className={`${styles.badge} ${styles.badgeAuth}`}>{logAction}</span>
        }
        return <span className={`${styles.badge} ${styles.badgeDefault}`}>{logAction}</span>
    }

    const getEventTypeBadge = (type: string) => {
        return <span className={`${styles.badge} ${styles.badgeDefault}`}>{type}</span>
    }

    return (
        <div className={styles.container}>
            <Heading title="Audit Logs" />

            <div className={styles.tabs}>
                <button className={`${styles.tab} ${activeTab === 'logs' ? styles.active : ''}`} onClick={() => setActiveTab('logs')} type="button">
                    Logs
                </button>
                <button className={`${styles.tab} ${activeTab === 'integrity' ? styles.active : ''}`} onClick={() => setActiveTab('integrity')} type="button">
                    Integrity
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'retention' ? styles.active : ''}`}
                    onClick={() => {
                        setActiveTab('retention')
                        if (!retentionLoaded) {
                            handleLoadRetention()
                        }
                    }}
                    type="button"
                >
                    Retention
                </button>
            </div>

            {activeTab === 'logs' && (
                <>
                    <div className={styles.filters}>
                        <div className={styles.filterField}>
                            <SingleSelectField
                                label="Entity Type"
                                selected={entityType}
                                onChange={({ selected }) => {
                                    setEntityType(selected)
                                    resetPagination()
                                }}
                                dense
                            >
                                <SingleSelectOption label="All" value="" />
                                <SingleSelectOption label="User" value="user" />
                                <SingleSelectOption label="Certificate" value="certificate" />
                                <SingleSelectOption label="Implementation" value="implementation" />
                                <SingleSelectOption label="Template" value="template" />
                                <SingleSelectOption label="Submission" value="submission" />
                            </SingleSelectField>
                        </div>
                        <div className={styles.filterField}>
                            <SingleSelectField
                                label="Event Type"
                                selected={eventType}
                                onChange={({ selected }) => {
                                    setEventType(selected)
                                    resetPagination()
                                }}
                                dense
                            >
                                <SingleSelectOption label="All" value="" />
                                <SingleSelectOption label="Auth" value="auth" />
                                <SingleSelectOption label="Data Change" value="data_change" />
                                <SingleSelectOption label="Admin" value="admin" />
                                <SingleSelectOption label="Security" value="security" />
                            </SingleSelectField>
                        </div>
                        <div className={styles.filterField}>
                            <SingleSelectField
                                label="Action"
                                selected={action}
                                onChange={({ selected }) => {
                                    setAction(selected)
                                    resetPagination()
                                }}
                                dense
                            >
                                <SingleSelectOption label="All" value="" />
                                <SingleSelectOption label="Create" value="create" />
                                <SingleSelectOption label="Update" value="update" />
                                <SingleSelectOption label="Delete" value="delete" />
                                <SingleSelectOption label="Login" value="login" />
                                <SingleSelectOption label="Logout" value="logout" />
                            </SingleSelectField>
                        </div>
                        <div className={styles.filterField}>
                            <InputField
                                name="actor"
                                label="Actor"
                                placeholder="Search by email..."
                                value={actorSearch}
                                onChange={({ value }) => {
                                    setActorSearch(value)
                                    resetPagination()
                                }}
                                dense
                                inputWidth="180px"
                            />
                        </div>
                    </div>

                    <Card className={styles.tableCard}>
                        {loading ? (
                            <div className={styles.loadingContainer}>
                                <CircularLoader />
                            </div>
                        ) : logs.length === 0 ? (
                            <div className={styles.emptyState}>No audit log entries found</div>
                        ) : (
                            <>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>Event Type</th>
                                            <th>Entity</th>
                                            <th>Action</th>
                                            <th>Actor</th>
                                            <th>IP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log) => (
                                            <tr key={log.id} onClick={() => navigate(`/admin/audit/${log.id}`)}>
                                                <td>{formatDateTime(log.createdAt)}</td>
                                                <td>{getEventTypeBadge(log.eventType)}</td>
                                                <td>{log.entityType}</td>
                                                <td>{getActionBadge(log.action)}</td>
                                                <td>{log.actor?.email || '-'}</td>
                                                <td>{log.actorIp || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <CursorPagination
                                    start={displayStart}
                                    end={displayEnd}
                                    total={totalCount}
                                    hasNextPage={pageInfo.hasNextPage}
                                    hasPreviousPage={cursorStack.length > 0}
                                    onNextPage={() => goToNextPage(pageInfo.endCursor)}
                                    onPreviousPage={goToPreviousPage}
                                />
                            </>
                        )}
                    </Card>
                </>
            )}

            {activeTab === 'integrity' && (
                <Card className={styles.card}>
                    <h3>Integrity Validation</h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--colors-grey600)', marginBottom: '12px' }}>
                        Validate the integrity of the audit log chain. This checks hash chains and digital signatures.
                    </p>

                    <Button primary onClick={handleValidateIntegrity} loading={actionLoading}>
                        Validate Integrity
                    </Button>

                    {integrityError && (
                        <div style={{ marginTop: '12px' }}>
                            <NoticeBox error title="Validation failed">
                                {integrityError}
                            </NoticeBox>
                        </div>
                    )}

                    {integrityResult && (
                        <div className={styles.integrityResult}>
                            <NoticeBox
                                valid={integrityResult.overallValid}
                                error={!integrityResult.overallValid}
                                title={integrityResult.overallValid ? 'Integrity Valid' : 'Integrity Compromised'}
                            >
                                {integrityResult.hashChain.entriesChecked} entries checked
                            </NoticeBox>
                            <div className={styles.integrityItem}>
                                <span className={styles.integrityLabel}>Hash Chain</span>
                                <span className={`${styles.badge} ${integrityResult.hashChain.valid ? styles.badgeValid : styles.badgeInvalid}`}>
                                    {integrityResult.hashChain.valid ? 'Valid' : 'Invalid'}
                                </span>
                            </div>
                            <div className={styles.integrityItem}>
                                <span className={styles.integrityLabel}>Signatures</span>
                                <span className={`${styles.badge} ${integrityResult.signatures?.valid !== false ? styles.badgeValid : styles.badgeInvalid}`}>
                                    {integrityResult.signatures ? (integrityResult.signatures.valid ? 'Valid' : 'Invalid') : 'Not configured'}
                                </span>
                            </div>
                            {(integrityResult.hashChain.errorMessage || integrityResult.signatures?.errorMessage) && (
                                <div>
                                    <strong style={{ fontSize: '0.8125rem' }}>Errors:</strong>
                                    <ul className={styles.recommendations}>
                                        {integrityResult.hashChain.errorMessage && <li>{integrityResult.hashChain.errorMessage}</li>}
                                        {integrityResult.signatures?.errorMessage && <li>{integrityResult.signatures.errorMessage}</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            )}

            {activeTab === 'retention' && (
                <>
                    {actionLoading && !retentionLoaded ? (
                        <div className={styles.loadingContainer}>
                            <CircularLoader />
                        </div>
                    ) : retentionError ? (
                        <NoticeBox error title="Error">
                            {retentionError}
                        </NoticeBox>
                    ) : (
                        <>
                            {retentionPolicy && (
                                <Card className={styles.card}>
                                    <h3>Retention Policy</h3>
                                    <div className={styles.retentionInfo}>
                                        <div className={styles.retentionItem}>
                                            <span className={styles.retentionLabel}>Default Retention</span>
                                            <span className={styles.retentionValue}>{retentionPolicy.defaultRetentionDays} days</span>
                                        </div>
                                        <div className={styles.retentionItem}>
                                            <span className={styles.retentionLabel}>Security Events</span>
                                            <span className={styles.retentionValue}>{retentionPolicy.securityEventRetentionDays} days</span>
                                        </div>
                                        <div className={styles.retentionItem}>
                                            <span className={styles.retentionLabel}>Certificate Events</span>
                                            <span className={styles.retentionValue}>{retentionPolicy.certificateEventRetentionDays} days</span>
                                        </div>
                                        <div className={styles.retentionItem}>
                                            <span className={styles.retentionLabel}>Auto Cleanup</span>
                                            <span className={styles.retentionValue}>{retentionPolicy.autoCleanupEnabled ? 'Enabled' : 'Disabled'}</span>
                                        </div>
                                        <div className={styles.retentionItem}>
                                            <span className={styles.retentionLabel}>Archive Before Delete</span>
                                            <span className={styles.retentionValue}>{retentionPolicy.archiveBeforeDelete ? 'Yes' : 'No'}</span>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {complianceReport && (
                                <Card className={styles.card}>
                                    <h3>Compliance Report</h3>
                                    <NoticeBox
                                        valid={complianceReport.complianceStatus === 'compliant'}
                                        warning={complianceReport.complianceStatus === 'needs-attention'}
                                        error={complianceReport.complianceStatus === 'non-compliant'}
                                        title={
                                            complianceReport.complianceStatus === 'compliant'
                                                ? 'Compliant'
                                                : complianceReport.complianceStatus === 'needs-attention'
                                                  ? 'Needs Attention'
                                                  : 'Non-Compliant'
                                        }
                                    >
                                        {complianceReport.statistics.totalLogs} total entries ({complianceReport.statistics.logsPendingArchival} pending archival)
                                    </NoticeBox>

                                    {complianceReport.recommendations?.length > 0 && (
                                        <div>
                                            <strong style={{ fontSize: '0.8125rem', display: 'block', marginTop: '12px' }}>Recommendations:</strong>
                                            <ul className={styles.recommendations}>
                                                {complianceReport.recommendations.map((rec, i) => (
                                                    <li key={i}>{rec}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </Card>
                            )}

                            <Card className={styles.card}>
                                <h3>Cleanup</h3>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--colors-grey600)', marginBottom: '12px' }}>
                                    Remove audit log entries older than the retention period.
                                </p>

                                {cleanupResult && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <NoticeBox valid title={cleanupResult.dryRun ? 'Dry Run Result' : 'Cleanup Complete'}>
                                            {cleanupResult.dryRun ? `${cleanupResult.deleted} entries would be deleted` : `${cleanupResult.deleted} entries deleted`}
                                        </NoticeBox>
                                    </div>
                                )}

                                <div className={styles.actions}>
                                    <Button onClick={handleDryRun} loading={actionLoading}>
                                        Dry Run
                                    </Button>
                                    <Button destructive onClick={() => setShowCleanupModal(true)} loading={actionLoading}>
                                        Run Cleanup
                                    </Button>
                                </div>
                            </Card>
                        </>
                    )}
                </>
            )}

            {showCleanupModal && (
                <ConfirmationModal
                    title="Run Audit Log Cleanup"
                    message="Are you sure you want to permanently delete old audit log entries? This action cannot be undone."
                    confirmLabel="Run Cleanup"
                    destructive
                    onConfirm={handleCleanup}
                    onCancel={() => setShowCleanupModal(false)}
                    loading={actionLoading}
                />
            )}
        </div>
    )
}
