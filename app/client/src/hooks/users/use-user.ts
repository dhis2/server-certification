import { useState, useEffect, useCallback } from 'react'
import type { AdminUser } from '../../types/user.ts'
import { extractErrorMessage } from '../../utils/format.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseUserReturn {
    user: AdminUser | null
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

export const useUser = (userId: string | undefined): UseUserReturn => {
    const [user, setUser] = useState<AdminUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<AdminUser>({ url: userId ? `/users/${userId}` : '', method: 'GET' }, { manual: true })

    const refetch = useCallback(async () => {
        if (!userId) {
            return
        }
        try {
            await execute({ url: `/users/${userId}` })
        } catch {}
    }, [execute, userId])

    useEffect(() => {
        if (userId) {
            refetch()
        }
    }, [userId, refetch])

    useEffect(() => {
        if (data) {
            setUser(data)
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

    return { user, loading, error, refetch }
}
