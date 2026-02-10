import {
    Button,
    Card,
    CircularLoader,
    NoticeBox,
    ButtonStrip,
    DataTable,
    DataTableHead,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableColumnHeader,
    TextAreaField,
} from '@dhis2/ui'
import { useState, useCallback, useMemo } from 'react'
import type { FC } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heading, ConfirmationModal, ScoreGauge, CategoryScoreCard, ProgressBar, MultiProgressBar, CGBadge, StatusBadge } from '../../components/index.ts'
import { useAssessment } from '../../hooks/index.ts'
import { SubmissionStatus, ComplianceStatus, complianceStatusConfig } from '../../types/index.ts'
import styles from './assessment-summary.module.css'

export const AssessmentSummary: FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const { submission, summary, loading, error, finalize, withdraw } = useAssessment(id)

    const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false)
    const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
    const [assessorNotes, setAssessorNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [actionError, setActionError] = useState('')

    const complianceDistribution = useMemo(() => {
        if (!submission?.responses) {
            return null
        }

        const distribution = {
            compliant: 0,
            partiallyCompliant: 0,
            nonCompliant: 0,
            notApplicable: 0,
            notTested: 0,
        }

        submission.responses.forEach((r) => {
            switch (r.complianceStatus) {
                case ComplianceStatus.COMPLIANT:
                    distribution.compliant++
                    break
                case ComplianceStatus.PARTIALLY_COMPLIANT:
                    distribution.partiallyCompliant++
                    break
                case ComplianceStatus.NON_COMPLIANT:
                    distribution.nonCompliant++
                    break
                case ComplianceStatus.NOT_APPLICABLE:
                    distribution.notApplicable++
                    break
                case ComplianceStatus.NOT_TESTED:
                    distribution.notTested++
                    break
            }
        })

        return distribution
    }, [submission?.responses])

    const canFinalize = submission?.status === SubmissionStatus.COMPLETED && summary?.completionRate === 100

    const canWithdraw = submission?.status === SubmissionStatus.DRAFT || submission?.status === SubmissionStatus.IN_PROGRESS || submission?.status === SubmissionStatus.COMPLETED

    const handleFinalize = useCallback(async () => {
        setIsSubmitting(true)
        setActionError('')
        try {
            await finalize({ assessorNotes })
            navigate(`/assessments/${id}/certificate`)
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to finalize assessment')
        } finally {
            setIsSubmitting(false)
            setShowFinalizeConfirm(false)
        }
    }, [finalize, assessorNotes, navigate, id])

    const handleWithdraw = useCallback(async () => {
        setIsSubmitting(true)
        setActionError('')
        try {
            await withdraw()
            navigate('/assessments')
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to withdraw assessment')
        } finally {
            setIsSubmitting(false)
            setShowWithdrawConfirm(false)
        }
    }, [withdraw, navigate])

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <CircularLoader />
                </div>
            </div>
        )
    }

    if (error || !submission || !summary) {
        return (
            <div className={styles.container}>
                <Heading title="Assessment Summary" />
                <NoticeBox error title="Error">
                    {error?.message || 'Failed to load assessment summary'}
                    <Button small secondary onClick={() => navigate('/assessments')}>
                        Back to Assessments
                    </Button>
                </NoticeBox>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Button small secondary onClick={() => navigate(`/assessments/${id}`)}>
                        ← Back to Assessment
                    </Button>
                    <Heading title="Assessment Summary" />
                </div>
                <ButtonStrip>
                    {canWithdraw && (
                        <Button destructive onClick={() => setShowWithdrawConfirm(true)}>
                            Withdraw Assessment
                        </Button>
                    )}
                    {canFinalize && (
                        <Button primary onClick={() => setShowFinalizeConfirm(true)} data-test="finalize-assessment">
                            Finalize & Certify
                        </Button>
                    )}
                </ButtonStrip>
            </div>

            {actionError && (
                <NoticeBox error title="Error">
                    {actionError}
                </NoticeBox>
            )}

            <Card className={styles.infoCard}>
                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Implementation</span>
                        <span className={styles.infoValue}>{submission.implementation?.name}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Template</span>
                        <span className={styles.infoValue}>{submission.template?.name}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Target CG</span>
                        <CGBadge cg={submission.targetControlGroup} />
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Status</span>
                        <StatusBadge status={submission.status} />
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Assessor</span>
                        <span className={styles.infoValue}>{submission.assessorName || '-'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Date</span>
                        <span className={styles.infoValue}>{submission.assessmentDate ? new Date(submission.assessmentDate).toLocaleDateString() : '-'}</span>
                    </div>
                </div>
            </Card>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Completion Status</h2>
                <Card className={styles.completionCard}>
                    <ProgressBar
                        current={Math.round(summary.completionRate)}
                        total={100}
                        label="Controls Assessed"
                        showPercentage
                        variant={summary.completionRate === 100 ? 'success' : 'default'}
                    />

                    {complianceDistribution && (
                        <div className={styles.distributionSection}>
                            <h4>Compliance Distribution</h4>
                            <MultiProgressBar
                                segments={[
                                    {
                                        value: complianceDistribution.compliant,
                                        color: 'green',
                                        label: 'Compliant',
                                    },
                                    {
                                        value: complianceDistribution.partiallyCompliant,
                                        color: 'yellow',
                                        label: 'Partially Compliant',
                                    },
                                    {
                                        value: complianceDistribution.nonCompliant,
                                        color: 'red',
                                        label: 'Non-Compliant',
                                    },
                                    {
                                        value: complianceDistribution.notApplicable + complianceDistribution.notTested,
                                        color: 'grey',
                                        label: 'N/A or Not Tested',
                                    },
                                ]}
                                total={submission.responses.length}
                            />
                        </div>
                    )}
                </Card>
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Score Overview</h2>
                <div className={styles.scoreGrid}>
                    <Card className={styles.overallScoreCard}>
                        <ScoreGauge score={summary.overallScore} label="Overall Score" status={summary.certificationResult} size="large" />
                        <div className={styles.certificationPreview}>
                            <h4>Certification Preview</h4>
                            <div className={`${styles.resultPreview} ${summary.passesTargetCG ? styles.passPreview : styles.failPreview}`}>
                                <span className={styles.resultLabel}>{summary.passesTargetCG ? 'WILL PASS' : 'WILL FAIL'}</span>
                                <span className={styles.resultDescription}>
                                    {summary.passesTargetCG
                                        ? `All required ${submission.targetControlGroup} controls are compliant`
                                        : `Some ${submission.targetControlGroup} controls are non-compliant`}
                                </span>
                            </div>
                        </div>
                    </Card>

                    <div className={styles.categoryScores}>
                        {(summary.categoryScores ?? []).map((cs) => (
                            <CategoryScoreCard key={cs.categoryId} categoryName={cs.categoryName} score={cs.score} completionRate={cs.completionRate} />
                        ))}
                    </div>
                </div>
            </div>

            {(summary.nonCompliantControls ?? []).length > 0 && (
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Non-Compliant Controls ({(summary.nonCompliantControls ?? []).length})</h2>
                    <Card className={styles.nonCompliantCard}>
                        <DataTable>
                            <DataTableHead>
                                <DataTableRow>
                                    <DataTableColumnHeader>Code</DataTableColumnHeader>
                                    <DataTableColumnHeader>Control</DataTableColumnHeader>
                                    <DataTableColumnHeader>CG</DataTableColumnHeader>
                                    <DataTableColumnHeader>Status</DataTableColumnHeader>
                                    <DataTableColumnHeader>Blocker?</DataTableColumnHeader>
                                </DataTableRow>
                            </DataTableHead>
                            <DataTableBody>
                                {(summary.nonCompliantControls ?? []).map((control) => (
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
                                        <DataTableCell>
                                            {control.isBlocker ? (
                                                <span className={styles.blockerYes}>Yes - Blocks Certification</span>
                                            ) : (
                                                <span className={styles.blockerNo}>No</span>
                                            )}
                                        </DataTableCell>
                                    </DataTableRow>
                                ))}
                            </DataTableBody>
                        </DataTable>
                    </Card>
                </div>
            )}

            {showFinalizeConfirm && (
                <ConfirmationModal
                    open={showFinalizeConfirm}
                    title="Finalize Assessment"
                    message={
                        <div className={styles.finalizeMessage}>
                            <p>
                                <strong>{summary.passesTargetCG ? 'This assessment will PASS certification.' : 'This assessment will FAIL certification.'}</strong>
                            </p>
                            <p>
                                Once finalized, the assessment cannot be modified.
                                {summary.passesTargetCG ? ' A certificate will be issued.' : ' You can resume the assessment later to address non-compliant controls.'}
                            </p>
                            <TextAreaField
                                label="Assessor Notes (optional)"
                                value={assessorNotes}
                                onChange={(e: { value: string }) => setAssessorNotes(e.value)}
                                rows={3}
                                placeholder="Add any final notes or observations..."
                            />
                        </div>
                    }
                    confirmLabel={summary.passesTargetCG ? 'Finalize & Issue Certificate' : 'Finalize'}
                    onConfirm={handleFinalize}
                    onCancel={() => setShowFinalizeConfirm(false)}
                    loading={isSubmitting}
                />
            )}

            <ConfirmationModal
                open={showWithdrawConfirm}
                title="Withdraw Assessment"
                message="Are you sure you want to withdraw this assessment? This action cannot be undone."
                confirmLabel="Withdraw"
                destructive
                onConfirm={handleWithdraw}
                onCancel={() => setShowWithdrawConfirm(false)}
                loading={isSubmitting}
            />
        </div>
    )
}
