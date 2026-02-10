import { useCallback } from 'react'
import type { AuditStatistics, IntegrityValidation, RetentionPolicy, RetentionComplianceReport } from '../../types/audit.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseAuditActionsReturn {
    getStatistics: () => Promise<AuditStatistics>
    validateIntegrity: () => Promise<IntegrityValidation>
    getRetentionPolicy: () => Promise<RetentionPolicy>
    getComplianceReport: () => Promise<RetentionComplianceReport>
    triggerCleanup: (dryRun?: boolean) => Promise<{ deleted: number; dryRun: boolean }>
    loading: boolean
}

export const useAuditActions = (): UseAuditActionsReturn => {
    const [{ loading: statsLoading }, executeStats] = useAuthAxios<AuditStatistics>({ method: 'GET', url: '/audit/statistics' }, { manual: true })

    const [{ loading: integrityLoading }, executeIntegrity] = useAuthAxios<IntegrityValidation>({ method: 'GET', url: '/audit/integrity/validate' }, { manual: true })

    const [{ loading: retentionLoading }, executeRetention] = useAuthAxios<RetentionPolicy>({ method: 'GET', url: '/audit/retention/policy' }, { manual: true })

    const [{ loading: complianceLoading }, executeCompliance] = useAuthAxios<RetentionComplianceReport>({ method: 'GET', url: '/audit/retention/compliance' }, { manual: true })

    const [{ loading: cleanupLoading }, executeCleanup] = useAuthAxios<{ deleted: number; dryRun: boolean }>({ method: 'POST' }, { manual: true })

    const getStatistics = useCallback(async (): Promise<AuditStatistics> => {
        const response = await executeStats()
        return response.data
    }, [executeStats])

    const validateIntegrity = useCallback(async (): Promise<IntegrityValidation> => {
        const response = await executeIntegrity()
        return response.data
    }, [executeIntegrity])

    const getRetentionPolicy = useCallback(async (): Promise<RetentionPolicy> => {
        const response = await executeRetention()
        return response.data
    }, [executeRetention])

    const getComplianceReport = useCallback(async (): Promise<RetentionComplianceReport> => {
        const response = await executeCompliance()
        return response.data
    }, [executeCompliance])

    const triggerCleanup = useCallback(
        async (dryRun = true): Promise<{ deleted: number; dryRun: boolean }> => {
            const response = await executeCleanup({
                url: `/audit/retention/cleanup${dryRun ? '?dryRun=true' : ''}`,
            })
            return response.data
        },
        [executeCleanup]
    )

    return {
        getStatistics,
        validateIntegrity,
        getRetentionPolicy,
        getComplianceReport,
        triggerCleanup,
        loading: statsLoading || integrityLoading || retentionLoading || complianceLoading || cleanupLoading,
    }
}
