import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Connection, PageInfo, CursorPaginationResult } from '../types/pagination.ts'
import { extractErrorMessage } from '../utils/format.ts'
import { useAuthAxios } from './use-auth-axios.ts'

interface CursorPaginationOptions {
    endpoint: string
    params?: Record<string, string | number | boolean | undefined>
    pageSize?: number
    after?: string
    autoFetch?: boolean
}

const DEFAULT_PAGE_SIZE = 20

export const useCursorPagination = <T>(options: CursorPaginationOptions): CursorPaginationResult<T> => {
    const { endpoint, params = {}, pageSize = DEFAULT_PAGE_SIZE, after, autoFetch = true } = options

    const [items, setItems] = useState<T[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [pageInfo, setPageInfo] = useState<PageInfo>({ hasNextPage: false, endCursor: null })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const queryParams = useMemo(() => {
        const urlParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                urlParams.set(key, String(value))
            }
        })
        urlParams.set('first', String(pageSize))
        if (after) {
            urlParams.set('after', after)
        }
        return urlParams.toString()
    }, [params, pageSize, after])

    const url = queryParams ? `${endpoint}?${queryParams}` : endpoint

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<Connection<T>>({ url, method: 'GET' }, { manual: true })

    const refetch = useCallback(async () => {
        try {
            await execute({ url })
        } catch {}
    }, [execute, url])

    useEffect(() => {
        if (autoFetch) {
            refetch()
        }
    }, [autoFetch, refetch])

    useEffect(() => {
        if (data) {
            const entries = Array.isArray(data.edges) ? data.edges.map((edge) => edge.node) : []
            setItems(entries)
            setTotalCount(typeof data.totalCount === 'number' ? data.totalCount : 0)
            setPageInfo(data.pageInfo ?? { hasNextPage: false, endCursor: null })
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

    return { items, totalCount, pageInfo, loading, error, refetch }
}
