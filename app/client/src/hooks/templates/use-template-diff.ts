import { useState, useCallback } from 'react'
import type { TemplateDiff } from '../../types/template.ts'
import { extractErrorMessage } from '../../utils/template-validation.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseTemplateDiffReturn {
    getDiff: (name: string, fromVersion: number, toVersion: number) => Promise<TemplateDiff>
    diff: TemplateDiff | null
    loading: boolean
    error: Error | null
}

export const useTemplateDiff = (): UseTemplateDiffReturn => {
    const [diff, setDiff] = useState<TemplateDiff | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const [, execute] = useAuthAxios<TemplateDiff>({ url: '', method: 'GET' }, { manual: true })

    const getDiff = useCallback(
        async (name: string, fromVersion: number, toVersion: number): Promise<TemplateDiff> => {
            setLoading(true)
            setError(null)
            try {
                const encodedName = encodeURIComponent(name)
                const response = await execute({
                    url: `/templates/registry/diff/${encodedName}?from=${String(fromVersion)}&to=${String(toVersion)}`,
                })
                setDiff(response.data)
                return response.data
            } catch (err) {
                const diffError = new Error(extractErrorMessage(err))
                setError(diffError)
                throw diffError
            } finally {
                setLoading(false)
            }
        },
        [execute]
    )

    return { getDiff, diff, loading, error }
}
