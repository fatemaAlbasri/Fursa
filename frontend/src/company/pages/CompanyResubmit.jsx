import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api.js'
import Notice from '../../shared/components/Notice.jsx'
import PhoneInput from '../../shared/components/PhoneInput.jsx'
import { ButtonSpinner } from '../../shared/components/Loading.jsx'
import { BuildingIcon, InfoIcon, PencilIcon, XIcon } from '../../shared/components/icons.jsx'
import CompanyLogo from '../../jobseeker/components/CompanyLogo.jsx'
import { Section } from '../../jobseeker/components/profile/ProfileParts.jsx'
import { INDUSTRIES, LOCATIONS } from '../../shared/utils/companyOptions.js'
import '../../jobseeker/styles/Profile.css'
import '../styles/CompanyProfile.css'
import '../styles/CompanyResubmit.css'

// /company/review: a company the admin didn't approve fixes any of its details
// (logo, name, CR number, contact, industry, location, about), can leave a note,
// and sends it to the Fursa team again → PUT /api/profile/company/review → back to 'pending'.
// Same cards and buttons as the company profile page.

function Field({ label, error, hint, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

// text box with suggestions: pick one or type your own
function TypeOrPick({ name, value, onChange, options, placeholder }) {
  return (
    <>
      <input name={name} list={`${name}-options`} value={value} onChange={onChange} placeholder={placeholder} autoComplete="off" />
      <datalist id={`${name}-options`}>
        {options.map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>
    </>
  )
}

// grey shapes of the page while it loads (same look as the other company pages)
function ResubmitLoading() {
  const line = (width, thin) => <span className={thin ? 'sk sk--line sk--thin' : 'sk sk--line'} style={{ width }} />
  const card = (fields) => (
    <section className="card pf-card" aria-hidden="true">
      <div className="pf-card__head">
        <div className="pf-card__titles">
          <span className="sk pf-card__icon" />
          <div className="rs-loading__text">
            {line(150)}
            {line(230, true)}
          </div>
        </div>
      </div>
      <div className="cp-grid">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="rs-loading__field">
            {line('35%', true)}
            <span className="sk rs-loading__input" />
          </div>
        ))}
      </div>
    </section>
  )
  return (
    <div className="rs-loading" role="status" aria-label="Loading your company">
      <div className="rs-loading__text" aria-hidden="true">
        {line(280)}
        {line(380, true)}
      </div>
      <span className="sk rs-loading__reason" aria-hidden="true" />
      {card(6)}
      {card(1)}
    </div>
  )
}

const toForm = (c) => ({
  companyName: c.name || '',
  crNumber: c.cr_number || '',
  industry: c.industry || '',
  location: c.location || '',
  phone: (c.phone || '').replace(/^\+973/, ''),
  website: c.website || '',
  about: c.about || '',
  note: ''
})

// same checks as the backend, so mistakes show before sending
function check(form) {
  const errs = {}
  if (!form.companyName.trim()) errs.companyName = 'Required'
  const cr = form.crNumber.replace(/\s/g, '')
  if (!cr) errs.crNumber = 'Required'
  else if (!/^\d{3,8}(-\d{1,3})?$/.test(cr)) errs.crNumber = 'Enter a CR number like 123456-1'
  if (!form.industry.trim()) errs.industry = 'Required'
  if (!form.location.trim()) errs.location = 'Required'
  const phone = form.phone.replace(/\s/g, '')
  if (phone && !/^\d{8}$/.test(phone)) errs.phone = 'Enter 8 digits'
  if (form.website && !/^https?:\/\/\S+\.\S+/.test(form.website.trim())) errs.website = 'Start with https://'
  return errs
}

export default function CompanyResubmit() {
  const navigate = useNavigate()
  const [company, setCompany] = useState(null) // null = loading
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const logoInput = useRef(null)

  useEffect(() => {
    api('/profile')
      .then(({ profile }) => {
        setCompany(profile.company)
        setForm(toForm(profile.company))
      })
      .catch((err) => setNotice({ type: 'error', text: err.error || 'Could not load your company.' }))
  }, [])

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: undefined })
  }

  // the logo is saved right away (same as on the profile page)
  const changeLogo = async (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const body = new FormData()
    body.append('logo', file)
    try {
      const data = await api('/profile/company/logo', { method: 'PUT', body })
      setCompany({ ...company, logo_url: data.logo_url })
    } catch (err) {
      setNotice({ type: 'error', text: err.error || 'Could not change the logo.' })
    } finally {
      setUploading(false)
    }
  }

  const removeLogo = async () => {
    setUploading(true)
    try {
      await api('/profile/company/logo', { method: 'DELETE' })
      setCompany({ ...company, logo_url: null })
    } catch (err) {
      setNotice({ type: 'error', text: err.error || 'Could not remove the logo.' })
    } finally {
      setUploading(false)
    }
  }

  const send = async (e) => {
    e.preventDefault()
    const errs = check(form)
    setErrors(errs)
    if (Object.keys(errs).length) {
      setNotice({ type: 'error', text: 'Please fix the highlighted fields.' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSending(true)
    setNotice(null)
    try {
      await api('/profile/company/review', {
        method: 'PUT',
        body: { ...form, crNumber: form.crNumber.replace(/\s/g, ''), phone: form.phone.replace(/\s/g, '') }
      })
      navigate('/company/jobs', { replace: true })
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      setNotice({ type: 'error', text: err.error || 'Could not send. Please try again.' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSending(false)
    }
  }

  if (!company) {
    return (
      <main className="container cp rs">
        {notice ? <Notice notice={notice} /> : <ResubmitLoading />}
      </main>
    )
  }

  // only a rejected company has something to fix here
  if (company.status !== 'rejected') {
    const pending = company.status === 'pending'
    return (
      <main className="container cp rs">
        <Section
          title={pending ? 'Your details are with the Fursa team' : 'Your company is approved'}
          sub={pending ? "We're checking your company and will let you know soon." : 'There is nothing to fix. You can publish jobs.'}
          icon={<BuildingIcon />}
          labelledBy="rs-state-title"
        >
          <div className="cp-actions rs-state">
            <Link to="/company/jobs" className="cp-btn cp-btn--teal">
              Go to my jobs
            </Link>
          </div>
        </Section>
      </main>
    )
  }

  const logoInfo = { company_id: company.id, company_name: form.companyName || company.name, company_logo: company.logo_url }

  return (
    <main className="container cp rs">
      <div className="rs-head">
        <Link to="/company/jobs" className="rs-back">
          ← Back to my jobs
        </Link>
        <h1 className="title">Fix your company details</h1>
        <p className="muted">Change anything that wasn't right, then send it to the Fursa team to check again.</p>
      </div>

      {company.rejection_reason && (
        <div className="rs-reason">
          <InfoIcon />
          <div>
            <p className="rs-reason__title">Why it wasn't approved</p>
            <p>{company.rejection_reason}</p>
          </div>
        </div>
      )}

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <form className="rs-form" onSubmit={send} noValidate>
        <Section title="Company details" sub="What the Fursa team checks" icon={<BuildingIcon />} labelledBy="rs-details-title">
          {/* same logo box as the profile page: pencil = change, × = remove */}
          <div className="rs-logo">
            <div className="cp-logo-wrap">
              <CompanyLogo job={logoInfo} className="cp-logo" />
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
              {company.logo_url && (
                <button
                  type="button"
                  className="cp-logo-remove"
                  aria-label="Remove logo"
                  title="Remove logo"
                  disabled={uploading}
                  onClick={removeLogo}
                >
                  <XIcon />
                </button>
              )}
              <input ref={logoInput} type="file" accept="image/*" hidden onChange={changeLogo} />
            </div>
            <div>
              <p className="rs-logo__name">Company logo</p>
              <p className="rs-logo__hint">PNG, JPG or SVG, up to 5 MB. Saved right away.</p>
            </div>
          </div>

          <div className="cp-grid">
            <Field label="Company name" error={errors.companyName}>
              <input name="companyName" value={form.companyName} onChange={change} />
            </Field>
            <Field label="CR number" error={errors.crNumber} hint="Must match your company name.">
              <input name="crNumber" value={form.crNumber} onChange={change} inputMode="numeric" placeholder="123456-1" />
            </Field>
            <Field label="Industry" error={errors.industry}>
              <TypeOrPick name="industry" value={form.industry} onChange={change} options={INDUSTRIES} placeholder="Pick or type" />
            </Field>
            <Field label="Location" error={errors.location}>
              <TypeOrPick name="location" value={form.location} onChange={change} options={LOCATIONS} placeholder="Pick or type a city" />
            </Field>
            <Field label="Company phone" error={errors.phone}>
              <PhoneInput value={form.phone} onChange={change} placeholder="17XX XXXX" />
            </Field>
            <Field label="Website (optional)" error={errors.website}>
              <input name="website" value={form.website} onChange={change} placeholder="https://www.company.bh" />
            </Field>
          </div>
          <Field label="About the company (optional)" error={errors.about}>
            <textarea name="about" rows={4} maxLength={2000} value={form.about} onChange={change} />
          </Field>
        </Section>

        <Section
          title="Note for the Fursa team"
          sub="Tell us what you changed"
          optional
          icon={<PencilIcon />}
          labelledBy="rs-note-title"
        >
          <Field label="Your note" error={errors.note}>
            <textarea
              name="note"
              rows={3}
              maxLength={500}
              value={form.note}
              onChange={change}
              placeholder="e.g. We fixed the CR number, it was missing the branch number."
            />
          </Field>
        </Section>

        <div className="cp-actions">
          <Link to="/company/jobs" className="cp-btn">
            Cancel
          </Link>
          <button type="submit" className="cp-btn cp-btn--teal" disabled={sending} aria-busy={sending}>
            {sending ? (
              <>
                <ButtonSpinner />
                Sending…
              </>
            ) : (
              'Send for review'
            )}
          </button>
        </div>
      </form>
    </main>
  )
}
