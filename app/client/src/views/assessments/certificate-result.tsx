import { Button, Card, CircularLoader, NoticeBox, ButtonStrip, DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableCell, DataTableColumnHeader } from '@dhis2/ui'
import type { FC } from 'react'
import { useCallback, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { Heading, ConfirmationModal, PassFailIndicator, CGBadge } from '../../components/index.ts'
import { useAssessment, useCertificate } from '../../hooks/index.ts'
import { SubmissionStatus, CertificationResult, complianceStatusConfig } from '../../types/index.ts'
import styles from './certificate-result.module.css'

export const CertificateResult: FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const { submission, summary, loading, error, resume } = useAssessment(id)
    const { certificate, loading: certLoading } = useCertificate(id)

    const [showResumeConfirm, setShowResumeConfirm] = useState(false)
    const [isResuming, setIsResuming] = useState(false)

    const handleResume = useCallback(async () => {
        setIsResuming(true)
        try {
            await resume()
            navigate(`/assessments/${id}`)
        } finally {
            setIsResuming(false)
            setShowResumeConfirm(false)
        }
    }, [resume, navigate, id])

    const handleDownloadCertificate = useCallback(() => {
        if (!certificate?.vcJson) {
            console.error('No certificate data available')
            return
        }

        const blob = new Blob([JSON.stringify(certificate.vcJson, null, 2)], {
            type: 'application/ld+json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `DHIS2-Certificate-${certificate.certificateNumber}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }, [certificate])

    if (loading || certLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <CircularLoader />
                </div>
            </div>
        )
    }

    if (error || !submission) {
        return (
            <div className={styles.container}>
                <Heading title="Certificate Result" />
                <NoticeBox error title="Error">
                    {error?.message || 'Failed to load certificate'}
                    <Button small secondary onClick={() => navigate('/assessments')}>
                        Back to Assessments
                    </Button>
                </NoticeBox>
            </div>
        )
    }

    const isPassed = submission.status === SubmissionStatus.PASSED
    const isFailed = submission.status === SubmissionStatus.FAILED

    if (!isPassed && !isFailed) {
        return <Navigate to={`/assessments/${id}/summary`} replace />
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Button small secondary onClick={() => navigate('/assessments')}>
                    ← Back to Assessments
                </Button>
            </div>

            <div className={styles.resultSection}>
                <PassFailIndicator
                    result={isPassed ? CertificationResult.PASS : CertificationResult.FAIL}
                    targetCG={submission.targetControlGroup}
                    data-test="certification-result"
                />
            </div>

            {isPassed && (
                <Card className={styles.certificateCard}>
                    <div className={styles.certificateHeader}>
                        <div className={styles.certificateIcon}></div>
                        <h2 className={styles.certificateTitle}>DHIS2 Server Certification</h2>
                    </div>

                    <div className={styles.certificateDetails}>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Certificate Number</span>
                            <span className={styles.detailValue}>
                                {certificate?.certificateNumber || submission.certificateNumber || `CERT-${submission.id.slice(0, 8).toUpperCase()}`}
                            </span>
                        </div>
                        {certificate?.verificationCode && (
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Verification Code</span>
                                <span className={styles.detailValue}>
                                    <code>{certificate.verificationCode}</code>
                                </span>
                            </div>
                        )}
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Implementation</span>
                            <span className={styles.detailValue}>{certificate?.implementation?.name || submission.implementation?.name}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>DHIS2 Instance</span>
                            <span className={styles.detailValue}>{submission.implementation?.dhis2InstanceUrl || '-'}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Control Group</span>
                            <CGBadge cg={certificate?.controlGroup || submission.targetControlGroup} showDescription />
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Overall Score</span>
                            <span className={styles.detailValue}>{Math.round(certificate?.finalScore || submission.totalScore || 0)}%</span>
                        </div>
                        {certificate && (
                            <>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Valid From</span>
                                    <span className={styles.detailValue}>{new Date(certificate.validFrom).toLocaleDateString()}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Valid Until</span>
                                    <span className={styles.detailValue}>{new Date(certificate.validUntil).toLocaleDateString()}</span>
                                </div>
                            </>
                        )}
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Issued Date</span>
                            <span className={styles.detailValue}>
                                {certificate?.issuedAt
                                    ? new Date(certificate.issuedAt).toLocaleDateString()
                                    : submission.finalizedAt
                                      ? new Date(submission.finalizedAt).toLocaleDateString()
                                      : '-'}
                            </span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Assessor</span>
                            <span className={styles.detailValue}>{submission.assessorName || '-'}</span>
                        </div>
                    </div>

                    <div className={styles.certificateActions}>
                        <ButtonStrip>
                            <Button primary onClick={handleDownloadCertificate} disabled={!certificate} data-test="download-certificate">
                                Download Certificate (JSON-LD)
                            </Button>
                            <Button onClick={() => window.print()}>Print</Button>
                        </ButtonStrip>

                        {certificate?.verificationCode && (
                            <div className={styles.verificationSection}>
                                <p className={styles.verificationLabel}>Verify this certificate:</p>
                                <code className={styles.verificationUrl}>
                                    {window.location.origin}/verify/{certificate.verificationCode}
                                </code>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {isFailed && summary && (
                <>
                    <Card className={styles.failedCard}>
                        <h2 className={styles.failedTitle}>Remediation Required</h2>
                        <p className={styles.failedDescription}>
                            The following controls must be addressed before certification can be achieved. You can resume this assessment after implementing the necessary changes.
                        </p>

                        <DataTable>
                            <DataTableHead>
                                <DataTableRow>
                                    <DataTableColumnHeader>Code</DataTableColumnHeader>
                                    <DataTableColumnHeader>Control</DataTableColumnHeader>
                                    <DataTableColumnHeader>Control Group</DataTableColumnHeader>
                                    <DataTableColumnHeader>Status</DataTableColumnHeader>
                                </DataTableRow>
                            </DataTableHead>
                            <DataTableBody>
                                {summary.nonCompliantControls
                                    .filter((c) => c.isBlocker)
                                    .map((control) => (
                                        <DataTableRow key={control.code}>
                                            <DataTableCell>
                                                <code className={styles.controlCode}>{control.code}</code>
                                            </DataTableCell>
                                            <DataTableCell>{control.name}</DataTableCell>
                                            <DataTableCell>{control.controlGroup}</DataTableCell>
                                            <DataTableCell>
                                                <span className={styles[complianceStatusConfig[control.complianceStatus].color]}>
                                                    {complianceStatusConfig[control.complianceStatus].label}
                                                </span>
                                            </DataTableCell>
                                        </DataTableRow>
                                    ))}
                            </DataTableBody>
                        </DataTable>
                    </Card>

                    <div className={styles.nextSteps}>
                        <h3>Next Steps</h3>
                        <ol className={styles.stepsList}>
                            <li>Review each non-compliant control and understand the requirements</li>
                            <li>Implement the necessary security measures on your DHIS2 server</li>
                            <li>Collect evidence of compliance for each control</li>
                            <li>Resume this assessment to re-evaluate the controls</li>
                        </ol>
                        <Button primary onClick={() => setShowResumeConfirm(true)} data-test="resume-assessment">
                            Resume Assessment
                        </Button>
                    </div>
                </>
            )}

            {submission.assessorNotes && (
                <Card className={styles.notesCard}>
                    <h3 className={styles.notesTitle}>Assessor Notes</h3>
                    <p className={styles.notesContent}>{submission.assessorNotes}</p>
                </Card>
            )}

            <ConfirmationModal
                open={showResumeConfirm}
                title="Resume Assessment"
                message="This will reopen the assessment so you can update the control evaluations. The previous results will be preserved."
                confirmLabel="Resume"
                onConfirm={handleResume}
                onCancel={() => setShowResumeConfirm(false)}
                loading={isResuming}
            />
        </div>
    )
}
