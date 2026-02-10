import { IconChevronDown24, IconChevronUp24 } from '@dhis2/ui'
import { useState, useCallback } from 'react'
import type { FC, KeyboardEvent } from 'react'
import type { CategoryResponse } from '../../types/template.ts'
import styles from './category-accordion.module.css'
import { CriterionRow } from './criterion-row.tsx'

export interface CategoryAccordionProps {
    category: CategoryResponse
    defaultExpanded?: boolean
    index?: number
}

export const CategoryAccordion: FC<CategoryAccordionProps> = ({ category, defaultExpanded = false, index }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)

    const criteriaCount = category.criteria?.length ?? 0
    const weightPercent = Math.round(category.weight * 100)

    const handleToggle = useCallback(() => {
        setIsExpanded((prev) => !prev)
    }, [])

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLButtonElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleToggle()
            }
        },
        [handleToggle]
    )

    const accordionId = `category-${category.id}`
    const panelId = `category-panel-${category.id}`

    return (
        <div className={styles.accordion} data-test={`category-accordion-${category.id}`}>
            <button className={styles.header} onClick={handleToggle} onKeyDown={handleKeyDown} aria-expanded={isExpanded} aria-controls={panelId} id={accordionId} type="button">
                <div className={styles.headerContent}>
                    <div className={styles.titleSection}>
                        {index !== undefined && <span className={styles.index}>{String(index + 1)}.</span>}
                        <h3 className={styles.title}>{category.name}</h3>
                    </div>
                    <div className={styles.metadata}>
                        <span className={styles.metaItem}>
                            <span className={styles.metaLabel}>Weight:</span>
                            <span className={styles.metaValue}>{String(weightPercent)}%</span>
                        </span>
                        <span className={styles.metaItem}>
                            <span className={styles.metaLabel}>Criteria:</span>
                            <span className={styles.metaValue}>{String(criteriaCount)}</span>
                        </span>
                    </div>
                </div>
                <span className={styles.chevron} aria-hidden="true">
                    {isExpanded ? <IconChevronUp24 /> : <IconChevronDown24 />}
                </span>
            </button>

            {isExpanded && (
                <div className={styles.panel} role="region" aria-labelledby={accordionId} id={panelId}>
                    {category.description && <p className={styles.description}>{category.description}</p>}

                    {criteriaCount > 0 ? (
                        <div className={styles.criteriaList}>
                            {category.criteria
                                ?.slice()
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map((criterion) => (
                                    <CriterionRow key={criterion.id} criterion={criterion} />
                                ))}
                        </div>
                    ) : (
                        <p className={styles.emptyState}>No criteria in this category.</p>
                    )}
                </div>
            )}
        </div>
    )
}
