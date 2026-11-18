import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api.js'
import { formatSalary, formatDeadline } from '../../shared/utils/jobFormat.js'
import CompanyLogo from '../../jobseeker/components/CompanyLogo.jsx'
import Notice from '../../shared/components/Notice.jsx'
import PhoneInput from '../../shared/components/PhoneInput.jsx'
import Loading, { ButtonSpinner } from '../../shared/components/Loading.jsx'
import {
  LogOutIcon,
  TrashIcon,
  BriefcaseIcon,
  CalendarIcon,
  PencilIcon,
  TrendIcon
} from '../../shared/components/icons.jsx'
import '../styles/CompanyProfile.css'

// Company profile page

// grey box with a label and a value
function Info({ label, children, wide }) {
  return (
    <div className={`cp-info${wide ? ' cp-info--wide' : ''}`}>
      <span className="cp-info__label">{label}</span>
      <span className="cp-info__value">{children || '—'}</span>
    </div>
  )
}

// form field with label and error message
function Field({ label, error, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

// fill the edit forms with the current data (remove +973 from the phone)
const detailsForm = (c) => ({
  companyName: c.name || '',
  industry: c.industry || '',
  location: c.location || '',
  website: c.website || '',
  phone: (c.phone || '').replace(/^\+973/, ''),
  about: c.about || ''
})
const contactForm = (p) => ({
  firstName: p.first_name,
  lastName: p.last_name,
  email: p.email
})

// format date like "Oct 2026"
const monthYear = (date) =>
  new Date(date).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric'
  })

// add https:// if it's missing so the link works
const websiteHref = (url) => (/^https?:\/\//.test(url) ? url : `https://${url}`)

export default function CompanyProfile() {
  const navigate = useNavigate()
  const logoInput = useRef(null)

  const [profile, setProfile] = useState(null)
  const [plan, setPlan] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState(null)

  // get profile and plan
  useEffect(() => {
    api('/profile')
      .then((data) => setProfile(data.profile))
      .catch((err) =>
        setNotice({
          type: 'error',
          text: err.error || 'Could not load your profile.'
        })
      )
    api('/plans/mine')
      .then(setPlan)
      .catch(() => {}) // no plan, hide the plan box
  }, [])

  // scroll up so the user can see the message
  useEffect(() => {
    if (notice) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [notice])

  if (!profile) {
    return (
      <main className="container cp">
        {notice ? (
          <Notice notice={notice} />
        ) : (
          <Loading text="Loading your profile…" />
        )}
      </main>
    )
  }

  const company = profile.company || {}

  const startEdit = (section) => {
    setEditing(section)
    setForm(section === 'details' ? detailsForm(company) : contactForm(profile))
    setErrors({})
    setNotice(null)
  }
  const cancelEdit = () => {
    setEditing(null)
    setErrors({})
  }
  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: undefined })
  }

  const save = async () => {
    setBusy(true)
    setNotice(null)
    try {
      if (editing === 'details') {
        const data = await api('/profile/company/details', {
          method: 'PUT',
          body: form
        })
        setProfile({ ...profile, company: data.company })
        setNotice({ type: 'success', text: 'Company details saved.' })
      } else {
        const data = await api('/profile/company/contact', {
          method: 'PUT',
          body: form
        })
        setProfile({ ...profile, ...data })
        setNotice({ type: 'success', text: 'HR contact saved.' })
      }
      setEditing(null)
    } catch (err) {
      setErrors(err.fields || {})
      setNotice({
        type: 'error',
        text: err.error || 'Could not save. Try again.'
      })
    } finally {
      setBusy(false)
    }
  }

  const changeLogo = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const body = new FormData()
    body.append('logo', file)
    try {
      const data = await api('/profile/company/logo', { method: 'PUT', body })
      setProfile({
        ...profile,
        company: { ...company, logo_url: data.logo_url }
      })
      setNotice({ type: 'success', text: 'Logo changed.' })
    } catch (err) {
      setNotice({
        type: 'error',
        text: err.error || 'Could not change the logo.'
      })
    } finally {
      setUploading(false)
    }
  }

  const logout = async () => {
    await api('/auth/profile/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('token')
    navigate('/')
  }

  // save and cancel buttons
  const formButtons = (
    <div className="cp-actions">
      <button
        type="button"
        className="cp-btn"
        onClick={cancelEdit}
        disabled={busy}
      >
        Cancel
      </button>
      <button
        type="button"
        className="cp-btn cp-btn--teal"
        onClick={save}
        disabled={busy}
      >
        {busy ? (
          <>
            <ButtonSpinner />
            Saving…
          </>
        ) : (
          'Save'
        )}
      </button>
    </div>
  )

  return (
    <main className="container cp">
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {/* company header */}
      <section className="cp-hero" aria-label="Company">
        <div className="cp-hero__banner" />
        <div className="cp-hero__body">
          <div className="cp-logo-wrap">
            <CompanyLogo
              job={{
                company_logo: company.logo_url,
                company_name: company.name,
                company_id: company.id
              }}
              className="cp-logo"
            />
            <button
              type="button"
              className="cp-logo-edit"
              aria-label="Change logo"
              title="Change logo"
              disabled={uploading}
              onClick={() => logoInput.current.click()}
            >
              {uploading ? <ButtonSpinner /> : <PencilIcon />}
            </button>
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              hidden
              onChange={changeLogo}
            />
          </div>
          <div className="cp-hero__text">
            <h1>{company.name}</h1>
            <p className="cp-meta">
              <span>
                <BriefcaseIcon />
                Employer account
              </span>
              {profile.created_at && (
                <span>
                  <CalendarIcon />
                  Member since {monthYear(profile.created_at)}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--outline cp-logout"
            onClick={logout}
          >
            <LogOutIcon />
            Log out
          </button>
        </div>
      </section>

      {/* current plan */}
      {plan && (
        <section className="cp-plan" aria-label="Current plan">
          <span className="cp-plan__icon">
            <TrendIcon />
          </span>
          <div className="cp-plan__text">
            <p className="cp-plan__kicker">CURRENT PLAN</p>
            <p className="cp-plan__title">
              <span className="cp-plan__name">{plan.plan.name}</span>
              <span className="cp-plan__price">
                {plan.plan.price_bhd
                  ? `${formatSalary(plan.plan.price_bhd)} / month`
                  : 'Free'}
              </span>
            </p>
            <div className="cp-plan__chips">
              <span>
                {plan.usage.max_active_jobs == null
                  ? `${plan.usage.active_jobs} active jobs · no limit`
                  : `${plan.usage.active_jobs} of ${plan.usage.max_active_jobs} active jobs used`}
              </span>
              {plan.subscription.renews_at && (
                <span>
                  Renews {formatDeadline(plan.subscription.renews_at)}
                </span>
              )}
            </div>
          </div>
          <Link to="/company/plans" className="cp-plan__change">
            Change plan
          </Link>
        </section>
      )}

      {/* company details */}
      <section className="cp-card">
        <div className="cp-card__head">
          <h2>Company details</h2>
          {editing !== 'details' && (
            <button
              type="button"
              className="cp-edit"
              onClick={() => startEdit('details')}
            >
              Edit
            </button>
          )}
        </div>

        {editing === 'details' ? (
          <>
            <div className="cp-grid">
              <Field label="Company name" error={errors.companyName}>
                <input
                  name="companyName"
                  value={form.companyName}
                  onChange={change}
                />
              </Field>
              <Field label="Industry" error={errors.industry}>
                <input
                  name="industry"
                  value={form.industry}
                  onChange={change}
                />
              </Field>
              <Field label="Location" error={errors.location}>
                <input
                  name="location"
                  value={form.location}
                  onChange={change}
                />
              </Field>
              <Field label="Company phone" error={errors.phone}>
                <PhoneInput
                  value={form.phone}
                  onChange={change}
                  placeholder="1XXX XXXX"
                />
              </Field>
              <Field label="Website" error={errors.website}>
                <input
                  name="website"
                  value={form.website}
                  onChange={change}
                  placeholder="https://"
                />
              </Field>
            </div>
            <Field label="About the company" error={errors.about}>
              <textarea
                name="about"
                rows="4"
                maxLength={2000}
                value={form.about}
                onChange={change}
              />
            </Field>
            {formButtons}
          </>
        ) : (
          <>
            <div className="cp-grid">
              <Info label="Company name">{company.name}</Info>
              <Info label="Industry">{company.industry}</Info>
              <Info label="Location">{company.location}</Info>
              <Info label="Company phone">{company.phone}</Info>
              <Info label="Website" wide>
                {company.website && (
                  <a
                    href={websiteHref(company.website)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {company.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </Info>
            </div>
            <div className="cp-info">
              <span className="cp-info__label">About the company</span>
              <span className="cp-info__text">{company.about || '—'}</span>
            </div>
          </>
        )}
      </section>

      {/* HR contact */}
      <section className="cp-card">
        <div className="cp-card__head">
          <h2>HR contact</h2>
          {editing !== 'contact' && (
            <button
              type="button"
              className="cp-edit"
              onClick={() => startEdit('contact')}
            >
              Edit
            </button>
          )}
        </div>

        {editing === 'contact' ? (
          <>
            <div className="cp-grid">
              <Field label="First name" error={errors.firstName}>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={change}
                />
              </Field>
              <Field label="Last name" error={errors.lastName}>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={change}
                />
              </Field>
              <Field label="Work email" error={errors.email}>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={change}
                />
              </Field>
            </div>
            {formButtons}
          </>
        ) : (
          <div className="cp-grid">
            <Info label="Name">
              {profile.first_name} {profile.last_name}
            </Info>
            <Info label="Work email">{profile.email}</Info>
          </div>
        )}

        <div className="cp-links">
          <Link to="/company/change-password" className="cp-btn">
            Change password
          </Link>
          <Link to="/company/delete-account" className="cp-btn cp-btn--danger">
            <TrashIcon />
            Delete my account
          </Link>
        </div>
      </section>
    </main>
  )
}
