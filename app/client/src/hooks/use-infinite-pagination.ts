import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Connection, PageInfo } from '../types/pagination.ts'
import { extractErrorMessage } from '../utils/format.ts'
import { useAuthAxios } from './use-auth-axios.ts'

interface InfinitePaginationOptions {
    endpoint: string
    params?: Record<string, string | number | boolean | undefined>
    pageSize?: number
}

interface InfinitePaginationResult<T> {
    items: T[]
    totalCount: number
    hasNextPage: boolean
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
    loadMore: () => Promise<void>
}

const DEFAULT_PAGE_SIZE = 20

export const useInfinitePagination = <T>(options: InfinitePaginationOptions): InfinitePaginationResult<T> => {
    const { endpoint, params = {}, pageSize = DEFAULT_PAGE_SIZE } = options

    const [items, setItems] = useState<T[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [pageInfo, setPageInfo] = useState<PageInfo>({ hasNextPage: false, endCursor: null })
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const queryParams = useMemo(() => {
        const urlParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                urlParams.set(key, String(value))
            }
        })
        urlParams.set('first', String(pageSize))
        return urlParams.toString()
    }, [params, pageSize])

    const [{ loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<Connection<T>>({ url: `${endpoint}?${queryParams}`, method: 'GET' }, { manual: true })

    const refetch = useCallback(async () => {
        try {
            const response = await execute({ url: `${endpoint}?${queryParams}` })
            if (response.data) {
                const edges = Array.isArray(response.data.edges) ? response.data.edges : []
                setItems(edges.map((e) => e.node))
                setTotalCount(typeof response.data.totalCount === 'number' ? response.data.totalCount : 0)
                setPageInfo(response.data.pageInfo ?? { hasNextPage: false, endCursor: null })
            }
        } catch {}
    }, [execute, endpoint, queryParams])

    const loadMore = useCallback(async () => {
        if (!pageInfo.hasNextPage || !pageInfo.endCursor || loadingMore) {
            return
        }

        setLoadingMore(true)
        try {
            const urlParams = new URLSearchParams()
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    urlParams.set(key, String(value))
                }
            })
            urlParams.set('first', String(pageSize))
            urlParams.set('after', pageInfo.endCursor)

            const response = await execute({ url: `${endpoint}?${urlParams.toString()}` })
            if (response.data) {
                const edges = Array.isArray(response.data.edges) ? response.data.edges : []
                setItems((prev) => [...prev, ...edges.map((e) => e.node)])
                setPageInfo(response.data.pageInfo ?? { hasNextPage: false, endCursor: null })
            }
        } catch {
        } finally {
            setLoadingMore(false)
        }
    }, [execute, endpoint, params, pageSize, pageInfo.hasNextPage, pageInfo.endCursor, loadingMore])

    useEffect(() => {
        refetch()
    }, [refetch])

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

    return { items, totalCount, hasNextPage: pageInfo.hasNextPage, loading, error, refetch, loadMore }
}
