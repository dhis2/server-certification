import { useCallback, useState } from 'react'
import { extractErrorMessage } from '../utils/format.ts'
import { useAuthAxios } from './use-auth-axios.ts'

interface UpdateProfileDto {
    firstName?: string
    lastName?: string
}

interface ChangePasswordDto {
    currentPassword: string
    newPassword: string
    confirmPassword: string
}

interface UseProfileReturn {
    updateProfile: (dto: UpdateProfileDto) => Promise<void>
    changePassword: (dto: ChangePasswordDto) => Promise<void>
    profileLoading: boolean
    passwordLoading: boolean
    profileError: string | null
    passwordError: string | null
    profileSuccess: boolean
    passwordSuccess: boolean
    clearProfileStatus: () => void
    clearPasswordStatus: () => void
}

export const useProfile = (): UseProfileReturn => {
    const [profileError, setProfileError] = useState<string | null>(null)
    const [passwordError, setPasswordError] = useState<string | null>(null)
    const [profileSuccess, setProfileSuccess] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState(false)

    const [{ loading: profileLoading }, executeUpdateProfile] = useAuthAxios({ method: 'PATCH', url: '/auth/me' }, { manual: true })

    const [{ loading: passwordLoading }, executeChangePassword] = useAuthAxios({ method: 'PATCH', url: '/auth/me/password' }, { manual: true })

    const updateProfile = useCallback(
        async (dto: UpdateProfileDto) => {
            setProfileError(null)
            setProfileSuccess(false)
            try {
                await executeUpdateProfile({ data: dto })
                setProfileSuccess(true)
            } catch (err) {
                setProfileError(extractErrorMessage(err))
            }
        },
        [executeUpdateProfile]
    )

    const changePassword = useCallback(
        async (dto: ChangePasswordDto) => {
            setPasswordError(null)
            setPasswordSuccess(false)
            try {
                await executeChangePassword({ data: dto })
                setPasswordSuccess(true)
            } catch (err) {
                setPasswordError(extractErrorMessage(err))
            }
        },
        [executeChangePassword]
    )

    const clearProfileStatus = useCallback(() => {
        setProfileError(null)
        setProfileSuccess(false)
    }, [])

    const clearPasswordStatus = useCallback(() => {
        setPasswordError(null)
        setPasswordSuccess(false)
    }, [])

    return {
        updateProfile,
        changePassword,
        profileLoading,
        passwordLoading,
        profileError,
        passwordError,
        profileSuccess,
        passwordSuccess,
        clearProfileStatus,
        clearPasswordStatus,
    }
}
