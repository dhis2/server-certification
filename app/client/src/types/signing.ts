export interface KeyHealth {
    status: 'healthy' | 'warning' | 'critical' | 'unknown'
    keyId: string | null
    version: number
    ageDays: number | null
    daysUntilRotation: number | null
    maxAgeDays: number
    recommendations: string[]
}

export interface RotationPolicy {
    maxAgeDays: number
    warningThresholdDays: number
    checkOnStartup: boolean
}

export interface RotationReport {
    keyId: string
    version: number
    lastRotatedAt: string | null
    nextRotationAt: string | null
    complianceStatus: 'compliant' | 'warning' | 'non-compliant'
}
