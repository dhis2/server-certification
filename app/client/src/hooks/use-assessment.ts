import { useState, useEffect, useCallback, useRef } from 'react'
import type { Submission, SubmissionResponse, SaveResponsesDto, SaveSingleResponseDto, FinalizeSubmissionDto, AssessmentSummary } from '../types'
import { useAuthAxios } from './use-auth-axios.ts'

interface UseAssessmentOptions {
    autoSaveDelay?: number
}

interface UseAssessmentReturn {
    submission: Submission | null
    summary: AssessmentSummary | null
    loading: boolean
    saving: boolean
    error: Error | null
    pendingChanges: boolean
    lastSaved: Date | null
    saveResponses: (responses: SaveSingleResponseDto[], categoryIndex?: number) => Promise<void>
    saveImmediately: () => Promise<void>
    complete: () => Promise<Submission>
    finalize: (dto?: FinalizeSubmissionDto) => Promise<Submission>
    resume: () => Promise<Submission>
    withdraw: () => Promise<void>
    refetch: () => void
}

export const useAssessment = (submissionId: string | undefined, options: UseAssessmentOptions = {}): UseAssessmentReturn => {
    const { autoSaveDelay = 2000 } = options

    const [submission, setSubmission] = useState<Submission | null>(null)
    const [summary, setSummary] = useState<AssessmentSummary | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [pendingChanges, setPendingChanges] = useState(false)
    const [lastSaved, setLastSaved] = useState<Date | null>(null)

    const pendingResponsesRef = useRef<SaveSingleResponseDto[]>([])
    const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isMountedRef = useRef(true)

    const [{ data: submissionData, loading: fetchLoading, error: fetchError }, fetchSubmission] = useAuthAxios<Submission>(
        { url: submissionId ? `/submissions/${submissionId}` : '', method: 'GET' },
        { manual: true }
    )

    const [{ data: summaryData, loading: summaryLoading }, fetchSummary] = useAuthAxios<AssessmentSummary>(
        { url: submissionId ? `/submissions/${submissionId}/summary` : '', method: 'GET' },
        { manual: true }
    )

    const [, executeSave] = useAuthAxios({ method: 'PATCH' }, { manual: true })

    const [, executeComplete] = useAuthAxios<Submission>({ method: 'POST' }, { manual: true })

    const [, executeFinalize] = useAuthAxios<Submission>({ method: 'POST' }, { manual: true })

    const [, executeResume] = useAuthAxios<Submission>({ method: 'POST' }, { manual: true })

    const [, executeWithdraw] = useAuthAxios({ method: 'POST' }, { manual: true })

    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
        }
    }, [])

    useEffect(() => {
        if (submissionId) {
            fetchSubmission().catch(() => {})
            fetchSummary().catch(() => {})
        }
    }, [submissionId, fetchSubmission, fetchSummary])

    useEffect(() => {
        if (submissionData) {
            setSubmission(submissionData)
        }
    }, [submissionData])

    useEffect(() => {
        if (summaryData) {
            setSummary(summaryData)
        }
    }, [summaryData])

    useEffect(() => {
        setLoading(fetchLoading || summaryLoading)
    }, [fetchLoading, summaryLoading])

    useEffect(() => {
        if (fetchError) {
            setError(new Error(fetchError.message || 'Failed to fetch assessment'))
        } else {
            setError(null)
        }
    }, [fetchError])

    const flushPendingChanges = useCallback(async () => {
        if (pendingResponsesRef.current.length === 0 || !submissionId) {
            return
        }

        if (isMountedRef.current) {
            setSaving(true)
        }
        try {
            const dto: SaveResponsesDto = {
                responses: [...pendingResponsesRef.current],
            }
            await executeSave({
                url: `/submissions/${submissionId}/responses`,
                data: dto,
            })
            pendingResponsesRef.current = []
            if (isMountedRef.current) {
                setPendingChanges(false)
                setLastSaved(new Date())
                setError(null)
            }
        } catch (err) {
            if (isMountedRef.current) {
                setError(err instanceof Error ? err : new Error('Failed to save responses'))
            }
        } finally {
            if (isMountedRef.current) {
                setSaving(false)
            }
        }
    }, [submissionId, executeSave])

    const saveResponses = useCallback(
        async (responses: SaveSingleResponseDto[], categoryIndex?: number): Promise<void> => {
            for (const response of responses) {
                const existingIndex = pendingResponsesRef.current.findIndex((r) => r.criterionId === response.criterionId)
                if (existingIndex >= 0) {
                    pendingResponsesRef.current[existingIndex] = response
                } else {
                    pendingResponsesRef.current.push(response)
                }
            }

            // Optimistically update local submission state so UI reflects changes immediately
            setSubmission((prev) => {
                if (!prev) {
                    return prev
                }

                const updatedResponses = [...prev.responses]

                for (const newResponse of responses) {
                    const existingIndex = updatedResponses.findIndex((r) => r.criterionId === newResponse.criterionId)
                    const existingResponse = existingIndex >= 0 ? updatedResponses[existingIndex] : null

                    const responseData: SubmissionResponse = {
                        id: existingResponse?.id ?? `temp-${newResponse.criterionId}`,
                        criterionId: newResponse.criterionId,
                        complianceStatus: newResponse.complianceStatus,
                        score: newResponse.score,
                        findings: newResponse.findings,
                        evidenceNotes: newResponse.evidenceNotes,
                        remediationRequired: newResponse.remediationRequired ?? false,
                        remediationTargetDate: newResponse.remediationTargetDate,
                        remediationOwner: newResponse.remediationOwner,
                        createdAt: existingResponse?.createdAt ?? new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    }

                    if (existingIndex >= 0) {
                        updatedResponses[existingIndex] = responseData
                    } else {
                        updatedResponses.push(responseData)
                    }
                }

                return {
                    ...prev,
                    responses: updatedResponses,
                    currentCategoryIndex: categoryIndex ?? prev.currentCategoryIndex,
                }
            })

            setPendingChanges(true)

            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current)
            }

            autoSaveTimeoutRef.current = setTimeout(() => {
                flushPendingChanges()
            }, autoSaveDelay)
        },
        [autoSaveDelay, flushPendingChanges]
    )

    const saveImmediately = useCallback(async (): Promise<void> => {
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current)
            autoSaveTimeoutRef.current = null
        }
        await flushPendingChanges()
    }, [flushPendingChanges])

    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current)
            }
            if (pendingResponsesRef.current.length > 0) {
                // Note: This is a fire-and-forget save on unmount
                flushPendingChanges()
            }
        }
    }, [flushPendingChanges])

    const complete = useCallback(async (): Promise<Submission> => {
        await saveImmediately() // Save pending first
        const response = await executeComplete({
            url: `/submissions/${submissionId}/complete`,
        })
        await fetchSubmission()
        await fetchSummary()
        return response.data
    }, [submissionId, saveImmediately, executeComplete, fetchSubmission, fetchSummary])

    const finalize = useCallback(
        async (dto?: FinalizeSubmissionDto): Promise<Submission> => {
            const response = await executeFinalize({
                url: `/submissions/${submissionId}/finalize`,
                data: dto || {},
            })
            await fetchSubmission()
            await fetchSummary()
            return response.data
        },
        [submissionId, executeFinalize, fetchSubmission, fetchSummary]
    )

    const resume = useCallback(async (): Promise<Submission> => {
        const response = await executeResume({
            url: `/submissions/${submissionId}/resume`,
        })
        await fetchSubmission()
        await fetchSummary()
        return response.data
    }, [submissionId, executeResume, fetchSubmission, fetchSummary])

    const withdraw = useCallback(async (): Promise<void> => {
        await executeWithdraw({
            url: `/submissions/${submissionId}/withdraw`,
        })
        await fetchSubmission()
    }, [submissionId, executeWithdraw, fetchSubmission])

    const refetch = useCallback(() => {
        fetchSubmission()
        fetchSummary()
    }, [fetchSubmission, fetchSummary])

    return {
        submission,
        summary,
        loading,
        saving,
        error,
        pendingChanges,
        lastSaved,
        saveResponses,
        saveImmediately,
        complete,
        finalize,
        resume,
        withdraw,
        refetch,
    }
}
