import { useState, useEffect, useCallback, useMemo } from 'react'
import type { TemplateResponse } from '../../types/template.ts'
import { extractErrorMessage } from '../../utils/template-validation.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseTemplateVersionsReturn {
    versions: TemplateResponse[]
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export const useTemplateVersions = (templateName: string | undefined): UseTemplateVersionsReturn => {
    const [versions, setVersions] = useState<TemplateResponse[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const encodedName = useMemo(() => (templateName ? encodeURIComponent(templateName) : ''), [templateName])

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<TemplateResponse[]>(
        { url: encodedName ? `/templates/registry/versions/${encodedName}` : '', method: 'GET' },
        { manual: true }
    )

    const refetch = useCallback(async () => {
        if (!encodedName) {
            return
        }
        try {
            await execute({ url: `/templates/registry/versions/${encodedName}` })
        } catch {}
    }, [execute, encodedName])

    useEffect(() => {
        if (encodedName) {
            refetch()
        }
    }, [encodedName, refetch])

    useEffect(() => {
        if (data) {
            setVersions(Array.isArray(data) ? data : [])
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

    return { versions, loading, error, refetch }
}
