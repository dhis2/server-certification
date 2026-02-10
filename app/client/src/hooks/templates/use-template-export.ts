import { useState, useCallback } from 'react'
import type { ExportResult } from '../../types/template.ts'
import { extractErrorMessage } from '../../utils/template-validation.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseTemplateExportReturn {
    exportTemplate: (id: string) => Promise<ExportResult>
    downloadTemplate: (id: string) => Promise<void>
    loading: boolean
    error: Error | null
}

export const useTemplateExport = (): UseTemplateExportReturn => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const [, execute] = useAuthAxios<ExportResult>({ url: '', method: 'GET' }, { manual: true })

    const exportTemplate = useCallback(
        async (id: string): Promise<ExportResult> => {
            setLoading(true)
            setError(null)
            try {
                const response = await execute({ url: `/templates/${id}/export` })
                return response.data
            } catch (err) {
                const exportError = new Error(extractErrorMessage(err))
                setError(exportError)
                throw exportError
            } finally {
                setLoading(false)
            }
        },
        [execute]
    )

    const downloadTemplate = useCallback(
        async (id: string): Promise<void> => {
            try {
                const result = await exportTemplate(id)
                const blob = new Blob([result.content], { type: result.contentType })
                const url = URL.createObjectURL(blob)

                const link = document.createElement('a')
                link.href = url
                link.download = result.filename
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)

                URL.revokeObjectURL(url)
            } catch {
                /* error already set in exportTemplate */
            }
        },
        [exportTemplate]
    )

    return { exportTemplate, downloadTemplate, loading, error }
}
