import { Button, Card, CircularLoader, NoticeBox } from '@dhis2/ui'
import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Heading, ConfirmationModal } from '../../components/index.ts'
import { useAuthAxios } from '../../hooks/use-auth-axios.ts'
import { useCertificateActions } from '../../hooks/use-certificates.ts'
import type { CertificateEntry } from '../../hooks/use-certificates.ts'
import { formatDateTime, extractErrorMessage } from '../../utils/format.ts'
import styles from './certificate-detail.module.css'

export const CertificateDetail = () => {
    const { id } = useParams<{ id: string }>()

    const [certificate, setCertificate] = useState<CertificateEntry | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<CertificateEntry>({ url: id ? `/certificates/${id}` : '', method: 'GET' }, { manual: true })

    const { revokeCertificate, downloadCredential, loading: actionLoading } = useCertificateActions()

    const [showCredential, setShowCredential] = useState(false)
    const [revokeReason, setRevokeReason] = useState('')
    const [showRevokeModal, setShowRevokeModal] = useState(false)
    const [actionError, setActionError] = useState('')
    const [actionSuccess, setActionSuccess] = useState('')

    const refetch = useCallback(async () => {
        if (!id) {
            return
        }
        try {
            await execute({ url: `/certificates/${id}` })
        } catch {}
    }, [execute, id])

    useEffect(() => {
        if (id) {
            refetch()
        }
    }, [id, refetch])

    useEffect(() => {
        if (data) {
            setCertificate(data)
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

    const handleRevoke = useCallback(async () => {
        if (!id) {
            return
        }
        setActionError('')
        try {
            await revokeCertificate(id, revokeReason)
            setActionSuccess('Certificate revoked successfully')
            setShowRevokeModal(false)
            setRevokeReason('')
            await refetch()
        } catch (err) {
            setActionError(extractErrorMessage(err))
            setShowRevokeModal(false)
        }
    }, [id, revokeReason, revokeCertificate, refetch])

    const handleDownload = useCallback(async () => {
        if (!id || !certificate) {
            return
        }
        try {
            const credential = await downloadCredential(id)
            const blob = new Blob([JSON.stringify(credential, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `certificate-${certificate.certificateNumber}.json`
            a.click()
            URL.revokeObjectURL(url)
        } catch {}
    }, [id, certificate, downloadCredential])

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <CircularLoader />
            </div>
        )
    }

    if (error || !certificate) {
        return (
            <div className={styles.container}>
                <NoticeBox error title="Error">
                    {error?.message || 'Certificate not found'}
                </NoticeBox>
            </div>
        )
    }

    const isExpired = new Date(certificate.validUntil) < new Date()

    const getStatusBadge = () => {
        if (certificate.isRevoked) {
            return <span className={`${styles.badge} ${styles.badgeRevoked}`}>Revoked</span>
        }
        if (isExpired) {
            return <span className={`${styles.badge} ${styles.badgeExpired}`}>Expired</span>
        }
        return <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
    }

    const isRevoked = certificate.isRevoked

    return (
        <div className={styles.container}>
            <Link to="/admin/certificates" className={styles.backLink}>
                &larr; Back to Certificates
            </Link>

            <Heading title={`Certificate ${certificate.certificateNumber}`} />

            {actionSuccess && (
                <NoticeBox valid title="Success">
                    {actionSuccess}
                </NoticeBox>
            )}
            {actionError && (
                <NoticeBox error title="Error">
                    {actionError}
                </NoticeBox>
            )}

            <Card className={styles.card}>
                <h3>Certificate Information</h3>
                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Certificate Number</span>
                        <span className={styles.infoValue}>{certificate.certificateNumber}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Status</span>
                        <span className={styles.infoValue}>{getStatusBadge()}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Score</span>
                        <span className={styles.infoValue}>{Math.round(certificate.finalScore)}%</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Control Group</span>
                        <span className={styles.infoValue}>{certificate.controlGroup || '-'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Valid From</span>
                        <span className={styles.infoValue}>{formatDateTime(certificate.validFrom)}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Valid Until</span>
                        <span className={styles.infoValue}>{formatDateTime(certificate.validUntil)}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Verification Code</span>
                        <span className={styles.infoValue}>{certificate.verificationCode}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Issued At</span>
                        <span className={styles.infoValue}>{formatDateTime(certificate.issuedAt)}</span>
                    </div>
                </div>
            </Card>

            {certificate.integrity && (
                <Card className={styles.card}>
                    <h3>Integrity Status</h3>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Hash Chain</span>
                            <span className={styles.infoValue}>
                                <span className={`${styles.badge} ${certificate.integrity.hashValid ? styles.badgeValid : styles.badgeInvalid}`}>
                                    {certificate.integrity.hashValid ? 'Valid' : 'Invalid'}
                                </span>
                            </span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Signature</span>
                            <span className={styles.infoValue}>
                                <span className={`${styles.badge} ${certificate.integrity.signatureValid ? styles.badgeValid : styles.badgeInvalid}`}>
                                    {certificate.integrity.signatureValid ? 'Valid' : 'Invalid'}
                                </span>
                            </span>
                        </div>
                    </div>
                </Card>
            )}

            <Card className={styles.card}>
                <h3>W3C Verifiable Credential</h3>
                <Button small onClick={handleDownload} loading={actionLoading}>
                    Download VC JSON
                </Button>
                <div className={styles.credentialPreview}>
                    <button className={styles.credentialToggle} onClick={() => setShowCredential(!showCredential)}>
                        {showCredential ? '▼ Hide' : '▶ Show'} Credential JSON
                    </button>
                    {showCredential && certificate.credential && <pre className={styles.credentialJson}>{JSON.stringify(certificate.credential, null, 2)}</pre>}
                </div>
            </Card>

            {isRevoked ? (
                <Card className={styles.card}>
                    <h3>Revocation Information</h3>
                    <div className={styles.revocationInfo}>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Revoked At</span>
                                <span className={styles.infoValue}>{formatDateTime(certificate.revokedAt)}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Revoked By</span>
                                <span className={styles.infoValue}>{certificate.revokedBy || '-'}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Reason</span>
                                <span className={styles.infoValue}>{certificate.revocationReason || '-'}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card className={styles.card}>
                    <h3>Revoke Certificate</h3>
                    <div className={styles.revokeForm}>
                        <label>
                            <span style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--colors-grey700)', marginBottom: '4px' }}>
                                Reason for revocation ({revokeReason.trim().length}/10 characters)
                            </span>
                            <textarea value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} placeholder="Enter the reason for revoking this certificate..." />
                        </label>
                        <Button destructive onClick={() => setShowRevokeModal(true)} disabled={revokeReason.trim().length < 10}>
                            Revoke Certificate
                        </Button>
                    </div>
                </Card>
            )}

            {showRevokeModal && (
                <ConfirmationModal
                    title="Revoke Certificate"
                    message={`Are you sure you want to revoke certificate ${certificate.certificateNumber}? This action cannot be undone.`}
                    confirmLabel="Revoke"
                    destructive
                    onConfirm={handleRevoke}
                    onCancel={() => setShowRevokeModal(false)}
                    loading={actionLoading}
                />
            )}
        </div>
    )
}
