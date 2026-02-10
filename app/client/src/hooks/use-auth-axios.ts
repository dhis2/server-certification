import axios, { AxiosError } from 'axios'
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { makeUseAxios } from 'axios-hooks'
import type { Options, UseAxiosResult } from 'axios-hooks'
import { useCallback } from 'react'
import type { AuthTokens } from '../types/index.ts'

if (!import.meta.env.VITE_API_URL) {
    throw new Error('No baseURL found. Ensure VITE_API_URL environment variable is set')
}

export const baseURL = import.meta.env.VITE_API_URL
export const UNAUTHORIZED_EVENT = 'DHIS2_CERT_UNAUTHORIZED_EVENT'

const TOKEN_STORAGE_KEY = 'dhis2_cert_tokens'

// TODO: Use secure storage
export const getStoredTokens = (): AuthTokens | null => {
    try {
        const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
        return stored ? JSON.parse(stored) : null
    } catch {
        return null
    }
}

export const setStoredTokens = (tokens: AuthTokens): void => {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens))
}

export const clearStoredTokens = (): void => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
}

const dispatchUnauthorizedEvent = (): void => {
    const event = new CustomEvent(UNAUTHORIZED_EVENT)
    window.dispatchEvent(event)
}

let isRefreshing = false
let failedQueue: Array<{
    resolve: (token: string) => void
    reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null): void => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token!)
        }
    })
    failedQueue = []
}

export const axiosInstance = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
})

axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const tokens = getStoredTokens()
        if (tokens?.accessToken && config.headers) {
            config.headers.Authorization = `Bearer ${tokens.accessToken}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

        if (!originalRequest || error.response?.status !== 401) {
            return Promise.reject(error)
        }

        if (originalRequest._retry) {
            dispatchUnauthorizedEvent()
            return Promise.reject(error)
        }

        if (isRefreshing) {
            return new Promise<string>((resolve, reject) => {
                failedQueue.push({ resolve, reject })
            })
                .then((token) => {
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`
                    }
                    return axiosInstance(originalRequest)
                })
                .catch((err) => Promise.reject(err))
        }

        originalRequest._retry = true
        isRefreshing = true

        const tokens = getStoredTokens()
        if (!tokens?.refreshToken) {
            isRefreshing = false
            dispatchUnauthorizedEvent()
            return Promise.reject(error)
        }

        try {
            const response = await axios.post<AuthTokens>(`${baseURL}/auth/refresh-tokens`, {
                refreshToken: tokens.refreshToken,
            })

            const newTokens = response.data
            setStoredTokens(newTokens)

            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`
            }

            processQueue(null, newTokens.accessToken)
            return axiosInstance(originalRequest)
        } catch (refreshError) {
            processQueue(refreshError, null)
            clearStoredTokens()
            dispatchUnauthorizedEvent()
            return Promise.reject(refreshError)
        } finally {
            isRefreshing = false
        }
    }
)

const useAxiosWithJwt = makeUseAxios({
    axios: axiosInstance,
    defaultOptions: {
        ssr: false,
    },
})

interface UseAuthAxiosOptions extends Options {
    autoCatch?: boolean
}

interface UseAuthAxios {
    <TResponse = unknown, TBody = unknown, TError = unknown>(config: AxiosRequestConfig<TBody> | string, options?: UseAuthAxiosOptions): UseAxiosResult<TResponse, TBody, TError>
}

const useAuthAxios: UseAuthAxios = (urlOrConfigObject, options = {}) => {
    const useAxiosResult: UseAxiosResult = useAxiosWithJwt(urlOrConfigObject, options)
    const [, execute] = useAxiosResult

    const executeWithAutoCatch = useCallback(
        async (...args: Parameters<typeof execute>) => {
            try {
                return await execute(...args)
            } catch (error) {
                console.error(error)
            }
        },
        [execute]
    )

    if (options.autoCatch) {
        return [useAxiosResult[0], executeWithAutoCatch as typeof execute, useAxiosResult[2]] as typeof useAxiosResult
    }
    return useAxiosResult
}

export { useAuthAxios }
