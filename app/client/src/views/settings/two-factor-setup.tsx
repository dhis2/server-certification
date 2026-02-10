import { Button, Card, InputField, Help, Modal, ModalTitle, ModalContent, ModalActions, ButtonStrip, NoticeBox } from '@dhis2/ui'
import { useState, useCallback } from 'react'
import { useAuthAxios, useAuth } from '../../hooks/index.ts'
import type { TfaSetupResponse, RecoveryCodesResponse } from '../../types/index.ts'
import styles from './two-factor-setup.module.css'

const CODE_LENGTH = 6

interface RecoveryCodesModalProps {
    codes: string[]
    onClose: () => void
    isRegeneration?: boolean
}

const RecoveryCodesModal = ({ codes, onClose, isRegeneration = false }: RecoveryCodesModalProps) => {
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(() => {
        const text = codes.join('\n')
        navigator.clipboard.writeText(text).then(
            () => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            },
            () => {
                const textarea = document.createElement('textarea')
                textarea.value = text
                document.body.appendChild(textarea)
                textarea.select()
                document.execCommand('copy')
                document.body.removeChild(textarea)
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            }
        )
    }, [codes])

    const handleDownload = useCallback(() => {
        const text = `DHIS2 Server Certification - Recovery Codes\n${'='.repeat(45)}\n\nGenerated: ${new Date().toISOString()}\n\nKeep these codes in a safe place. Each code can only be used once.\n\n${codes.join('\n')}\n`
        const blob = new Blob([text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'dhis2-recovery-codes.txt'
        a.click()
        URL.revokeObjectURL(url)
    }, [codes])

    return (
        <Modal position="middle" large>
            <ModalTitle>{isRegeneration ? 'New Recovery Codes' : 'Save Your Recovery Codes'}</ModalTitle>
            <ModalContent>
                <NoticeBox warning title="Important">
                    {isRegeneration
                        ? 'Your previous recovery codes have been invalidated. Save these new codes securely.'
                        : 'Save these codes in a secure location. You will need them if you lose access to your authenticator app.'}
                </NoticeBox>

                <div className={styles.recoveryCodes}>
                    {codes.map((code, index) => (
                        <code key={index} className={styles.recoveryCode}>
                            {code}
                        </code>
                    ))}
                </div>

                <p className={styles.codesWarning}>Each code can only be used once. Store them safely and do not share them.</p>
            </ModalContent>
            <ModalActions>
                <ButtonStrip>
                    <Button onClick={handleCopy}>{copied ? 'Copied!' : 'Copy Codes'}</Button>
                    <Button onClick={handleDownload}>Download</Button>
                    <Button primary onClick={onClose}>
                        I have saved my codes
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}

export const TwoFactorSetup = () => {
    const { currentUser, refreshUser } = useAuth()
    const [setupData, setSetupData] = useState<TfaSetupResponse | null>(null)
    const [verificationCode, setVerificationCode] = useState('')
    const [disablePassword, setDisablePassword] = useState('')
    const [disableCode, setDisableCode] = useState('')
    const [error, setError] = useState('')
    const [showRecoveryCodes, setShowRecoveryCodes] = useState<string[] | null>(null)
    const [isRegeneration, setIsRegeneration] = useState(false)
    const [showDisableModal, setShowDisableModal] = useState(false)

    const [{ loading: setupLoading }, initiateSetup] = useAuthAxios<TfaSetupResponse>({ method: 'POST', url: '/auth/2fa/setup' }, { manual: true })

    const [{ loading: verifyLoading }, verifySetup] = useAuthAxios<{ message: string }>({ method: 'POST', url: '/auth/2fa/verify-setup' }, { manual: true })

    const [{ loading: disableLoading }, disable2fa] = useAuthAxios<{ message: string }>({ method: 'POST', url: '/auth/2fa/disable' }, { manual: true })

    const [{ loading: regenerateLoading }, regenerateCodes] = useAuthAxios<RecoveryCodesResponse>({ method: 'POST', url: '/auth/2fa/regenerate-recovery-codes' }, { manual: true })

    const handleInitiateSetup = useCallback(async () => {
        setError('')
        try {
            const response = await initiateSetup()
            setSetupData(response.data)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to initiate 2FA setup')
        }
    }, [initiateSetup])

    const handleVerifySetup = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault()
            setError('')

            const cleanCode = verificationCode.replace(/\D/g, '')
            if (cleanCode.length !== CODE_LENGTH) {
                setError('Please enter a valid 6-digit code')
                return
            }

            try {
                await verifySetup({ data: { code: cleanCode } })
                setShowRecoveryCodes(setupData?.recoveryCodes || [])
                setSetupData(null)
                setVerificationCode('')
                await refreshUser()
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Verification failed')
            }
        },
        [verifySetup, verificationCode, setupData, refreshUser]
    )

    const handleDisable = useCallback(
        async (e?: React.FormEvent) => {
            e?.preventDefault()
            setError('')

            const cleanCode = disableCode.replace(/\D/g, '')
            if (cleanCode.length !== CODE_LENGTH) {
                setError('Please enter a valid 6-digit code')
                return
            }

            try {
                await disable2fa({ data: { password: disablePassword, code: cleanCode } })
                setShowDisableModal(false)
                setDisablePassword('')
                setDisableCode('')
                await refreshUser()
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to disable 2FA')
            }
        },
        [disable2fa, disablePassword, disableCode, refreshUser]
    )

    const handleRegenerateCodes = useCallback(async () => {
        setError('')
        try {
            const response = await regenerateCodes()
            setShowRecoveryCodes(response.data.recoveryCodes)
            setIsRegeneration(true)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to regenerate recovery codes')
        }
    }, [regenerateCodes])

    const cancelSetup = useCallback(() => {
        setSetupData(null)
        setVerificationCode('')
        setError('')
    }, [])

    const isTfaEnabled = currentUser?.isTfaEnabled

    return (
        <Card className={styles.container}>
            <h3 className={styles.title}>Two-Factor Authentication</h3>

            {isTfaEnabled ? (
                <div className={styles.enabled}>
                    <NoticeBox valid title="2FA is enabled">
                        Your account is protected with two-factor authentication.
                    </NoticeBox>

                    <div className={styles.actions}>
                        <Button onClick={handleRegenerateCodes} loading={regenerateLoading}>
                            Regenerate Recovery Codes
                        </Button>
                        <Button destructive onClick={() => setShowDisableModal(true)}>
                            Disable 2FA
                        </Button>
                    </div>

                    {error && <Help error>{error}</Help>}
                </div>
            ) : setupData ? (
                <form onSubmit={handleVerifySetup} className={styles.setupForm}>
                    <p className={styles.instruction}>Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):</p>

                    <div className={styles.qrContainer}>
                        <img src={setupData.qrCode} alt="2FA QR Code" className={styles.qrCode} />
                    </div>

                    <p className={styles.manualEntry}>
                        Or enter this code manually: <code className={styles.secretCode}>{setupData.otpauthUrl.split('secret=')[1]?.split('&')[0]}</code>
                    </p>

                    <InputField
                        name="verificationCode"
                        label="Verification Code"
                        value={verificationCode}
                        placeholder="Enter 6-digit code"
                        autoComplete="one-time-code"
                        onChange={({ value }) => {
                            setVerificationCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH))
                            setError('')
                        }}
                        disabled={verifyLoading}
                        inputWidth="200px"
                    />

                    {error && <Help error>{error}</Help>}

                    <ButtonStrip>
                        <Button type="submit" primary loading={verifyLoading} disabled={verificationCode.length !== CODE_LENGTH}>
                            Verify and Enable
                        </Button>
                        <Button onClick={cancelSetup} disabled={verifyLoading}>
                            Cancel
                        </Button>
                    </ButtonStrip>
                </form>
            ) : (
                <div className={styles.disabled}>
                    <p className={styles.description}>
                        Add an extra layer of security to your account by enabling two-factor authentication. You will need an authenticator app on your phone.
                    </p>

                    {error && <Help error>{error}</Help>}

                    <Button primary onClick={handleInitiateSetup} loading={setupLoading}>
                        Set Up Two-Factor Authentication
                    </Button>
                </div>
            )}

            {showRecoveryCodes && (
                <RecoveryCodesModal
                    codes={showRecoveryCodes}
                    isRegeneration={isRegeneration}
                    onClose={() => {
                        setShowRecoveryCodes(null)
                        setIsRegeneration(false)
                    }}
                />
            )}

            {showDisableModal && (
                <Modal
                    position="middle"
                    onClose={() => {
                        setShowDisableModal(false)
                        setError('')
                    }}
                >
                    <ModalTitle>Disable Two-Factor Authentication</ModalTitle>
                    <ModalContent>
                        <form id="disable-2fa-form" onSubmit={handleDisable}>
                            <NoticeBox warning title="Warning">
                                Disabling 2FA will make your account less secure.
                            </NoticeBox>

                            <div className={styles.disableForm}>
                                <InputField
                                    name="password"
                                    label="Password"
                                    type="password"
                                    value={disablePassword}
                                    autoComplete="current-password"
                                    onChange={({ value }) => {
                                        setDisablePassword(value)
                                        setError('')
                                    }}
                                    disabled={disableLoading}
                                    inputWidth="100%"
                                />

                                <InputField
                                    name="code"
                                    label="Authentication Code"
                                    value={disableCode}
                                    placeholder="Enter 6-digit code"
                                    autoComplete="one-time-code"
                                    onChange={({ value }) => {
                                        setDisableCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH))
                                        setError('')
                                    }}
                                    disabled={disableLoading}
                                    inputWidth="100%"
                                />
                            </div>

                            {error && <Help error>{error}</Help>}
                        </form>
                    </ModalContent>
                    <ModalActions>
                        <ButtonStrip>
                            <Button
                                onClick={() => {
                                    setShowDisableModal(false)
                                    setError('')
                                }}
                                disabled={disableLoading}
                            >
                                Cancel
                            </Button>
                            <Button destructive type="submit" form="disable-2fa-form" loading={disableLoading} disabled={!disablePassword || disableCode.length !== CODE_LENGTH}>
                                Disable 2FA
                            </Button>
                        </ButtonStrip>
                    </ModalActions>
                </Modal>
            )}
        </Card>
    )
}
