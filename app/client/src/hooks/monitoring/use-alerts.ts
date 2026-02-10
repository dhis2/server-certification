import { useState, useEffect, useCallback } from 'react'
import type { MonitoringAlert, AlertSummary } from '../../types/monitoring.ts'
import { extractErrorMessage } from '../../utils/format.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseAlertsReturn {
    alerts: MonitoringAlert[]
    summary: AlertSummary | null
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export const useAlerts = (): UseAlertsReturn => {
    const [alerts, setAlerts] = useState<MonitoringAlert[]>([])
    const [summary, setSummary] = useState<AlertSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [, fetchAlerts] = useAuthAxios<MonitoringAlert[]>({ url: '/monitoring/alerts', method: 'GET' }, { manual: true })

    const [, fetchSummary] = useAuthAxios<AlertSummary>({ url: '/monitoring/alerts/summary', method: 'GET' }, { manual: true })

    const refetch = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [alertsResult, summaryResult] = await Promise.allSettled([fetchAlerts(), fetchSummary()])

            if (alertsResult.status === 'fulfilled' && alertsResult.value?.data) {
                setAlerts(Array.isArray(alertsResult.value.data) ? alertsResult.value.data : [])
            }
            if (summaryResult.status === 'fulfilled' && summaryResult.value?.data) {
                setSummary(summaryResult.value.data)
            }
        } catch (err) {
            setError(new Error(extractErrorMessage(err)))
        } finally {
            setLoading(false)
        }
    }, [fetchAlerts, fetchSummary])

    useEffect(() => {
        refetch()
    }, [refetch])

    return { alerts, summary, loading, error, refetch }
}
