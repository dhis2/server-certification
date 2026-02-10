import { Button, Card, CircularLoader, NoticeBox, SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import { useState, useCallback, useEffect, useMemo } from 'react'
import type { FC } from 'react'
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom'
import { Heading, DiffViewer } from '../../components/index.ts'
import { useAuth, useTemplateVersions, useTemplateDiff } from '../../hooks/index.ts'
import styles from './template-diff.module.css'

export const TemplateDiff: FC = () => {
    const { name } = useParams<{ name: string }>()
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const { isAdmin } = useAuth()

    const initialFromVersion = searchParams.get('from')
    const initialToVersion = searchParams.get('to')

    const [fromVersion, setFromVersion] = useState<number | null>(() => {
        const parsed = initialFromVersion ? parseInt(initialFromVersion, 10) : NaN
        return isNaN(parsed) ? null : parsed
    })
    const [toVersion, setToVersion] = useState<number | null>(() => {
        const parsed = initialToVersion ? parseInt(initialToVersion, 10) : NaN
        return isNaN(parsed) ? null : parsed
    })

    const decodedName = name ? decodeURIComponent(name) : undefined
    const { versions, loading: versionsLoading, error: versionsError } = useTemplateVersions(decodedName)
    const { getDiff, diff, loading: diffLoading, error: diffError } = useTemplateDiff()

    useEffect(() => {
        if (versions.length >= 2 && fromVersion === null && toVersion === null) {
            const sortedVersions = [...versions].sort((a, b) => b.version - a.version)
            setToVersion(sortedVersions[0].version)
            setFromVersion(sortedVersions[1].version)
        }
    }, [versions, fromVersion, toVersion])

    useEffect(() => {
        if (decodedName && fromVersion !== null && toVersion !== null && fromVersion !== toVersion) {
            getDiff(decodedName, fromVersion, toVersion)
        }
    }, [decodedName, fromVersion, toVersion, getDiff])

    useEffect(() => {
        if (fromVersion !== null && toVersion !== null) {
            setSearchParams({ from: String(fromVersion), to: String(toVersion) }, { replace: true })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromVersion, toVersion])

    const versionOptions = useMemo(() => {
        return [...versions]
            .sort((a, b) => b.version - a.version)
            .map((v) => ({
                value: String(v.version),
                label: `Version ${String(v.version)}${v.isPublished ? ' (Published)' : ' (Draft)'}`,
            }))
    }, [versions])

    const handleFromVersionChange = useCallback((e: { selected: string }) => {
        setFromVersion(parseInt(e.selected, 10))
    }, [])

    const handleToVersionChange = useCallback((e: { selected: string }) => {
        setToVersion(parseInt(e.selected, 10))
    }, [])

    const handleSwapVersions = useCallback(() => {
        const temp = fromVersion
        setFromVersion(toVersion)
        setToVersion(temp)
    }, [fromVersion, toVersion])

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />
    }

    if (versionsLoading) {
        return (
            <div className={styles.container}>
                <Heading title="Compare Versions" />
                <div className={styles.loadingContainer}>
                    <CircularLoader />
                </div>
            </div>
        )
    }

    if (versionsError || !decodedName) {
        return (
            <div className={styles.container}>
                <Heading title="Compare Versions" />
                <NoticeBox error title="Error">
                    {versionsError?.message || 'Template not found'}
                    <Button small secondary onClick={() => navigate('/templates')}>
                        Back to Templates
                    </Button>
                </NoticeBox>
            </div>
        )
    }

    if (versions.length < 2) {
        return (
            <div className={styles.container}>
                <Heading title="Compare Versions">
                    <Button secondary onClick={() => navigate('/templates')}>
                        Back to Templates
                    </Button>
                </Heading>
                <Card className={styles.card}>
                    <div className={styles.emptyState}>
                        <p>This template has only one version. Create a new version to enable comparison.</p>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <Heading title={`Compare Versions: ${decodedName}`}>
                <Button secondary onClick={() => navigate('/templates')}>
                    Back to Templates
                </Button>
            </Heading>

            <Card className={styles.selectorCard}>
                <div className={styles.selectors}>
                    <div className={styles.selectorGroup}>
                        <label className={styles.selectorLabel}>From Version</label>
                        <SingleSelectField selected={fromVersion !== null ? String(fromVersion) : ''} onChange={handleFromVersionChange} data-test="from-version-select">
                            {versionOptions.map((opt) => (
                                <SingleSelectOption key={opt.value} value={opt.value} label={opt.label} />
                            ))}
                        </SingleSelectField>
                    </div>

                    <Button className={styles.swapButton} small onClick={handleSwapVersions} title="Swap versions">
                        ⇄
                    </Button>

                    <div className={styles.selectorGroup}>
                        <label className={styles.selectorLabel}>To Version</label>
                        <SingleSelectField selected={toVersion !== null ? String(toVersion) : ''} onChange={handleToVersionChange} data-test="to-version-select">
                            {versionOptions.map((opt) => (
                                <SingleSelectOption key={opt.value} value={opt.value} label={opt.label} />
                            ))}
                        </SingleSelectField>
                    </div>
                </div>

                {fromVersion === toVersion && fromVersion !== null && (
                    <NoticeBox warning title="Same Version Selected" className={styles.warningBox}>
                        Please select different versions to compare.
                    </NoticeBox>
                )}
            </Card>

            {diffLoading && (
                <div className={styles.loadingContainer}>
                    <CircularLoader />
                </div>
            )}

            {diffError && (
                <NoticeBox error title="Error loading diff">
                    {diffError.message}
                </NoticeBox>
            )}

            {diff && !diffLoading && (
                <Card className={styles.card}>
                    <DiffViewer diff={diff} view="grouped" />
                </Card>
            )}
        </div>
    )
}
