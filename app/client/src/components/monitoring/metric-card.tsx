import { Card } from '@dhis2/ui'
import type { FC, ReactNode } from 'react'
import styles from './metric-card.module.css'

interface MetricCardProps {
    label: string
    value: string | number
    icon?: ReactNode
    unit?: string
    progress?: number
}

export const MetricCard: FC<MetricCardProps> = ({ label, value, icon, unit, progress }) => {
    const getProgressColor = (pct: number) => {
        if (pct >= 80) {
            return styles.progressRed
        }
        if (pct >= 60) {
            return styles.progressYellow
        }
        return styles.progressGreen
    }

    return (
        <Card className={styles.card}>
            <div className={styles.header}>
                {icon && <span className={styles.icon}>{icon}</span>}
                <span className={styles.label}>{label}</span>
            </div>
            <div className={styles.value}>
                {value}
                {unit && <span className={styles.unit}>{unit}</span>}
            </div>
            {progress !== undefined && (
                <div className={styles.progressContainer}>
                    <div className={`${styles.progressBar} ${getProgressColor(progress)}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
                </div>
            )}
        </Card>
    )
}
