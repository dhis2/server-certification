import { useMemo } from 'react'
import type { AuditLogEntry, AuditLogFilters } from '../../types/audit.ts'
import type { PageInfo } from '../../types/pagination.ts'
import { useCursorPagination } from '../use-cursor-pagination.ts'

interface UseAuditLogsReturn {
    logs: AuditLogEntry[]
    totalCount: number
    pageInfo: PageInfo
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

const DEFAULT_PAGE_SIZE = 20

export const useAuditLogs = (filters: AuditLogFilters = {}): UseAuditLogsReturn => {
    const { entityType, eventType, actorId, action, startDate, endDate, first = DEFAULT_PAGE_SIZE, after } = filters

    const params = useMemo(
        () => ({
            entityType,
            eventType,
            actorId,
            action,
            startDate,
            endDate,
        }),
        [entityType, eventType, actorId, action, startDate, endDate]
    )

    const { items, totalCount, pageInfo, loading, error, refetch } = useCursorPagination<AuditLogEntry>({
        endpoint: '/audit',
        params,
        pageSize: first,
        after,
    })

    return { logs: items, totalCount, pageInfo, loading, error, refetch }
}
