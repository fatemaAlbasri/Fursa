import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api.js'
import { formatSalary, formatDeadline } from '../../shared/utils/jobFormat.js'
import CompanyLogo from '../../jobseeker/components/CompanyLogo.jsx'
import Notice from '../../shared/components/Notice.jsx'
import ConfirmDialog from '../../shared/components/ConfirmDialog.jsx'
import PhoneInput from '../../shared/components/PhoneInput.jsx'
import { ButtonSpinner } from '../../shared/components/Loading.jsx'
import {
  LogOutIcon,
  TrashIcon,
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  GlobeIcon,
  InfoIcon,
  LockIcon,
  PencilIcon,
  PinIcon,
  TrendIcon,
  XIcon
} from '../../shared/components/icons.jsx'
// same cards and tiles as the job seeker profile (wireframes 11 and 16 share them)
import {
  Section,
  EditButton,
  InfoTile,
  UserIcon,
  MailIcon,
  PhoneIcon
} from '../../jobseeker/components/profile/ProfileParts.jsx'
import { formatPhone } from '../../jobseeker/utils/profile.js'
import DeleteAccountDialog from '../../jobseeker/components/profile/DeleteAccountDialog.jsx'

// What the delete pop-up lists for a company
const COMPANY_LOST = [
  'Your company profile, logo and website link',
  'All your job posts, open and closed',
  'All applicants and their ranked results',
  'Your plan will stop renewing (no refund for the current month)'
]
const COMPANY_BYE =
  'Your company, job posts and applicant data have been removed. We have sent a confirmation to your work email.'
import '../../jobseeker/styles/Profile.css'
import '../styles/CompanyProfile.css'

function CompanyProfileLoading() {
  const line = (width, thin) => <span className={thin ? 'sk sk--line sk--thin' : 'sk sk--line'} style={{ width }} />
  const tiles = (n) => (
    <div className="pf-grid">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="pf-tile">
          <span className="sk pf-tile__icon" />
          <div className="pf-tile__text cp-loading__text">
            {line('40%', true)}
            {line('70%')}
          </div>
        </div>
      ))}
    </div>
  )
  const head = (
    <div className="pf-card__head">
      <div className="pf-card__titles">
        <span className="sk pf-card__icon" />
        <div className="cp-loading__text">
          {line(150)}
          {line(210, true)}
        </div>
      </div>
      <span className="sk sk--btn" />
    </div>
  )
  return (
    <div className="cp-loading" role="status" aria-label="Loading your profile">
      <section className="cp-hero" aria-hidden="true">
        <div className="cp-hero__banner" />
        <div className="cp-hero__body">
          <div className="cp-logo-wrap">
            <span className="sk cp-logo" />
          </div>
          <div className="cp-hero__text cp-loading__text">
            {line(200)}
            <div className="cp-meta">
              <span className="sk sk--pill" />
              <span className="sk sk--pill cp-loading__chip" />
            </div>
          </div>
          <span className="sk sk--btn" />
        </div>
      </section>
      <section className="cp-plan" aria-hidden="true">
        <span className="sk cp-plan__icon" />
        <div className="cp-plan__text cp-loading__text">
          {line(90, true)}
          {line(160)}
          {line(220, true)}
        </div>
        <span className="sk sk--btn" />
      </section>
      <section className="card pf-card" aria-hidden="true">
        {head}
        {tiles(6)}
      </section>
      <section className="card pf-card" aria-hidden="true">
        {head}
        {tiles(2)}
      </section>
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
  const [logoBusy, setLogoBusy] = useState(false) // removing right now
  const location = useLocation()
  // A message handed over by another page (e.g. "Password updated" from Change password)
  const [notice, setNotice] = useState(() => location.state?.notice ?? null)
  const [deleting, setDeleting] = useState(false) // "Delete your account?" pop-up is open
  const [confirmLogout, setConfirmLogout] = useState(false) // "Are you sure?" dialog is open
  const [loggingOut, setLoggingOut] = useState(false)

  // Escape closes the log out dialog (= Cancel), never logs out. Ignored while logging out.
  useEffect(() => {
    if (!confirmLogout || loggingOut) return
    const onKey = (e) => {
      if (e.key === 'Escape') setConfirmLogout(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmLogout, loggingOut])

  // Shown once: clear it from the history entry so a reload or Back doesn't show it again
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

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
        {notice?.type === 'error' ? <Notice notice={notice} /> : <CompanyProfileLoading />}
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

  const removeLogo = async () => {
    setLogoBusy(true)
    try {
      await api('/profile/company/logo', { method: 'DELETE' })
      setProfile({ ...profile, company: { ...company, logo_url: null } })
      setNotice({ type: 'success', text: 'Logo removed.' })
    } catch (err) {
      setNotice({ type: 'error', text: err.error || 'Could not remove the logo.' })
    } finally {
      setLogoBusy(false)
    }
  }

  // Tell the backend (it can't cancel the token, so a failure doesn't matter), then forget the token
  const logout = async () => {
    setLoggingOut(true)
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
        <div className="cp-hero__banner" aria-hidden="true">
          <span className="pf-header__dots" />
          <span className="pf-header__shape pf-header__shape--1" />
          <span className="pf-header__shape pf-header__shape--2" />
          <span className="pf-header__shape pf-header__shape--3" />
        </div>
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
            {/* only when there is a logo to remove */}
            {company.logo_url && (
              <button
                type="button"
                className="cp-logo-remove"
                aria-label="Remove logo"
                title="Remove logo"
                disabled={uploading || logoBusy}
                onClick={removeLogo}
              >
                <XIcon />
              </button>
            )}
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
              <span className="pf-chip pf-chip--teal">
                <BriefcaseIcon />
                Employer account
              </span>
              {profile.created_at && (
                <span className="pf-chip">
                  <CalendarIcon />
                  Member since {monthYear(profile.created_at)}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            className="pf-outline pf-logout"
            onClick={() => setConfirmLogout(true)}
            disabled={loggingOut}
          >
            <LogOutIcon />
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </section>
      <ConfirmDialog
        open={confirmLogout}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmLabel="Log out"
        busy={loggingOut}
        onConfirm={logout}
        onCancel={() => setConfirmLogout(false)}
      />

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
      <Section
        title="Company details"
        sub="Shown on your public company page"
        icon={<BuildingIcon />}
        labelledBy="cp-details-title"
        action={
          editing !== 'details' && <EditButton onClick={() => startEdit('details')} label="Edit company details" />
        }
      >

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
          <div className="pf-grid">
            <InfoTile label="Company name" icon={<BuildingIcon />}>
              {company.name || '—'}
            </InfoTile>
            <InfoTile label="Industry" icon={<BriefcaseIcon />}>
              {company.industry || '—'}
            </InfoTile>
            <InfoTile label="Location" icon={<PinIcon />}>
              {company.location || '—'}
            </InfoTile>
            <InfoTile label="Company phone" icon={<PhoneIcon />}>
              {company.phone ? formatPhone(company.phone) : <span className="pf-empty">Not added</span>}
            </InfoTile>
            <InfoTile label="Website" icon={<GlobeIcon />}>
              {company.website ? (
                <a href={websiteHref(company.website)} target="_blank" rel="noreferrer">
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              ) : (
                <span className="pf-empty">Not added</span>
              )}
            </InfoTile>
            <InfoTile label="About the company" icon={<InfoIcon />} wide>
              {company.about ? (
                <span className="cp-about">{company.about}</span>
              ) : (
                <span className="pf-empty">Not added</span>
              )}
            </InfoTile>
          </div>
        )}
      </Section>

      {/* HR contact */}
      <Section
        title="HR contact"
        sub="The account used to sign in"
        icon={<UserIcon />}
        labelledBy="cp-contact-title"
        action={editing !== 'contact' && <EditButton onClick={() => startEdit('contact')} label="Edit HR contact" />}
      >

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
          <div className="pf-grid">
            <InfoTile label="Name" icon={<UserIcon />}>
              {profile.first_name} {profile.last_name}
            </InfoTile>
            <InfoTile label="Work email" icon={<MailIcon />}>
              {profile.email}
            </InfoTile>
          </div>
        )}

        <div className="pf-account">
          <Link to="/company/change-password" className="pf-outline">
            <LockIcon />
            Change password
          </Link>
          <button type="button" className="btn pf-danger" onClick={() => setDeleting(true)}>
            <TrashIcon />
            Delete my account
          </button>
        </div>

        <DeleteAccountDialog
          open={deleting}
          who={[company.name, profile.email].filter(Boolean).join(' · ')}
          lost={COMPANY_LOST}
          bye={COMPANY_BYE}
          alt={{
            text: 'Only want to stop paying? You can',
            label: 'change your plan instead.',
            onClick: () => navigate('/company/plans')
          }}
          onClose={() => setDeleting(false)}
        />
      </Section>
    </main>
  )
}
