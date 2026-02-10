import { Card, CircularLoader, NoticeBox } from '@dhis2/ui'
import axios from 'axios'
import type { FC } from 'react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { baseURL } from '../../hooks/use-auth-axios.ts'
import type { VerificationResult } from '../../types/index.ts'
import styles from './verify-certificate.module.css'

export const VerifyCertificate: FC = () => {
    const { code } = useParams<{ code: string }>()
    const [result, setResult] = useState<VerificationResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!code) {
            setError('No verification code provided')
            setLoading(false)
            return
        }

        axios
            .get<VerificationResult>(`${baseURL}/verify/${code}`)
            .then((res) => {
                setResult(res.data)
                setError(null)
            })
            .catch((err) => {
                setError(err.response?.data?.message || err.message || 'Verification failed')
            })
            .finally(() => setLoading(false))
    }, [code])

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingContainer}>
                    <CircularLoader />
                    <p className={styles.loadingText}>Verifying certificate...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className={styles.container}>
                <Card className={styles.card}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Certificate Verification</h1>
                    </div>
                    <NoticeBox error title="Verification Failed">
                        {error}
                    </NoticeBox>
                </Card>
            </div>
        )
    }

    if (!result) {
        return (
            <div className={styles.container}>
                <Card className={styles.card}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Certificate Verification</h1>
                    </div>
                    <NoticeBox error title="Error">
                        Unable to verify certificate. Please check the verification code.
                    </NoticeBox>
                </Card>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <Card className={styles.card}>
                <div className={styles.header}>
                    <h1 className={styles.title}>DHIS2 Certificate Verification</h1>
                </div>

                {result.valid ? (
                    <div className={styles.validResult} data-test="verification-valid">
                        <div className={styles.statusIcon}>✓</div>
                        <h2 className={styles.statusTitle}>Certificate Valid</h2>
                        <p className={styles.statusDescription}>This certificate is authentic and currently valid.</p>

                        {result.certificate && (
                            <div className={styles.certificateDetails}>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Implementation</span>
                                    <span className={styles.detailValue}>{result.certificate.implementation?.name}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Certificate Number</span>
                                    <span className={styles.detailValue}>{result.certificate.certificateNumber}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Control Group</span>
                                    <span className={styles.detailValue}>{result.certificate.controlGroup}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Score</span>
                                    <span className={styles.detailValue}>{Math.round(result.certificate.finalScore)}%</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Valid From</span>
                                    <span className={styles.detailValue}>{new Date(result.certificate.validFrom).toLocaleDateString()}</span>
                                </div>
                                <div className={styles.detailRow}>
                                    <span className={styles.detailLabel}>Valid Until</span>
                                    <span className={styles.detailValue}>{new Date(result.certificate.validUntil).toLocaleDateString()}</span>
                                </div>
                            </div>
                        )}

                        <div className={styles.checksSection}>
                            <h3 className={styles.checksTitle}>Verification Checks</h3>
                            <ul className={styles.checksList}>
                                <li className={styles.checkItem}>
                                    <span className={styles.checkIcon}>✓</span>
                                    Certificate found in registry
                                </li>
                                <li className={styles.checkItem}>
                                    <span className={styles.checkIcon}>✓</span>
                                    Certificate not revoked
                                </li>
                                <li className={styles.checkItem}>
                                    <span className={styles.checkIcon}>✓</span>
                                    Certificate not expired
                                </li>
                                <li className={styles.checkItem}>
                                    <span className={styles.checkIcon}>✓</span>
                                    Digital signature valid
                                </li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className={styles.invalidResult} data-test="verification-invalid">
                        <div className={styles.statusIconInvalid}>✗</div>
                        <h2 className={styles.statusTitleInvalid}>Certificate Invalid</h2>
                        <p className={styles.statusDescription}>This certificate could not be verified. See details below.</p>

                        <div className={styles.checksSection}>
                            <h3 className={styles.checksTitle}>Verification Checks</h3>
                            <ul className={styles.checksList}>
                                <li className={result.checks.found ? styles.checkItem : styles.checkItemFailed}>
                                    <span className={result.checks.found ? styles.checkIcon : styles.checkIconFailed}>{result.checks.found ? '✓' : '✗'}</span>
                                    {result.checks.found ? 'Certificate found in registry' : 'Certificate not found in registry'}
                                </li>
                                {result.checks.found && (
                                    <>
                                        <li className={result.checks.notRevoked ? styles.checkItem : styles.checkItemFailed}>
                                            <span className={result.checks.notRevoked ? styles.checkIcon : styles.checkIconFailed}>{result.checks.notRevoked ? '✓' : '✗'}</span>
                                            {result.checks.notRevoked ? 'Certificate not revoked' : 'Certificate has been revoked'}
                                        </li>
                                        <li className={result.checks.notExpired ? styles.checkItem : styles.checkItemFailed}>
                                            <span className={result.checks.notExpired ? styles.checkIcon : styles.checkIconFailed}>{result.checks.notExpired ? '✓' : '✗'}</span>
                                            {result.checks.notExpired ? 'Certificate not expired' : 'Certificate has expired'}
                                        </li>
                                        <li className={result.checks.integrityValid ? styles.checkItem : styles.checkItemFailed}>
                                            <span className={result.checks.integrityValid ? styles.checkIcon : styles.checkIconFailed}>
                                                {result.checks.integrityValid ? '✓' : '✗'}
                                            </span>
                                            {result.checks.integrityValid ? 'Digital signature valid' : 'Digital signature invalid'}
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                )}

                <div className={styles.footer}>
                    <p className={styles.footerText}>DHIS2 Server Certification Program</p>
                </div>
            </Card>
        </div>
    )
}
