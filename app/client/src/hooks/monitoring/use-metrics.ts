import { useState, useEffect, useCallback, useRef } from 'react'
import type { MetricsSnapshot } from '../../types/monitoring.ts'
import { extractErrorMessage } from '../../utils/format.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseMetricsOptions {
    autoRefresh?: boolean
    refreshInterval?: number
}

interface UseMetricsReturn {
    metrics: MetricsSnapshot | null
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export const useMetrics = (options: UseMetricsOptions = {}): UseMetricsReturn => {
    const { autoRefresh = false, refreshInterval = 30000 } = options

    const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<MetricsSnapshot>({ url: '/monitoring/metrics', method: 'GET' }, { manual: true })

    const refetch = useCallback(async () => {
        try {
            await execute()
        } catch {}
    }, [execute])

    useEffect(() => {
        refetch()
    }, [refetch])

    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(refetch, refreshInterval)
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                }
            }
        }
    }, [autoRefresh, refreshInterval, refetch])

    useEffect(() => {
        if (data) {
            setMetrics(data)
        }
    }, [data])

    useEffect(() => {
        setLoading(fetchLoading)
    }, [fetchLoading])

    useEffect(() => {
        if (fetchError) {
            setError(new Error(extractErrorMessage(fetchError)))
        } else {
            setError(null)
        }
    }, [fetchError])

    return { metrics, loading, error, refetch }
}
