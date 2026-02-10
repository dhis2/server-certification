import { useState, useEffect, useCallback } from 'react'
import type { TemplateStatistics } from '../../types/template.ts'
import { extractErrorMessage } from '../../utils/template-validation.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseTemplateStatisticsReturn {
    statistics: TemplateStatistics | null
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export const useTemplateStatistics = (): UseTemplateStatisticsReturn => {
    const [statistics, setStatistics] = useState<TemplateStatistics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<TemplateStatistics>(
        { url: '/templates/registry/statistics', method: 'GET' },
        { manual: true }
    )

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
            setStatistics(data)
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

    return { statistics, loading, error, refetch }
}
