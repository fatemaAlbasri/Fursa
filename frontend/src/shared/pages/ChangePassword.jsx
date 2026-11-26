import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' }

// One page for both roles: role = 'jobseeker' | 'company' (set by the route in App.jsx).
export default function ChangePassword({ role }) {
  const navigate = useNavigate()
  // "Back to profile" goes to each role's profile page
  const profilePath = role === 'company' ? '/company/profile' : '/jobseeker/profile'

  const [email, setEmail] = useState('')
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState(null) // { type: 'success' | 'error', text }
  const [loading, setLoading] = useState(false)

  // Load the logged-in user's email. No token or a bad token → Sign In.
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate(`/signin?role=${role}`, { replace: true })
      return
    }
    let ignore = false // stops a late answer from updating the page after leaving it
    api('/auth/me')
      .then(({ user }) => {
        if (ignore) return
        const userRole = user.role === 'employer' ? 'company' : 'jobseeker'
        // A company opened the job seeker URL (or the opposite): send them to their own page
        if (user.role !== 'admin' && userRole !== role) {
          navigate(`/${userRole}/change-password`, { replace: true })
          return
        }
        setEmail(user.email)
      })
      .catch((err) => {
        if (ignore) return
        // The server answered with an error (expired / invalid token) → sign in again
        if (err.error) navigate(`/signin?role=${role}`, { replace: true })
        else setAlert({ type: 'error', text: 'Could not reach the server' })
      })
    return () => {
      ignore = true
    }
  }, [role, navigate])

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: undefined }) // hide that field's error while typing
  }

  const submit = async (e) => {
    e.preventDefault()
    setAlert(null)

    const errs = {}
    if (!form.currentPassword) errs.currentPassword = 'Enter your current password'
    if (!form.newPassword) errs.newPassword = 'Enter a new password'
    else if (!checkPassword(form.newPassword).valid)
      errs.newPassword = 'Meet all the password requirements'
    else if (form.newPassword === form.currentPassword)
      errs.newPassword = 'Must be different from the current password'
    if (!form.confirmPassword) errs.confirmPassword = 'Confirm your new password'
    else if (form.confirmPassword !== form.newPassword)
      errs.confirmPassword = 'Passwords do not match'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      const { message } = await api('/auth/profile/change-password', {
        method: 'PUT',
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword }
      })
      // Back to the profile, which shows this message at the top
      navigate(profilePath, {
        state: { notice: { type: 'success', text: `${message}. Use your new password next time you sign in.` } }
      })
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      else setAlert({ type: 'error', text: err.error || 'Could not reach the server' })
      setLoading(false)
    }
  }

  // Show "do not match" as soon as the confirmation differs, not only after submitting
  const confirmError =
    errors.confirmPassword ||
    (form.confirmPassword && form.confirmPassword !== form.newPassword
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
          <div>
            <h1>Change password</h1>
            <p>{email || ' '}</p>
          </div>
        </div>

        {alert && (
          <p className={`pw-alert pw-alert--${alert.type}`} role={alert.type === 'error' ? 'alert' : 'status'}>
            {alert.text}
          </p>
        )}

        <Field label="Current password" error={errors.currentPassword}>
          <PasswordInput name="currentPassword" value={form.currentPassword} onChange={change} />
          <p>
            <Link to={`/forgot-password?role=${role}`} className="link small">
              Forgot your password?
            </Link>
          </p>
        </Field>

        <Field label="New password" error={errors.newPassword}>
          <PasswordInput name="newPassword" value={form.newPassword} onChange={change} />
          <PasswordStrength password={form.newPassword} />
        </Field>

        <Field label="Confirm new password" error={confirmError}>
          <PasswordInput name="confirmPassword" value={form.confirmPassword} onChange={change} />
        </Field>

        <div className="pw-actions">
          <button type="button" className="btn btn--cancel" onClick={() => navigate(profilePath)}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </main>
  )
}
