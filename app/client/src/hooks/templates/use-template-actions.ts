import { useState, useCallback } from 'react'
import type { TemplateResponse } from '../../types/template.ts'
import { extractErrorMessage } from '../../utils/template-validation.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseTemplatePublishReturn {
    publish: (id: string) => Promise<TemplateResponse>
    loading: boolean
    error: Error | null
}

export const useTemplatePublish = (): UseTemplatePublishReturn => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const [, execute] = useAuthAxios<TemplateResponse>({ url: '', method: 'POST' }, { manual: true })

    const publish = useCallback(
        async (id: string): Promise<TemplateResponse> => {
            setLoading(true)
            setError(null)
            try {
                const response = await execute({ url: `/templates/${id}/publish` })
                return response.data
            } catch (err) {
                const publishError = new Error(extractErrorMessage(err))
                setError(publishError)
                throw publishError
            } finally {
                setLoading(false)
            }
        },
        [execute]
    )

    return { publish, loading, error }
}

interface UseTemplateDeleteReturn {
    deleteTemplate: (id: string) => Promise<void>
    loading: boolean
    error: Error | null
}

export const useTemplateDelete = (): UseTemplateDeleteReturn => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const [, execute] = useAuthAxios({ url: '', method: 'DELETE' }, { manual: true })

    const deleteTemplate = useCallback(
        async (id: string): Promise<void> => {
            setLoading(true)
            setError(null)
            try {
                await execute({ url: `/templates/${id}` })
            } catch (err) {
                const deleteError = new Error(extractErrorMessage(err))
                setError(deleteError)
                throw deleteError
            } finally {
                setLoading(false)
            }
        },
        [execute]
    )

    return { deleteTemplate, loading, error }
}

interface UseTemplateNewVersionReturn {
    createNewVersion: (id: string) => Promise<TemplateResponse>
    loading: boolean
    error: Error | null
}

export const useTemplateNewVersion = (): UseTemplateNewVersionReturn => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const [, execute] = useAuthAxios<TemplateResponse>({ url: '', method: 'POST' }, { manual: true })

    const createNewVersion = useCallback(
        async (id: string): Promise<TemplateResponse> => {
            setLoading(true)
            setError(null)
            try {
                const response = await execute({ url: `/templates/${id}/version` })
                return response.data
            } catch (err) {
                const versionError = new Error(extractErrorMessage(err))
                setError(versionError)
                throw versionError
            } finally {
                setLoading(false)
            }
        },
        [execute]
    )

    return { createNewVersion, loading, error }
}
