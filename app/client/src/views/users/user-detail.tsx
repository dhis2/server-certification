import { Button, Card, CircularLoader, NoticeBox, SingleSelectField, SingleSelectOption } from '@dhis2/ui'
import { useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Heading, ConfirmationModal } from '../../components/index.ts'
import { useUser, useUserActions, useRoles } from '../../hooks/users/index.ts'
import { formatDateTime, extractErrorMessage } from '../../utils/format.ts'
import styles from './user-detail.module.css'

type ModalAction = 'activate' | 'deactivate' | 'unlock' | 'resetPassword' | 'delete' | null

export const UserDetail = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user, loading, error, refetch } = useUser(id)
    const { adminUpdateUser, unlockUser, resetPassword, deleteUser, loading: actionLoading } = useUserActions()
    const { roles } = useRoles()

    const [activeModal, setActiveModal] = useState<ModalAction>(null)
    const [selectedRole, setSelectedRole] = useState<string>('')
    const [actionError, setActionError] = useState('')
    const [actionSuccess, setActionSuccess] = useState('')
    const [tempPassword, setTempPassword] = useState('')

    const handleRoleChange = useCallback(async () => {
        if (!id || !selectedRole) {
            return
        }
        setActionError('')
        try {
            await adminUpdateUser(id, { roleId: selectedRole })
            setActionSuccess('Role updated successfully')
            await refetch()
        } catch (err) {
            setActionError(extractErrorMessage(err))
        }
    }, [id, selectedRole, adminUpdateUser, refetch])

    const handleConfirmAction = useCallback(async () => {
        if (!id || !activeModal) {
            return
        }
        setActionError('')
        setActionSuccess('')

        try {
            switch (activeModal) {
                case 'activate':
                    await adminUpdateUser(id, { isActive: true })
                    setActionSuccess('User activated')
                    break
                case 'deactivate':
                    await adminUpdateUser(id, { isActive: false })
                    setActionSuccess('User deactivated')
                    break
                case 'unlock':
                    await unlockUser(id)
                    setActionSuccess('User unlocked')
                    break
                case 'resetPassword': {
                    const result = await resetPassword(id)
                    setTempPassword(result.temporaryPassword)
                    setActionSuccess('Password reset successfully')
                    break
                }
                case 'delete':
                    await deleteUser(id)
                    navigate('/admin/users')
                    return
            }
            setActiveModal(null)
            await refetch()
        } catch (err) {
            setActionError(extractErrorMessage(err))
            setActiveModal(null)
        }
    }, [id, activeModal, adminUpdateUser, unlockUser, resetPassword, deleteUser, navigate, refetch])

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <CircularLoader />
            </div>
        )
    }

    if (error || !user) {
        return (
            <div className={styles.container}>
                <NoticeBox error title="Error">
                    {error?.message || 'User not found'}
                </NoticeBox>
            </div>
        )
    }

    const getStatusBadge = () => {
        if (user.isLocked) {
            return <span className={`${styles.badge} ${styles.badgeLocked}`}>Locked</span>
        }
        if (!user.isActive) {
            return <span className={`${styles.badge} ${styles.badgeInactive}`}>Inactive</span>
        }
        return <span className={`${styles.badge} ${styles.badgeActive}`}>Active</span>
    }

    return (
        <div className={styles.container}>
            <Link to="/admin/users" className={styles.backLink}>
                &larr; Back to Users
            </Link>

            <Heading title={[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email} />

            {actionSuccess && (
                <NoticeBox valid title="Success">
                    {actionSuccess}
                </NoticeBox>
            )}
            {actionError && (
                <NoticeBox error title="Error">
                    {actionError}
                </NoticeBox>
            )}

            {tempPassword && (
                <NoticeBox warning title="Temporary Password">
                    The user&apos;s password has been reset. Share this temporary password securely:
                    <div className={styles.tempPassword}>{tempPassword}</div>
                </NoticeBox>
            )}

            <Card className={styles.card}>
                <h3>Profile Information</h3>
                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Email</span>
                        <span className={styles.infoValue}>{user.email}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Name</span>
                        <span className={styles.infoValue}>{[user.firstName, user.lastName].filter(Boolean).join(' ') || '-'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Role</span>
                        <span className={styles.infoValue}>{user.role?.name || 'user'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Two-Factor Auth</span>
                        <span className={styles.infoValue}>{user.isTfaEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Created</span>
                        <span className={styles.infoValue}>{formatDateTime(user.createdAt)}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Last Updated</span>
                        <span className={styles.infoValue}>{formatDateTime(user.updatedAt)}</span>
                    </div>
                </div>
            </Card>

            <Card className={styles.card}>
                <h3>Account Status</h3>
                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Status</span>
                        <span className={styles.infoValue}>{getStatusBadge()}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Failed Login Attempts</span>
                        <span className={styles.infoValue}>{user.failedLoginAttempts}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Last Login</span>
                        <span className={styles.infoValue}>{formatDateTime(user.lastLoginAt)}</span>
                    </div>
                </div>
                <div className={styles.actions}>
                    {user.isLocked && (
                        <Button onClick={() => setActiveModal('unlock')} loading={actionLoading}>
                            Unlock Account
                        </Button>
                    )}
                    {user.isActive ? (
                        <Button onClick={() => setActiveModal('deactivate')} loading={actionLoading}>
                            Deactivate
                        </Button>
                    ) : (
                        <Button primary onClick={() => setActiveModal('activate')} loading={actionLoading}>
                            Activate
                        </Button>
                    )}
                    <Button onClick={() => setActiveModal('resetPassword')} loading={actionLoading}>
                        Reset Password
                    </Button>
                </div>
            </Card>

            <Card className={styles.card}>
                <h3>Change Role</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', maxWidth: '300px' }}>
                    <SingleSelectField
                        label="Role"
                        selected={selectedRole || String(user.role?.id || '')}
                        onChange={({ selected }) => setSelectedRole(selected)}
                        disabled={actionLoading}
                    >
                        {roles.map((role) => (
                            <SingleSelectOption key={role.id} label={role.name} value={String(role.id)} />
                        ))}
                    </SingleSelectField>
                    <Button primary onClick={handleRoleChange} loading={actionLoading} disabled={!selectedRole || selectedRole === String(user.role?.id || '')}>
                        Update
                    </Button>
                </div>
            </Card>

            <div className={styles.dangerZone}>
                <h3>Danger Zone</h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--colors-grey600)', marginBottom: '12px' }}>Permanently delete this user account. This action cannot be undone.</p>
                <Button destructive onClick={() => setActiveModal('delete')} loading={actionLoading}>
                    Delete User
                </Button>
            </div>

            {activeModal === 'activate' && (
                <ConfirmationModal
                    title="Activate User"
                    message={`Are you sure you want to activate ${user.email}?`}
                    confirmLabel="Activate"
                    onConfirm={handleConfirmAction}
                    onCancel={() => setActiveModal(null)}
                    loading={actionLoading}
                />
            )}
            {activeModal === 'deactivate' && (
                <ConfirmationModal
                    title="Deactivate User"
                    message={`Are you sure you want to deactivate ${user.email}? They will no longer be able to log in.`}
                    confirmLabel="Deactivate"
                    destructive
                    onConfirm={handleConfirmAction}
                    onCancel={() => setActiveModal(null)}
                    loading={actionLoading}
                />
            )}
            {activeModal === 'unlock' && (
                <ConfirmationModal
                    title="Unlock User"
                    message={`Are you sure you want to unlock ${user.email}? Their failed login attempts will be reset.`}
                    confirmLabel="Unlock"
                    onConfirm={handleConfirmAction}
                    onCancel={() => setActiveModal(null)}
                    loading={actionLoading}
                />
            )}
            {activeModal === 'resetPassword' && (
                <ConfirmationModal
                    title="Reset Password"
                    message={`Are you sure you want to reset the password for ${user.email}? A temporary password will be generated.`}
                    confirmLabel="Reset Password"
                    destructive
                    onConfirm={handleConfirmAction}
                    onCancel={() => setActiveModal(null)}
                    loading={actionLoading}
                />
            )}
            {activeModal === 'delete' && (
                <ConfirmationModal
                    title="Delete User"
                    message={`Are you sure you want to permanently delete ${user.email}? This action cannot be undone.`}
                    confirmLabel="Delete"
                    destructive
                    onConfirm={handleConfirmAction}
                    onCancel={() => setActiveModal(null)}
                    loading={actionLoading}
                />
            )}
        </div>
    )
}
