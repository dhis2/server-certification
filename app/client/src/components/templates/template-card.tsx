import { Button, ButtonStrip, Card, Tag } from '@dhis2/ui'
import type { FC } from 'react'
import type { TemplateResponse } from '../../types/template.ts'
import { templateStatusConfig } from '../../types/template.ts'
import { formatDate } from '../../utils/template-validation.ts'
import styles from './template-card.module.css'

export interface TemplateCardProps {
    template: TemplateResponse
    onView: (id: string) => void
    onExport: (id: string) => void
    onPublish?: (template: TemplateResponse) => void
    onCreateVersion?: (id: string) => void
    onDelete?: (template: TemplateResponse) => void
    isExporting?: boolean
    isPublishing?: boolean
}

export const TemplateCard: FC<TemplateCardProps> = ({ template, onView, onExport, onPublish, onCreateVersion, onDelete, isExporting = false, isPublishing = false }) => {
    const statusKey = template.isPublished ? 'published' : 'draft'
    const statusConfig = templateStatusConfig[statusKey]

    const categoryCount = template.categories?.length ?? 0
    const criteriaCount = template.categories?.reduce((sum, cat) => sum + (cat.criteria?.length ?? 0), 0) ?? 0

    return (
        <Card className={styles.card}>
            <div className={styles.header}>
                <div className={styles.titleRow}>
                    <h3 className={styles.name}>{template.name}</h3>
                    <Tag positive={statusConfig.color === 'positive'} neutral={statusConfig.color === 'warning'}>
                        {statusConfig.label}
                    </Tag>
                </div>
                <span className={styles.version}>Version {String(template.version)}</span>
            </div>

            {template.description && <p className={styles.description}>{template.description}</p>}

            <div className={styles.metadata}>
                <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Categories:</span>
                    <span className={styles.metaValue}>{String(categoryCount)}</span>
                </div>
                <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Criteria:</span>
                    <span className={styles.metaValue}>{String(criteriaCount)}</span>
                </div>
                <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Updated:</span>
                    <span className={styles.metaValue}>{formatDate(template.updatedAt)}</span>
                </div>
            </div>

            {template.effectiveFrom && (
                <div className={styles.effectiveDates}>
                    <span>Effective: {formatDate(template.effectiveFrom)}</span>
                    {template.effectiveTo && <span> - {formatDate(template.effectiveTo)}</span>}
                </div>
            )}

            <div className={styles.actions}>
                <ButtonStrip>
                    <Button small onClick={() => onView(template.id)} data-test={`view-template-${template.id}`}>
                        View
                    </Button>
                    <Button small onClick={() => onExport(template.id)} loading={isExporting} data-test={`export-template-${template.id}`}>
                        Export
                    </Button>
                    {!template.isPublished && onPublish && (
                        <Button small primary onClick={() => onPublish(template)} loading={isPublishing} data-test={`publish-template-${template.id}`}>
                            Publish
                        </Button>
                    )}
                    {template.isPublished && onCreateVersion && (
                        <Button small secondary onClick={() => onCreateVersion(template.id)} data-test={`version-template-${template.id}`}>
                            New Version
                        </Button>
                    )}
                    {!template.isPublished && onDelete && (
                        <Button small destructive onClick={() => onDelete(template)} data-test={`delete-template-${template.id}`}>
                            Delete
                        </Button>
                    )}
                </ButtonStrip>
            </div>
        </Card>
    )
}
