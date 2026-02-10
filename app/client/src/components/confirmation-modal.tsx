import { Button, ButtonStrip, Modal, ModalTitle, ModalActions, ModalContent } from '@dhis2/ui'
import type { FC, ReactNode } from 'react'

export type ConfirmationModalProps = {
    children?: ReactNode
    open?: boolean
    title?: string
    message?: ReactNode
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
    loading?: boolean
    onConfirm: () => void | Promise<void>
    onCancel: () => void
}

export const ConfirmationModal: FC<ConfirmationModalProps> = ({
    children,
    open = true,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    loading = false,
    onConfirm,
    onCancel,
}) => {
    if (!open) {
        return null
    }

    return (
        <Modal small onClose={onCancel}>
            {title && <ModalTitle>{title}</ModalTitle>}
            <ModalContent>{children || message}</ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button onClick={onCancel} secondary disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button primary={!destructive} destructive={destructive} onClick={onConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}
