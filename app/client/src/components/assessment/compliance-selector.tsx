import { Radio, Tag } from '@dhis2/ui'
import type { FC } from 'react'
import { ComplianceStatus, complianceStatusConfig } from '../../types/index.ts'
import styles from './compliance-selector.module.css'

interface ComplianceSelectorProps {
    criterionId: string
    value: ComplianceStatus | undefined
    onChange: (status: ComplianceStatus) => void
    disabled?: boolean
    showHelp?: boolean
    'data-test'?: string
}

const statusOrder: ComplianceStatus[] = [
    ComplianceStatus.COMPLIANT,
    ComplianceStatus.PARTIALLY_COMPLIANT,
    ComplianceStatus.NON_COMPLIANT,
    ComplianceStatus.NOT_APPLICABLE,
    ComplianceStatus.NOT_TESTED,
]

export const ComplianceSelector: FC<ComplianceSelectorProps> = ({ criterionId, value, onChange, disabled = false, showHelp = false, 'data-test': dataTest }) => {
    return (
        <div className={styles.container} data-test={dataTest}>
            <div className={styles.radioGroup}>
                {statusOrder.map((status) => {
                    const config = complianceStatusConfig[status]
                    return (
                        <div key={status} className={styles.optionWrapper}>
                            <Radio
                                name={`complianceStatus-${criterionId}`}
                                label={config.label}
                                value={status}
                                checked={value === status}
                                onChange={() => onChange(status)}
                                disabled={disabled}
                                data-test={`compliance-option-${status}`}
                            />
                            <Tag className={styles[config.color]}>{config.label}</Tag>
                        </div>
                    )
                })}
            </div>

            {showHelp && (
                <div className={styles.helpSection}>
                    <p className={styles.helpText}>
                        <strong>Compliant:</strong> Control is fully implemented and verified.
                    </p>
                    <p className={styles.helpText}>
                        <strong>Partially Compliant:</strong> Control is partially implemented.
                    </p>
                    <p className={styles.helpText}>
                        <strong>Non-Compliant:</strong> Control is not implemented.
                    </p>
                    <p className={styles.helpText}>
                        <strong>Not Applicable:</strong> Control does not apply to this environment.
                    </p>
                    <p className={styles.helpText}>
                        <strong>Not Tested:</strong> Control has not been assessed yet.
                    </p>
                </div>
            )}
        </div>
    )
}
