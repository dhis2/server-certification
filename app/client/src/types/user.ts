export interface AdminUser {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    role: { id: string; name: string } | null
    isTfaEnabled: boolean
    isActive: boolean
    isLocked: boolean
    failedLoginAttempts: number
    lastLoginAt: string | null
    createdAt: string
    updatedAt: string
}

export interface CreateUserDto {
    firstName: string
    lastName: string
    email: string
    password: string
    roleId?: string
}

export interface AdminUpdateUserDto {
    roleId?: string
    isActive?: boolean
    isLocked?: boolean
}

export interface UserEdge {
    node: AdminUser
    cursor: string
}

interface UserPageInfo {
    hasNextPage: boolean
    endCursor: string | null
}

export interface UsersConnection {
    edges: UserEdge[]
    pageInfo: UserPageInfo
    totalCount: number
}
