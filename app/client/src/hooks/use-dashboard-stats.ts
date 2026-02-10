import { useState, useEffect, useCallback } from 'react'
import { useAuthAxios } from './use-auth-axios.ts'
import { useAuth } from './use-auth.ts'

interface CertificateStats {
    active: number
    expiringSoon: number
    revoked: number
    total: number
}

interface TemplateStats {
    totalTemplates: number
    publishedTemplates: number
}

export interface DashboardStats {
    certificates: CertificateStats | null
    templates: TemplateStats | null
    loading: boolean
    error: Error | null
    refetch: () => void
}

interface MonitoringCertificatesResponse {
    active?: number
    expiringSoon?: number
    revoked?: number
    total?: number
}

interface TemplateStatisticsResponse {
    totalTemplates?: number
    publishedTemplates?: number
}

export const useDashboardStats = (): DashboardStats => {
    const { isAdmin } = useAuth()
    const [certificates, setCertificates] = useState<CertificateStats | null>(null)
    const [templates, setTemplates] = useState<TemplateStats | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const [, fetchCertificates] = useAuthAxios<MonitoringCertificatesResponse>({ url: '/monitoring/certificates', method: 'GET' }, { manual: true })

    const [, fetchTemplates] = useAuthAxios<TemplateStatisticsResponse>({ url: '/templates/registry/statistics', method: 'GET' }, { manual: true })

    const refetch = useCallback(async () => {
        if (!isAdmin) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            const [certResult, templateResult] = await Promise.allSettled([fetchCertificates(), fetchTemplates()])

            if (certResult.status === 'fulfilled' && certResult.value?.data) {
                const d = certResult.value.data
                setCertificates({
                    active: d.active ?? 0,
                    expiringSoon: d.expiringSoon ?? 0,
                    revoked: d.revoked ?? 0,
                    total: d.total ?? 0,
                })
            }

            if (templateResult.status === 'fulfilled' && templateResult.value?.data) {
                const d = templateResult.value.data
                setTemplates({
                    totalTemplates: d.totalTemplates ?? 0,
                    publishedTemplates: d.publishedTemplates ?? 0,
                })
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to fetch dashboard stats'))
        } finally {
            setLoading(false)
        }
    }, [isAdmin, fetchCertificates, fetchTemplates])

    useEffect(() => {
        refetch()
    }, [refetch])

    return { certificates, templates, loading, error, refetch }
}
