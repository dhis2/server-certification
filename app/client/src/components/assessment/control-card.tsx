import { Card, Tag, TextAreaField, InputField, IconInfo16 } from '@dhis2/ui'
import type { FC } from 'react'
import { useState, useCallback } from 'react'
import { Criterion, SubmissionResponse, ComplianceStatus, ControlGroup, SaveSingleResponseDto } from '../../types/index.ts'
import { ComplianceSelector } from './compliance-selector.tsx'
import styles from './control-card.module.css'

interface ControlCardProps {
    criterion: Criterion
    response?: SubmissionResponse
    onChange: (response: SaveSingleResponseDto) => void
    disabled?: boolean
    expanded?: boolean
    'data-test'?: string
}

export const ControlCard: FC<ControlCardProps> = ({ criterion, response, onChange, disabled = false, expanded: initialExpanded = false, 'data-test': dataTest }) => {
    const [expanded, setExpanded] = useState(initialExpanded)

    const handleComplianceChange = useCallback(
        (status: ComplianceStatus) => {
            const needsRemediation = status === ComplianceStatus.NON_COMPLIANT || status === ComplianceStatus.PARTIALLY_COMPLIANT

            onChange({
                criterionId: criterion.id,
                complianceStatus: status,
                score: response?.score,
                findings: response?.findings,
                evidenceNotes: response?.evidenceNotes,
                remediationRequired: needsRemediation,
                remediationTargetDate: response?.remediationTargetDate,
                remediationOwner: response?.remediationOwner,
            })
        },
        [criterion.id, response, onChange]
    )

    const handleFieldChange = useCallback(
        (field: keyof SaveSingleResponseDto, value: string | boolean | undefined) => {
            onChange({
                criterionId: criterion.id,
                complianceStatus: response?.complianceStatus || ComplianceStatus.NOT_TESTED,
                score: response?.score,
                findings: field === 'findings' ? (value as string) : response?.findings,
                evidenceNotes: field === 'evidenceNotes' ? (value as string) : response?.evidenceNotes,
                remediationRequired: field === 'remediationRequired' ? (value as boolean) : response?.remediationRequired || false,
                remediationTargetDate: field === 'remediationTargetDate' ? (value as string) : response?.remediationTargetDate,
                remediationOwner: field === 'remediationOwner' ? (value as string) : response?.remediationOwner,
            })
        },
        [criterion.id, response, onChange]
    )

    const getCGBadgeClass = (cg: ControlGroup) => {
        switch (cg) {
            case ControlGroup.DSCP1:
                return styles.dscp1Badge
            default:
                return ''
        }
    }

    const showRemediation = response?.complianceStatus === ComplianceStatus.NON_COMPLIANT || response?.complianceStatus === ComplianceStatus.PARTIALLY_COMPLIANT

    return (
        <Card className={styles.card} data-test={dataTest}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.code}>{criterion.code}</span>
                    <h4 className={styles.name}>{criterion.name}</h4>
                </div>
                <div className={styles.badges}>
                    <Tag className={getCGBadgeClass(criterion.controlGroup)}>{criterion.controlGroup}</Tag>
                    <Tag className={criterion.controlType === 'technical' ? styles.technicalBadge : styles.orgBadge}>
                        {criterion.controlType === 'technical' ? 'Technical' : 'Organizational'}
                    </Tag>
                    {criterion.isMandatory && <Tag className={styles.mandatoryBadge}>Required</Tag>}
                </div>
            </div>

            {criterion.description && <p className={styles.description}>{criterion.description}</p>}

            <button type="button" className={styles.expandButton} onClick={() => setExpanded(!expanded)} data-test="expand-control">
                {expanded ? 'Hide Details' : 'Show Details'}
            </button>

            {expanded && (
                <div className={styles.details}>
                    {criterion.guidance && (
                        <div className={styles.guidanceSection}>
                            <h5 className={styles.sectionTitle}>
                                <IconInfo16 />
                                Verification Guidance
                            </h5>
                            <p className={styles.guidance}>{criterion.guidance}</p>
                        </div>
                    )}

                    {criterion.cisMapping && (
                        <div className={styles.mappingSection}>
                            <span className={styles.mappingLabel}>CIS Mapping:</span>
                            <span className={styles.mappingValue}>{criterion.cisMapping}</span>
                        </div>
                    )}

                    {criterion.verificationMethod && (
                        <div className={styles.mappingSection}>
                            <span className={styles.mappingLabel}>Verification Method:</span>
                            <span className={styles.mappingValue}>{criterion.verificationMethod}</span>
                        </div>
                    )}
                </div>
            )}

            <div className={styles.assessmentSection}>
                <h5 className={styles.sectionTitle}>Assessment</h5>

                <div className={styles.complianceRow}>
                    <ComplianceSelector
                        criterionId={criterion.id}
                        value={response?.complianceStatus}
                        onChange={handleComplianceChange}
                        disabled={disabled}
                        data-test="compliance-selector"
                    />
                </div>

                <div className={styles.fieldsGrid}>
                    <TextAreaField
                        label="Findings"
                        name="findings"
                        value={response?.findings || ''}
                        onChange={(payload: { value: string }) => handleFieldChange('findings', payload.value)}
                        disabled={disabled}
                        placeholder="Document your findings and observations..."
                        rows={3}
                        data-test="findings-input"
                    />

                    {criterion.evidenceRequired && (
                        <TextAreaField
                            label="Evidence Notes (Required)"
                            name="evidenceNotes"
                            value={response?.evidenceNotes || ''}
                            onChange={(payload: { value: string }) => handleFieldChange('evidenceNotes', payload.value)}
                            disabled={disabled}
                            placeholder="Document evidence collected..."
                            rows={2}
                            helpText="Evidence is required for this control"
                            data-test="evidence-input"
                        />
                    )}
                </div>

                {showRemediation && (
                    <div className={styles.remediationSection}>
                        <h5 className={styles.sectionTitle}>Remediation Tracking</h5>
                        <div className={styles.remediationGrid}>
                            <InputField
                                label="Target Date"
                                name="remediationTargetDate"
                                type="date"
                                value={response?.remediationTargetDate || ''}
                                onChange={(payload: { value: string }) => handleFieldChange('remediationTargetDate', payload.value)}
                                disabled={disabled}
                                data-test="remediation-date-input"
                            />
                            <InputField
                                label="Remediation Owner"
                                name="remediationOwner"
                                value={response?.remediationOwner || ''}
                                onChange={(payload: { value: string }) => handleFieldChange('remediationOwner', payload.value)}
                                disabled={disabled}
                                placeholder="Person responsible..."
                                data-test="remediation-owner-input"
                            />
                        </div>
                    </div>
                )}
            </div>
        </Card>
    )
}
