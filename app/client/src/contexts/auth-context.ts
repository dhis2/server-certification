import { createContext } from 'react'
import type { User, LoginStep } from '../types/index.ts'

export interface AuthContextApi {
    currentUser: User | null
    isAdmin: boolean
    isAuthenticating: boolean
    authError: string
    loginStep: LoginStep
    login: (email: string, password: string, tfaCode?: string) => Promise<void>
    loginWithRecoveryCode: (recoveryCode: string) => Promise<void>
    logout: () => Promise<void>
    logoutAll: () => Promise<void>
    refreshUser: () => Promise<void>
    clearAuthError: () => void
    resetLoginStep: () => void
}

const throwIfUninitialized = (): never => {
    throw new Error('Attempted to use `AuthContext` before initialization. Ensure the component is wrapped in an `AuthProvider`.')
}

export const AuthContext = createContext<AuthContextApi>({
    currentUser: null,
    isAdmin: false,
    isAuthenticating: false,
    authError: '',
    loginStep: 'credentials',
    login: throwIfUninitialized,
    loginWithRecoveryCode: throwIfUninitialized,
    logout: throwIfUninitialized,
    logoutAll: throwIfUninitialized,
    refreshUser: throwIfUninitialized,
    clearAuthError: () => {},
    resetLoginStep: () => {},
})
