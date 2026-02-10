import { Card, CircularLoader, NoticeBox } from '@dhis2/ui'
import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Heading } from '../../components/index.ts'
import { useAuthAxios } from '../../hooks/use-auth-axios.ts'
import type { AuditLogEntry } from '../../types/audit.ts'
import { formatDateTime, extractErrorMessage } from '../../utils/format.ts'
import styles from './audit-log-detail.module.css'

export const AuditLogDetail = () => {
    const { id } = useParams<{ id: string }>()

    const [entry, setEntry] = useState<AuditLogEntry | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<AuditLogEntry>({ url: id ? `/audit/${id}` : '', method: 'GET' }, { manual: true })

    const refetch = useCallback(async () => {
        if (!id) {
            return
        }
        try {
            await execute({ url: `/audit/${id}` })
        } catch {}
    }, [execute, id])

    useEffect(() => {
        if (id) {
            refetch()
        }
    }, [id, refetch])

    useEffect(() => {
        if (data) {
            setEntry(data)
        }
    }, [data])

    useEffect(() => {
        setLoading(fetchLoading)
    }, [fetchLoading])

    useEffect(() => {
        if (fetchError) {
            setError(new Error(extractErrorMessage(fetchError)))
        } else {
            setError(null)
        }
    }, [fetchError])

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <CircularLoader />
            </div>
        )
    }

    if (error || !entry) {
        return (
            <div className={styles.container}>
                <NoticeBox error title="Error">
                    {error?.message || 'Audit log entry not found'}
                </NoticeBox>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <Link to="/admin/audit" className={styles.backLink}>
                &larr; Back to Audit Logs
            </Link>

            <Heading title="Audit Log Entry" />

            <Card className={styles.card}>
                <h3>Entry Details</h3>
                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>ID</span>
                        <span className={styles.infoValue}>{entry.id}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Timestamp</span>
                        <span className={styles.infoValue}>{formatDateTime(entry.createdAt)}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Event Type</span>
                        <span className={styles.infoValue}>{entry.eventType}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Entity Type</span>
                        <span className={styles.infoValue}>{entry.entityType}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Entity ID</span>
                        <span className={styles.infoValue}>{entry.entityId || '-'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Action</span>
                        <span className={styles.infoValue}>{entry.action}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Actor</span>
                        <span className={styles.infoValue}>{entry.actor?.email || '-'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>IP Address</span>
                        <span className={styles.infoValue}>{entry.actorIp || '-'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>User Agent</span>
                        <span className={styles.infoValue}>{entry.actorUserAgent || '-'}</span>
                    </div>
                </div>
            </Card>

            {(entry.oldValues || entry.newValues) && (
                <Card className={styles.card}>
                    <h3>Data Changes</h3>
                    <div className={styles.diffContainer}>
                        {entry.oldValues && (
                            <div className={styles.diffPane}>
                                <span className={styles.diffLabel}>Old Values</span>
                                <pre className={`${styles.diffContent} ${styles.diffOld}`}>{JSON.stringify(entry.oldValues, null, 2)}</pre>
                            </div>
                        )}
                        {entry.newValues && (
                            <div className={styles.diffPane}>
                                <span className={styles.diffLabel}>New Values</span>
                                <pre className={`${styles.diffContent} ${styles.diffNew}`}>{JSON.stringify(entry.newValues, null, 2)}</pre>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            <Card className={styles.card}>
                <h3>Integrity Information</h3>
                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Current Hash</span>
                        <div className={styles.hashDisplay}>{entry.currHash}</div>
                    </div>
                    {entry.prevHash && (
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Previous Hash</span>
                            <div className={styles.hashDisplay}>{entry.prevHash}</div>
                        </div>
                    )}
                    {entry.signature && (
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Signature</span>
                            <div className={styles.hashDisplay}>{entry.signature}</div>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
