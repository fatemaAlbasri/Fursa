import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api.js'
import PasswordInput from '../../shared/components/PasswordInput.jsx'
import { ButtonSpinner } from '../../shared/components/Loading.jsx'
import { WarningIcon, XIcon, InfoIcon, TrashIcon, CheckIcon } from '../../shared/components/icons.jsx'
import '../styles/DeleteAccount.css'

// Delete company account page

const LOST = [
  'Your company profile, logo and website link',
  'All your job posts, open and closed',
  'All applicants and their ranked results',
  'Your plan will stop renewing (no refund for the current month)'
]

export default function DeleteAccount() {
  const [who, setWho] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleted, setDeleted] = useState(false)

  // show company name and email under the title
  useEffect(() => {
    api('/profile')
      .then(({ profile }) => setWho([profile.company?.name, profile.email].filter(Boolean).join(' · ')))
      .catch(() => {})
  }, [])

  const remove = async () => {
    if (!password) return setError('Enter your password')
    setBusy(true)
    setError('')
    try {
      await api('/auth/profile/account', { method: 'DELETE', body: { password } })
      localStorage.removeItem('token')
      setDeleted(true)
    } catch (err) {
      setError(err.fields?.password || err.error || 'Could not delete the account. Try again.')
    } finally {
      setBusy(false)
    }
  }

  // after the account is deleted
  if (deleted) {
    return (
      <main className="container da">
        <section className="da-done">
          <span className="da-done__icon"><CheckIcon /></span>
          <h1>Your account has been deleted</h1>
          <p>Your company, job posts and applicant data have been removed.</p>
          <Link to="/" className="da-home">Go to the home page</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="container da">
      <section className="da-card">
        <div className="da-head">
          <span className="da-head__icon"><WarningIcon /></span>
          <div>
            <h1>Delete your account?</h1>
            <p>{who && `${who} · `}This cannot be undone.</p>
          </div>
        </div>

        {/* what will be deleted */}
        <div className="da-lost">
          <p className="da-lost__title">What will be deleted</p>
          {LOST.map((text) => (
            <p key={text} className="da-lost__item"><XIcon /><span>{text}</span></p>
          ))}
        </div>

        {/* just text for now, no plans page yet */}
        <p className="da-alt">
          <InfoIcon />
          <span>Only want to stop paying? You can <b>change your plan instead.</b></span>
        </p>

        <div className="field">
          <label htmlFor="da-password">Enter your password to confirm</label>
          <PasswordInput
            id="da-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
          />
          {error && <p className="field__error">{error}</p>}
        </div>

        <div className="da-actions">
          <Link to="/company/profile" className="da-keep">Keep my account</Link>
          <button type="button" className="da-delete" onClick={remove} disabled={busy}>
            {busy ? <><ButtonSpinner />Deleting…</> : <><TrashIcon />Delete my account</>}
          </button>
        </div>
      </section>
    </main>
  )
}
