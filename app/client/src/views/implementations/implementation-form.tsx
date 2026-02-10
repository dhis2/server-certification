import { InputField, TextAreaField } from '@dhis2/ui'
import { useState, useCallback } from 'react'
import type { FC, FormEvent } from 'react'
import type { CreateImplementationDto, Implementation } from '../../types'
import styles from './implementation-form.module.css'

interface ImplementationFormProps {
    initialData?: Implementation
    onSubmit: (data: CreateImplementationDto) => Promise<void>
    isSubmitting?: boolean
}

interface FormErrors {
    name?: string
    contactEmail?: string
    dhis2InstanceUrl?: string
}

const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

const validateUrl = (url: string): boolean => {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

export const ImplementationForm: FC<ImplementationFormProps> = ({ initialData, onSubmit, isSubmitting = false }) => {
    const [formData, setFormData] = useState<CreateImplementationDto>({
        name: initialData?.name || '',
        country: initialData?.country || '',
        contactEmail: initialData?.contactEmail || '',
        contactPhone: initialData?.contactPhone || '',
        description: initialData?.description || '',
        dhis2InstanceUrl: initialData?.dhis2InstanceUrl || '',
        dhis2Version: initialData?.dhis2Version || '',
    })

    const [errors, setErrors] = useState<FormErrors>({})
    const [touched, setTouched] = useState<Set<string>>(new Set())

    const validate = useCallback((): FormErrors => {
        const newErrors: FormErrors = {}

        if (!formData.name.trim()) {
            newErrors.name = 'Implementation name is required'
        }

        if (formData.contactEmail && !validateEmail(formData.contactEmail)) {
            newErrors.contactEmail = 'Please enter a valid email address'
        }

        if (formData.dhis2InstanceUrl && !validateUrl(formData.dhis2InstanceUrl)) {
            newErrors.dhis2InstanceUrl = 'Please enter a valid URL'
        }

        return newErrors
    }, [formData])

    const handleChange = useCallback((field: keyof CreateImplementationDto, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }, [])

    const handleBlur = useCallback(
        (field: string) => {
            setTouched((prev) => new Set(prev).add(field))
            setErrors(validate())
        },
        [validate]
    )

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault()
            const validationErrors = validate()
            setErrors(validationErrors)
            setTouched(new Set(Object.keys(formData)))

            if (Object.keys(validationErrors).length === 0) {
                // Filter out empty optional fields to avoid backend validation errors
                const cleanedData: CreateImplementationDto = {
                    name: formData.name,
                    ...(formData.country?.trim() && { country: formData.country.trim() }),
                    ...(formData.contactEmail?.trim() && { contactEmail: formData.contactEmail.trim() }),
                    ...(formData.contactPhone?.trim() && { contactPhone: formData.contactPhone.trim() }),
                    ...(formData.description?.trim() && { description: formData.description.trim() }),
                    ...(formData.dhis2InstanceUrl?.trim() && { dhis2InstanceUrl: formData.dhis2InstanceUrl.trim() }),
                    ...(formData.dhis2Version?.trim() && { dhis2Version: formData.dhis2Version.trim() }),
                }
                await onSubmit(cleanedData)
            }
        },
        [formData, validate, onSubmit]
    )

    const getError = (field: keyof FormErrors): string | undefined => {
        return touched.has(field) ? errors[field] : undefined
    }

    return (
        <form id="implementation-form" onSubmit={handleSubmit} className={styles.form}>
            <InputField
                label="Implementation Name"
                name="name"
                value={formData.name}
                onChange={(e: { value: string }) => handleChange('name', e.value)}
                onBlur={() => handleBlur('name')}
                required
                disabled={isSubmitting}
                error={!!getError('name')}
                validationText={getError('name')}
                data-test="impl-name-input"
            />

            <InputField
                label="Country"
                name="country"
                value={formData.country || ''}
                onChange={(e: { value: string }) => handleChange('country', e.value)}
                disabled={isSubmitting}
                data-test="impl-country-input"
            />

            <InputField
                label="Contact Email"
                name="contactEmail"
                type="email"
                value={formData.contactEmail || ''}
                onChange={(e: { value: string }) => handleChange('contactEmail', e.value)}
                onBlur={() => handleBlur('contactEmail')}
                disabled={isSubmitting}
                error={!!getError('contactEmail')}
                validationText={getError('contactEmail')}
                helpText="Contact person for this implementation (not a login account)"
                data-test="impl-email-input"
            />

            <InputField
                label="Contact Phone"
                name="contactPhone"
                value={formData.contactPhone || ''}
                onChange={(e: { value: string }) => handleChange('contactPhone', e.value)}
                disabled={isSubmitting}
                data-test="impl-phone-input"
            />

            <InputField
                label="DHIS2 Instance URL"
                name="dhis2InstanceUrl"
                type="url"
                value={formData.dhis2InstanceUrl || ''}
                onChange={(e: { value: string }) => handleChange('dhis2InstanceUrl', e.value)}
                onBlur={() => handleBlur('dhis2InstanceUrl')}
                disabled={isSubmitting}
                error={!!getError('dhis2InstanceUrl')}
                validationText={getError('dhis2InstanceUrl')}
                placeholder="https://dhis2.example.org"
                helpText="URL of the DHIS2 server being assessed"
                data-test="impl-url-input"
            />

            <InputField
                label="DHIS2 Version"
                name="dhis2Version"
                value={formData.dhis2Version || ''}
                onChange={(e: { value: string }) => handleChange('dhis2Version', e.value)}
                disabled={isSubmitting}
                placeholder="e.g., 2.40.2"
                data-test="impl-version-input"
            />

            <TextAreaField
                label="Description"
                name="description"
                value={formData.description || ''}
                onChange={(e: { value: string }) => handleChange('description', e.value)}
                disabled={isSubmitting}
                rows={3}
                placeholder="Optional description of the DHIS2 implementation being assessed..."
                data-test="impl-description-input"
            />
        </form>
    )
}
