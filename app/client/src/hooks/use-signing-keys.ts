import { useState, useEffect, useCallback } from 'react'
import type { KeyHealth, RotationPolicy, RotationReport } from '../types/signing.ts'
import { extractErrorMessage } from '../utils/format.ts'
import { useAuthAxios } from './use-auth-axios.ts'

interface UseSigningKeysReturn {
    health: KeyHealth | null
    policy: RotationPolicy | null
    report: RotationReport | null
    loading: boolean
    error: Error | null
    refetch: () => void
}

export const useSigningKeys = (): UseSigningKeysReturn => {
    const [health, setHealth] = useState<KeyHealth | null>(null)
    const [policy, setPolicy] = useState<RotationPolicy | null>(null)
    const [report, setReport] = useState<RotationReport | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [, fetchHealth] = useAuthAxios<KeyHealth>({ url: '/admin/keys/health', method: 'GET' }, { manual: true })

    const [, fetchPolicy] = useAuthAxios<RotationPolicy>({ url: '/admin/keys/policy', method: 'GET' }, { manual: true })

    const [, fetchReport] = useAuthAxios<RotationReport>({ url: '/admin/keys/rotation-report', method: 'GET' }, { manual: true })

    const refetch = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const [healthResult, policyResult, reportResult] = await Promise.allSettled([fetchHealth(), fetchPolicy(), fetchReport()])

            if (healthResult.status === 'fulfilled' && healthResult.value?.data) {
                setHealth(healthResult.value.data)
            }
            if (policyResult.status === 'fulfilled' && policyResult.value?.data) {
                setPolicy(policyResult.value.data)
            }
            if (reportResult.status === 'fulfilled' && reportResult.value?.data) {
                setReport(reportResult.value.data)
            }
        } catch (err) {
            setError(new Error(extractErrorMessage(err)))
        } finally {
            setLoading(false)
        }
    }, [fetchHealth, fetchPolicy, fetchReport])

    useEffect(() => {
        refetch()
    }, [refetch])

    return { health, policy, report, loading, error, refetch }
}
