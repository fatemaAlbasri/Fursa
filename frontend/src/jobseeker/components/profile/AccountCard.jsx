import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../../shared/api.js'
import ConfirmDialog from '../../../shared/components/ConfirmDialog.jsx'
import PasswordInput from '../../../shared/components/PasswordInput.jsx'
import { LockIcon, TrashIcon } from '../../../shared/components/icons.jsx'
import { Section, ShieldIcon, errorText } from './ProfileParts.jsx'

// "Account": Change password (the existing page) and Delete my account.
// Deleting asks for confirmation + the current password: DELETE /api/auth/profile/account { password }.
export default function AccountCard() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const close = () => {
    setOpen(false)
    setPassword('')
    setError('')
  }

  async function deleteAccount() {
    if (!password) return setError('Enter your password to confirm')
    setBusy(true)
    setError('')
    try {
      await api('/auth/profile/account', { method: 'DELETE', body: { password } })
      localStorage.removeItem('token')
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.fields?.password || errorText(err))
      setBusy(false)
    }
  }

  return (
    <Section title="Account" sub="Password and account settings" icon={<ShieldIcon />} labelledBy="pf-account-title">
      <div className="pf-account">
        <Link to="/jobseeker/change-password" className="pf-outline">
          <LockIcon />
          Change password
        </Link>
        <button type="button" className="btn pf-danger" onClick={() => setOpen(true)}>
          <TrashIcon />
          Delete my account
        </button>
      </div>

      <ConfirmDialog
        open={open}
        title="Delete your account?"
        message="This permanently deletes your profile, CV, applications and notifications. This can't be undone."
        confirmLabel="Delete my account"
        danger
        busy={busy}
        onConfirm={deleteAccount}
        onCancel={close}
      >
        <div className="field pf-dialog-field">
          <label htmlFor="pf-delete-password">Enter your password to confirm</label>
          <PasswordInput
            id="pf-delete-password"
            name="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
          />
          {error && <p className="field__error" role="alert">{error}</p>}
        </div>
      </ConfirmDialog>
    </Section>
  )
}
