import { Button, Card, CircularLoader, InputField, NoticeBox, SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import { useState, useCallback } from 'react'
import type { FC } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Heading, ConfirmationModal, TemplateCard, CursorPagination } from '../../components/index.ts'
import {
    useAuth,
    useTemplatesList,
    useTemplateExport,
    useTemplatePublish,
    useTemplateDelete,
    useTemplateNewVersion,
    useTemplateStatistics,
    useDebounce,
    usePaginationNavigation,
} from '../../hooks/index.ts'
import type { TemplateResponse } from '../../types/template.ts'
import styles from './templates-list.module.css'

const PAGE_SIZE = 12

type FilterStatus = 'all' | 'published' | 'draft'

export const TemplatesList: FC = () => {
    const navigate = useNavigate()
    const { isAdmin } = useAuth()

    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
    const [deleteTarget, setDeleteTarget] = useState<TemplateResponse | null>(null)
    const [publishTarget, setPublishTarget] = useState<TemplateResponse | null>(null)
    const [exportingId, setExportingId] = useState<string | null>(null)

    const pagination = usePaginationNavigation()
    const { afterCursor, cursorStack, goToNextPage, goToPreviousPage, resetPagination, getDisplayRange } = pagination

    const debouncedSearch = useDebounce(searchTerm, 300)

    const {
        templates,
        totalCount,
        pageInfo,
        loading: templatesLoading,
        error: templatesError,
        refetch,
    } = useTemplatesList({
        isPublished: filterStatus === 'all' ? undefined : filterStatus === 'published',
        search: debouncedSearch || undefined,
        first: PAGE_SIZE,
        after: afterCursor,
    })

    const { statistics, loading: statsLoading } = useTemplateStatistics()
    const { downloadTemplate } = useTemplateExport()
    const { publish, loading: publishLoading, error: publishError } = useTemplatePublish()
    const { deleteTemplate, loading: deleteLoading, error: deleteError } = useTemplateDelete()
    const { createNewVersion } = useTemplateNewVersion()

    const { start: displayStart, end: displayEnd } = getDisplayRange(PAGE_SIZE, totalCount)

    const handleView = useCallback(
        (id: string) => {
            navigate(`/templates/${id}`)
        },
        [navigate]
    )

    const handleExport = useCallback(
        async (id: string) => {
            setExportingId(id)
            try {
                await downloadTemplate(id)
            } finally {
                setExportingId(null)
            }
        },
        [downloadTemplate]
    )

    const handlePublish = useCallback(async () => {
        if (!publishTarget) {
            return
        }
        try {
            await publish(publishTarget.id)
            setPublishTarget(null)
            refetch()
        } catch {}
    }, [publishTarget, publish, refetch])

    const handleDelete = useCallback(async () => {
        if (!deleteTarget) {
            return
        }
        try {
            await deleteTemplate(deleteTarget.id)
            setDeleteTarget(null)
            refetch()
        } catch {}
    }, [deleteTarget, deleteTemplate, refetch])

    const handleCreateVersion = useCallback(
        async (id: string) => {
            try {
                const newVersion = await createNewVersion(id)
                navigate(`/templates/${newVersion.id}`)
            } catch {}
        },
        [createNewVersion, navigate]
    )

    const handleSearchChange = useCallback(
        (e: { value: string }) => {
            setSearchTerm(e.value)
            resetPagination()
        },
        [resetPagination]
    )

    const handleFilterChange = useCallback(
        (e: { selected: string }) => {
            setFilterStatus(e.selected as FilterStatus)
            resetPagination()
        },
        [resetPagination]
    )

    const handleImportClick = useCallback(() => {
        navigate('/templates/import')
    }, [navigate])

    const isLoading = templatesLoading && templates.length === 0

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />
    }

    if (isLoading) {
        return (
            <div className={styles.container}>
                <Heading title="Templates" />
                <div className={styles.loadingContainer}>
                    <CircularLoader />
                </div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <Heading title="Templates">
                <Button primary onClick={handleImportClick} data-test="import-template">
                    Import Template
                </Button>
            </Heading>

            {!statsLoading && statistics && (
                <div className={styles.statsBar}>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{String(statistics.totalTemplates)}</span>
                        <span className={styles.statLabel}>Total</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{String(statistics.publishedTemplates)}</span>
                        <span className={styles.statLabel}>Published</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{String(statistics.draftTemplates)}</span>
                        <span className={styles.statLabel}>Drafts</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statValue}>{String(statistics.totalCriteria)}</span>
                        <span className={styles.statLabel}>Total Criteria</span>
                    </div>
                </div>
            )}

            {templatesError && (
                <NoticeBox error title="Error loading templates">
                    {templatesError.message}
                    <Button small secondary onClick={refetch}>
                        Retry
                    </Button>
                </NoticeBox>
            )}

            <Card className={styles.card}>
                <div className={styles.toolbar}>
                    <div className={styles.searchWrapper}>
                        <InputField placeholder="Search templates..." value={searchTerm} onChange={handleSearchChange} data-test="search-templates" />
                    </div>
                    <div className={styles.filterWrapper}>
                        <SingleSelectField selected={filterStatus} onChange={handleFilterChange} data-test="filter-status">
                            <SingleSelectOption value="all" label="All Templates" />
                            <SingleSelectOption value="published" label="Published" />
                            <SingleSelectOption value="draft" label="Drafts" />
                        </SingleSelectField>
                    </div>
                </div>

                {templates.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>{debouncedSearch ? 'No templates match your search.' : 'No templates yet.'}</p>
                        {!debouncedSearch && (
                            <Button small onClick={handleImportClick}>
                                Import your first template
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className={styles.templatesGrid}>
                            {templates.map((template) => (
                                <TemplateCard
                                    key={template.id}
                                    template={template}
                                    onView={handleView}
                                    onExport={handleExport}
                                    onPublish={setPublishTarget}
                                    onDelete={setDeleteTarget}
                                    onCreateVersion={handleCreateVersion}
                                    isExporting={exportingId === template.id}
                                    isPublishing={publishLoading && publishTarget?.id === template.id}
                                />
                            ))}
                        </div>

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

            <ConfirmationModal
                open={!!publishTarget}
                title="Publish Template"
                message={
                    <>
                        Are you sure you want to publish <strong>{publishTarget?.name}</strong> (version {String(publishTarget?.version)})?
                        <br />
                        <br />
                        Once published, this template cannot be modified. You will need to create a new version for changes.
                    </>
                }
                confirmLabel="Publish"
                onConfirm={handlePublish}
                onCancel={() => setPublishTarget(null)}
                loading={publishLoading}
            />

            {publishError && (
                <NoticeBox error title="Publish Failed">
                    {publishError.message}
                </NoticeBox>
            )}

            <ConfirmationModal
                open={!!deleteTarget}
                title="Delete Template"
                message={`Are you sure you want to delete "${deleteTarget?.name}" (version ${String(deleteTarget?.version)})? This action cannot be undone.`}
                confirmLabel="Delete"
                destructive
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                loading={deleteLoading}
            />

            {deleteError && (
                <NoticeBox error title="Delete Failed">
                    {deleteError.message}
                </NoticeBox>
            )}
        </div>
    )
}
