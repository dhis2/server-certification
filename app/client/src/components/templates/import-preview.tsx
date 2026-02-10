import { NoticeBox, Tag } from '@dhis2/ui'
import type { FC } from 'react'
import type { TemplateDefinition, ValidationResult } from '../../types/template.ts'
import styles from './import-preview.module.css'

export interface ImportPreviewProps {
    definition: TemplateDefinition
    validationResult: ValidationResult | null
    existingVersion?: number
}

export const ImportPreview: FC<ImportPreviewProps> = ({ definition, validationResult, existingVersion }) => {
    const totalCategories = definition.categories.length
    const totalCriteria = definition.categories.reduce((sum, cat) => sum + cat.criteria.length, 0)

    const mandatoryCriteria = definition.categories.reduce((sum, cat) => sum + cat.criteria.filter((c) => c.isMandatory).length, 0)

    const criticalCriteria = definition.categories.reduce((sum, cat) => sum + cat.criteria.filter((c) => c.isCriticalFail).length, 0)

    const isUpgrade = existingVersion !== undefined && definition.version > existingVersion

    return (
        <div className={styles.preview} data-test="import-preview">
            {validationResult && !validationResult.valid && (
                <NoticeBox error title="Validation Failed" className={styles.notice}>
                    <ul className={styles.errorList}>
                        {validationResult.errors.map((error, index) => (
                            <li key={index} className={styles.errorItem}>
                                <code className={styles.errorPath}>{error.path}</code>: {error.message}
                            </li>
                        ))}
                    </ul>
                </NoticeBox>
            )}

            {validationResult?.valid && (
                <NoticeBox title="Validation Passed" className={styles.notice}>
                    Template structure is valid and ready for import.
                </NoticeBox>
            )}

            {isUpgrade && (
                <NoticeBox warning title="Version Upgrade" className={styles.notice}>
                    This will create version {String(definition.version)} (upgrading from version {String(existingVersion)}).
                </NoticeBox>
            )}

            <div className={styles.header}>
                <div className={styles.titleRow}>
                    <h3 className={styles.name}>{definition.name}</h3>
                    <Tag neutral>Version {String(definition.version)}</Tag>
                </div>
                {definition.description && <p className={styles.description}>{definition.description}</p>}
            </div>

            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{String(totalCategories)}</span>
                    <span className={styles.statLabel}>Categories</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{String(totalCriteria)}</span>
                    <span className={styles.statLabel}>Criteria</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{String(mandatoryCriteria)}</span>
                    <span className={styles.statLabel}>Mandatory</span>
                </div>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{String(criticalCriteria)}</span>
                    <span className={styles.statLabel}>Critical</span>
                </div>
            </div>

            <div className={styles.categoriesList}>
                <h4 className={styles.sectionTitle}>Categories</h4>
                {definition.categories
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((category, index) => (
                        <div key={index} className={styles.categoryItem}>
                            <div className={styles.categoryHeader}>
                                <span className={styles.categoryIndex}>{String(index + 1)}.</span>
                                <span className={styles.categoryName}>{category.name}</span>
                                <span className={styles.categoryMeta}>
                                    {String(Math.round(category.weight * 100))}% weight · {String(category.criteria.length)} criteria
                                </span>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    )
}
