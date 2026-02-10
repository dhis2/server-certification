import type { FC } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/index.ts'

export const AdminRoute: FC = () => {
    const { isAdmin } = useAuth()

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}
