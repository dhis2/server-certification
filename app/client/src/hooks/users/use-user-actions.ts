import { useCallback } from 'react'
import type { AdminUser, CreateUserDto, AdminUpdateUserDto } from '../../types/user.ts'
import { useAuthAxios } from '../use-auth-axios.ts'

interface UseUserActionsReturn {
    createUser: (dto: CreateUserDto) => Promise<AdminUser>
    adminUpdateUser: (id: string, dto: AdminUpdateUserDto) => Promise<AdminUser>
    unlockUser: (id: string) => Promise<void>
    resetPassword: (id: string) => Promise<{ temporaryPassword: string }>
    deleteUser: (id: string) => Promise<void>
    loading: boolean
}

export const useUserActions = (): UseUserActionsReturn => {
    const [{ loading: createLoading }, executeCreate] = useAuthAxios<AdminUser>({ method: 'POST', url: '/users' }, { manual: true })

    const [{ loading: updateLoading }, executeUpdate] = useAuthAxios<AdminUser>({ method: 'PATCH' }, { manual: true })

    const [{ loading: unlockLoading }, executeUnlock] = useAuthAxios({ method: 'POST' }, { manual: true })

    const [{ loading: resetLoading }, executeReset] = useAuthAxios<{ temporaryPassword: string }>({ method: 'POST' }, { manual: true })

    const [{ loading: deleteLoading }, executeDelete] = useAuthAxios({ method: 'DELETE' }, { manual: true })

    const createUser = useCallback(
        async (dto: CreateUserDto): Promise<AdminUser> => {
            const response = await executeCreate({ data: dto })
            return response.data
        },
        [executeCreate]
    )

    const adminUpdateUser = useCallback(
        async (id: string, dto: AdminUpdateUserDto): Promise<AdminUser> => {
            const response = await executeUpdate({ url: `/users/${id}/admin`, data: dto })
            return response.data
        },
        [executeUpdate]
    )

    const unlockUser = useCallback(
        async (id: string): Promise<void> => {
            await executeUnlock({ url: `/users/${id}/unlock` })
        },
        [executeUnlock]
    )

    const resetPassword = useCallback(
        async (id: string): Promise<{ temporaryPassword: string }> => {
            const response = await executeReset({ url: `/users/${id}/reset-password` })
            return response.data
        },
        [executeReset]
    )

    const deleteUser = useCallback(
        async (id: string): Promise<void> => {
            await executeDelete({ url: `/users/${id}` })
        },
        [executeDelete]
    )

    return {
        createUser,
        adminUpdateUser,
        unlockUser,
        resetPassword,
        deleteUser,
        loading: createLoading || updateLoading || unlockLoading || resetLoading || deleteLoading,
    }
}
