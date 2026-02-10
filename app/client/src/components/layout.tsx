import { LogoIconWhite, IconSettings24, IconDashboardWindow24, IconWorld24, IconCheckmarkCircle24, IconFileDocument24, IconUserGroup24, IconLock24 } from '@dhis2/ui'
import type { FC } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/index.ts'
import styles from './layout.module.css'
import { LogoutButton } from './logout-button.tsx'

export const Layout: FC = () => {
    const { currentUser, isAdmin } = useAuth()
    const location = useLocation()

    const isSettingsActive = location.pathname.startsWith('/settings')
    const isImplementationsActive = location.pathname.startsWith('/implementations')
    const isAssessmentsActive = location.pathname.startsWith('/assessments')
    const isTemplatesActive = location.pathname.startsWith('/templates')
    const isUsersActive = location.pathname.startsWith('/admin/users')
    const isCertificatesActive = location.pathname.startsWith('/admin/certificates')
    const isMonitoringActive = location.pathname.startsWith('/admin/monitoring')
    const isAuditActive = location.pathname.startsWith('/admin/audit')
    const isKeysActive = location.pathname.startsWith('/admin/keys')

    return (
        <div className={styles.container}>
            <div className={styles.nav}>
                <h1 className={styles.header}>
                    <LogoIconWhite className={styles.logo} />
                    Server Certification
                </h1>
                <nav className={styles.navlist}>
                    <NavLink to="/dashboard">
                        <span className={styles.navLabel}>
                            <IconDashboardWindow24 />
                            Dashboard
                        </span>
                    </NavLink>

                    <NavLink to="/implementations" className={({ isActive }) => (isActive || isImplementationsActive ? 'active' : undefined)}>
                        <span className={styles.navLabel}>
                            <IconWorld24 />
                            Implementations
                        </span>
                    </NavLink>

                    <NavLink to="/assessments" className={({ isActive }) => (isActive || isAssessmentsActive ? 'active' : undefined)}>
                        <span className={styles.navLabel}>
                            <IconCheckmarkCircle24 />
                            Assessments
                        </span>
                    </NavLink>

                    {isAdmin && (
                        <>
                            <div className={styles.sectionLabel}>Administration</div>

                            <NavLink to="/templates" className={({ isActive }) => (isActive || isTemplatesActive ? 'active' : undefined)}>
                                <span className={styles.navLabel}>
                                    <IconFileDocument24 />
                                    Templates
                                </span>
                            </NavLink>

                            <NavLink to="/admin/users" className={({ isActive }) => (isActive || isUsersActive ? 'active' : undefined)}>
                                <span className={styles.navLabel}>
                                    <IconUserGroup24 />
                                    Users
                                </span>
                            </NavLink>

                            <NavLink to="/admin/certificates" className={({ isActive }) => (isActive || isCertificatesActive ? 'active' : undefined)}>
                                <span className={styles.navLabel}>
                                    <IconCheckmarkCircle24 />
                                    Certificates
                                </span>
                            </NavLink>

                            <NavLink to="/admin/monitoring" className={({ isActive }) => (isActive || isMonitoringActive ? 'active' : undefined)}>
                                <span className={styles.navLabel}>
                                    <IconDashboardWindow24 />
                                    Monitoring
                                </span>
                            </NavLink>

                            <NavLink to="/admin/audit" className={({ isActive }) => (isActive || isAuditActive ? 'active' : undefined)}>
                                <span className={styles.navLabel}>
                                    <IconFileDocument24 />
                                    Audit Logs
                                </span>
                            </NavLink>

                            <NavLink to="/admin/keys" className={({ isActive }) => (isActive || isKeysActive ? 'active' : undefined)}>
                                <span className={styles.navLabel}>
                                    <IconLock24 />
                                    Signing Keys
                                </span>
                            </NavLink>
                        </>
                    )}

                    <NavLink to="/settings" className={({ isActive }) => (isActive || isSettingsActive ? 'active' : undefined)}>
                        <span className={styles.navLabel}>
                            <IconSettings24 />
                            Settings
                        </span>
                    </NavLink>
                </nav>
                <div className={styles.userSection}>
                    <div className={styles.userInfo}>
                        <span className={styles.userEmail}>{currentUser?.email}</span>
                        {currentUser?.role?.name && <span className={styles.userRole}>{currentUser.role.name}</span>}
                    </div>
                    <LogoutButton />
                </div>
            </div>
            <div className={styles.mainArea}>
                <Outlet />
            </div>
        </div>
    )
}
