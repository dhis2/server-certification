import type { FC } from 'react'
import { useMemo } from 'react'
import type { TemplateDiff, DiffChange } from '../../types/template.ts'
import styles from './diff-viewer.module.css'

export interface DiffViewerProps {
    diff: TemplateDiff
    view?: 'unified' | 'grouped'
}

interface GroupedChanges {
    added: DiffChange[]
    removed: DiffChange[]
    modified: DiffChange[]
}

export const DiffViewer: FC<DiffViewerProps> = ({ diff, view = 'grouped' }) => {
    const groupedChanges = useMemo((): GroupedChanges => {
        const groups: GroupedChanges = {
            added: [],
            removed: [],
            modified: [],
        }

        for (const change of diff.changes) {
            groups[change.type].push(change)
        }

        return groups
    }, [diff.changes])

    const totalChanges = diff.changes.length

    if (totalChanges === 0) {
        return (
            <div className={styles.container} data-test="diff-viewer">
                <div className={styles.emptyState}>
                    <p>
                        No differences found between version {String(diff.fromVersion)} and version {String(diff.toVersion)}.
                    </p>
                </div>
            </div>
        )
    }

    const formatValue = (value: unknown): string => {
        if (value === null || value === undefined) {
            return 'null'
        }
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2)
        }
        return String(value)
    }

    const renderChange = (change: DiffChange, index: number) => (
        <div key={index} className={`${styles.change} ${styles[change.type]}`}>
            <div className={styles.changePath}>
                <code>{change.path}</code>
            </div>
            {change.type === 'modified' && (
                <div className={styles.changeValues}>
                    <div className={styles.oldValue}>
                        <span className={styles.valueLabel}>Old:</span>
                        <pre className={styles.valueContent}>{formatValue(change.oldValue)}</pre>
                    </div>
                    <div className={styles.newValue}>
                        <span className={styles.valueLabel}>New:</span>
                        <pre className={styles.valueContent}>{formatValue(change.newValue)}</pre>
                    </div>
                </div>
            )}
            {change.type === 'added' && change.newValue !== undefined && (
                <div className={styles.changeValues}>
                    <div className={styles.newValue}>
                        <span className={styles.valueLabel}>Value:</span>
                        <pre className={styles.valueContent}>{formatValue(change.newValue)}</pre>
                    </div>
                </div>
            )}
            {change.type === 'removed' && change.oldValue !== undefined && (
                <div className={styles.changeValues}>
                    <div className={styles.oldValue}>
                        <span className={styles.valueLabel}>Value:</span>
                        <pre className={styles.valueContent}>{formatValue(change.oldValue)}</pre>
                    </div>
                </div>
            )}
        </div>
    )

    if (view === 'unified') {
        return (
            <div className={styles.container} data-test="diff-viewer">
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        Changes from Version {String(diff.fromVersion)} to Version {String(diff.toVersion)}
                    </h3>
                    <span className={styles.count}>{String(totalChanges)} changes</span>
                </div>
                <div className={styles.changesList}>{diff.changes.map((change, index) => renderChange(change, index))}</div>
            </div>
        )
    }

    return (
        <div className={styles.container} data-test="diff-viewer">
            <div className={styles.header}>
                <h3 className={styles.title}>
                    Changes from Version {String(diff.fromVersion)} to Version {String(diff.toVersion)}
                </h3>
                <div className={styles.summary}>
                    {groupedChanges.added.length > 0 && <span className={styles.addedCount}>+{String(groupedChanges.added.length)} added</span>}
                    {groupedChanges.removed.length > 0 && <span className={styles.removedCount}>-{String(groupedChanges.removed.length)} removed</span>}
                    {groupedChanges.modified.length > 0 && <span className={styles.modifiedCount}>~{String(groupedChanges.modified.length)} modified</span>}
                </div>
            </div>

            {groupedChanges.added.length > 0 && (
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>
                        <span className={styles.addedIcon}>+</span> Added ({String(groupedChanges.added.length)})
                    </h4>
                    <div className={styles.changesList}>{groupedChanges.added.map((change, index) => renderChange(change, index))}</div>
                </div>
            )}

            {groupedChanges.removed.length > 0 && (
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>
                        <span className={styles.removedIcon}>-</span> Removed ({String(groupedChanges.removed.length)})
                    </h4>
                    <div className={styles.changesList}>{groupedChanges.removed.map((change, index) => renderChange(change, index))}</div>
                </div>
            )}

            {groupedChanges.modified.length > 0 && (
                <div className={styles.section}>
                    <h4 className={styles.sectionTitle}>
                        <span className={styles.modifiedIcon}>~</span> Modified ({String(groupedChanges.modified.length)})
                    </h4>
                    <div className={styles.changesList}>{groupedChanges.modified.map((change, index) => renderChange(change, index))}</div>
                </div>
            )}
        </div>
    )
}
