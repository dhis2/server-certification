import { Button, ButtonStrip, InputField, Modal, ModalTitle, ModalContent, ModalActions, SingleSelectField, SingleSelectOption, Help } from '@dhis2/ui'
import { useState, useCallback, type FC } from 'react'
import { useUserActions, useRoles } from '../../hooks/users/index.ts'
import { extractErrorMessage } from '../../utils/format.ts'

interface CreateUserModalProps {
    onClose: () => void
    onCreated: () => void
}

export const CreateUserModal: FC<CreateUserModalProps> = ({ onClose, onCreated }) => {
    const { createUser, loading } = useUserActions()
    const { roles } = useRoles()
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [roleId, setRoleId] = useState('')
    const [error, setError] = useState('')

    const doSubmit = useCallback(async () => {
        setError('')

        if (!email.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
            setError('All fields are required')
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }

        try {
            await createUser({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                password,
                ...(roleId && { roleId }),
            })
            onCreated()
        } catch (err) {
            setError(extractErrorMessage(err))
        }
    }, [createUser, firstName, lastName, email, password, roleId, onCreated])

    return (
        <Modal onClose={onClose}>
            <ModalTitle>Create User</ModalTitle>
            <ModalContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        doSubmit()
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                    <InputField name="firstName" label="First name" value={firstName} required onChange={({ value }) => setFirstName(value)} disabled={loading} inputWidth="100%" />
                    <InputField name="lastName" label="Last name" value={lastName} required onChange={({ value }) => setLastName(value)} disabled={loading} inputWidth="100%" />
                    <InputField name="email" label="Email" type="email" value={email} required onChange={({ value }) => setEmail(value)} disabled={loading} inputWidth="100%" />
                    <InputField
                        name="password"
                        label="Password"
                        type="password"
                        value={password}
                        required
                        helpText="Minimum 8 characters"
                        onChange={({ value }) => setPassword(value)}
                        disabled={loading}
                        inputWidth="100%"
                    />
                    <SingleSelectField label="Role" selected={roleId} onChange={({ selected }) => setRoleId(selected)} disabled={loading}>
                        <SingleSelectOption label="Default (User)" value="" />
                        {roles.map((role) => (
                            <SingleSelectOption key={role.id} label={role.name} value={String(role.id)} />
                        ))}
                    </SingleSelectField>

                    {error && <Help error>{error}</Help>}
                </form>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button onClick={onClose} secondary disabled={loading}>
                        Cancel
                    </Button>
                    <Button primary onClick={doSubmit} loading={loading}>
                        Create User
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}
