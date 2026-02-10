import { useState, useCallback } from 'react'
import type { PaginationNavigation } from '../types/pagination.ts'

export const usePaginationNavigation = (): PaginationNavigation => {
    const [afterCursor, setAfterCursor] = useState<string | undefined>(undefined)
    const [cursorStack, setCursorStack] = useState<string[]>([])

    const resetPagination = useCallback(() => {
        setAfterCursor(undefined)
        setCursorStack([])
    }, [])

    const goToNextPage = useCallback(
        (endCursor: string | null) => {
            if (endCursor) {
                setCursorStack((prev) => [...prev, afterCursor ?? ''])
                setAfterCursor(endCursor)
            }
        },
        [afterCursor]
    )

    const goToPreviousPage = useCallback(() => {
        setCursorStack((prev) => {
            const newStack = [...prev]
            const prevCursor = newStack.pop()
            setAfterCursor(prevCursor || undefined)
            return newStack
        })
    }, [])

    const currentPage = cursorStack.length + 1

    const getDisplayRange = useCallback(
        (pageSize: number, totalCount: number) => ({
            start: (currentPage - 1) * pageSize + 1,
            end: Math.min(currentPage * pageSize, totalCount),
        }),
        [currentPage]
    )

    return {
        afterCursor,
        cursorStack,
        currentPage,
        goToNextPage,
        goToPreviousPage,
        resetPagination,
        getDisplayRange,
    }
}
