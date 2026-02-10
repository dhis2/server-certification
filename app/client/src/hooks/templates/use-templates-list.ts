import { useMemo } from 'react'
import type { TemplateResponse, TemplateFilters, TemplatePageInfo } from '../../types/template.ts'
import { useCursorPagination } from '../use-cursor-pagination.ts'

interface UseTemplatesListOptions extends TemplateFilters {
    autoFetch?: boolean
}

interface UseTemplatesListReturn {
    templates: TemplateResponse[]
    totalCount: number
    pageInfo: TemplatePageInfo
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
}

const DEFAULT_PAGE_SIZE = 12

export const useTemplatesList = (options: UseTemplatesListOptions = {}): UseTemplatesListReturn => {
    const { isPublished, search, first = DEFAULT_PAGE_SIZE, after, autoFetch = true } = options

    const params = useMemo(
        () => ({
            isPublished,
            search,
        }),
        [isPublished, search]
    )

    const { items, totalCount, pageInfo, loading, error, refetch } = useCursorPagination<TemplateResponse>({
        endpoint: '/templates',
        params,
        pageSize: first,
        after,
        autoFetch,
    })

    return { templates: items, totalCount, pageInfo, loading, error, refetch }
}
