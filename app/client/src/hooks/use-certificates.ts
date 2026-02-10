import { useCallback, useMemo } from 'react'
import type { PageInfo } from '../types/pagination.ts'
import { useAuthAxios } from './use-auth-axios.ts'
import { useCursorPagination } from './use-cursor-pagination.ts'

interface CertificateEntry {
    id: string
    certificateNumber: string
    implementationId: string
    implementationName?: string
    finalScore: number
    isRevoked: boolean
    controlGroup: string
    validFrom: string
    validUntil: string
    verificationCode: string
    issuedAt: string
    revokedAt?: string | null
    revocationReason?: string | null
    revokedBy?: string | null
    integrity?: {
        hashValid: boolean
        signatureValid: boolean
    }
    credential?: unknown
}

interface CertificatesListFilters {
    implementationId?: string
    status?: string
    first?: number
    after?: string
}

interface UseCertificatesListReturn {
    certificates: CertificateEntry[]
    totalCount: number
    pageInfo: PageInfo
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

const DEFAULT_PAGE_SIZE = 20

export const useCertificatesList = (filters: CertificatesListFilters = {}): UseCertificatesListReturn => {
    const { implementationId, status, first = DEFAULT_PAGE_SIZE, after } = filters

    const params = useMemo(
        () => ({
            implementationId,
            status: status && status !== 'all' ? status : undefined,
        }),
        [implementationId, status]
    )

    const { items, totalCount, pageInfo, loading, error, refetch } = useCursorPagination<CertificateEntry>({
        endpoint: '/certificates',
        params,
        pageSize: first,
        after,
    })

    return { certificates: items, totalCount, pageInfo, loading, error, refetch }
}

interface UseCertificateActionsReturn {
    revokeCertificate: (id: string, reason: string) => Promise<void>
    downloadCredential: (id: string) => Promise<unknown>
    loading: boolean
}

export const useCertificateActions = (): UseCertificateActionsReturn => {
    const [{ loading: revokeLoading }, executeRevoke] = useAuthAxios({ method: 'POST' }, { manual: true })

    const [{ loading: downloadLoading }, executeDownload] = useAuthAxios({ method: 'GET' }, { manual: true })

    const revokeCertificate = useCallback(
        async (id: string, reason: string): Promise<void> => {
            await executeRevoke({ url: `/certificates/${id}/revoke`, data: { reason } })
        },
        [executeRevoke]
    )

    const downloadCredential = useCallback(
        async (id: string): Promise<unknown> => {
            const response = await executeDownload({ url: `/certificates/${id}/credential` })
            return response.data
        },
        [executeDownload]
    )

    return {
        revokeCertificate,
        downloadCredential,
        loading: revokeLoading || downloadLoading,
    }
}

export type { CertificateEntry, CertificatesListFilters }
