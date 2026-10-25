import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PasswordInput from '../components/PasswordInput.jsx'
import PasswordStrength, { checkPassword } from '../components/PasswordStrength.jsx'
import { api } from '../api.js'

function Field({ label, error, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

// Opened from the link in the "Reset your Fursa password" email: /reset-password?token=...
export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  // The email link has no role, so only keep one if it's in the URL; otherwise Sign In uses its default tab
  const role = ['jobseeker', 'company'].includes(params.get('role')) ? params.get('role') : ''
  const signinPath = role ? `/signin?role=${role}` : '/signin'
  const forgotPath = role ? `/forgot-password?role=${role}` : '/forgot-password'

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  // { type: 'success' | 'error', text, newLink } — newLink shows "Request a new reset link"
  const [alert, setAlert] = useState(
    token ? null : { type: 'error', text: 'This reset link is invalid or has expired.', newLink: true }
  )
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: undefined })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!token) return
    setAlert(null)

    const errs = {}
    if (!form.password) errs.password = 'Enter a new password'
    else if (!checkPassword(form.password).valid)
      errs.password = 'Meet all the password requirements'
    if (!form.confirmPassword) errs.confirmPassword = 'Confirm your new password'
    else if (form.confirmPassword !== form.password)
      errs.confirmPassword = 'Passwords do not match'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      const { message } = await api('/auth/reset-password', {
        method: 'POST',
        body: { token, password: form.password }
      })
      setAlert({ type: 'success', text: message })
      setDone(true)
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      // e.g. "This reset link is invalid or has expired" → offer a new link
      else if (err.error) setAlert({ type: 'error', text: err.error, newLink: true })
      else setAlert({ type: 'error', text: 'Could not reach the server' })
    } finally {
      setLoading(false)
    }
  }

  const confirmError =
    errors.confirmPassword ||
    (form.confirmPassword && form.confirmPassword !== form.password
      ? 'Passwords do not match'
      : '')

  return (
    <main className="pw">
      <form className="card" onSubmit={submit} noValidate autoComplete="off">
        <div className="pw-head">
          <span className="pw-head__icon">
            {/* lock */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>
          <h1>Reset password</h1>
        </div>

        {!done && token && (
          <p className="pw-text">Choose a new password for your Fursa account.</p>
        )}

        {alert && (
          <p className={`pw-alert pw-alert--${alert.type}`} role={alert.type === 'error' ? 'alert' : 'status'}>
            {alert.text}
            {alert.newLink && (
              <>
                {' '}
                <Link className="link" to={forgotPath}>Request a new reset link</Link>
              </>
            )}
          </p>
        )}

        {done ? (
          <button type="button" className="btn btn--primary btn--block" onClick={() => navigate(signinPath)}>
            Go to sign in
          </button>
        ) : (
          token && (
            <>
              <Field label="New password" error={errors.password}>
                <PasswordInput name="password" value={form.password} onChange={change} />
                <PasswordStrength password={form.password} />
              </Field>

              <Field label="Confirm new password" error={confirmError}>
                <PasswordInput name="confirmPassword" value={form.confirmPassword} onChange={change} />
              </Field>

              <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
                {loading ? 'Saving…' : 'Reset password'}
              </button>
            </>
          )
        )}

        {!done && (
          <p className="center muted small">
            Remembered it?{' '}
            <Link className="link" to={signinPath}>
              Back to sign in
            </Link>
          </p>
        )}
      </form>
    </main>
  )
}
