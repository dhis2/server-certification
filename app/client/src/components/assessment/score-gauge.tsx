import type { FC } from 'react'
import { CertificationResult } from '../../types/index.ts'
import styles from './score-gauge.module.css'

interface ScoreGaugeProps {
    score: number
    label?: string
    status?: CertificationResult | null
    size?: 'small' | 'medium' | 'large'
    showLabel?: boolean
    'data-test'?: string
}

export const ScoreGauge: FC<ScoreGaugeProps> = ({ score, label, status, size = 'medium', showLabel = true, 'data-test': dataTest }) => {
    const clampedScore = Math.min(100, Math.max(0, score))
    const sizeConfig = {
        small: { size: 80, strokeWidth: 6, fontSize: 18 },
        medium: { size: 120, strokeWidth: 8, fontSize: 24 },
        large: { size: 160, strokeWidth: 10, fontSize: 32 },
    }

    const config = sizeConfig[size]
    const radius = (config.size - config.strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (clampedScore / 100) * circumference

    const getColor = () => {
        if (status === CertificationResult.PASS) {
            return 'var(--colors-green500)'
        }
        if (status === CertificationResult.FAIL) {
            return 'var(--colors-red500)'
        }
        if (clampedScore >= 80) {
            return 'var(--colors-green500)'
        }
        if (clampedScore >= 60) {
            return 'var(--colors-yellow500)'
        }
        return 'var(--colors-red500)'
    }

    const getStatusClass = () => {
        if (status === CertificationResult.PASS) {
            return styles.pass
        }
        if (status === CertificationResult.FAIL) {
            return styles.fail
        }
        return ''
    }

    return (
        <div className={`${styles.container} ${getStatusClass()}`} data-test={dataTest}>
            <svg width={config.size} height={config.size} className={styles.gauge} viewBox={`0 0 ${config.size} ${config.size}`}>
                <circle className={styles.background} strokeWidth={config.strokeWidth} r={radius} cx={config.size / 2} cy={config.size / 2} fill="none" />
                <circle
                    className={styles.progress}
                    strokeWidth={config.strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    r={radius}
                    cx={config.size / 2}
                    cy={config.size / 2}
                    fill="none"
                    style={{ stroke: getColor() }}
                    transform={`rotate(-90 ${config.size / 2} ${config.size / 2})`}
                />
            </svg>
            <div className={styles.content}>
                <span className={styles.score} style={{ fontSize: config.fontSize }}>
                    {Math.round(clampedScore)}%
                </span>
                {showLabel && label && <span className={styles.label}>{label}</span>}
            </div>
        </div>
    )
}

interface CategoryScoreCardProps {
    categoryName: string
    score: number
    completionRate: number
    'data-test'?: string
}

export const CategoryScoreCard: FC<CategoryScoreCardProps> = ({ categoryName, score, completionRate, 'data-test': dataTest }) => {
    return (
        <div className={styles.scoreCard} data-test={dataTest}>
            <div className={styles.scoreCardHeader}>
                <h4 className={styles.scoreCardTitle}>{categoryName}</h4>
                <span className={styles.scoreCardCompletion}>{Math.round(completionRate)}% complete</span>
            </div>
            <ScoreGauge score={score} size="small" showLabel={false} />
        </div>
    )
}

interface PassFailIndicatorProps {
    result: CertificationResult
    targetCG: string
    'data-test'?: string
}

export const PassFailIndicator: FC<PassFailIndicatorProps> = ({ result, targetCG, 'data-test': dataTest }) => {
    const isPass = result === CertificationResult.PASS

    return (
        <div className={`${styles.passFailContainer} ${isPass ? styles.passContainer : styles.failContainer}`} data-test={dataTest}>
            <div className={styles.passFailIcon}>{isPass ? '✓' : '✗'}</div>
            <div className={styles.passFailContent}>
                <span className={styles.passFailLabel}>{isPass ? 'CERTIFICATION PASSED' : 'CERTIFICATION FAILED'}</span>
                <span className={styles.passFailCG}>Control Group: {targetCG}</span>
            </div>
        </div>
    )
}
