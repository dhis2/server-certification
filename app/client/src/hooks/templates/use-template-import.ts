import { useState, useCallback } from 'react'
import type { ImportRequest, ImportResult, ValidationResult } from '../../types/template.ts'
import { extractErrorMessage } from '../../utils/template-validation.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseTemplateImportReturn {
    validate: (data: ImportRequest) => Promise<ValidationResult>
    importTemplate: (data: ImportRequest) => Promise<ImportResult>
    loading: boolean
    error: Error | null
    clearError: () => void
}

export const useTemplateImport = (): UseTemplateImportReturn => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const [, executeValidate] = useAuthAxios<ValidationResult>({ url: '/templates/import/validate', method: 'POST' }, { manual: true })
    const [, executeImport] = useAuthAxios<ImportResult>({ url: '/templates/import', method: 'POST' }, { manual: true })

    const validate = useCallback(
        async (data: ImportRequest): Promise<ValidationResult> => {
            setLoading(true)
            setError(null)
            try {
                const response = await executeValidate({ data })
                return response.data
            } catch (err) {
                const validationError = new Error(extractErrorMessage(err))
                setError(validationError)
                throw validationError
            } finally {
                setLoading(false)
            }
        },
        [executeValidate]
    )

    const importTemplate = useCallback(
        async (data: ImportRequest): Promise<ImportResult> => {
            setLoading(true)
            setError(null)
            try {
                const response = await executeImport({ data })
                return response.data
            } catch (err) {
                const importError = new Error(extractErrorMessage(err))
                setError(importError)
                throw importError
            } finally {
                setLoading(false)
            }
        },
        [executeImport]
    )

    const clearError = useCallback(() => {
        setError(null)
    }, [])

    return { validate, importTemplate, loading, error, clearError }
}
