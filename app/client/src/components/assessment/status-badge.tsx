import { Tag } from '@dhis2/ui'
import type { FC } from 'react'
import { SubmissionStatus, submissionStatusConfig, ControlGroup, controlGroupConfig } from '../../types/index.ts'
import styles from './status-badge.module.css'

interface StatusBadgeProps {
    status: SubmissionStatus
    'data-test'?: string
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, 'data-test': dataTest }) => {
    const config = submissionStatusConfig[status]

    return (
        <Tag className={styles[config.color]} data-test={dataTest}>
            {config.label}
        </Tag>
    )
}

interface CGBadgeProps {
    cg: ControlGroup
    showDescription?: boolean
    'data-test'?: string
}

export const CGBadge: FC<CGBadgeProps> = ({ cg, showDescription = false, 'data-test': dataTest }) => {
    const config = controlGroupConfig[cg]

    const getColorClass = () => {
        switch (cg) {
            case ControlGroup.DSCP1:
                return styles.dscp1
            default:
                return ''
        }
    }

    return (
        <span className={`${styles.cgBadge} ${getColorClass()}`} data-test={dataTest}>
            <span className={styles.cgLabel}>{cg}</span>
            {showDescription && <span className={styles.cgDescription}>{config.description}</span>}
        </span>
    )
}

interface ControlTypeBadgeProps {
    type: 'technical' | 'organizational'
    'data-test'?: string
}

export const ControlTypeBadge: FC<ControlTypeBadgeProps> = ({ type, 'data-test': dataTest }) => {
    return (
        <Tag className={type === 'technical' ? styles.technical : styles.organizational} data-test={dataTest}>
            {type === 'technical' ? 'Technical' : 'Organizational'}
        </Tag>
    )
}
