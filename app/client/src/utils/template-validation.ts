import type { ImportFormat, TemplateConfig } from '../types/template.ts'

export const DEFAULT_TEMPLATE_LIMITS: TemplateConfig = {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxContentLength: 5 * 1024 * 1024,
    allowedExtensions: ['.yaml', '.yml', '.json'],
    allowedMimeTypes: ['application/x-yaml', 'application/yaml', 'text/yaml', 'text/x-yaml', 'application/json', 'text/plain'],
    maxNameLength: 255,
    maxDescriptionLength: 4000,
    maxCriteriaPerCategory: 100,
    maxCategoriesPerTemplate: 50,
    maxCriterionCodeLength: 50,
    maxCriterionNameLength: 255,
    maxCriterionDescriptionLength: 2000,
    maxGuidanceLength: 4000,
    maxEvidenceDescriptionLength: 1000,
    maxVerificationMethodLength: 4000,
    maxCisMappingLength: 50,
    maxFilenameLength: 255,
}

export interface FileValidationResult {
    valid: boolean
    error: string | null
    format: ImportFormat | null
}

export const validateTemplateFile = (file: File, config?: TemplateConfig): FileValidationResult => {
    const limits = config ?? DEFAULT_TEMPLATE_LIMITS
    const allowedExtensions = [...limits.allowedExtensions]
    const allowedMimeTypes = [...limits.allowedMimeTypes]

    if (file.size > limits.maxFileSize) {
        const maxMB = limits.maxFileSize / (1024 * 1024)
        return {
            valid: false,
            error: `File size exceeds ${String(maxMB)}MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
            format: null,
        }
    }

    if (file.size === 0) {
        return {
            valid: false,
            error: 'File is empty',
            format: null,
        }
    }

    const fileName = file.name.toLowerCase()
    const lastDotIndex = fileName.lastIndexOf('.')
    if (lastDotIndex === -1) {
        return {
            valid: false,
            error: `File must have an extension. Allowed: ${allowedExtensions.join(', ')}`,
            format: null,
        }
    }

    const extension = fileName.slice(lastDotIndex)
    if (!allowedExtensions.includes(extension)) {
        return {
            valid: false,
            error: `Invalid file type "${extension}". Allowed: ${allowedExtensions.join(', ')}`,
            format: null,
        }
    }

    const mimeType = file.type.toLowerCase()
    if (mimeType && !allowedMimeTypes.includes(mimeType)) {
        console.warn(`Unexpected MIME type: ${mimeType}`)
    }

    const format: ImportFormat = extension === '.json' ? 'json' : 'yaml'

    return {
        valid: true,
        error: null,
        format,
    }
}

export const validateContentLength = (content: string, config?: TemplateConfig): string | null => {
    const limits = config ?? DEFAULT_TEMPLATE_LIMITS

    if (!content || content.trim().length === 0) {
        return 'Content is empty'
    }

    if (content.length > limits.maxContentLength) {
        const maxMB = limits.maxContentLength / (1024 * 1024)
        return `Content exceeds ${String(maxMB)}MB limit`
    }

    return null
}

export const detectContentFormat = (content: string): ImportFormat | null => {
    const trimmed = content.trim()

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            JSON.parse(trimmed)
            return 'json'
        } catch {
            // Not valid JSON, might be YAML
        }
    }

    if (trimmed.startsWith('---') || /^[a-zA-Z_][a-zA-Z0-9_]*\s*:/m.test(trimmed)) {
        return 'yaml'
    }

    return null
}

export const sanitizeForDisplay = (text: string): string => {
    if (typeof document === 'undefined') {
        // Server-side or test environment fallback
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
    }

    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

export const escapeWithLineBreaks = (text: string): string => {
    return sanitizeForDisplay(text).replace(/\n/g, '<br>')
}

const ALLOWED_PROTOCOLS = ['https:', 'http:'] as const

export const isValidUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url)
        return ALLOWED_PROTOCOLS.includes(parsed.protocol as (typeof ALLOWED_PROTOCOLS)[number])
    } catch {
        return false
    }
}

export const extractHostname = (url: string): string | null => {
    try {
        const parsed = new URL(url)
        return parsed.hostname
    } catch {
        return null
    }
}

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {
        return '0 B'
    }

    const units = ['B', 'KB', 'MB', 'GB']
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const size = bytes / Math.pow(k, i)

    return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

export const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) {
        return '-'
    }

    try {
        const date = new Date(dateString)
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    } catch {
        return '-'
    }
}

export const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) {
        return '-'
    }

    try {
        const date = new Date(dateString)
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    } catch {
        return '-'
    }
}

interface AxiosError {
    response?: {
        data?: {
            message?: string | string[]
        }
    }
    message?: string
}

export const extractErrorMessage = (error: unknown): string => {
    if (!error) {
        return 'An unknown error occurred'
    }

    const axiosError = error as AxiosError
    if (axiosError.response?.data?.message) {
        const message = axiosError.response.data.message
        return Array.isArray(message) ? message.join(', ') : message
    }

    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === 'string') {
        return error
    }

    return 'An unexpected error occurred'
}
