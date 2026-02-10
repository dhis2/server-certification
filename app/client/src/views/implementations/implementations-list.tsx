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
    InputField,
    NoticeBox,
    Pagination,
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    ButtonStrip,
} from '@dhis2/ui'
import { useState, useMemo, useCallback } from 'react'
import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heading, ConfirmationModal } from '../../components/index.ts'
import { useImplementations } from '../../hooks/index.ts'
import type { Implementation, CreateImplementationDto } from '../../types/index.ts'
import { ImplementationForm } from './implementation-form.tsx'
import styles from './implementations-list.module.css'

const PAGE_SIZE = 10

export const ImplementationsList: FC = () => {
    const navigate = useNavigate()
    const { implementations, loading, error, createImplementation, deleteImplementation, refetch } = useImplementations()

    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Implementation | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [actionError, setActionError] = useState('')

    const filteredImplementations = useMemo(() => {
        if (!searchTerm.trim()) {
            return implementations
        }
        const term = searchTerm.toLowerCase()
        return implementations.filter(
            (impl) => impl.name.toLowerCase().includes(term) || impl.country?.toLowerCase().includes(term) || impl.contactEmail?.toLowerCase().includes(term)
        )
    }, [implementations, searchTerm])

    const totalPages = Math.ceil(filteredImplementations.length / PAGE_SIZE)
    const paginatedImplementations = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE
        return filteredImplementations.slice(start, start + PAGE_SIZE)
    }, [filteredImplementations, currentPage])

    const handleCreate = useCallback(
        async (data: CreateImplementationDto) => {
            setIsSubmitting(true)
            setActionError('')
            try {
                await createImplementation(data)
                setShowCreateModal(false)
            } catch (err) {
                setActionError(err instanceof Error ? err.message : 'Failed to create implementation')
            } finally {
                setIsSubmitting(false)
            }
        },
        [createImplementation]
    )

    const handleDelete = useCallback(async () => {
        if (!deleteTarget) {
            return
        }
        setIsSubmitting(true)
        setActionError('')
        try {
            await deleteImplementation(deleteTarget.id)
            setDeleteTarget(null)
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to delete implementation')
        } finally {
            setIsSubmitting(false)
        }
    }, [deleteTarget, deleteImplementation])

    if (loading) {
        return (
            <div className={styles.container}>
                <Heading title="Implementations" />
                <div className={styles.loadingContainer}>
                    <CircularLoader />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={styles.container}>
                <Heading title="Implementations" />
                <NoticeBox error title="Error loading implementations">
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
            <Heading title="Implementations" />

            {actionError && (
                <NoticeBox error title="Error">
                    {actionError}
                </NoticeBox>
            )}

            <Card className={styles.card}>
                <div className={styles.toolbar}>
                    <div className={styles.searchWrapper}>
                        <InputField
                            placeholder="Search implementations..."
                            value={searchTerm}
                            onChange={(e: { value: string }) => {
                                setSearchTerm(e.value)
                                setCurrentPage(1)
                            }}
                            data-test="search-implementations"
                        />
                    </div>
                    <Button primary onClick={() => setShowCreateModal(true)} data-test="create-implementation">
                        Add Implementation
                    </Button>
                </div>

                {paginatedImplementations.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>{searchTerm ? 'No implementations match your search.' : 'No implementations yet.'}</p>
                        {!searchTerm && (
                            <Button small onClick={() => setShowCreateModal(true)}>
                                Create your first implementation
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <DataTable>
                            <DataTableHead>
                                <DataTableRow>
                                    <DataTableColumnHeader>Name</DataTableColumnHeader>
                                    <DataTableColumnHeader>Country</DataTableColumnHeader>
                                    <DataTableColumnHeader>Contact Email</DataTableColumnHeader>
                                    <DataTableColumnHeader>DHIS2 Instance</DataTableColumnHeader>
                                    <DataTableColumnHeader>Actions</DataTableColumnHeader>
                                </DataTableRow>
                            </DataTableHead>
                            <DataTableBody>
                                {paginatedImplementations.map((impl) => (
                                    <DataTableRow key={impl.id} data-test={`implementation-row-${impl.id}`}>
                                        <DataTableCell>
                                            <strong>{impl.name}</strong>
                                        </DataTableCell>
                                        <DataTableCell>{impl.country || '-'}</DataTableCell>
                                        <DataTableCell>{impl.contactEmail || '-'}</DataTableCell>
                                        <DataTableCell>
                                            {impl.dhis2InstanceUrl ? (
                                                <a
                                                    href={impl.dhis2InstanceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className={styles.instanceLink}
                                                >
                                                    {(() => {
                                                        try {
                                                            return new URL(impl.dhis2InstanceUrl).hostname
                                                        } catch {
                                                            return impl.dhis2InstanceUrl
                                                        }
                                                    })()}
                                                </a>
                                            ) : (
                                                '-'
                                            )}
                                        </DataTableCell>
                                        <DataTableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                            <ButtonStrip>
                                                <Button small onClick={() => navigate(`/implementations/${impl.id}`)} data-test={`view-impl-${impl.id}`}>
                                                    View
                                                </Button>
                                                <Button small destructive onClick={() => setDeleteTarget(impl)} data-test={`delete-impl-${impl.id}`}>
                                                    Delete
                                                </Button>
                                            </ButtonStrip>
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
                                    total={filteredImplementations.length}
                                    onPageChange={setCurrentPage}
                                    onPageSizeChange={() => {}}
                                />
                            </div>
                        )}
                    </>
                )}
            </Card>

            {showCreateModal && (
                <Modal onClose={() => setShowCreateModal(false)} position="middle">
                    <ModalTitle>Add Implementation</ModalTitle>
                    <ModalContent>
                        <ImplementationForm onSubmit={handleCreate} isSubmitting={isSubmitting} />
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip end>
                            <Button secondary onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </Button>
                            <Button primary type="submit" form="implementation-form" loading={isSubmitting} data-test="submit-implementation">
                                Create
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}

            <ConfirmationModal
                open={!!deleteTarget}
                title="Delete Implementation"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                destructive
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={isSubmitting}
            />
        </div>
    )
}
