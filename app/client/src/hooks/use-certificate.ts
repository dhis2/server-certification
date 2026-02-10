import { useState, useEffect, useCallback } from 'react'
import type { Certificate } from '../types/index.ts'
import { useAuthAxios } from './use-auth-axios.ts'

interface UseCertificateReturn {
    certificate: Certificate | null
    loading: boolean
    error: Error | null
    refetch: () => void
}

export const useCertificate = (submissionId: string | undefined): UseCertificateReturn => {
    const [certificate, setCertificate] = useState<Certificate | null>(null)
    const [error, setError] = useState<Error | null>(null)

    const [{ data, loading: fetchLoading, error: fetchError }, execute] = useAuthAxios<Certificate>(
        {
            url: submissionId ? `/certificates/by-submission/${submissionId}` : '',
            method: 'GET',
        },
        { manual: true }
    )

    const refetch = useCallback(() => {
        if (submissionId) {
            execute()
        }
    }, [submissionId, execute])

    useEffect(() => {
        if (submissionId) {
            execute()
        }
    }, [submissionId, execute])

    useEffect(() => {
        if (data) {
            setCertificate(data)
            setError(null)
        }
    }, [data])

    useEffect(() => {
        if (fetchError) {
            if (fetchError.response?.status !== 404) {
                setError(new Error(fetchError.message || 'Failed to fetch certificate'))
            } else {
                setError(null)
            }
        }
    }, [fetchError])

    return {
        certificate,
        loading: fetchLoading,
        error,
        refetch,
    }
}
