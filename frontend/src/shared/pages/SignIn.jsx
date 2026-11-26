import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PasswordInput from '../components/PasswordInput.jsx'
import { api } from '../api.js'
import { ButtonSpinner } from '../components/Loading.jsx'

function Field({ label, error, extra, children }) {
  return (
    <div className="field">
      <div className="field__top">
        <label>{label}</label>
        {extra}
      </div>
      {children}
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

export default function SignIn() {
  const [params] = useSearchParams()
  const [role, setRole] = useState(
    params.get('role') === 'company' ? 'company' : 'jobseeker'
  )
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const navigate = useNavigate()

  const isCompany = role === 'company'
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.password) errs.password = 'Enter your password'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setBusy(true)
    try {
      const { token, user } = await api('/auth/signin', {
        method: 'POST',
        body: { ...form, role }
      })
      localStorage.setItem('token', token)
      const HOME = { admin: '/admin', employer: '/company', seeker: '/jobseeker' }
      navigate(HOME[user.role] || '/jobseeker')
        } catch (err) {
      setErrors(
        err.fields || { password: err.error || 'Could not reach the server' }
      )
      setBusy(false) // on success the page changes, so only stop on errors
    }
  }

  return (
    <div className="split split--signin">
      <aside className="split__brand">
        <Link to="/" className="logo">
          <img src="/white-full-logo.png" alt="Fursa" className="logo__full" />
        </Link>
        <div className="split__copy">
          <h1>
            Unlock Your <span className="accent">Chance.</span>
          </h1>
          {/* key={role} fades the text in again when the role changes */}
          <p key={role} className="swap">
            {isCompany
              ? 'Post a job and get your applicants ranked, with a clear reason for every score.'
              : 'See the jobs and internships that match your skills, and improve your CV with AI.'}
          </p>
        </div>
        <div className="dots">
          <span />
          <span />
          <span />
        </div>
      </aside>

      <main className="split__form">
        <form className="auth" onSubmit={submit} noValidate autoComplete="off">
          <h2>Welcome back</h2>
          <p className="muted">Sign in as a job seeker or a company.</p>

          <div
            className={isCompany ? 'tabs tabs--right' : 'tabs'}
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isCompany}
              className={!isCompany ? 'tab tab--active' : 'tab'}
              onClick={() => setRole('jobseeker')}
            >
              Job seeker
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isCompany}
              className={isCompany ? 'tab tab--active' : 'tab'}
              onClick={() => setRole('company')}
            >
              Company
            </button>
          </div>

          <Field
            label={isCompany ? 'Company email' : 'Email'}
            error={errors.email}
          >
            <input
              name="email"
              type="email"
              placeholder="name@email.com"
              value={form.email}
              onChange={change}
              autoComplete="off"
            />
          </Field>

          <Field
            label="Password"
            error={errors.password}
            extra={
              <Link to={`/forgot-password?role=${role}`} className="link small">
                Forgot password?
              </Link>
            }
          >
            <PasswordInput value={form.password} onChange={change} />
          </Field>

          <button className="btn btn--primary btn--block" type="submit" disabled={busy} aria-busy={busy}>
            {busy ? (
              <>
                <ButtonSpinner />
                Signing in…
              </>
            ) : (
              // key={role} restarts the fade-in each time the role changes
              <span key={role} className="swap">
                {isCompany ? 'Sign in as company' : 'Sign in as job seeker'}
              </span>
            )}
          </button>

          <p className="center muted">
            New to Fursa?{' '}
            <Link key={role} className="link swap" to={`/signup?role=${role}`}>
              {isCompany
                ? 'Create a company account'
                : 'Create a job seeker account'}
            </Link>
          </p>
        </form>
      </main>
    </div>
  )
}
