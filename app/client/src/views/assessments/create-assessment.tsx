import { Button, Card, CircularLoader, NoticeBox, SingleSelectField, SingleSelectOption, InputField, TextAreaField, ButtonStrip, Radio } from '@dhis2/ui'
import { useState, useCallback, useEffect } from 'react'
import type { FC, FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Heading } from '../../components/index.ts'
import { useImplementations, useTemplates, useSubmissions } from '../../hooks/index.ts'
import { ControlGroup, controlGroupConfig, type CreateSubmissionDto } from '../../types/index.ts'
import styles from './create-assessment.module.css'

interface FormErrors {
    implementationId?: string
    templateId?: string
    submit?: string
}

export const CreateAssessment: FC = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const preselectedImplId = searchParams.get('implementationId')

    const { implementations, loading: implsLoading } = useImplementations()
    const { templates, loading: templatesLoading } = useTemplates()
    const { createSubmission } = useSubmissions()

    const [formData, setFormData] = useState<CreateSubmissionDto>({
        implementationId: preselectedImplId || '',
        templateId: '',
        targetControlGroup: ControlGroup.DSCP1,
        assessorName: '',
        assessmentDate: new Date().toISOString().split('T')[0],
        systemEnvironment: '',
    })

    const [errors, setErrors] = useState<FormErrors>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (preselectedImplId) {
            setFormData((prev) => ({ ...prev, implementationId: preselectedImplId }))
        }
    }, [preselectedImplId])

    useEffect(() => {
        if (templates.length === 1 && !formData.templateId) {
            setFormData((prev) => ({ ...prev, templateId: templates[0].id }))
        }
    }, [templates, formData.templateId])

    const validate = useCallback((): FormErrors => {
        const newErrors: FormErrors = {}
        if (!formData.implementationId) {
            newErrors.implementationId = 'Please select an implementation'
        }
        if (!formData.templateId) {
            newErrors.templateId = 'Please select a template'
        }
        return newErrors
    }, [formData])

    const handleChange = useCallback(<K extends keyof CreateSubmissionDto>(field: K, value: CreateSubmissionDto[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }, [])

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault()
            const validationErrors = validate()
            setErrors(validationErrors)

            if (Object.keys(validationErrors).length > 0) {
                return
            }

            setIsSubmitting(true)
            try {
                const submission = await createSubmission(formData)
                navigate(`/assessments/${submission.id}`)
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to create assessment'
                setErrors((prev) => ({ ...prev, submit: message }))
            } finally {
                setIsSubmitting(false)
            }
        },
        [formData, validate, createSubmission, navigate]
    )

    const isLoading = implsLoading || templatesLoading

    if (isLoading) {
        return (
            <div className={styles.container}>
                <Heading title="New Assessment" />
                <div className={styles.loadingContainer}>
                    <CircularLoader />
                </div>
            </div>
        )
    }

    if (implementations.length === 0) {
        return (
            <div className={styles.container}>
                <Heading title="New Assessment" />
                <NoticeBox warning title="No Implementations">
                    You need to create an implementation before starting an assessment.
                    <Button small primary onClick={() => navigate('/implementations')}>
                        Go to Implementations
                    </Button>
                </NoticeBox>
            </div>
        )
    }

    if (templates.length === 0) {
        return (
            <div className={styles.container}>
                <Heading title="New Assessment" />
                <NoticeBox warning title="No Templates Available">
                    No published assessment templates are available. Please contact an administrator.
                </NoticeBox>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Button small secondary onClick={() => navigate('/assessments')}>
                    ← Back
                </Button>
                <Heading title="New Assessment" />
            </div>

            <Card className={styles.card}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Assessment Setup</h3>

                        <SingleSelectField
                            label="Implementation"
                            selected={formData.implementationId}
                            onChange={(e: { selected: string }) => handleChange('implementationId', e.selected)}
                            error={!!errors.implementationId}
                            validationText={errors.implementationId}
                            required
                            data-test="select-implementation"
                        >
                            <SingleSelectOption value="" label="Select an implementation..." />
                            {implementations.map((impl) => (
                                <SingleSelectOption key={impl.id} value={impl.id} label={impl.name} />
                            ))}
                        </SingleSelectField>

                        <SingleSelectField
                            label="Assessment Template"
                            selected={formData.templateId}
                            onChange={(e: { selected: string }) => handleChange('templateId', e.selected)}
                            error={!!errors.templateId}
                            validationText={errors.templateId}
                            required
                            data-test="select-template"
                        >
                            <SingleSelectOption value="" label="Select a template..." />
                            {templates.map((template) => (
                                <SingleSelectOption key={template.id} value={template.id} label={`${template.name} v${template.version}`} />
                            ))}
                        </SingleSelectField>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Target Assessment Level</h3>
                        <p className={styles.sectionDescription}>Select the server quality assurance level you want to certify for.</p>

                        <div className={styles.igOptions}>
                            {Object.entries(controlGroupConfig).map(([key, config]) => (
                                <div key={key} className={styles.igOption}>
                                    <Radio
                                        name="targetControlGroup"
                                        value={key}
                                        label={config.label}
                                        checked={formData.targetControlGroup === key}
                                        onChange={() => handleChange('targetControlGroup', key as ControlGroup)}
                                        data-test={`ig-option-${key}`}
                                    />
                                    <span className={styles.igDescription}>{config.description}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Assessment Details</h3>

                        <div className={styles.fieldGrid}>
                            <InputField
                                label="Assessor Name"
                                name="assessorName"
                                value={formData.assessorName || ''}
                                onChange={(e: { value: string }) => handleChange('assessorName', e.value)}
                                placeholder="Name of the person conducting the assessment"
                                data-test="assessor-name"
                            />

                            <InputField
                                label="Assessment Date"
                                name="assessmentDate"
                                type="date"
                                value={formData.assessmentDate || ''}
                                onChange={(e: { value: string }) => handleChange('assessmentDate', e.value)}
                                data-test="assessment-date"
                            />
                        </div>

                        <TextAreaField
                            label="System Environment"
                            name="systemEnvironment"
                            value={formData.systemEnvironment || ''}
                            onChange={(e: { value: string }) => handleChange('systemEnvironment', e.value)}
                            rows={3}
                            placeholder="Describe the system environment being assessed (e.g., production, staging, infrastructure details)..."
                            data-test="system-environment"
                        />
                    </div>

                    {errors.submit && (
                        <NoticeBox error title="Error">
                            {errors.submit}
                        </NoticeBox>
                    )}

                    <div className={styles.formActions}>
                        <ButtonStrip end>
                            <Button secondary onClick={() => navigate('/assessments')}>
                                Cancel
                            </Button>
                            <Button primary type="submit" loading={isSubmitting} data-test="create-assessment-submit">
                                Start Assessment
                            </Button>
                        </ButtonStrip>
                    </div>
                </form>
            </Card>
        </div>
    )
}
