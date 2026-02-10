import { Button, ButtonStrip, Modal, ModalTitle, ModalActions, ModalContent } from '@dhis2/ui'
import type { FC } from 'react'

interface SessionTimeoutModalProps {
    remainingSeconds: number
    onStayLoggedIn: () => void
    onLogout: () => void
}

export const SessionTimeoutModal: FC<SessionTimeoutModalProps> = ({ remainingSeconds, onStayLoggedIn, onLogout }) => (
    <Modal small>
        <ModalTitle>Session Expiring</ModalTitle>
        <ModalContent>
            <p>
                Your session will expire in{' '}
                <strong>
                    {remainingSeconds > 60
                        ? `${Math.ceil(remainingSeconds / 60)} minute${Math.ceil(remainingSeconds / 60) !== 1 ? 's' : ''}`
                        : `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`}
                </strong>{' '}
                due to inactivity.
            </p>
            <p>Would you like to stay logged in?</p>
        </ModalContent>
        <ModalActions>
            <ButtonStrip end>
                <Button onClick={onLogout} secondary>
                    Log out
                </Button>
                <Button onClick={onStayLoggedIn} primary>
                    Stay logged in
                </Button>
            </ButtonStrip>
        </ModalActions>
    </Modal>
)
