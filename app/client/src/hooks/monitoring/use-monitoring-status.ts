import { useState, useEffect, useCallback } from 'react'
import type { MonitoringStatus } from '../../types/monitoring.ts'
import { extractErrorMessage } from '../../utils/format.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseMonitoringStatusReturn {
    status: MonitoringStatus | null
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export const useMonitoringStatus = (): UseMonitoringStatusReturn => {
    const [status, setStatus] = useState<MonitoringStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<MonitoringStatus>({ url: '/monitoring/status', method: 'GET' }, { manual: true })

    const refetch = useCallback(async () => {
        try {
            await execute()
        } catch {}
    }, [execute])

    useEffect(() => {
        refetch()
    }, [refetch])

    useEffect(() => {
        if (data) {
            setStatus(data)
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

    return { status, loading, error, refetch }
}
