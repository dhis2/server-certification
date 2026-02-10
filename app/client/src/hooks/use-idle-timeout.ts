import { useCallback, useEffect, useRef, useState } from 'react'

interface UseIdleTimeoutOptions {
    idleTimeoutMs: number
    warningBeforeMs: number
    onIdle: () => void
    enabled: boolean
}

interface UseIdleTimeoutReturn {
    showWarning: boolean
    remainingSeconds: number
    resetIdle: () => void
}

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'] as const
const DEBOUNCE_MS = 1000

export const useIdleTimeout = ({ idleTimeoutMs, warningBeforeMs, onIdle, enabled }: UseIdleTimeoutOptions): UseIdleTimeoutReturn => {
    const [showWarning, setShowWarning] = useState(false)
    const [remainingSeconds, setRemainingSeconds] = useState(0)

    const lastActivityRef = useRef(Date.now())
    const warningTimerRef = useRef<ReturnType<typeof setTimeout>>()
    const idleTimerRef = useRef<ReturnType<typeof setTimeout>>()
    const countdownRef = useRef<ReturnType<typeof setInterval>>()
    const debounceRef = useRef<ReturnType<typeof setTimeout>>()

    const clearAllTimers = useCallback(() => {
        clearTimeout(warningTimerRef.current)
        clearTimeout(idleTimerRef.current)
        clearInterval(countdownRef.current)
        clearTimeout(debounceRef.current)
    }, [])

    const startTimers = useCallback(() => {
        clearAllTimers()

        const warningDelay = idleTimeoutMs - warningBeforeMs

        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true)
            setRemainingSeconds(Math.ceil(warningBeforeMs / 1000))

            countdownRef.current = setInterval(() => {
                setRemainingSeconds((prev) => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }, warningDelay)

        idleTimerRef.current = setTimeout(() => {
            clearAllTimers()
            setShowWarning(false)
            onIdle()
        }, idleTimeoutMs)
    }, [idleTimeoutMs, warningBeforeMs, onIdle, clearAllTimers])

    const resetIdle = useCallback(() => {
        lastActivityRef.current = Date.now()
        setShowWarning(false)
        setRemainingSeconds(0)
        startTimers()
    }, [startTimers])

    useEffect(() => {
        if (!enabled) {
            clearAllTimers()
            setShowWarning(false)
            return
        }

        startTimers()

        const handleActivity = () => {
            if (showWarning) {
                return
            }

            clearTimeout(debounceRef.current)
            debounceRef.current = setTimeout(() => {
                lastActivityRef.current = Date.now()
                startTimers()
            }, DEBOUNCE_MS)
        }

        for (const event of ACTIVITY_EVENTS) {
            window.addEventListener(event, handleActivity, { passive: true })
        }

        return () => {
            clearAllTimers()
            for (const event of ACTIVITY_EVENTS) {
                window.removeEventListener(event, handleActivity)
            }
        }
    }, [enabled, startTimers, clearAllTimers, showWarning])

    return { showWarning, remainingSeconds, resetIdle }
}
