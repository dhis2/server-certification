import { Button, LogoIcon, NoticeBox } from '@dhis2/ui'
import { useNavigate } from 'react-router-dom'
import styles from './not-found.module.css'

export const NotFound = () => {
    const navigate = useNavigate()

    return (
        <div className={styles.wrapper}>
            <div className={styles.content}>
                <LogoIcon className={styles.logo} />
                <NoticeBox warning title="404 - Page Not Found">
                    The page you are looking for could not be found.
                </NoticeBox>
                <Button primary onClick={() => navigate('/')}>
                    Go to Dashboard
                </Button>
            </div>
        </div>
    )
}
