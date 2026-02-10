import { Button, Card, Help, InputField, LogoIcon, ButtonStrip, IconArrowLeft16 } from '@dhis2/ui'
import { useCallback, useState, useEffect } from 'react'
import { useAuth } from '../hooks/index.ts'
import styles from './login.module.css'

const TFA_CODE_LENGTH = 6
const RECOVERY_CODE_LENGTH = 8

export const Login = () => {
    const { login, loginWithRecoveryCode, isAuthenticating, authError, loginStep, clearAuthError, resetLoginStep } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [tfaCode, setTfaCode] = useState('')
    const [recoveryCode, setRecoveryCode] = useState('')
    const [showRecoveryInput, setShowRecoveryInput] = useState(false)

    useEffect(() => {
        if (loginStep === 'tfa') {
            const timer = setTimeout(() => {
                const input = document.querySelector<HTMLInputElement>(showRecoveryInput ? 'input[name="recoveryCode"]' : 'input[name="tfaCode"]')
                input?.focus()
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [loginStep, showRecoveryInput])

    const handleCredentialsSubmit = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault()
            if (!email.trim() || !password.trim()) {
                return
            }
            await login(email.trim(), password)
        },
        [login, email, password]
    )

    const handleTfaSubmit = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault()

            if (showRecoveryInput) {
                const cleanCode = recoveryCode.toUpperCase().replace(/[^A-F0-9]/g, '')
                if (cleanCode.length !== RECOVERY_CODE_LENGTH) {
                    return
                }
                await loginWithRecoveryCode(cleanCode)
            } else {
                const cleanCode = tfaCode.replace(/\D/g, '')
                if (cleanCode.length !== TFA_CODE_LENGTH) {
                    return
                }
                await login(email, password, cleanCode)
            }
        },
        [login, loginWithRecoveryCode, email, password, tfaCode, recoveryCode, showRecoveryInput]
    )

    const handleTfaCodeChange = useCallback(
        ({ value }: { value: string }) => {
            const cleaned = value.replace(/\D/g, '').slice(0, TFA_CODE_LENGTH)
            setTfaCode(cleaned)
            clearAuthError()
        },
        [clearAuthError]
    )

    const handleRecoveryCodeChange = useCallback(
        ({ value }: { value: string }) => {
            const cleaned = value
                .toUpperCase()
                .replace(/[^A-F0-9]/g, '')
                .slice(0, RECOVERY_CODE_LENGTH)
            setRecoveryCode(cleaned)
            clearAuthError()
        },
        [clearAuthError]
    )

    const handleBackToLogin = useCallback(() => {
        resetLoginStep()
        setTfaCode('')
        setRecoveryCode('')
        setShowRecoveryInput(false)
        setPassword('')
    }, [resetLoginStep])

    const toggleRecoveryMode = useCallback(() => {
        setShowRecoveryInput((prev) => !prev)
        setTfaCode('')
        setRecoveryCode('')
        clearAuthError()
    }, [clearAuthError])

    if (loginStep === 'tfa') {
        return (
            <form className={styles.container} onSubmit={handleTfaSubmit}>
                <Card className={styles.box}>
                    <h2 className={styles.header}>
                        <LogoIcon className={styles.logo} />
                        Two-Factor Authentication
                    </h2>

                    <p className={styles.description}>
                        {showRecoveryInput ? 'Enter one of your recovery codes to sign in.' : 'Enter the 6-digit code from your authenticator app.'}
                    </p>

                    {showRecoveryInput ? (
                        <InputField
                            name="recoveryCode"
                            label="Recovery Code"
                            value={recoveryCode}
                            placeholder="XXXXXXXX"
                            autoComplete="off"
                            onChange={handleRecoveryCodeChange}
                            disabled={isAuthenticating}
                            inputWidth="100%"
                        />
                    ) : (
                        <InputField
                            name="tfaCode"
                            label="Authentication Code"
                            value={tfaCode}
                            placeholder="000000"
                            autoComplete="one-time-code"
                            onChange={handleTfaCodeChange}
                            disabled={isAuthenticating}
                            inputWidth="100%"
                        />
                    )}

                    {authError && <Help error>{authError}</Help>}

                    <ButtonStrip>
                        <Button
                            type="submit"
                            primary
                            loading={isAuthenticating}
                            disabled={showRecoveryInput ? recoveryCode.length !== RECOVERY_CODE_LENGTH : tfaCode.length !== TFA_CODE_LENGTH}
                        >
                            Verify
                        </Button>
                    </ButtonStrip>

                    <div className={styles.linkContainer}>
                        <button type="button" className={styles.textButton} onClick={handleBackToLogin}>
                            <IconArrowLeft16 /> Back to login
                        </button>
                        <button type="button" className={styles.textButton} onClick={toggleRecoveryMode}>
                            {showRecoveryInput ? 'Use authenticator app' : 'Use recovery code'}
                        </button>
                    </div>
                </Card>
            </form>
        )
    }

    return (
        <form className={styles.container} onSubmit={handleCredentialsSubmit}>
            <Card className={styles.box}>
                <h2 className={styles.header}>
                    <LogoIcon className={styles.logo} />
                    DHIS2 Server Certification
                </h2>

                <InputField
                    name="email"
                    label="Email"
                    type="email"
                    value={email}
                    autoComplete="email"
                    onChange={({ value }) => {
                        setEmail(value)
                        clearAuthError()
                    }}
                    disabled={isAuthenticating}
                    inputWidth="100%"
                />

                <InputField
                    type="password"
                    name="password"
                    label="Password"
                    value={password}
                    autoComplete="current-password"
                    onChange={({ value }) => {
                        setPassword(value)
                        clearAuthError()
                    }}
                    disabled={isAuthenticating}
                    inputWidth="100%"
                />

                {authError && <Help error>{authError}</Help>}

                <Button primary type="submit" loading={isAuthenticating} disabled={!email.trim() || !password.trim()}>
                    Sign In
                </Button>
            </Card>
        </form>
    )
}
