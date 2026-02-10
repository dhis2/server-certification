import { Button, ButtonStrip, Card, CircularLoader, NoticeBox, SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import { useState, useCallback, useRef } from 'react'
import type { FC, DragEvent, ChangeEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { parse as parseYaml } from 'yaml'
import { Heading, YamlEditor, ImportPreview } from '../../components/index.ts'
import { useAuth, useTemplateImport, useFileReader } from '../../hooks/index.ts'
import type { ImportFormat, ImportState, TemplateDefinition, ValidationResult, ImportResult } from '../../types/template.ts'
import { validateTemplateFile, validateContentLength, detectContentFormat, formatFileSize, DEFAULT_TEMPLATE_LIMITS } from '../../utils/template-validation.ts'
import styles from './template-import.module.css'

export const TemplateImport: FC = () => {
    const navigate = useNavigate()
    const { isAdmin } = useAuth()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [content, setContent] = useState('')
    const [format, setFormat] = useState<ImportFormat>('yaml')
    const [importState, setImportState] = useState<ImportState>('idle')
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
    const [importResult, setImportResult] = useState<ImportResult | null>(null)
    const [parsedDefinition, setParsedDefinition] = useState<TemplateDefinition | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const { validate, importTemplate, loading: importLoading } = useTemplateImport()
    const { readFile, loading: fileLoading } = useFileReader()

    const handleContentChange = useCallback((value: string) => {
        setContent(value)
        setImportState('idle')
        setValidationResult(null)
        setParsedDefinition(null)
        setError(null)

        const detectedFormat = detectContentFormat(value)
        if (detectedFormat) {
            setFormat(detectedFormat)
        }
    }, [])

    const handleFormatChange = useCallback((e: { selected: string }) => {
        setFormat(e.selected as ImportFormat)
    }, [])

    const handleFileSelect = useCallback(
        async (file: File) => {
            const validation = validateTemplateFile(file)
            if (!validation.valid) {
                setError(validation.error)
                return
            }

            try {
                const fileContent = await readFile(file)
                setContent(fileContent)
                if (validation.format) {
                    setFormat(validation.format)
                }
                setImportState('idle')
                setValidationResult(null)
                setParsedDefinition(null)
                setError(null)
            } catch (err) {
                setError('Failed to read file')
            }
        },
        [readFile]
    )

    const handleFileInputChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0]
            if (file) {
                handleFileSelect(file)
            }
            event.target.value = ''
        },
        [handleFileSelect]
    )

    const handleBrowseClick = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault()
            event.stopPropagation()
            setIsDragging(false)

            const file = event.dataTransfer.files?.[0]
            if (file) {
                handleFileSelect(file)
            }
        },
        [handleFileSelect]
    )

    const handleValidate = useCallback(async () => {
        const contentError = validateContentLength(content)
        if (contentError) {
            setError(contentError)
            return
        }

        setImportState('validating')
        setError(null)

        try {
            const result = await validate({ format, content })
            setValidationResult(result)

            if (result.valid) {
                try {
                    const parsed: TemplateDefinition = format === 'json' ? JSON.parse(content) : parseYaml(content)
                    setParsedDefinition(parsed)
                } catch {
                    // Parse failed but validation passed - continue without preview
                }
                setImportState('validated')
            } else {
                const errorSummary = result.errors.length === 1 ? result.errors[0].message : `${String(result.errors.length)} validation errors found`
                setError(errorSummary)
                setImportState('error')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Validation failed')
            setImportState('error')
        }
    }, [content, format, validate])

    const handleImport = useCallback(async () => {
        setImportState('importing')
        setError(null)

        try {
            const result = await importTemplate({ format, content })
            setImportResult(result)
            setImportState('success')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed')
            setImportState('error')
        }
    }, [content, format, importTemplate])

    const handleReset = useCallback(() => {
        setContent('')
        setFormat('yaml')
        setImportState('idle')
        setValidationResult(null)
        setImportResult(null)
        setParsedDefinition(null)
        setError(null)
    }, [])

    const handleViewTemplate = useCallback(() => {
        if (importResult?.templateId) {
            navigate(`/templates/${importResult.templateId}`)
        }
    }, [importResult, navigate])

    const isLoading = importLoading || fileLoading

    const canValidate = content.trim().length > 0 && importState === 'idle'
    const canImport = importState === 'validated' && validationResult?.valid

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />
    }

    return (
        <div className={styles.container}>
            <Heading title="Import Template">
                <Button secondary onClick={() => navigate('/templates')}>
                    Back to Templates
                </Button>
            </Heading>

            {error && (
                <NoticeBox error title="Error" className={styles.notice}>
                    {error}
                </NoticeBox>
            )}

            {validationResult && !validationResult.valid && validationResult.errors.length > 0 && (
                <NoticeBox warning title="Validation Errors" className={styles.notice}>
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                        {validationResult.errors.map((err, index) => (
                            <li key={index} style={{ marginBottom: '0.25rem' }}>
                                <code style={{ fontSize: '0.85em' }}>{err.path}</code>: {err.message}
                            </li>
                        ))}
                    </ul>
                </NoticeBox>
            )}

            {importState === 'success' && importResult && (
                <Card className={styles.successCard}>
                    <div className={styles.successContent}>
                        <h3 className={styles.successTitle}>Import Successful!</h3>
                        <p className={styles.successMessage}>
                            Template <strong>{importResult.name}</strong> (version {String(importResult.version)}) has been {importResult.created ? 'created' : 'updated'}.
                        </p>
                        <div className={styles.successStats}>
                            <span>{String(importResult.categoriesCount)} categories</span>
                            <span>{String(importResult.criteriaCount)} criteria</span>
                        </div>
                        <ButtonStrip>
                            <Button primary onClick={handleViewTemplate}>
                                View Template
                            </Button>
                            <Button secondary onClick={handleReset}>
                                Import Another
                            </Button>
                        </ButtonStrip>
                    </div>
                </Card>
            )}

            {importState !== 'success' && (
                <>
                    <Card className={styles.card}>
                        <h3 className={styles.sectionTitle}>Upload File</h3>
                        <div
                            className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={handleBrowseClick}
                            role="button"
                            tabIndex={0}
                            aria-label="Drop zone for template file upload"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    handleBrowseClick()
                                }
                            }}
                        >
                            {fileLoading ? (
                                <CircularLoader small />
                            ) : (
                                <>
                                    <p className={styles.dropText}>
                                        Drag and drop a template file here, or <span className={styles.browseLink}>browse</span>
                                    </p>
                                    <p className={styles.dropHint}>
                                        Supports: {DEFAULT_TEMPLATE_LIMITS.allowedExtensions.join(', ')} (max {formatFileSize(DEFAULT_TEMPLATE_LIMITS.maxFileSize)})
                                    </p>
                                </>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={DEFAULT_TEMPLATE_LIMITS.allowedExtensions.join(',')}
                            onChange={handleFileInputChange}
                            className={styles.hiddenInput}
                            aria-hidden="true"
                        />
                    </Card>

                    <Card className={styles.card}>
                        <div className={styles.editorHeader}>
                            <h3 className={styles.sectionTitle}>Template Content</h3>
                            <div className={styles.formatSelect}>
                                <SingleSelectField selected={format} onChange={handleFormatChange} dense>
                                    <SingleSelectOption value="yaml" label="YAML" />
                                    <SingleSelectOption value="json" label="JSON" />
                                </SingleSelectField>
                            </div>
                        </div>
                        <YamlEditor value={content} onChange={handleContentChange} errors={validationResult?.errors} maxHeight="400px" aria-label="Template content editor" />
                    </Card>

                    {parsedDefinition && validationResult && (
                        <Card className={styles.card}>
                            <h3 className={styles.sectionTitle}>Preview</h3>
                            <ImportPreview definition={parsedDefinition} validationResult={validationResult} />
                        </Card>
                    )}

                    <div className={styles.actions}>
                        <ButtonStrip end>
                            <Button secondary onClick={handleReset} disabled={isLoading}>
                                Reset
                            </Button>
                            <Button secondary onClick={handleValidate} loading={importState === 'validating'} disabled={!canValidate || isLoading}>
                                {importState === 'validated' ? 'Validated' : 'Validate'}
                            </Button>
                            <Button primary onClick={handleImport} loading={importLoading} disabled={!canImport || isLoading}>
                                Import Template
                            </Button>
                        </ButtonStrip>
                    </div>
                </>
            )}
        </div>
    )
}
