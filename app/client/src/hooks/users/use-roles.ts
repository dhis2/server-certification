import { useAuthAxios } from '../use-auth-axios.ts'

interface Role {
    id: number
    name: string
    description: string
    isDefault: boolean
}

interface UseRolesReturn {
    roles: Role[]
    loading: boolean
    error: Error | null
}

export const useRoles = (): UseRolesReturn => {
    const [{ data, loading, error }] = useAuthAxios<Role[]>({ url: '/auth/roles', method: 'GET' })

    return { roles: data || [], loading, error: error ? new Error(error.message || 'Failed to load roles') : null }
}
