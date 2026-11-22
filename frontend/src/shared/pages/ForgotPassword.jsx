import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import PasswordSteps from '../components/PasswordSteps.jsx'

// One page for both roles. ?role= is only kept so "Back to sign in" opens the same tab.
export default function ForgotPassword() {
  const [params] = useSearchParams()
  const role = params.get('role') === 'company' ? 'company' : 'jobseeker'

  const [email, setEmail] = useState('')
  const [error, setError] = useState('') // message under the email box
  const [alert, setAlert] = useState(null) // { type: 'success' | 'error', text }
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setAlert(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email')
      return
    }
    setError('')

    setLoading(true)
    try {
      const { message } = await api('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim() }
      })
      setAlert({ type: 'success', text: message })
      setSent(true)
    } catch (err) {
      if (err.fields?.email) setError(err.fields.email)
      else setAlert({ type: 'error', text: err.error || 'Could not reach the server' })
    } finally {
      setLoading(false)
    }
  }

  const tryAgain = () => {
    setSent(false)
    setAlert(null)
  }

  return (
    <main className="pw">
      <PasswordSteps step={sent ? 2 : 1} />
      <form className="card" onSubmit={submit} noValidate>
        <div className="pw-head">
          <span className="pw-head__icon">
            {/* envelope */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
          </span>
          <h1>Forgot password?</h1>
        </div>

        <p className="pw-text">
          No worries. Enter the email you signed up with and we'll send you a link to choose a new password.
        </p>

        {alert && (
          <p className={`pw-alert pw-alert--${alert.type}`} role={alert.type === 'error' ? 'alert' : 'status'}>
            {alert.text}
            {alert.type === 'success' && ' Please check your email inbox.'}
          </p>
        )}

        {sent ? (
          <button type="button" className="btn btn--cancel btn--block" onClick={tryAgain}>
            Didn't get it? Try again
          </button>
        ) : (
          <>
            <div className="field">
              <label htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {error && <p className="field__error">{error}</p>}
            </div>

            <button className="btn btn--primary btn--block" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}

        <p className="center muted small">
          Remembered it?{' '}
          <Link className="link" to={`/signin?role=${role}`}>
            Back to sign in
          </Link>
        </p>
      </form>
    </main>
  )
}
