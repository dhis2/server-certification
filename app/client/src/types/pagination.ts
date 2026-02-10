export interface Edge<T> {
    node: T
    cursor: string
}

export interface PageInfo {
    hasNextPage: boolean
    endCursor: string | null
}

export interface Connection<T> {
    edges: Edge<T>[]
    pageInfo: PageInfo
    totalCount: number
}

export interface PaginationState {
    afterCursor: string | undefined
    cursorStack: string[]
    currentPage: number
}

export interface PaginationNavigation {
    afterCursor: string | undefined
    cursorStack: string[]
    currentPage: number
    goToNextPage: (endCursor: string | null) => void
    goToPreviousPage: () => void
    resetPagination: () => void
    getDisplayRange: (pageSize: number, totalCount: number) => { start: number; end: number }
}

export interface CursorPaginationResult<T> {
    items: T[]
    totalCount: number
    pageInfo: PageInfo
    loading: boolean
    error: Error | null
    refetch: () => Promise<void>
}
