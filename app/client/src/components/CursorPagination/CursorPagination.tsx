import { Button } from '@dhis2/ui'
import type { FC } from 'react'
import styles from './CursorPagination.module.css'

interface CursorPaginationProps {
    start: number
    end: number
    total: number
    hasNextPage: boolean
    hasPreviousPage: boolean
    onNextPage: () => void
    onPreviousPage: () => void
}

export const CursorPagination: FC<CursorPaginationProps> = ({ start, end, total, hasNextPage, hasPreviousPage, onNextPage, onPreviousPage }) => {
    if (!hasPreviousPage && !hasNextPage) {
        return null
    }

    return (
        <div className={styles.pagination}>
            <span className={styles.info}>
                Showing {start}–{end} of {total}
            </span>
            <div className={styles.buttons}>
                <Button small disabled={!hasPreviousPage} onClick={onPreviousPage}>
                    Previous
                </Button>
                <Button small disabled={!hasNextPage} onClick={onNextPage}>
                    Next
                </Button>
            </div>
        </div>
    )
}
