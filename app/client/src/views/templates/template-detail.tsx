import { Button, ButtonStrip, Card, CircularLoader, NoticeBox, Tag } from '@dhis2/ui'
import { useState, useCallback } from 'react'
import type { FC } from 'react'
import { useNavigate, useParams, Navigate, Link } from 'react-router-dom'
import { Heading, ConfirmationModal, CategoryAccordion } from '../../components/index.ts'
import { useAuth, useTemplate, useTemplateVersions, useTemplateExport, useTemplatePublish, useTemplateDelete, useTemplateNewVersion } from '../../hooks/index.ts'
import { templateStatusConfig } from '../../types/template.ts'
import { formatDate, formatDateTime } from '../../utils/template-validation.ts'
import styles from './template-detail.module.css'

export const TemplateDetail: FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { isAdmin } = useAuth()

    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showPublishModal, setShowPublishModal] = useState(false)

    const { template, loading: templateLoading, error: templateError, refetch } = useTemplate(id)
    const { versions, loading: versionsLoading } = useTemplateVersions(template?.name)
    const { downloadTemplate, loading: exportLoading } = useTemplateExport()
    const { publish, loading: publishLoading } = useTemplatePublish()
    const { deleteTemplate, loading: deleteLoading } = useTemplateDelete()
    const { createNewVersion, loading: versionLoading } = useTemplateNewVersion()

    const handleExport = useCallback(async () => {
        if (!id) {
            return
        }
        await downloadTemplate(id)
    }, [id, downloadTemplate])

    const handlePublish = useCallback(async () => {
        if (!id) {
            return
        }
        try {
            await publish(id)
            setShowPublishModal(false)
            refetch()
            // eslint-disable-next-line no-empty
        } catch {}
    }, [id, publish, refetch])

    const handleDelete = useCallback(async () => {
        if (!id) {
            return
        }
        try {
            await deleteTemplate(id)
            setShowDeleteModal(false)
            navigate('/templates')
            // eslint-disable-next-line no-empty
        } catch {}
    }, [id, deleteTemplate, navigate])

    const handleCreateVersion = useCallback(async () => {
        if (!id) {
            return
        }
        try {
            const newVersion = await createNewVersion(id)
            navigate(`/templates/${newVersion.id}`)
            // eslint-disable-next-line no-empty
        } catch {}
    }, [id, createNewVersion, navigate])

    const handleCompareVersions = useCallback(() => {
        if (!template) {
            return
        }
        navigate(`/templates/diff/${encodeURIComponent(template.name)}`)
    }, [template, navigate])

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />
    }

    if (templateLoading) {
        return (
            <div className={styles.container}>
                <Heading title="Template Details" />
                <div className={styles.loadingContainer}>
                    <CircularLoader />
                </div>
            </div>
        )
    }

    if (templateError || !template) {
        return (
            <div className={styles.container}>
                <Heading title="Template Details" />
                <NoticeBox error title="Error loading template">
                    {templateError?.message || 'Template not found'}
                    <Button small secondary onClick={() => navigate('/templates')}>
                        Back to Templates
                    </Button>
                </NoticeBox>
            </div>
        )
    }

    const statusKey = template.isPublished ? 'published' : 'draft'
    const statusConfig = templateStatusConfig[statusKey]

    const categoryCount = template.categories?.length ?? 0
    const criteriaCount = template.categories?.reduce((sum, cat) => sum + (cat.criteria?.length ?? 0), 0) ?? 0

    return (
        <div className={styles.container}>
            <Heading title="Template Details">
                <ButtonStrip>
                    <Button secondary onClick={() => navigate('/templates')}>
                        Back to List
                    </Button>
                    <Button onClick={handleExport} loading={exportLoading} data-test="export-template">
                        Export YAML
                    </Button>
                    {template.isPublished && versions.length > 1 && (
                        <Button onClick={handleCompareVersions} data-test="compare-versions">
                            Compare Versions
                        </Button>
                    )}
                    {template.isPublished ? (
                        <Button primary onClick={handleCreateVersion} loading={versionLoading} data-test="create-version">
                            Create New Version
                        </Button>
                    ) : (
                        <>
                            <Button primary onClick={() => setShowPublishModal(true)} data-test="publish-template">
                                Publish
                            </Button>
                            <Button destructive onClick={() => setShowDeleteModal(true)} data-test="delete-template">
                                Delete
                            </Button>
                        </>
                    )}
                </ButtonStrip>
            </Heading>

            <div className={styles.layout}>
                <div className={styles.mainContent}>
                    <Card className={styles.card}>
                        <div className={styles.header}>
                            <div className={styles.titleRow}>
                                <h2 className={styles.templateName}>{template.name}</h2>
                                <Tag positive={statusConfig.color === 'positive'} neutral={statusConfig.color === 'warning'}>
                                    {statusConfig.label}
                                </Tag>
                            </div>
                            <span className={styles.version}>Version {String(template.version)}</span>
                            {template.description && <p className={styles.description}>{template.description}</p>}
                        </div>

                        <div className={styles.metadata}>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Categories</span>
                                <span className={styles.metaValue}>{String(categoryCount)}</span>
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Criteria</span>
                                <span className={styles.metaValue}>{String(criteriaCount)}</span>
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Created</span>
                                <span className={styles.metaValue}>{formatDateTime(template.createdAt)}</span>
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>Updated</span>
                                <span className={styles.metaValue}>{formatDateTime(template.updatedAt)}</span>
                            </div>
                            {template.effectiveFrom && (
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Effective From</span>
                                    <span className={styles.metaValue}>{formatDate(template.effectiveFrom)}</span>
                                </div>
                            )}
                            {template.effectiveTo && (
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Effective To</span>
                                    <span className={styles.metaValue}>{formatDate(template.effectiveTo)}</span>
                                </div>
                            )}
                        </div>

                        <div className={styles.categoriesSection}>
                            <h3 className={styles.sectionTitle}>Categories & Criteria</h3>
                            {categoryCount === 0 ? (
                                <p className={styles.emptyState}>No categories defined.</p>
                            ) : (
                                <div className={styles.categoriesList}>
                                    {template.categories
                                        ?.slice()
                                        .sort((a, b) => a.sortOrder - b.sortOrder)
                                        .map((category, index) => (
                                            <CategoryAccordion key={category.id} category={category} index={index} defaultExpanded={index === 0} />
                                        ))}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <aside className={styles.sidebar}>
                    <Card className={styles.sidebarCard}>
                        <h3 className={styles.sidebarTitle}>Version History</h3>
                        {versionsLoading ? (
                            <div className={styles.sidebarLoading}>
                                <CircularLoader small />
                            </div>
                        ) : versions.length === 0 ? (
                            <p className={styles.sidebarEmpty}>No version history available.</p>
                        ) : (
                            <ul className={styles.versionList}>
                                {versions.map((version) => (
                                    <li key={version.id} className={`${styles.versionItem} ${version.id === id ? styles.currentVersion : ''}`}>
                                        <Link to={`/templates/${version.id}`} className={styles.versionLink}>
                                            <span className={styles.versionNumber}>v{String(version.version)}</span>
                                            <span className={styles.versionDate}>{formatDate(version.createdAt)}</span>
                                            {version.isPublished ? <Tag positive>Published</Tag> : <Tag neutral>Draft</Tag>}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </aside>
            </div>

            <ConfirmationModal
                open={showPublishModal}
                title="Publish Template"
                message={
                    <>
                        Are you sure you want to publish <strong>{template.name}</strong> (version {String(template.version)})?
                        <br />
                        <br />
                        Once published, this template cannot be modified. You will need to create a new version for changes.
                    </>
                }
                confirmLabel="Publish"
                onConfirm={handlePublish}
                onCancel={() => setShowPublishModal(false)}
                loading={publishLoading}
            />

            <ConfirmationModal
                open={showDeleteModal}
                title="Delete Template"
                message={`Are you sure you want to delete "${template.name}" (version ${String(template.version)})? This action cannot be undone.`}
                confirmLabel="Delete"
                destructive
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteModal(false)}
                loading={deleteLoading}
            />
        </div>
    )
}
