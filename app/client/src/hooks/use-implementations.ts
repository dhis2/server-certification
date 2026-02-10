import { useState, useEffect, useCallback } from 'react'
import type { Implementation, CreateImplementationDto, UpdateImplementationDto, ImplementationsConnection } from '../types'
import { useAuthAxios } from './use-auth-axios.ts'

interface UseImplementationsReturn {
    implementations: Implementation[]
    totalCount: number
    loading: boolean
    error: Error | null
    createImplementation: (dto: CreateImplementationDto) => Promise<Implementation>
    updateImplementation: (id: string, dto: UpdateImplementationDto) => Promise<Implementation>
    deleteImplementation: (id: string) => Promise<void>
    refetch: () => Promise<void>
}

export const useImplementations = (): UseImplementationsReturn => {
    const [implementations, setImplementations] = useState<Implementation[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [{ loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<ImplementationsConnection>({ url: '/implementations', method: 'GET' }, { manual: true })

    const [, executeCreate] = useAuthAxios<Implementation>({ url: '/implementations', method: 'POST' }, { manual: true })

    const [, executeUpdate] = useAuthAxios<Implementation>({ method: 'PATCH' }, { manual: true })

    const [, executeDelete] = useAuthAxios({ method: 'DELETE' }, { manual: true })

    const refetch = useCallback(async () => {
        try {
            const response = await execute()
            if (response.data) {
                const edges = Array.isArray(response.data.edges) ? response.data.edges : []
                setImplementations(edges.map((e) => e.node))
                setTotalCount(response.data.totalCount ?? 0)
            }
        } catch {}
    }, [execute])

    useEffect(() => {
        refetch()
    }, [refetch])

    useEffect(() => {
        setLoading(fetchLoading)
    }, [fetchLoading])

    useEffect(() => {
        if (fetchError) {
            setError(new Error(fetchError.message || 'Failed to fetch implementations'))
        } else {
            setError(null)
        }
    }, [fetchError])

    const createImplementation = useCallback(
        async (dto: CreateImplementationDto): Promise<Implementation> => {
            const response = await executeCreate({ data: dto })
            await refetch()
            return response.data
        },
        [executeCreate, refetch]
    )

    const updateImplementation = useCallback(
        async (id: string, dto: UpdateImplementationDto): Promise<Implementation> => {
            const response = await executeUpdate({ url: `/implementations/${id}`, data: dto })
            await refetch()
            return response.data
        },
        [executeUpdate, refetch]
    )

    const deleteImplementation = useCallback(
        async (id: string): Promise<void> => {
            await executeDelete({ url: `/implementations/${id}` })
            await refetch()
        },
        [executeDelete, refetch]
    )

    return {
        implementations,
        totalCount,
        loading,
        error,
        createImplementation,
        updateImplementation,
        deleteImplementation,
        refetch,
    }
}

interface UseImplementationReturn {
    implementation: Implementation | null
    loading: boolean
    error: Error | null
    refetch: () => void
}

export const useImplementation = (implementationId: string | undefined): UseImplementationReturn => {
    const [implementation, setImplementation] = useState<Implementation | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<Implementation>(
        { url: implementationId ? `/implementations/${implementationId}` : '', method: 'GET' },
        { manual: true }
    )

    useEffect(() => {
        if (implementationId) {
            execute().catch(() => {})
        }
    }, [implementationId, execute])

    useEffect(() => {
        if (data) {
            setImplementation(data)
        }
    }, [data])

    useEffect(() => {
        setLoading(fetchLoading)
    }, [fetchLoading])

    useEffect(() => {
        if (fetchError) {
            setError(new Error(fetchError.message || 'Failed to fetch implementation'))
        } else {
            setError(null)
        }
    }, [fetchError])

    return {
        implementation,
        loading,
        error,
        refetch: execute,
    }
}
