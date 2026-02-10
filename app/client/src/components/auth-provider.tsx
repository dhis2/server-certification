import axios, { AxiosError } from 'axios'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { AuthContext } from '../contexts/index.ts'
import { useAuthAxios, UNAUTHORIZED_EVENT, getStoredTokens, setStoredTokens, clearStoredTokens, axiosInstance, baseURL } from '../hooks/use-auth-axios.ts'
import { useIdleTimeout } from '../hooks/use-idle-timeout.ts'
import type { User, AuthTokens, LoginStep, ApiError } from '../types/index.ts'
import { Login } from './login.tsx'
import { SessionTimeoutModal } from './session-timeout-modal.tsx'

const CURRENT_USER_KEY = 'dhis2_cert_current_user'

const getUserFromStorage = (): User | null => {
    try {
        const stored = localStorage.getItem(CURRENT_USER_KEY)
        return stored ? JSON.parse(stored) : null
    } catch {
        return null
    }
}

const setUserToStorage = (user: User): void => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
}

const clearUserFromStorage = (): void => {
    localStorage.removeItem(CURRENT_USER_KEY)
}

interface PendingCredentials {
    email: string
    password: string
}

export const AuthProvider: FC = () => {
    const navigate = useNavigate()
    const [isAuthenticating, setIsAuthenticating] = useState(false)
    const [authError, setAuthError] = useState('')
    const [currentUser, setCurrentUser] = useState<User | null>(() => getUserFromStorage())
    const [loginStep, setLoginStep] = useState<LoginStep>('credentials')
    const [checkingAuth, setCheckingAuth] = useState(true)

    const [idleTimeoutMs, setIdleTimeoutMs] = useState(30 * 60 * 1000)

    const pendingCredentialsRef = useRef<PendingCredentials | null>(null)

    const isAdmin = useMemo(() => currentUser?.role?.name === 'admin' || currentUser?.role?.name === 'administrator', [currentUser])

    const [, fetchCurrentUser] = useAuthAxios<User>({ method: 'GET', url: '/auth/me' }, { manual: true, autoCatch: false })

    const [, requestLogout] = useAuthAxios<void>({ method: 'POST', url: '/auth/logout' }, { manual: true, autoCatch: false })

    const [, requestLogoutAll] = useAuthAxios<void>({ method: 'POST', url: '/auth/logout-all' }, { manual: true, autoCatch: false })

    const handleSuccessfulLogin = useCallback(
        async (tokens: AuthTokens) => {
            setStoredTokens(tokens)
            if (tokens.idleTimeoutSeconds) {
                setIdleTimeoutMs(tokens.idleTimeoutSeconds * 1000)
            }
            try {
                const userResponse = await fetchCurrentUser()
                setCurrentUser(userResponse.data)
                setUserToStorage(userResponse.data)
                setAuthError('')
                setLoginStep('credentials')
                pendingCredentialsRef.current = null
            } catch (error) {
                console.error('Failed to fetch user after login:', error)
                clearStoredTokens()
                setAuthError('Failed to load user profile')
            }
        },
        [fetchCurrentUser]
    )

    const extractErrorMessage = (error: unknown): string => {
        if (error instanceof AxiosError) {
            const data = error.response?.data as ApiError | string
            if (typeof data === 'string') {
                return data
            }
            if (data?.message) {
                return data.message
            }
            return error.message
        }
        if (error instanceof Error) {
            return error.message
        }
        return 'An unexpected error occurred'
    }

    const login = useCallback(
        async (email: string, password: string, tfaCode?: string) => {
            setIsAuthenticating(true)
            setAuthError('')

            try {
                const payload: Record<string, string> = { email, password }
                if (tfaCode) {
                    payload.tfaCode = tfaCode
                }

                const response = await axiosInstance.post<AuthTokens>('/auth/login', payload)
                await handleSuccessfulLogin(response.data)
            } catch (error) {
                const message = extractErrorMessage(error)

                if (message === 'OTP code is required') {
                    pendingCredentialsRef.current = { email, password }
                    setLoginStep('tfa')
                } else {
                    setAuthError(message)
                    if (loginStep === 'tfa') {
                        // Don't reset to credentials on TFA failure - let user retry
                    }
                }
            } finally {
                setIsAuthenticating(false)
            }
        },
        [handleSuccessfulLogin, loginStep]
    )

    const loginWithRecoveryCode = useCallback(
        async (recoveryCode: string) => {
            if (!pendingCredentialsRef.current) {
                setAuthError('Session expired. Please start over.')
                setLoginStep('credentials')
                return
            }

            setIsAuthenticating(true)
            setAuthError('')

            try {
                const { email, password } = pendingCredentialsRef.current
                const response = await axiosInstance.post<AuthTokens>('/auth/login', {
                    email,
                    password,
                    recoveryCode: recoveryCode.toUpperCase().replace(/[^A-F0-9]/g, ''),
                })
                await handleSuccessfulLogin(response.data)
            } catch (error) {
                setAuthError(extractErrorMessage(error))
            } finally {
                setIsAuthenticating(false)
            }
        },
        [handleSuccessfulLogin]
    )

    const logout = useCallback(async () => {
        try {
            await requestLogout()
        } catch (error) {
            console.error('Logout request failed:', error)
        } finally {
            clearStoredTokens()
            clearUserFromStorage()
            setCurrentUser(null)
            setLoginStep('credentials')
            pendingCredentialsRef.current = null
            navigate('/')
        }
    }, [requestLogout, navigate])

    const logoutAll = useCallback(async () => {
        try {
            await requestLogoutAll()
        } catch (error) {
            console.error('Logout all request failed:', error)
        } finally {
            clearStoredTokens()
            clearUserFromStorage()
            setCurrentUser(null)
            setLoginStep('credentials')
            pendingCredentialsRef.current = null
            navigate('/')
        }
    }, [requestLogoutAll, navigate])

    const clearAuthError = useCallback(() => setAuthError(''), [])

    const resetLoginStep = useCallback(() => {
        setLoginStep('credentials')
        pendingCredentialsRef.current = null
        setAuthError('')
    }, [])

    const refreshUser = useCallback(async () => {
        try {
            const userResponse = await fetchCurrentUser()
            setCurrentUser(userResponse.data)
            setUserToStorage(userResponse.data)
        } catch (error) {
            console.error('Failed to refresh user:', error)
        }
    }, [fetchCurrentUser])

    // Check authentication on mount using axiosInstance directly to avoid
    // axios-hooks cancellation during re-renders. The interceptor handles
    // expired access tokens by refreshing via the refresh token automatically.
    // Auth failures dispatch UNAUTHORIZED_EVENT which the listener below handles.
    useEffect(() => {
        const checkAuth = async () => {
            const tokens = getStoredTokens()
            if (!tokens?.accessToken) {
                setCheckingAuth(false)
                return
            }

            try {
                const response = await axiosInstance.get<User>('/auth/me')
                setCurrentUser(response.data)
                setUserToStorage(response.data)
            } catch {
                // Auth failures (expired refresh token) are handled by the
                // UNAUTHORIZED_EVENT listener via the axios interceptor.
                // For other errors (network), keep the cached user.
            } finally {
                setCheckingAuth(false)
            }
        }

        checkAuth()
    }, [])

    useEffect(() => {
        const handleUnauthorized = () => {
            clearStoredTokens()
            clearUserFromStorage()
            setCurrentUser(null)
            setLoginStep('credentials')
            pendingCredentialsRef.current = null
            navigate('/')
        }

        window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
        return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    }, [navigate])

    const { showWarning, remainingSeconds, resetIdle } = useIdleTimeout({
        idleTimeoutMs,
        warningBeforeMs: 120_000,
        onIdle: logout,
        enabled: !!currentUser,
    })

    const handleStayLoggedIn = useCallback(async () => {
        const tokens = getStoredTokens()
        if (!tokens?.refreshToken) {
            return
        }

        try {
            const response = await axios.post<AuthTokens>(`${baseURL}/auth/refresh-tokens`, {
                refreshToken: tokens.refreshToken,
            })
            const newTokens = response.data
            setStoredTokens(newTokens)
            if (newTokens.idleTimeoutSeconds) {
                setIdleTimeoutMs(newTokens.idleTimeoutSeconds * 1000)
            }
            resetIdle()
        } catch {
            logout()
        }
    }, [logout, resetIdle])

    if (checkingAuth) {
        return null
    }

    return (
        <AuthContext.Provider
            value={{
                currentUser,
                isAdmin,
                isAuthenticating,
                authError,
                loginStep,
                login,
                loginWithRecoveryCode,
                logout,
                logoutAll,
                refreshUser,
                clearAuthError,
                resetLoginStep,
            }}
        >
            {currentUser ? (
                <>
                    <Outlet />
                    {showWarning && <SessionTimeoutModal remainingSeconds={remainingSeconds} onStayLoggedIn={handleStayLoggedIn} onLogout={logout} />}
                </>
            ) : (
                <Login />
            )}
        </AuthContext.Provider>
    )
}
