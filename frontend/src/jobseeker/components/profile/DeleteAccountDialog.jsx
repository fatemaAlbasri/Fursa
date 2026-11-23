import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../shared/api.js'
import PasswordInput from '../../../shared/components/PasswordInput.jsx'
import { ButtonSpinner } from '../../../shared/components/Loading.jsx'
import { CheckIcon, InfoIcon, TrashIcon, WarningIcon, XIcon } from '../../../shared/components/icons.jsx'
import { errorText } from './ProfileParts.jsx'

// "Delete your account?" pop-up (wireframes 21 and 22): what will be deleted, a softer way out
// ("log out instead" / "change your plan instead"), the password, Keep my account / Delete my account.
// Then "Your account has been deleted".
// DELETE /api/auth/profile/account { password }; the backend also emails a confirmation.
// The job seeker texts are the defaults; the company profile passes its own.

const SEEKER_LOST = [
  'Your profile, phone number and job preferences',
  'Your CV and all AI CV reports',
  'Your skills and job matches',
  'All your applications (companies will no longer see them)'
]
const SEEKER_BYE = 'Your profile, CV and applications have been removed. We have sent a confirmation to your email.'

// who = line under the title (email, or company · email)
// alt = { text, label, onClick } for the teal box
export default function DeleteAccountDialog({
  open,
  who,
  lost = SEEKER_LOST,
  bye = SEEKER_BYE,
  alt,
  onClose
}) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const box = useRef(null)

  // Fresh every time it opens; the page behind doesn't scroll; Escape = Keep my account
  useEffect(() => {
    if (!open) return
    setPassword('')
    setError('')
    setDeleted(false)
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    box.current?.querySelector('input')?.focus({ preventScroll: true })
    return () => {
      document.body.style.overflow = scroll
    }
  }, [open])

  useEffect(() => {
    if (!open || busy || deleted) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, deleted, onClose])

  if (!open) return null

  async function remove(e) {
    e.preventDefault()
    if (!password) return setError('Enter your password to confirm')
    setBusy(true)
    setError('')
    try {
      await api('/auth/profile/account', { method: 'DELETE', body: { password } })
      localStorage.removeItem('token')
      setDeleted(true)
    } catch (err) {
      setError(err.fields?.password || errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const goHome = () => navigate('/', { replace: true })

  return (
    <div className="dialog-overlay pf-del-overlay" onClick={busy ? undefined : deleted ? goHome : onClose}>
      <div
        ref={box}
        className={deleted ? 'pf-del pf-del--done' : 'pf-del'}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="pf-del-title"
        onClick={(e) => e.stopPropagation()}
      >
        {deleted ? (
          <>
            <span className="pf-del__done-icon" aria-hidden="true">
              <CheckIcon />
            </span>
            <h2 id="pf-del-title" className="pf-del__title">
              Your account has been deleted
            </h2>
            <p className="pf-del__bye">{bye}</p>
            <button type="button" className="btn btn--primary pf-del__home" onClick={goHome}>
              Go to the home page
            </button>
          </>
        ) : (
          <form className="pf-del__form" onSubmit={remove} noValidate>
            <button type="button" className="pf-del__close" aria-label="Close" onClick={onClose} disabled={busy}>
              <XIcon />
            </button>
            <div className="pf-del__head">
              <span className="pf-del__icon" aria-hidden="true">
                <WarningIcon />
              </span>
              <div>
                <h2 id="pf-del-title" className="pf-del__title">
                  Delete your account?
                </h2>
                <p className="pf-del__who">
                  {who ? `${who} · ` : ''}This cannot be undone.
                </p>
              </div>
            </div>

            <div className="pf-del__lost">
              <p className="pf-del__lost-title">What will be deleted</p>
              <ul>
                {lost.map((text) => (
                  <li key={text}>
                    <XIcon />
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {alt && (
              <div className="pf-del__alt">
                <InfoIcon />
                <p>
                  {alt.text}{' '}
                  <button type="button" className="pf-del__link" onClick={alt.onClick} disabled={busy}>
                    {alt.label}
                  </button>
                </p>
              </div>
            )}

            <div className="field pf-del__field">
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
              {error && (
                <p className="field__error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="pf-del__actions">
              <button type="button" className="pf-del__keep" onClick={onClose} disabled={busy}>
                Keep my account
              </button>
              <button type="submit" className="pf-del__delete" disabled={busy} aria-busy={busy}>
                {busy ? <ButtonSpinner /> : <TrashIcon />}
                {busy ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
