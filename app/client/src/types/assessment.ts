export enum ControlGroup {
    DSCP1 = 'DSCP1',
}

export enum SubmissionStatus {
    DRAFT = 'draft',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    PASSED = 'passed',
    FAILED = 'failed',
    WITHDRAWN = 'withdrawn',
}

export enum ComplianceStatus {
    COMPLIANT = 'compliant',
    PARTIALLY_COMPLIANT = 'partially_compliant',
    NON_COMPLIANT = 'non_compliant',
    NOT_APPLICABLE = 'not_applicable',
    NOT_TESTED = 'not_tested',
}

export enum CertificationResult {
    PASS = 'pass',
    FAIL = 'fail',
}

export interface Implementation {
    id: string
    name: string
    country?: string
    contactEmail?: string
    contactPhone?: string
    description?: string
    dhis2InstanceUrl?: string // The DHIS2 server being assessed
    dhis2Version?: string
    isActive?: boolean
    createdAt?: string
    updatedAt?: string
}

export interface Criterion {
    id: string
    code: string
    name: string
    description?: string
    guidance?: string
    controlGroup: ControlGroup
    controlType: 'technical' | 'organizational'
    cisMapping?: string
    verificationMethod?: string
    weight: number
    isMandatory: boolean
    evidenceRequired: boolean
    evidenceDescription?: string
}

export interface Category {
    id: string
    name: string
    description?: string
    weight: number
    sortOrder: number
    criteria: Criterion[]
}

export interface AssessmentTemplate {
    id: string
    name: string
    version: string
    description?: string
    isPublished: boolean
    categories: Category[]
}

export interface SubmissionResponse {
    id: string
    criterionId: string
    complianceStatus: ComplianceStatus
    score?: number
    findings?: string
    evidenceNotes?: string
    remediationRequired: boolean
    remediationTargetDate?: string
    remediationOwner?: string
    createdAt?: string
    updatedAt?: string
}

export interface Submission {
    id: string
    implementationId: string
    implementation?: Implementation
    templateId: string
    template?: AssessmentTemplate
    targetControlGroup: ControlGroup
    status: SubmissionStatus
    assessorName?: string
    assessmentDate?: string
    systemEnvironment?: string
    currentCategoryIndex: number
    totalScore?: number
    certificationResult?: CertificationResult
    isCertified: boolean
    certificateNumber?: string
    completedAt?: string
    finalizedAt?: string
    assessorNotes?: string
    responses: SubmissionResponse[]
    createdById: string
    createdAt: string
    updatedAt: string
}
export interface CategoryScore {
    categoryId: string
    categoryName: string
    score: number
    completionRate: number
}

export interface NonCompliantControl {
    code: string
    name: string
    controlGroup: string
    complianceStatus: ComplianceStatus
    isBlocker: boolean
}

export interface AssessmentSummary {
    submission: Submission
    categoryScores: CategoryScore[]
    overallScore: number
    completionRate: number
    passesTargetCG: boolean
    certificationResult: CertificationResult | null
    nonCompliantControls: NonCompliantControl[]
    canResume: boolean
}

export interface CreateImplementationDto {
    name: string
    country?: string
    contactEmail?: string
    contactPhone?: string
    description?: string
    dhis2InstanceUrl?: string
    dhis2Version?: string
}

export interface UpdateImplementationDto extends Partial<CreateImplementationDto> {}

export interface ImplementationEdge {
    node: Implementation
    cursor: string
}

export interface ImplementationsConnection {
    edges: ImplementationEdge[]
    pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
    }
    totalCount: number
}

export interface CreateSubmissionDto {
    implementationId: string
    templateId: string
    targetControlGroup?: ControlGroup
    assessorName?: string
    assessmentDate?: string
    systemEnvironment?: string
}

export interface SaveSingleResponseDto {
    criterionId: string
    complianceStatus: ComplianceStatus
    score?: number
    findings?: string
    evidenceNotes?: string
    remediationRequired?: boolean
    remediationTargetDate?: string
    remediationOwner?: string
}

export interface SaveResponsesDto {
    responses: SaveSingleResponseDto[]
    currentCategoryIndex?: number
}

export interface FinalizeSubmissionDto {
    assessorNotes?: string
}

export interface ComplianceStatusConfig {
    label: string
    color: 'positive' | 'warning' | 'negative' | 'default' | 'info'
    icon: string | null
    score: number | null
}

export interface SubmissionStatusConfig {
    label: string
    color: 'positive' | 'warning' | 'negative' | 'default' | 'info'
}

export interface ControlGroupConfig {
    label: string
    description: string
}

export const complianceStatusConfig: Record<ComplianceStatus, ComplianceStatusConfig> = {
    [ComplianceStatus.COMPLIANT]: {
        label: 'Compliant',
        color: 'positive',
        icon: 'IconCheckmark24',
        score: 100,
    },
    [ComplianceStatus.PARTIALLY_COMPLIANT]: {
        label: 'Partially Compliant',
        color: 'warning',
        icon: 'IconWarning24',
        score: 50,
    },
    [ComplianceStatus.NON_COMPLIANT]: {
        label: 'Non-Compliant',
        color: 'negative',
        icon: 'IconCross24',
        score: 0,
    },
    [ComplianceStatus.NOT_APPLICABLE]: {
        label: 'Not Applicable',
        color: 'default',
        icon: 'IconInfo24',
        score: null,
    },
    [ComplianceStatus.NOT_TESTED]: {
        label: 'Not Tested',
        color: 'default',
        icon: null,
        score: 0,
    },
}

export const submissionStatusConfig: Record<SubmissionStatus, SubmissionStatusConfig> = {
    [SubmissionStatus.DRAFT]: {
        label: 'Draft',
        color: 'default',
    },
    [SubmissionStatus.IN_PROGRESS]: {
        label: 'In Progress',
        color: 'info',
    },
    [SubmissionStatus.COMPLETED]: {
        label: 'Completed',
        color: 'info',
    },
    [SubmissionStatus.PASSED]: {
        label: 'Passed',
        color: 'positive',
    },
    [SubmissionStatus.FAILED]: {
        label: 'Failed',
        color: 'negative',
    },
    [SubmissionStatus.WITHDRAWN]: {
        label: 'Withdrawn',
        color: 'default',
    },
}

export const controlGroupConfig: Record<ControlGroup, ControlGroupConfig> = {
    [ControlGroup.DSCP1]: {
        label: 'DSCP1 - Minimum Quality Assurance',
        description: 'Minimum DHIS2 server deployment, performance and security good practices',
    },
}

export interface CredentialSubjectResult {
    type: 'Result'
    resultDescription: string
    value: string
}

export interface CredentialSubjectAchievement {
    id: string
    type: 'Achievement'
    name: string
    description: string
    achievementType: 'Certificate'
    criteria: {
        narrative: string
    }
}

export interface CredentialSubject {
    type: 'AchievementSubject'
    id: string
    achievement: CredentialSubjectAchievement
    result: CredentialSubjectResult[]
}

export interface CredentialIssuer {
    id: string
    type: 'Profile'
    name: string
}

export interface CredentialStatus {
    id: string
    type: 'BitstringStatusListEntry'
    statusPurpose: 'revocation'
    statusListIndex: string
    statusListCredential: string
}

export interface DataIntegrityProof {
    type: 'DataIntegrityProof'
    cryptosuite: string
    verificationMethod: string
    proofPurpose: string
    proofValue: string
    created?: string
}

export interface DHIS2ServerCredential {
    '@context': string[]
    id: string
    type: string[]
    issuer: CredentialIssuer
    validFrom: string
    validUntil: string
    credentialSubject: CredentialSubject
    credentialStatus: CredentialStatus
    proof?: DataIntegrityProof
}

export interface Certificate {
    id: string
    submissionId: string
    implementationId: string
    certificateNumber: string
    certificationResult: CertificationResult
    controlGroup: ControlGroup
    finalScore: number
    validFrom: string
    validUntil: string
    verificationCode: string
    vcJson: DHIS2ServerCredential
    isRevoked: boolean
    revokedAt?: string
    revocationReason?: string
    issuedAt: string
    implementation?: Implementation
}

export interface VerificationResult {
    valid: boolean
    certificate?: Certificate
    checks: {
        found: boolean
        notRevoked: boolean
        notExpired: boolean
        integrityValid: boolean
    }
}

export interface SubmissionFilters {
    implementationId?: string
    status?: SubmissionStatus
    targetControlGroup?: ControlGroup
    dateFrom?: string
    dateTo?: string
}

export interface SortOptions {
    field: string
    direction: 'asc' | 'desc'
}
