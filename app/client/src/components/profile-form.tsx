import { Button, Card, InputField, NoticeBox } from '@dhis2/ui'
import { useState, useCallback, type FC, type FormEvent } from 'react'
import { useAuth } from '../hooks/index.ts'
import { useProfile } from '../hooks/use-profile.ts'
import styles from './profile-form.module.css'

const MIN_PASSWORD_LENGTH = 8

export const ProfileForm: FC = () => {
    const { currentUser, refreshUser } = useAuth()

    const {
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
    } = useProfile()

    const [firstName, setFirstName] = useState(currentUser?.firstName ?? '')
    const [lastName, setLastName] = useState(currentUser?.lastName ?? '')

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordValidationError, setPasswordValidationError] = useState('')

    const handleProfileSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault()
            await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() })
            await refreshUser()
        },
        [updateProfile, firstName, lastName, refreshUser]
    )

    const handlePasswordSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault()
            setPasswordValidationError('')

            if (newPassword.length < MIN_PASSWORD_LENGTH) {
                setPasswordValidationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
                return
            }

            if (newPassword !== confirmPassword) {
                setPasswordValidationError('Passwords do not match')
                return
            }

            await changePassword({ currentPassword, newPassword, confirmPassword })
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        },
        [changePassword, currentPassword, newPassword, confirmPassword]
    )

    return (
        <>
            <Card className={styles.section}>
                <h3>Profile Information</h3>
                <p>Update your name and personal details.</p>

                {profileSuccess && (
                    <div className={styles.notice}>
                        <NoticeBox valid title="Profile updated">
                            Your profile has been updated successfully.
                        </NoticeBox>
                    </div>
                )}
                {profileError && (
                    <div className={styles.notice}>
                        <NoticeBox error title="Update failed">
                            {profileError}
                        </NoticeBox>
                    </div>
                )}

                <form onSubmit={handleProfileSubmit} className={styles.form}>
                    <div className={styles.fieldRow}>
                        <InputField
                            name="firstName"
                            label="First name"
                            value={firstName}
                            onChange={({ value }) => {
                                setFirstName(value)
                                clearProfileStatus()
                            }}
                            disabled={profileLoading}
                            inputWidth="100%"
                        />
                        <InputField
                            name="lastName"
                            label="Last name"
                            value={lastName}
                            onChange={({ value }) => {
                                setLastName(value)
                                clearProfileStatus()
                            }}
                            disabled={profileLoading}
                            inputWidth="100%"
                        />
                    </div>

                    <InputField name="email" label="Email" value={currentUser?.email ?? ''} disabled inputWidth="100%" />

                    <div className={styles.actions}>
                        <Button type="submit" primary loading={profileLoading}>
                            Save Profile
                        </Button>
                    </div>
                </form>
            </Card>

            <Card className={styles.section}>
                <h3>Change Password</h3>
                <p>Update your password. You will need to enter your current password for verification.</p>

                {passwordSuccess && (
                    <div className={styles.notice}>
                        <NoticeBox valid title="Password changed">
                            Your password has been changed successfully.
                        </NoticeBox>
                    </div>
                )}
                {(passwordError || passwordValidationError) && (
                    <div className={styles.notice}>
                        <NoticeBox error title="Password change failed">
                            {passwordValidationError || passwordError}
                        </NoticeBox>
                    </div>
                )}

                <form onSubmit={handlePasswordSubmit} className={styles.form}>
                    <InputField
                        name="currentPassword"
                        label="Current password"
                        type="password"
                        value={currentPassword}
                        autoComplete="current-password"
                        onChange={({ value }) => {
                            setCurrentPassword(value)
                            clearPasswordStatus()
                            setPasswordValidationError('')
                        }}
                        disabled={passwordLoading}
                        inputWidth="100%"
                    />
                    <InputField
                        name="newPassword"
                        label="New password"
                        type="password"
                        value={newPassword}
                        autoComplete="new-password"
                        helpText={`Minimum ${MIN_PASSWORD_LENGTH} characters`}
                        onChange={({ value }) => {
                            setNewPassword(value)
                            clearPasswordStatus()
                            setPasswordValidationError('')
                        }}
                        disabled={passwordLoading}
                        inputWidth="100%"
                    />
                    <InputField
                        name="confirmPassword"
                        label="Confirm new password"
                        type="password"
                        value={confirmPassword}
                        autoComplete="new-password"
                        onChange={({ value }) => {
                            setConfirmPassword(value)
                            clearPasswordStatus()
                            setPasswordValidationError('')
                        }}
                        disabled={passwordLoading}
                        inputWidth="100%"
                    />

                    <div className={styles.actions}>
                        <Button type="submit" primary loading={passwordLoading} disabled={!currentPassword || !newPassword || !confirmPassword}>
                            Change Password
                        </Button>
                    </div>
                </form>
            </Card>
        </>
    )
}
