import { useMemo } from 'react'
import type { AdminUser } from '../../types/user.ts'
import { useInfinitePagination } from '../use-infinite-pagination.ts'

interface UseUsersListOptions {
    search?: string
    first?: number
}

interface UseUsersListReturn {
    users: AdminUser[]
    totalCount: number
    hasNextPage: boolean
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
    loadMore: () => Promise<void>
}

export const useUsersList = (options: UseUsersListOptions = {}): UseUsersListReturn => {
    const { search, first = 20 } = options

    const params = useMemo(() => ({ search }), [search])

    const { items, totalCount, hasNextPage, loading, error, refetch, loadMore } = useInfinitePagination<AdminUser>({
        endpoint: '/users',
        params,
        pageSize: first,
    })

    return { users: items, totalCount, hasNextPage, loading, error, refetch, loadMore }
}
