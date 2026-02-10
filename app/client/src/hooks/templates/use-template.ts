import { useState, useEffect, useCallback } from 'react'
import type { TemplateResponse } from '../../types/template.ts'
import { extractErrorMessage } from '../../utils/template-validation.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseTemplateReturn {
    template: TemplateResponse | null
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export const useTemplate = (templateId: string | undefined): UseTemplateReturn => {
    const [template, setTemplate] = useState<TemplateResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<TemplateResponse>(
        { url: templateId ? `/templates/${templateId}` : '', method: 'GET' },
        { manual: true }
    )

    const refetch = useCallback(async () => {
        if (!templateId) {
            return
        }
        try {
            await execute({ url: `/templates/${templateId}` })
        } catch {}
    }, [execute, templateId])

    useEffect(() => {
        if (templateId) {
            refetch()
        }
    }, [templateId, refetch])

    useEffect(() => {
        if (data) {
            setTemplate(data)
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

    return { template, loading, error, refetch }
}
