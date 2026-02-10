export interface MetricsSnapshot {
    system: {
        heapTotal: number
        heapUsed: number
        memoryUsagePercent: number
        uptime: number
        nodeVersion: string
    }
    requests: {
        totalRequests: number
        successfulRequests: number
        clientErrors: number
        serverErrors: number
        errorRatePercent: number
        averageResponseTimeMs: number
        requestsPerSecond: number
    }
    certificates: {
        totalIssued: number
        totalRevoked: number
        activeCertificates: number
        expiringCertificates: number
        expiredCertificates: number
        issuedLast24Hours: number
        verificationsLast24Hours: number
    }
    security: {
        failedAuthAttemptsLastHour: number
        rateLimitHitsLastHour: number
        uniqueRateLimitedIPs: number
        auditLogIntegrityValid: boolean
    }
    database: {
        connected: boolean
        activeConnections: number
        idleConnections: number
        totalConnections: number
    }
    collectedAt: string
}

export interface MonitoringAlert {
    id: string
    severity: 'critical' | 'warning' | 'info'
    category: string
    title: string
    message: string
    threshold?: number
    currentValue?: number
    triggeredAt: string
    resolvedAt?: string | null
}

export interface AlertSummary {
    bySeverity: Record<string, number>
    byCategory: Record<string, number>
    totalActive: number
}

export interface MonitoringStatus {
    enabled: boolean
    thresholds: Record<string, unknown>
    webhookConfigured: boolean
    slackConfigured: boolean
}
