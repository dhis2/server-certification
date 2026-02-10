import { Button, Card, CircularLoader, NoticeBox, ButtonStrip, Tag } from '@dhis2/ui'
import { useState, useCallback, useMemo, useEffect } from 'react'
import type { FC } from 'react'
import { useParams, useNavigate, useBlocker, Navigate } from 'react-router-dom'
import { Heading, ConfirmationModal, CategoryNav, ControlCard, ProgressBar, CGBadge, StatusBadge } from '../../components/index.ts'
import { useAssessment } from '../../hooks/index.ts'
import { SubmissionStatus, ComplianceStatus, type SaveSingleResponseDto, type Category, type Criterion, type SubmissionResponse } from '../../types/index.ts'
import styles from './assessment-form.module.css'

export const AssessmentForm: FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const { submission, loading, saving, error, pendingChanges, lastSaved, saveResponses, saveImmediately, complete } = useAssessment(id)

    const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
    const [isCompleting, setIsCompleting] = useState(false)
    const [completeError, setCompleteError] = useState('')

    const blocker = useBlocker(({ currentLocation, nextLocation }) => pendingChanges && currentLocation.pathname !== nextLocation.pathname)

    useEffect(() => {
        if (submission?.currentCategoryIndex !== undefined) {
            setCurrentCategoryIndex(submission.currentCategoryIndex)
        }
    }, [submission?.currentCategoryIndex])

    const categories: Category[] = useMemo(() => {
        return submission?.template?.categories || []
    }, [submission?.template?.categories])

    const currentCategory = categories[currentCategoryIndex]

    const getResponse = useCallback(
        (criterionId: string): SubmissionResponse | undefined => {
            return submission?.responses.find((r) => r.criterionId === criterionId)
        },
        [submission?.responses]
    )

    const completionStats = useMemo(() => {
        if (!submission || !categories.length) {
            return { total: 0, completed: 0, percentage: 0 }
        }

        const allCriteria = categories.flatMap((c) => c.criteria ?? [])
        const total = allCriteria.length
        const completed = submission.responses.filter((r) => r.complianceStatus !== ComplianceStatus.NOT_TESTED).length

        return {
            total,
            completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        }
    }, [submission, categories])

    const isAssessmentComplete = useMemo(() => {
        if (!submission || !categories.length) {
            return false
        }

        const allCriteria = categories.flatMap((c) => c.criteria ?? [])
        return allCriteria.every((criterion) => {
            const response = getResponse(criterion.id)
            return response && response.complianceStatus !== ComplianceStatus.NOT_TESTED
        })
    }, [submission, categories, getResponse])

    const handleResponseChange = useCallback(
        (response: SaveSingleResponseDto) => {
            saveResponses([response], currentCategoryIndex)
        },
        [saveResponses, currentCategoryIndex]
    )

    const handleCategoryChange = useCallback(
        async (newIndex: number) => {
            await saveImmediately()
            setCurrentCategoryIndex(newIndex)
        },
        [saveImmediately]
    )

    const handleComplete = useCallback(async () => {
        setIsCompleting(true)
        setCompleteError('')
        try {
            await complete()
            navigate(`/assessments/${id}/summary`)
        } catch (err) {
            setCompleteError(err instanceof Error ? err.message : 'Failed to complete assessment')
        } finally {
            setIsCompleting(false)
            setShowCompleteConfirm(false)
        }
    }, [complete, navigate, id])

    const handleBlockerProceed = useCallback(async () => {
        await saveImmediately()
        if (blocker.proceed) {
            blocker.proceed()
        }
    }, [saveImmediately, blocker])

    const isEditable = submission?.status === SubmissionStatus.DRAFT || submission?.status === SubmissionStatus.IN_PROGRESS

    if (loading) {
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
                <Heading title="Assessment Not Found" />
                <NoticeBox error title="Error">
                    {error?.message || 'Assessment not found'}
                    <Button small secondary onClick={() => navigate('/assessments')}>
                        Back to Assessments
                    </Button>
                </NoticeBox>
            </div>
        )
    }

    if (!isEditable) {
        return <Navigate to={`/assessments/${id}/summary`} replace />
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Button small secondary onClick={() => navigate('/assessments')}>
                        ← Back
                    </Button>
                    <div className={styles.headerInfo}>
                        <h1 className={styles.title}>{submission.implementation?.name}</h1>
                        <div className={styles.headerMeta}>
                            <StatusBadge status={submission.status} />
                            <CGBadge cg={submission.targetControlGroup} />
                            <span className={styles.templateName}>{submission.template?.name}</span>
                        </div>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.saveStatus}>
                        {saving ? (
                            <Tag>Saving...</Tag>
                        ) : pendingChanges ? (
                            <Tag className={styles.unsavedTag}>Unsaved changes</Tag>
                        ) : lastSaved ? (
                            <Tag className={styles.savedTag}>Saved {lastSaved.toLocaleTimeString()}</Tag>
                        ) : null}
                    </div>
                    <ButtonStrip>
                        <Button onClick={() => navigate(`/assessments/${id}/summary`)}>View Summary</Button>
                        <Button primary onClick={() => setShowCompleteConfirm(true)} disabled={!isAssessmentComplete} data-test="complete-assessment">
                            Complete Assessment
                        </Button>
                    </ButtonStrip>
                </div>
            </div>

            <Card className={styles.progressCard}>
                <ProgressBar current={completionStats.completed} total={completionStats.total} label="Overall Progress" />
            </Card>

            {completeError && (
                <NoticeBox error title="Error">
                    {completeError}
                </NoticeBox>
            )}

            <div className={styles.content}>
                <aside className={styles.sidebar}>
                    <CategoryNav
                        categories={categories}
                        currentIndex={currentCategoryIndex}
                        onSelect={handleCategoryChange}
                        responses={submission.responses}
                        data-test="category-nav"
                    />
                </aside>

                <main className={styles.main}>
                    {currentCategory && (
                        <>
                            <div className={styles.categoryHeader}>
                                <h2 className={styles.categoryTitle}>
                                    {currentCategoryIndex + 1}. {currentCategory.name}
                                </h2>
                                {currentCategory.description && <p className={styles.categoryDescription}>{currentCategory.description}</p>}
                                <span className={styles.categoryCount}>{currentCategory.criteria.length} controls</span>
                            </div>

                            <div className={styles.controlsList}>
                                {currentCategory.criteria.map((criterion: Criterion) => (
                                    <ControlCard
                                        key={criterion.id}
                                        criterion={criterion}
                                        response={getResponse(criterion.id)}
                                        onChange={handleResponseChange}
                                        disabled={!isEditable}
                                        data-test={`control-card-${criterion.code}`}
                                    />
                                ))}
                            </div>

                            <div className={styles.categoryNav}>
                                <Button secondary disabled={currentCategoryIndex === 0} onClick={() => handleCategoryChange(currentCategoryIndex - 1)} data-test="prev-category">
                                    ← Previous Category
                                </Button>
                                {currentCategoryIndex < categories.length - 1 ? (
                                    <Button primary onClick={() => handleCategoryChange(currentCategoryIndex + 1)} data-test="next-category">
                                        Next Category →
                                    </Button>
                                ) : (
                                    <Button primary onClick={() => navigate(`/assessments/${id}/summary`)} data-test="view-summary">
                                        View Summary →
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </main>
            </div>

            <ConfirmationModal
                open={showCompleteConfirm}
                title="Complete Assessment"
                message="Are you sure you want to mark this assessment as complete? You can still make changes before finalizing."
                confirmLabel="Complete"
                onConfirm={handleComplete}
                onCancel={() => setShowCompleteConfirm(false)}
                loading={isCompleting}
            />

            <ConfirmationModal
                open={blocker.state === 'blocked'}
                title="Unsaved Changes"
                message="You have unsaved changes. Would you like to save before leaving?"
                confirmLabel="Save & Leave"
                cancelLabel="Discard"
                onConfirm={handleBlockerProceed}
                onCancel={() => blocker.reset?.()}
            />
        </div>
    )
}
