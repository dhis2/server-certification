import { IconCheckmarkCircle16, IconError16 } from '@dhis2/ui'
import type { FC } from 'react'
import { Category, SubmissionResponse, ComplianceStatus } from '../../types/index.ts'
import styles from './category-nav.module.css'

interface CategoryCompletionStatus {
    categoryId: string
    total: number
    completed: number
    compliant: number
    nonCompliant: number
}

interface CategoryNavProps {
    categories: Category[]
    currentIndex: number
    onSelect: (index: number) => void
    responses: SubmissionResponse[]
    disabled?: boolean
    'data-test'?: string
}

const getCategoryStatus = (category: Category, responses: SubmissionResponse[]): CategoryCompletionStatus => {
    const categoryResponses = responses.filter((r) => category.criteria.some((c) => c.id === r.criterionId))

    const completed = categoryResponses.filter((r) => r.complianceStatus !== ComplianceStatus.NOT_TESTED).length

    const compliant = categoryResponses.filter((r) => r.complianceStatus === ComplianceStatus.COMPLIANT).length

    const nonCompliant = categoryResponses.filter(
        (r) => r.complianceStatus === ComplianceStatus.NON_COMPLIANT || r.complianceStatus === ComplianceStatus.PARTIALLY_COMPLIANT
    ).length

    return {
        categoryId: category.id,
        total: category.criteria.length,
        completed,
        compliant,
        nonCompliant,
    }
}

export const CategoryNav: FC<CategoryNavProps> = ({ categories, currentIndex, onSelect, responses, disabled = false, 'data-test': dataTest }) => {
    return (
        <nav className={styles.container} data-test={dataTest}>
            <h3 className={styles.title}>Categories</h3>
            <ul className={styles.list}>
                {categories.map((category, index) => {
                    const status = getCategoryStatus(category, responses)
                    const isComplete = status.completed === status.total && status.total > 0
                    const hasIssues = status.nonCompliant > 0
                    const isActive = index === currentIndex

                    return (
                        <li key={category.id}>
                            <button
                                type="button"
                                className={`${styles.item} ${isActive ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
                                onClick={() => !disabled && onSelect(index)}
                                disabled={disabled}
                                data-test={`category-nav-item-${index}`}
                            >
                                <div className={styles.itemContent}>
                                    <span className={styles.itemNumber}>{index + 1}</span>
                                    <div className={styles.itemInfo}>
                                        <span className={styles.itemName}>{category.name}</span>
                                        <span className={styles.itemProgress}>
                                            {status.completed} / {status.total} assessed
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.itemStatus}>
                                    {isComplete && !hasIssues && (
                                        <span className={styles.completeIcon}>
                                            <IconCheckmarkCircle16 />
                                        </span>
                                    )}
                                    {hasIssues && (
                                        <span className={styles.issueIcon}>
                                            <IconError16 />
                                        </span>
                                    )}
                                    {!isComplete && !hasIssues && (
                                        <span className={styles.progressRing}>
                                            <ProgressRing progress={status.total > 0 ? (status.completed / status.total) * 100 : 0} />
                                        </span>
                                    )}
                                </div>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}

interface ProgressRingProps {
    progress: number
    size?: number
}

const ProgressRing: FC<ProgressRingProps> = ({ progress, size = 20 }) => {
    const strokeWidth = 2
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (progress / 100) * circumference

    return (
        <svg width={size} height={size} className={styles.ring}>
            <circle className={styles.ringBg} strokeWidth={strokeWidth} r={radius} cx={size / 2} cy={size / 2} fill="none" />
            <circle
                className={styles.ringProgress}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                r={radius}
                cx={size / 2}
                cy={size / 2}
                fill="none"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
        </svg>
    )
}
