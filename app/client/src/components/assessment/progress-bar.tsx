import type { FC } from 'react'
import styles from './progress-bar.module.css'

interface ProgressBarProps {
    current: number
    total: number
    label?: string
    showPercentage?: boolean
    size?: 'small' | 'medium' | 'large'
    variant?: 'default' | 'success' | 'warning' | 'error'
    'data-test'?: string
}

export const ProgressBar: FC<ProgressBarProps> = ({ current, total, label, showPercentage = true, size = 'medium', variant = 'default', 'data-test': dataTest }) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0
    const clampedPercentage = Math.min(100, Math.max(0, percentage))

    return (
        <div className={styles.container} data-test={dataTest}>
            {(label || showPercentage) && (
                <div className={styles.header}>
                    {label && <span className={styles.label}>{label}</span>}
                    {showPercentage && (
                        <span className={styles.percentage}>
                            {current} / {total} ({clampedPercentage}%)
                        </span>
                    )}
                </div>
            )}
            <div className={`${styles.track} ${styles[size]}`}>
                <div
                    className={`${styles.fill} ${styles[variant]}`}
                    style={{ width: `${clampedPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={clampedPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>
        </div>
    )
}

interface ProgressSegment {
    value: number
    color: 'green' | 'yellow' | 'red' | 'grey'
    label?: string
}

interface MultiProgressBarProps {
    segments: ProgressSegment[]
    total: number
    label?: string
    showLegend?: boolean
    'data-test'?: string
}

export const MultiProgressBar: FC<MultiProgressBarProps> = ({ segments, total, label, showLegend = true, 'data-test': dataTest }) => {
    const getPercentage = (value: number) => (total > 0 ? (value / total) * 100 : 0)

    return (
        <div className={styles.container} data-test={dataTest}>
            {label && (
                <div className={styles.header}>
                    <span className={styles.label}>{label}</span>
                </div>
            )}
            <div className={`${styles.track} ${styles.medium}`}>
                {segments.map((segment, index) => (
                    <div
                        key={index}
                        className={`${styles.segment} ${styles[`segment${segment.color.charAt(0).toUpperCase() + segment.color.slice(1)}`]}`}
                        style={{ width: `${getPercentage(segment.value)}%` }}
                        title={segment.label ? `${segment.label}: ${segment.value}` : undefined}
                    />
                ))}
            </div>
            {showLegend && (
                <div className={styles.legend}>
                    {segments.map((segment, index) => (
                        <div key={index} className={styles.legendItem}>
                            <span className={`${styles.legendColor} ${styles[`segment${segment.color.charAt(0).toUpperCase() + segment.color.slice(1)}`]}`} />
                            <span className={styles.legendLabel}>
                                {segment.label}: {segment.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
