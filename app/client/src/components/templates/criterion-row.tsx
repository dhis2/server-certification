import { Tag, IconChevronDown16, IconChevronRight16 } from '@dhis2/ui'
import { useState, useCallback } from 'react'
import type { FC, KeyboardEvent } from 'react'
import type { CriterionResponse } from '../../types/template.ts'
import { controlTypeConfig } from '../../types/template.ts'
import styles from './criterion-row.module.css'

export interface CriterionRowProps {
    criterion: CriterionResponse
    showDetails?: boolean
}

export const CriterionRow: FC<CriterionRowProps> = ({ criterion, showDetails: initialShowDetails = false }) => {
    const [showDetails, setShowDetails] = useState(initialShowDetails)

    const typeConfig = controlTypeConfig[criterion.controlType] ?? { label: criterion.controlType, color: 'default' as const }
    const weightPercent = Math.round(criterion.weight * 100)

    const handleToggle = useCallback(() => {
        setShowDetails((prev) => !prev)
    }, [])

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleToggle()
            }
        },
        [handleToggle]
    )

    const detailsId = `criterion-details-${criterion.id}`

    return (
        <div className={styles.row} data-test={`criterion-row-${criterion.id}`}>
            <div className={styles.header} onClick={handleToggle} onKeyDown={handleKeyDown} role="button" tabIndex={0} aria-expanded={showDetails} aria-controls={detailsId}>
                <span className={styles.chevron} aria-hidden="true">
                    {showDetails ? <IconChevronDown16 /> : <IconChevronRight16 />}
                </span>

                <div className={styles.mainContent}>
                    <div className={styles.titleRow}>
                        <span className={styles.code}>{criterion.code}</span>
                        <span className={styles.name}>{criterion.name}</span>
                    </div>
                    <div className={styles.badges}>
                        <Tag neutral={typeConfig.color === 'default'} positive={typeConfig.color === 'info'}>
                            {typeConfig.label}
                        </Tag>
                        {criterion.isMandatory && <Tag neutral>Mandatory</Tag>}
                        {criterion.isCriticalFail && <Tag negative>Critical</Tag>}
                        {criterion.evidenceRequired && <Tag neutral>Evidence Required</Tag>}
                    </div>
                </div>

                <div className={styles.weight}>{String(weightPercent)}%</div>
            </div>

            {showDetails && (
                <div className={styles.details} id={detailsId}>
                    {criterion.description && (
                        <div className={styles.detailSection}>
                            <h4 className={styles.detailLabel}>Description</h4>
                            <p className={styles.detailText}>{criterion.description}</p>
                        </div>
                    )}

                    {criterion.guidance && (
                        <div className={styles.detailSection}>
                            <h4 className={styles.detailLabel}>Guidance</h4>
                            <p className={styles.detailText}>{criterion.guidance}</p>
                        </div>
                    )}

                    {criterion.verificationMethod && (
                        <div className={styles.detailSection}>
                            <h4 className={styles.detailLabel}>Verification Method</h4>
                            <p className={styles.detailText}>{criterion.verificationMethod}</p>
                        </div>
                    )}

                    {criterion.evidenceDescription && (
                        <div className={styles.detailSection}>
                            <h4 className={styles.detailLabel}>Evidence Description</h4>
                            <p className={styles.detailText}>{criterion.evidenceDescription}</p>
                        </div>
                    )}

                    <div className={styles.metadataGrid}>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Control Group:</span>
                            <span className={styles.metaValue}>{criterion.controlGroup}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Min Passing Score:</span>
                            <span className={styles.metaValue}>{String(criterion.minPassingScore)}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <span className={styles.metaLabel}>Max Score:</span>
                            <span className={styles.metaValue}>{String(criterion.maxScore)}</span>
                        </div>
                        {criterion.cisMapping && (
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>CIS Mapping:</span>
                                <span className={styles.metaValue}>{criterion.cisMapping}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
