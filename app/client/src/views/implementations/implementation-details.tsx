import { Button, Card, CircularLoader, NoticeBox, ButtonStrip, DataTable, DataTableHead, DataTableBody, DataTableRow, DataTableCell, DataTableColumnHeader, Tag } from '@dhis2/ui'
import { useState, useCallback } from 'react'
import type { FC } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Heading, ConfirmationModal, StatusBadge, CGBadge } from '../../components/index.ts'
import { useImplementation, useImplementations, useSubmissions } from '../../hooks/index.ts'
import type { CreateImplementationDto } from '../../types/index.ts'
import styles from './implementation-details.module.css'
import { ImplementationForm } from './implementation-form.tsx'

export const ImplementationDetails: FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const { implementation, loading, error, refetch } = useImplementation(id)
    const { updateImplementation, deleteImplementation } = useImplementations()
    const { submissions } = useSubmissions({ implementationId: id })

    const [isEditing, setIsEditing] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [actionError, setActionError] = useState('')

    const handleUpdate = useCallback(
        async (data: CreateImplementationDto) => {
            if (!id) {
                return
            }
            setIsSubmitting(true)
            setActionError('')
            try {
                await updateImplementation(id, data)
                setIsEditing(false)
                refetch()
            } catch (err) {
                setActionError(err instanceof Error ? err.message : 'Failed to update implementation')
            } finally {
                setIsSubmitting(false)
            }
        },
        [id, updateImplementation, refetch]
    )

    const handleDelete = useCallback(async () => {
        if (!id) {
            return
        }
        setIsSubmitting(true)
        setActionError('')
        try {
            await deleteImplementation(id)
            navigate('/implementations')
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to delete implementation')
        } finally {
            setIsSubmitting(false)
        }
    }, [id, deleteImplementation, navigate])

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <CircularLoader />
                </div>
            </div>
        )
    }

    if (error || !implementation) {
        return (
            <div className={styles.container}>
                <Heading title="Implementation Not Found" />
                <NoticeBox error title="Error">
                    {error?.message || 'Implementation not found'}
                    <Button small secondary onClick={() => navigate('/implementations')}>
                        Back to Implementations
                    </Button>
                </NoticeBox>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Button small secondary onClick={() => navigate('/implementations')}>
                        ← Back
                    </Button>
                    <Heading title={implementation.name} />
                </div>
                <ButtonStrip>
                    {!isEditing && (
                        <>
                            <Button onClick={() => setIsEditing(true)} data-test="edit-implementation">
                                Edit
                            </Button>
                            <Button destructive onClick={() => setShowDeleteConfirm(true)} data-test="delete-implementation">
                                Delete
                            </Button>
                            <Button primary onClick={() => navigate(`/assessments/new?implementationId=${id}`)} data-test="new-assessment">
                                New Assessment
                            </Button>
                        </>
                    )}
                </ButtonStrip>
            </div>

            {actionError && (
                <NoticeBox error title="Error">
                    {actionError}
                </NoticeBox>
            )}

            <div className={styles.content}>
                <Card className={styles.detailsCard}>
                    <h3 className={styles.cardTitle}>Implementation Details</h3>

                    {isEditing ? (
                        <>
                            <ImplementationForm initialData={implementation} onSubmit={handleUpdate} isSubmitting={isSubmitting} />
                            <div className={styles.formActions}>
                                <ButtonStrip end>
                                    <Button secondary onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </Button>
                                    <Button primary type="submit" form="implementation-form" loading={isSubmitting} data-test="save-implementation">
                                        Save Changes
                                    </Button>
                                </ButtonStrip>
                            </div>
                        </>
                    ) : (
                        <div className={styles.detailsGrid}>
                            <DetailRow label="Name" value={implementation.name} />
                            <DetailRow label="Country" value={implementation.country} />
                            <DetailRow label="Contact Email" value={implementation.contactEmail} />
                            <DetailRow label="Contact Phone" value={implementation.contactPhone} />
                            <DetailRow
                                label="DHIS2 Instance"
                                value={
                                    implementation.dhis2InstanceUrl ? (
                                        <a href={implementation.dhis2InstanceUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                            {implementation.dhis2InstanceUrl}
                                        </a>
                                    ) : undefined
                                }
                            />
                            <DetailRow label="DHIS2 Version" value={implementation.dhis2Version} />
                            <DetailRow label="Description" value={implementation.description} fullWidth />
                            <DetailRow
                                label="Status"
                                value={
                                    <Tag className={implementation.isActive !== false ? styles.activeTag : styles.inactiveTag}>
                                        {implementation.isActive !== false ? 'Active' : 'Inactive'}
                                    </Tag>
                                }
                            />
                            <DetailRow label="Created" value={implementation.createdAt ? new Date(implementation.createdAt).toLocaleDateString() : undefined} />
                        </div>
                    )}
                </Card>

                <Card className={styles.assessmentsCard}>
                    <div className={styles.assessmentsHeader}>
                        <h3 className={styles.cardTitle}>Assessments</h3>
                        <Button small primary onClick={() => navigate(`/assessments/new?implementationId=${id}`)}>
                            New Assessment
                        </Button>
                    </div>

                    {submissions.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No assessments yet for this implementation.</p>
                        </div>
                    ) : (
                        <DataTable>
                            <DataTableHead>
                                <DataTableRow>
                                    <DataTableColumnHeader>Template</DataTableColumnHeader>
                                    <DataTableColumnHeader>Target CG</DataTableColumnHeader>
                                    <DataTableColumnHeader>Status</DataTableColumnHeader>
                                    <DataTableColumnHeader>Date</DataTableColumnHeader>
                                    <DataTableColumnHeader>Actions</DataTableColumnHeader>
                                </DataTableRow>
                            </DataTableHead>
                            <DataTableBody>
                                {submissions.map((submission) => (
                                    <DataTableRow key={submission.id} data-test={`assessment-row-${submission.id}`}>
                                        <DataTableCell>{submission.template?.name || 'Unknown Template'}</DataTableCell>
                                        <DataTableCell>
                                            <CGBadge cg={submission.targetControlGroup} />
                                        </DataTableCell>
                                        <DataTableCell>
                                            <StatusBadge status={submission.status} />
                                        </DataTableCell>
                                        <DataTableCell>{new Date(submission.createdAt).toLocaleDateString()}</DataTableCell>
                                        <DataTableCell>
                                            <Button small onClick={() => navigate(`/assessments/${submission.id}`)}>
                                                View
                                            </Button>
                                        </DataTableCell>
                                    </DataTableRow>
                                ))}
                            </DataTableBody>
                        </DataTable>
                    )}
                </Card>
            </div>

            <ConfirmationModal
                open={showDeleteConfirm}
                title="Delete Implementation"
                message={`Are you sure you want to delete "${implementation?.name}"? This will also affect any related assessments.`}
                confirmLabel="Delete"
                destructive
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
                loading={isSubmitting}
            />
        </div>
    )
}

interface DetailRowProps {
    label: string
    value: React.ReactNode | undefined
    fullWidth?: boolean
}

const DetailRow: FC<DetailRowProps> = ({ label, value, fullWidth }) => (
    <div className={`${styles.detailRow} ${fullWidth ? styles.fullWidth : ''}`}>
        <span className={styles.detailLabel}>{label}</span>
        <span className={styles.detailValue}>{value || '-'}</span>
    </div>
)
