import { Card, IconCheckmarkCircle24, IconDashboardWindow24, IconUserGroup24, IconFileDocument24, IconWorld24, CircularLoader } from '@dhis2/ui'
import { Link } from 'react-router-dom'
import { Heading } from '../../components/index.ts'
import { useAuth } from '../../hooks/index.ts'
import { useDashboardStats } from '../../hooks/use-dashboard-stats.ts'
import styles from './dashboard.module.css'

export const Dashboard = () => {
    const { currentUser, isAdmin } = useAuth()
    const { certificates, templates, loading } = useDashboardStats()

    return (
        <div className={styles.container}>
            <Heading title="Dashboard" />

            <div className={styles.welcome}>
                <h2>Welcome, {currentUser?.firstName || currentUser?.email}</h2>
                <p>DHIS2 Server Certification Program</p>
            </div>

            <div className={styles.cards}>
                <Link to="/implementations" className={styles.cardLink}>
                    <Card className={styles.card}>
                        <div className={styles.cardContent}>
                            <span className={styles.cardIcon}>
                                <IconWorld24 />
                            </span>
                            <div>
                                <h3>Implementations</h3>
                                <p>Manage DHIS2 server implementations</p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link to="/assessments" className={styles.cardLink}>
                    <Card className={styles.card}>
                        <div className={styles.cardContent}>
                            <span className={styles.cardIcon}>
                                <IconCheckmarkCircle24 />
                            </span>
                            <div>
                                <h3>Assessments</h3>
                                {isAdmin && certificates ? (
                                    <p>
                                        {certificates.active} active certificate{certificates.active !== 1 ? 's' : ''}
                                    </p>
                                ) : (
                                    <p>View and manage server assessments</p>
                                )}
                            </div>
                        </div>
                    </Card>
                </Link>

                {isAdmin && (
                    <>
                        <Link to="/admin/users" className={styles.cardLink}>
                            <Card className={styles.card}>
                                <div className={styles.cardContent}>
                                    <span className={styles.cardIcon}>
                                        <IconUserGroup24 />
                                    </span>
                                    <div>
                                        <h3>User Management</h3>
                                        <p>Manage users and roles</p>
                                    </div>
                                </div>
                            </Card>
                        </Link>

                        <Link to="/templates" className={styles.cardLink}>
                            <Card className={styles.card}>
                                <div className={styles.cardContent}>
                                    <span className={styles.cardIcon}>
                                        <IconFileDocument24 />
                                    </span>
                                    <div>
                                        <h3>Templates</h3>
                                        {loading ? (
                                            <CircularLoader small />
                                        ) : templates ? (
                                            <p>
                                                {templates.publishedTemplates} published, {templates.totalTemplates} total
                                            </p>
                                        ) : (
                                            <p>Manage certification templates</p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </Link>

                        <Link to="/admin/monitoring" className={styles.cardLink}>
                            <Card className={styles.card}>
                                <div className={styles.cardContent}>
                                    <span className={styles.cardIcon}>
                                        <IconDashboardWindow24 />
                                    </span>
                                    <div>
                                        <h3>Monitoring</h3>
                                        <p>System health and alerts</p>
                                    </div>
                                </div>
                            </Card>
                        </Link>

                        <Link to="/admin/certificates" className={styles.cardLink}>
                            <Card className={styles.card}>
                                <div className={styles.cardContent}>
                                    <span className={styles.cardIcon}>
                                        <IconCheckmarkCircle24 />
                                    </span>
                                    <div>
                                        <h3>Certificates</h3>
                                        {loading ? (
                                            <CircularLoader small />
                                        ) : certificates ? (
                                            <p>
                                                {certificates.active} active
                                                {certificates.expiringSoon > 0 && `, ${certificates.expiringSoon} expiring soon`}
                                            </p>
                                        ) : (
                                            <p>Manage issued certificates</p>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    </>
                )}
            </div>

            <Card className={styles.statusCard}>
                <h3>Account Status</h3>
                <div className={styles.statusGrid}>
                    <div className={styles.statusItem}>
                        <span className={styles.statusLabel}>Email</span>
                        <span className={styles.statusValue}>{currentUser?.email}</span>
                    </div>
                    <div className={styles.statusItem}>
                        <span className={styles.statusLabel}>Role</span>
                        <span className={styles.statusValue}>{currentUser?.role?.name || 'User'}</span>
                    </div>
                    <div className={styles.statusItem}>
                        <span className={styles.statusLabel}>Two-Factor Auth</span>
                        <span className={`${styles.statusValue} ${currentUser?.isTfaEnabled ? styles.enabled : styles.disabled}`}>
                            {currentUser?.isTfaEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                </div>
            </Card>
        </div>
    )
}
