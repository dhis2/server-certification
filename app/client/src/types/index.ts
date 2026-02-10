export interface Role {
    id: string
    name: string
    description?: string
}

export interface User {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    role: Role | null
    isTfaEnabled: boolean
    createdAt: string
    updatedAt: string
}

export interface AuthTokens {
    accessToken: string
    refreshToken: string
    sessionExpiresAt?: string
    idleTimeoutSeconds?: number
}

export interface LoginRequest {
    email: string
    password: string
    tfaCode?: string
    recoveryCode?: string
}

export interface LoginResponse extends AuthTokens {}

export interface RefreshTokenRequest {
    refreshToken: string
}

export interface TfaSetupResponse {
    otpauthUrl: string
    qrCode: string
    recoveryCodes: string[]
    message: string
}

export interface TfaVerifyRequest {
    code: string
}

export interface TfaDisableRequest {
    password: string
    code: string
}

export interface RecoveryCodesResponse {
    recoveryCodes: string[]
}

export interface ApiError {
    statusCode: number
    message: string
    error?: string
    timestamp?: string
    path?: string
}

export type LoginStep = 'credentials' | 'tfa' | 'recovery'

export * from './assessment.ts'

export * from './audit.ts'

export * from './monitoring.ts'

export * from './pagination.ts'

export * from './signing.ts'

export * from './template.ts'

export * from './user.ts'
