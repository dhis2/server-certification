import { useState, useEffect, useCallback } from 'react'
import type { TemplateConfig } from '../../types/template.ts'
import { extractErrorMessage } from '../../utils/template-validation.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseTemplateConfigReturn {
    config: TemplateConfig | null
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export const useTemplateConfig = (): UseTemplateConfigReturn => {
    const [config, setConfig] = useState<TemplateConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<TemplateConfig>({ url: '/templates/config', method: 'GET' }, { manual: true })

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
            setConfig(data)
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

    return { config, loading, error, refetch }
}
