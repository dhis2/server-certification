import { useState, useCallback, useRef, useEffect } from 'react'

interface UseFileReaderReturn {
    readFile: (file: File) => Promise<string>
    loading: boolean
    error: Error | null
}

export const useFileReader = (): UseFileReaderReturn => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const activeReaderRef = useRef<FileReader | null>(null)
    const isMountedRef = useRef(true)

    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            activeReaderRef.current?.abort()
        }
    }, [])

    const readFile = useCallback((file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            setLoading(true)
            setError(null)

            if (activeReaderRef.current) {
                activeReaderRef.current.abort()
            }

            const reader = new FileReader()
            activeReaderRef.current = reader

            reader.onload = () => {
                if (!isMountedRef.current) {
                    return
                }
                setLoading(false)
                if (typeof reader.result === 'string') {
                    resolve(reader.result)
                } else {
                    const readError = new Error('Failed to read file as text')
                    setError(readError)
                    reject(readError)
                }
            }

            reader.onerror = () => {
                if (!isMountedRef.current) {
                    return
                }
                setLoading(false)
                const readError = new Error('Failed to read file')
                setError(readError)
                reject(readError)
            }

            reader.onabort = () => {
                if (!isMountedRef.current) {
                    return
                }
                setLoading(false)
                const abortError = new Error('File read was aborted')
                setError(abortError)
                reject(abortError)
            }

            reader.readAsText(file)
        })
    }, [])

    return { readFile, loading, error }
}
