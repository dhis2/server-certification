export interface AuditLogEntry {
    id: string
    eventType: string
    entityType: string
    entityId: string
    action: string
    actorId?: string | null
    actor?: {
        id: string
        email: string
    } | null
    actorIp?: string | null
    actorUserAgent?: string | null
    oldValues?: Record<string, unknown> | null
    newValues?: Record<string, unknown> | null
    currHash: string
    prevHash?: string | null
    signature: string
    createdAt: string
    archiveAfter?: string | null
}

export interface AuditLogFilters {
    entityType?: string
    eventType?: string
    actorId?: string
    action?: string
    startDate?: string
    endDate?: string
    first?: number
    after?: string
}

export interface AuditStatistics {
    totalEntries: number
    byEventType: Record<string, number>
    byEntityType: Record<string, number>
    byAction: Record<string, number>
}

export interface HashChainValidation {
    valid: boolean
    entriesChecked: number
    firstInvalidEntry?: string
    errorMessage?: string
}

export interface SignatureValidation {
    valid: boolean
    entriesChecked: number
    invalidEntries: Array<{ valid: boolean; entryId: string; errorMessage?: string }>
    errorMessage?: string
}

export interface IntegrityValidation {
    hashChain: HashChainValidation
    signatures: SignatureValidation | null
    overallValid: boolean
}

export interface RetentionPolicy {
    defaultRetentionDays: number
    securityEventRetentionDays: number
    certificateEventRetentionDays: number
    archiveBeforeDelete: boolean
    cleanupBatchSize: number
    autoCleanupEnabled: boolean
}

export interface RetentionComplianceReport {
    policy: RetentionPolicy
    statistics: {
        totalLogs: number
        logsWithArchiveDate: number
        logsPendingArchival: number
    }
    complianceStatus: 'compliant' | 'needs-attention' | 'non-compliant'
    recommendations: string[]
}
