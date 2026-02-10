import { Button, Card, InputField, CircularLoader } from '@dhis2/ui'
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heading } from '../../components/index.ts'
import { useDebounce } from '../../hooks/index.ts'
import { useUsersList } from '../../hooks/users/index.ts'
import { formatDateTime } from '../../utils/format.ts'
import { CreateUserModal } from './create-user-modal.tsx'
import styles from './users-list.module.css'

export const UsersList = () => {
    const navigate = useNavigate()
    const [searchInput, setSearchInput] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)

    const search = useDebounce(searchInput, 300)
    const { users, totalCount, hasNextPage, loading, refetch, loadMore } = useUsersList({ search })

    const handleCreated = useCallback(() => {
        setShowCreateModal(false)
        refetch()
    }, [refetch])

    const getStatusBadge = (user: { isActive: boolean; isLocked: boolean }) => {
        if (user.isLocked) {
            return <span className={`${styles.badge} ${styles.badgeLocked}`}>Locked</span>
        }
        if (!user.isActive) {
            return <span className={`${styles.badge} ${styles.badgeInactive}`}>Inactive</span>
        }
        return <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
    }

    const getRoleBadge = (role: { name: string } | null) => {
        const name = role?.name || 'user'
        const isAdmin = name === 'admin' || name === 'administrator'
        return <span className={`${styles.badge} ${isAdmin ? styles.badgeAdmin : styles.badgeUser}`}>{name}</span>
    }

    return (
        <div className={styles.container}>
            <Heading title="User Management">
                <Button primary onClick={() => setShowCreateModal(true)}>
                    Add User
                </Button>
            </Heading>

            <div className={styles.toolbar}>
                <div className={styles.search}>
                    <InputField name="search" placeholder="Search users..." value={searchInput} onChange={({ value }) => setSearchInput(value)} inputWidth="320px" />
                </div>
            </div>

            <Card className={styles.tableCard}>
                {loading && users.length === 0 ? (
                    <div className={styles.loadingContainer}>
                        <CircularLoader />
                    </div>
                ) : !users || users.length === 0 ? (
                    <div className={styles.emptyState}>{search ? 'No users match your search' : 'No users found'}</div>
                ) : (
                    <>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>2FA</th>
                                    <th>Last Login</th>
                                    <th className={styles.actionsCell}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className={styles.nameCell}>
                                                <span>{[user.firstName, user.lastName].filter(Boolean).join(' ') || '-'}</span>
                                                <span>{user.email}</span>
                                            </div>
                                        </td>
                                        <td>{getRoleBadge(user.role)}</td>
                                        <td>{getStatusBadge(user)}</td>
                                        <td>{user.isTfaEnabled ? 'Enabled' : 'Disabled'}</td>
                                        <td>{formatDateTime(user.lastLoginAt)}</td>
                                        <td className={styles.actionsCell}>
                                            <Button small onClick={() => navigate(`/admin/users/${user.id}`)}>
                                                View
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className={styles.pagination}>
                            <span className={styles.paginationInfo}>
                                Showing {users.length} of {totalCount}
                            </span>
                            {hasNextPage && (
                                <Button small onClick={loadMore} disabled={loading}>
                                    {loading ? 'Loading...' : 'Load More'}
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </Card>

            {showCreateModal && <CreateUserModal onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />}
        </div>
    )
}
