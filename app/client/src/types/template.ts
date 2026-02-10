export type ControlType = 'technical' | 'organizational'

export type ControlGroupType = 'DSCP1'

export interface CriterionDefinition {
    code: string
    name: string
    description?: string
    verificationMethod?: string
    guidance?: string
    controlType: ControlType
    controlGroup?: ControlGroupType
    isMandatory?: boolean
    isCriticalFail?: boolean
    evidenceRequired?: boolean
    evidenceDescription?: string
    cisMapping?: string | null
    weight?: number
    minPassingScore?: number
    maxScore?: number
    sortOrder?: number
}

export interface CategoryDefinition {
    name: string
    description?: string
    weight: number
    sortOrder: number
    criteria: CriterionDefinition[]
}

export interface TemplateDefinition {
    name: string
    version: number
    description?: string
    effectiveFrom?: string
    effectiveTo?: string
    categories: CategoryDefinition[]
}

export interface CriterionResponse {
    id: string
    code: string
    name: string
    description?: string | null
    guidance?: string | null
    verificationMethod?: string | null
    weight: number
    isMandatory: boolean
    isCriticalFail: boolean
    minPassingScore: number
    maxScore: number
    evidenceRequired: boolean
    evidenceDescription?: string | null
    sortOrder: number
    controlGroup: ControlGroupType
    controlType: ControlType
    cisMapping?: string | null
}

export interface CategoryResponse {
    id: string
    name: string
    description?: string | null
    weight: number
    sortOrder: number
    criteria?: CriterionResponse[]
}

export interface TemplateResponse {
    id: string
    name: string
    version: number
    description?: string | null
    isPublished: boolean
    parentVersionId?: string | null
    effectiveFrom?: string | null
    effectiveTo?: string | null
    createdAt: string
    updatedAt: string
    categories?: CategoryResponse[]
}

export interface TemplateEdge {
    node: TemplateResponse
    cursor: string
}

export interface TemplatePageInfo {
    hasNextPage: boolean
    endCursor: string | null
}

export interface TemplateListResponse {
    edges: TemplateEdge[]
    pageInfo: TemplatePageInfo
    totalCount: number
}

export type ImportFormat = 'yaml' | 'json'

export interface ImportRequest {
    format: ImportFormat
    content: string
}

export interface ImportResult {
    created: boolean
    updated: boolean
    templateId: string
    name: string
    version: number
    categoriesCount: number
    criteriaCount: number
}

export interface ValidationError {
    path: string
    message: string
    keyword?: string
}

export interface ValidationResult {
    valid: boolean
    errors: ValidationError[]
}

export interface ExportResult {
    content: string
    filename: string
    contentType: string
}

export type DiffChangeType = 'added' | 'removed' | 'modified'

export interface DiffChange {
    type: DiffChangeType
    path: string
    oldValue?: unknown
    newValue?: unknown
}

export interface TemplateDiff {
    fromVersion: number
    toVersion: number
    changes: DiffChange[]
}

export interface TemplateStatistics {
    totalTemplates: number
    publishedTemplates: number
    draftTemplates: number
    totalCategories: number
    totalCriteria: number
}

export interface TemplateStatusConfig {
    label: string
    color: 'positive' | 'warning' | 'negative' | 'default' | 'info'
}

export const templateStatusConfig: Record<'published' | 'draft', TemplateStatusConfig> = {
    published: {
        label: 'Published',
        color: 'positive',
    },
    draft: {
        label: 'Draft',
        color: 'warning',
    },
}

export interface ControlTypeConfig {
    label: string
    color: 'info' | 'default'
}

export const controlTypeConfig: Record<ControlType, ControlTypeConfig> = {
    technical: {
        label: 'Technical',
        color: 'info',
    },
    organizational: {
        label: 'Organizational',
        color: 'default',
    },
}

export interface TemplateFilters {
    isPublished?: boolean
    search?: string
    first?: number
    after?: string
}

export interface TemplateConfig {
    maxFileSize: number
    maxContentLength: number
    allowedExtensions: readonly string[]
    allowedMimeTypes: readonly string[]
    maxNameLength: number
    maxDescriptionLength: number
    maxCriteriaPerCategory: number
    maxCategoriesPerTemplate: number
    maxCriterionCodeLength: number
    maxCriterionNameLength: number
    maxCriterionDescriptionLength: number
    maxGuidanceLength: number
    maxEvidenceDescriptionLength: number
    maxVerificationMethodLength: number
    maxCisMappingLength: number
    maxFilenameLength: number
}

export type ImportState = 'idle' | 'validating' | 'validated' | 'importing' | 'success' | 'error'

export interface ImportContext {
    state: ImportState
    content: string
    format: ImportFormat
    validationResult: ValidationResult | null
    importResult: ImportResult | null
    error: Error | null
    parsedDefinition: TemplateDefinition | null
}
