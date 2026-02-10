import { IconLock24, IconUser24, IconSettings24, Card, NoticeBox } from '@dhis2/ui'
import { useSearchParams } from 'react-router-dom'
import { Heading, ProfileForm } from '../../components/index.ts'
import { useAuth } from '../../hooks/index.ts'
import styles from './settings.module.css'
import { TwoFactorSetup } from './two-factor-setup.tsx'

type SettingsTab = 'security' | 'profile' | 'preferences'

const VALID_TABS: SettingsTab[] = ['security', 'profile', 'preferences']
const DEFAULT_TAB: SettingsTab = 'security'

const TAB_CONFIG: { id: SettingsTab; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'security', label: 'Security', icon: <IconLock24 /> },
    { id: 'profile', label: 'Profile', icon: <IconUser24 /> },
    { id: 'preferences', label: 'Preferences', icon: <IconSettings24 />, adminOnly: true },
]

const isValidTab = (tab: string | null): tab is SettingsTab => tab !== null && VALID_TABS.includes(tab as SettingsTab)

export const Settings = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const { isAdmin } = useAuth()
    const tabParam = searchParams.get('tab')
    const activeTab: SettingsTab = isValidTab(tabParam) ? tabParam : DEFAULT_TAB

    const handleTabChange = (tab: SettingsTab) => {
        setSearchParams({ tab })
    }

    const availableTabs = TAB_CONFIG.filter((tab) => !tab.adminOnly || isAdmin)

    return (
        <div className={styles.container}>
            <Heading title="Settings" />

            <div className={styles.tabs}>
                {availableTabs.map((tab) => (
                    <button key={tab.id} className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`} onClick={() => handleTabChange(tab.id)} type="button">
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'security' && <TwoFactorSetup />}

                {activeTab === 'profile' && <ProfileForm />}

                {activeTab === 'preferences' && isAdmin && (
                    <Card className={styles.placeholderCard}>
                        <NoticeBox title="Preferences">System preferences will be available in a future update.</NoticeBox>
                    </Card>
                )}
            </div>
        </div>
    )
}
