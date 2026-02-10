import {
    Button,
    Card,
    CircularLoader,
    DataTable,
    DataTableHead,
    DataTableBody,
    DataTableRow,
    DataTableCell,
    DataTableColumnHeader,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
    Pagination,
} from '@dhis2/ui'
import { useState, useMemo, useCallback } from 'react'
import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heading, ConfirmationModal, StatusBadge, CGBadge } from '../../components/index.ts'
import { useSubmissions } from '../../hooks/index.ts'
import { SubmissionStatus, type Submission } from '../../types/index.ts'
import styles from './assessments-list.module.css'

const PAGE_SIZE = 10

const statusOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: SubmissionStatus.DRAFT, label: 'Draft' },
    { value: SubmissionStatus.IN_PROGRESS, label: 'In Progress' },
    { value: SubmissionStatus.COMPLETED, label: 'Completed' },
    { value: SubmissionStatus.PASSED, label: 'Passed' },
    { value: SubmissionStatus.FAILED, label: 'Failed' },
    { value: SubmissionStatus.WITHDRAWN, label: 'Withdrawn' },
]

export const AssessmentsList: FC = () => {
    const navigate = useNavigate()
    const [statusFilter, setStatusFilter] = useState<SubmissionStatus | undefined>(undefined)
    const [currentPage, setCurrentPage] = useState(1)
    const [deleteTarget, setDeleteTarget] = useState<Submission | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const { submissions, loading, error, deleteSubmission, refetch } = useSubmissions({
        status: statusFilter,
    })

    const totalPages = Math.ceil(submissions.length / PAGE_SIZE)
    const paginatedSubmissions = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return submissions.slice(start, start + PAGE_SIZE)
    }, [submissions, currentPage])

    const handleDelete = useCallback(async () => {
        if (!deleteTarget) {
            return
        }
        setIsDeleting(true)
        try {
            await deleteSubmission(deleteTarget.id)
            setDeleteTarget(null)
        } finally {
            setIsDeleting(false)
        }
    }, [deleteTarget, deleteSubmission])

    const handleRowClick = useCallback(
        (submission: Submission) => {
            const path =
                submission.status === SubmissionStatus.PASSED || submission.status === SubmissionStatus.FAILED
                    ? `/assessments/${submission.id}/certificate`
                    : `/assessments/${submission.id}`
            navigate(path)
        },
        [navigate]
    )

    const canDelete = (submission: Submission) => submission.status === SubmissionStatus.DRAFT

    if (loading) {
        return (
            <div className={styles.container}>
                <Heading title="Assessments" />
                <div className={styles.loadingContainer}>
                    <CircularLoader />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={styles.container}>
                <Heading title="Assessments" />
                <NoticeBox error title="Error loading assessments">
                    {error.message}
                    <Button small secondary onClick={refetch}>
                        Retry
                    </Button>
                </NoticeBox>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <Heading title="Assessments" />

            <Card className={styles.card}>
                <div className={styles.toolbar}>
                    <div className={styles.filters}>
                        <SingleSelectField
                            label="Status"
                            selected={statusFilter || ''}
                            onChange={(e: { selected: string }) => {
                                setStatusFilter(e.selected ? (e.selected as SubmissionStatus) : undefined)
                                setCurrentPage(1)
                            }}
                            className={styles.statusFilter}
                            data-test="status-filter"
                        >
                            {statusOptions.map((option) => (
                                <SingleSelectOption key={option.value} value={option.value} label={option.label} />
                            ))}
                        </SingleSelectField>
                    </div>
                    <Button primary onClick={() => navigate('/assessments/new')} data-test="new-assessment">
                        New Assessment
                    </Button>
                </div>

                {paginatedSubmissions.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>{statusFilter ? 'No assessments match your filter.' : 'No assessments yet.'}</p>
                        {!statusFilter && (
                            <Button small onClick={() => navigate('/assessments/new')}>
                                Start your first assessment
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <DataTable>
                            <DataTableHead>
                                <DataTableRow>
                                    <DataTableColumnHeader>Implementation</DataTableColumnHeader>
                                    <DataTableColumnHeader>Template</DataTableColumnHeader>
                                    <DataTableColumnHeader>Target CG</DataTableColumnHeader>
                                    <DataTableColumnHeader>Status</DataTableColumnHeader>
                                    <DataTableColumnHeader>Score</DataTableColumnHeader>
                                    <DataTableColumnHeader>Created</DataTableColumnHeader>
                                    <DataTableColumnHeader>Actions</DataTableColumnHeader>
                                </DataTableRow>
                            </DataTableHead>
                            <DataTableBody>
                                {paginatedSubmissions.map((submission) => (
                                    <DataTableRow key={submission.id} data-test={`assessment-row-${submission.id}`}>
                                        <DataTableCell>
                                            <strong>{submission.implementation?.name || 'Unknown'}</strong>
                                        </DataTableCell>
                                        <DataTableCell>{submission.template?.name || 'Unknown Template'}</DataTableCell>
                                        <DataTableCell>
                                            <CGBadge cg={submission.targetControlGroup} />
                                        </DataTableCell>
                                        <DataTableCell>
                                            <StatusBadge status={submission.status} />
                                        </DataTableCell>
                                        <DataTableCell>
                                            {submission.totalScore !== undefined && submission.totalScore !== null ? `${Math.round(submission.totalScore)}%` : '-'}
                                        </DataTableCell>
                                        <DataTableCell>{new Date(submission.createdAt).toLocaleDateString()}</DataTableCell>
                                        <DataTableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                            <div className={styles.actions}>
                                                <Button small onClick={() => handleRowClick(submission)} data-test={`view-assessment-${submission.id}`}>
                                                    {submission.status === SubmissionStatus.DRAFT || submission.status === SubmissionStatus.IN_PROGRESS ? 'Continue' : 'View'}
                                                </Button>
                                                {canDelete(submission) && (
                                                    <Button small destructive onClick={() => setDeleteTarget(submission)} data-test={`delete-assessment-${submission.id}`}>
                                                        Delete
                                                    </Button>
                                                )}
                                            </div>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))}
                            </DataTableBody>
                        </DataTable>

                        {totalPages > 1 && (
                            <div className={styles.pagination}>
                                <Pagination
                                    page={currentPage}
                                    pageCount={totalPages}
                                    pageSize={PAGE_SIZE}
                                    total={submissions.length}
                                    onPageChange={setCurrentPage}
                                    onPageSizeChange={() => {}}
                                />
                            </div>
                        )}
                    </>
                )}
            </Card>

            <ConfirmationModal
                open={!!deleteTarget}
                title="Delete Assessment"
                message="Are you sure you want to delete this draft assessment? This action cannot be undone."
                confirmLabel="Delete"
                destructive
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={isDeleting}
            />
        </div>
    )
}
