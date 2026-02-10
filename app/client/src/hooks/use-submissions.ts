import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Submission, CreateSubmissionDto, SubmissionStatus, ControlGroup } from '../types'
import { useAuthAxios } from './use-auth-axios.ts'

interface SubmissionEdge {
    node: Submission
    cursor: string
}

interface SubmissionsConnection {
    edges: SubmissionEdge[]
    pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
    }
    totalCount: number
}

interface UseSubmissionsOptions {
    implementationId?: string
    status?: SubmissionStatus
    targetControlGroup?: ControlGroup
}

interface UseSubmissionsReturn {
    submissions: Submission[]
    loading: boolean
    error: Error | null
    createSubmission: (dto: CreateSubmissionDto) => Promise<Submission>
    deleteSubmission: (id: string) => Promise<void>
    refetch: () => void
}

export const useSubmissions = (options: UseSubmissionsOptions = {}): UseSubmissionsReturn => {
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const url = useMemo(() => {
        const params = new URLSearchParams()
        if (options.implementationId) {
            params.set('implementationId', options.implementationId)
        }
        if (options.status) {
            params.set('status', options.status)
        }
        if (options.targetControlGroup) {
            params.set('targetControlGroup', options.targetControlGroup)
        }
        const query = params.toString()
        return `/submissions${query ? `?${query}` : ''}`
    }, [options.implementationId, options.status, options.targetControlGroup])

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<SubmissionsConnection>({ url, method: 'GET' }, { manual: true })

    const [, executeCreate] = useAuthAxios<Submission>({ url: '/submissions', method: 'POST' }, { manual: true })

    const [, executeDelete] = useAuthAxios({ method: 'DELETE' }, { manual: true })

    useEffect(() => {
        execute().catch(() => {})
    }, [execute])

    useEffect(() => {
        if (data) {
            const entries = Array.isArray(data.edges) ? data.edges.map((edge) => edge.node) : []
            setSubmissions(entries)
        }
    }, [data])

    useEffect(() => {
        setLoading(fetchLoading)
    }, [fetchLoading])

    useEffect(() => {
        if (fetchError) {
            setError(new Error(fetchError.message || 'Failed to fetch submissions'))
        } else {
            setError(null)
        }
    }, [fetchError])

    const createSubmission = useCallback(
        async (dto: CreateSubmissionDto): Promise<Submission> => {
            const response = await executeCreate({ data: dto })
            await execute() // refresh list
            return response.data
        },
        [executeCreate, execute]
    )

    const deleteSubmission = useCallback(
        async (id: string): Promise<void> => {
            await executeDelete({ url: `/submissions/${id}` })
            await execute()
        },
        [executeDelete, execute]
    )

    return {
        submissions,
        loading,
        error,
        createSubmission,
        deleteSubmission,
        refetch: execute,
    }
}

interface Template {
    id: string
    name: string
    version: string
    description?: string
    isPublished: boolean
}

interface TemplateEdge {
    node: Template
    cursor: string
}

interface TemplatesConnection {
    edges: TemplateEdge[]
    pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
    }
    totalCount: number
}

interface UseTemplatesReturn {
    templates: Template[]
    loading: boolean
    error: Error | null
    refetch: () => void
}

export const useTemplates = (): UseTemplatesReturn => {
    const [templates, setTemplates] = useState<Template[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<TemplatesConnection>({ url: '/templates?isPublished=true', method: 'GET' }, { manual: true })

    useEffect(() => {
        execute().catch(() => {})
    }, [execute])

    useEffect(() => {
        if (data) {
            const entries = Array.isArray(data.edges) ? data.edges.map((edge) => edge.node) : []
            setTemplates(entries)
        }
    }, [data])

    useEffect(() => {
        setLoading(fetchLoading)
    }, [fetchLoading])

    useEffect(() => {
        if (fetchError) {
            setError(new Error(fetchError.message || 'Failed to fetch templates'))
        } else {
            setError(null)
        }
    }, [fetchError])

    return {
        templates,
        loading,
        error,
        refetch: execute,
    }
}
