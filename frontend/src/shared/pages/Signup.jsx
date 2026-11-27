import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import MultiSelect from '../components/MultiSelect.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import ChoiceChips from '../components/ChoiceChips.jsx'
import PhoneInput from '../components/PhoneInput.jsx'
import { api } from '../api.js'
import { INDUSTRIES, LOCATIONS } from '../utils/companyOptions.js'
import { XIcon } from '../components/icons.jsx'
import { ButtonSpinner } from '../components/Loading.jsx'
import Notice from '../components/Notice.jsx'
import {
  MAJORS,
  STATUSES,
  JOB_TYPE_OPTIONS as JOB_TYPES,
  WORK_MODE_OPTIONS as WORK_MODES
} from '../utils/seekerOptions.js'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try Fursa with one job',
    price: 'BHD 0',
    features: [
      ['1 active job', true],
      ['Basic job listing', true],
      ['Applicants sorted by date', true],
      ['AI ranking & Top 10', false],
      ['Bulk shortlist / reject', false]
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For small teams hiring 1–2 roles',
    price: 'BHD 15',
    popular: true,
    features: [
      ['Up to 2 active jobs', true],
      ['AI ranking & Top 10', true],
      ['Match reasons for every applicant', true],
      ['Bulk shortlist / reject', true],
      ['Unlimited jobs', false]
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'For companies hiring often',
    price: 'BHD 25',
    features: [
      ['Unlimited active jobs', true],
      ['AI ranking & Top 10', true],
      ['Match reasons for every applicant', true],
      ['Bulk shortlist / reject', true],
      ['Hiring summary per job', true]
    ]
  }
]

const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v)
const hasErrors = (errs) => Object.keys(errs).length > 0

// After a failed submit: scroll to the first field with an error and put the cursor in it.
// Waits a moment so the error messages are on the page first.
function scrollToFirstError() {
  setTimeout(() => {
    const error = document.querySelector('.field__error')
    const box = error?.closest('.field, .choice-box') || error
    if (!box) return
    box.scrollIntoView({ behavior: 'smooth', block: 'center' })
    box.querySelector('input:not([type=file]), select, textarea')?.focus({ preventScroll: true })
  }, 50)
}

function Field({ label, error, hint, children }) {
  return (
    <div className="field">
      <div className="field__top">
        <label>{label}</label>
      </div>
      {children}
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

// Text box with suggestions: the user can pick from the list OR type their own.
function TypeOrPick({ name, value, onChange, options, placeholder }) {
  const listId = `${name}-options`
  return (
    <>
      <input
        name={name}
        list={listId}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>
    </>
  )
}

function SignInLink({ role }) {
  const isCompany = role === 'company'
  return (
    <div className="switch">
      <p>
        Already have an account?{' '}
        <Link className="link" to={`/signin?role=${role}`}>
          Sign in
        </Link>
      </p>
      <span className="switch__or">or</span>
      <Link
        className="switch__other"
        to={`/signup?role=${isCompany ? 'jobseeker' : 'company'}`}
        onClick={() => window.scrollTo(0, 0)}
      >
        {isCompany ? 'Looking for a job?' : 'Hiring for a company?'}{' '}
        <b>
          {isCompany
            ? 'Create a job seeker account'
            : 'Create a company account'}
        </b>
      </Link>
    </div>
  )
}

function Header({ employer, right }) {
  return (
    <header className="topbar">
      <Link to="/" className="logo">
        <img src="/white-full-logo.png" alt="Fursa" className="logo__full" />
        {employer && <span className="logo__tag">Employer</span>}
      </Link>
      <span className="topbar__right">{right}</span>
    </header>
  )
}

const ASIDE = {
  jobseeker: {
    title: (
      <>
        Unlock your <span className="accent">Chance.</span>
      </>
    ),
    text: 'Create your free account and see the jobs and internships that match you.',
    points: [
      'Jobs ranked by your match score',
      'Free AI feedback on your CV',
      'Track every application in one place'
    ]
  },
  company: {
    title: (
      <>
        Hire the right <span className="accent">graduates, faster.</span>
      </>
    ),
    text: 'Post jobs and internships, and let Fursa rank every applicant for you.',
    points: [
      'AI reads every CV and explains each score',
      'Your Top 10 applicants, ready to review',
      'Shortlist or reject in bulk'
    ]
  }
}

// Sign up page frame: navy panel on the left (stays put), form scrolls on the right.
function SignupSplit({ role, children }) {
  const { title, text, points } = ASIDE[role]
  return (
    <div className="split split--signup">
      <aside className="split__brand">
        <Link to="/" className="logo">
          <img src="/white-full-logo.png" alt="Fursa" className="logo__full" />
          {role === 'company' && <span className="logo__tag">Employer</span>}
        </Link>
        <div className="split__copy">
          <h1>{title}</h1>
          <p>{text}</p>
          <ul className="split__points">
            {points.map((p) => (
              <li key={p}>
                <span className="split__check">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="dots">
          <span />
          <span />
          <span />
        </div>
      </aside>
      <div className="split__main">{children}</div>
    </div>
  )
}

/* ================= JOB SEEKER ================= */

function JobSeekerSignup() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    password: '',
    email: '',
    phone: '',
    major: '',
    graduationStatus: 'Graduated'
  })
  const [skills, setSkills] = useState([])
  const [jobTypes, setJobTypes] = useState([])
  const [workModes, setWorkModes] = useState([])
  const [cv, setCv] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState({})
  const [notice, setNotice] = useState(null) // errors that aren't about one field
  const [busy, setBusy] = useState(false)
  const fileInput = useRef(null)
  const navigate = useNavigate()

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const pickCv = (file) => {
    if (!file) return
    const ok = /\.(pdf|docx?)$/i.test(file.name)
    setErrors({
      ...errors,
      cv: ok ? undefined : 'Please upload a PDF or Word file'
    })
    if (ok) setCv(file)
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'Required'
    if (!form.lastName.trim()) errs.lastName = 'Required'
    if (form.password.length < 8) errs.password = 'At least 8 characters'
    if (!isEmail(form.email)) errs.email = 'Enter a valid email'
    if (form.phone && !/^\d{8}$/.test(form.phone.replace(/\s/g, '')))
      errs.phone = 'Enter 8 digits'
    if (!form.major.trim()) errs.major = 'Pick or type your major'
    if (skills.length === 0) errs.skills = 'Pick at least one skill'
    if (jobTypes.length === 0) errs.jobTypes = 'Pick at least one job type'
    if (workModes.length === 0) errs.workModes = 'Pick at least one work mode'

    setErrors(errs)
    setNotice(null)
    if (hasErrors(errs)) return scrollToFirstError()

    const data = new FormData()
    data.append('role', 'jobseeker')
    Object.entries(form).forEach(([key, value]) => data.append(key, value))
    data.append('skills', JSON.stringify(skills))
    // already lists, e.g. ["full_time", "internship"]
    data.append('jobTypes', JSON.stringify(jobTypes))
    data.append('workModes', JSON.stringify(workModes))
    if (cv) data.append('cv', cv)

    setBusy(true)
    try {
      const { token } = await api('/auth/signup', {
        method: 'POST',
        body: data
      })
      localStorage.setItem('token', token)
      navigate('/jobseeker')
    } catch (err) {
      setBusy(false)
      if (err.fields) {
        setErrors(err.fields)
        scrollToFirstError()
      } else {
        setNotice({ type: 'error', text: err.error || 'Could not reach the server' })
      }
    }
  }

  return (
    <SignupSplit role="jobseeker">
      <main className="container">
        <div className="page-head">
          <span className="pill">Job seeker account</span>
          <h1 className="title">Create your account</h1>
          <p className="muted">
            Add your skills and CV so Fursa can show you the jobs that match
            you.
          </p>
        </div>

        <form className="card" onSubmit={submit} noValidate autoComplete="off">
          <div className="grid2">
            <Field label="First name" error={errors.firstName}>
              <input
                name="firstName"
                placeholder="First name"
                value={form.firstName}
                onChange={change}
              />
            </Field>
            <Field label="Last name" error={errors.lastName}>
              <input
                name="lastName"
                placeholder="Last name"
                value={form.lastName}
                onChange={change}
              />
            </Field>
          </div>

          <Field label="Password" error={errors.password}>
            <PasswordInput
              placeholder="At least 8 characters"
              value={form.password}
              onChange={change}
            />
          </Field>

          <div className="grid2">
            <Field label="Email" error={errors.email}>
              <input
                name="email"
                type="email"
                placeholder="name@email.com"
                value={form.email}
                onChange={change}
                autoComplete="off"
              />
            </Field>
            <Field label="Phone number" error={errors.phone}>
              <PhoneInput value={form.phone} onChange={change} />
            </Field>

            <Field label="Major / field of study" error={errors.major}>
              {/* pick from the list or type your own */}
              <input
                name="major"
                list="signup-major-options"
                value={form.major}
                onChange={change}
                placeholder="Pick or type your major"
                autoComplete="off"
              />
              <datalist id="signup-major-options">
                {MAJORS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
            <Field label="Graduation status" error={errors.graduationStatus}>
              <select
                name="graduationStatus"
                value={form.graduationStatus}
                onChange={change}
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Skills"
            error={errors.skills}
            hint="Pick from the list. We use these to show you jobs that match."
          >
            <MultiSelect
              value={skills}
              onChange={setSkills}
              placeholder="Search skills ▾"
            />
          </Field>

          <ChoiceChips
            label="Job type"
            options={JOB_TYPES}
            value={jobTypes}
            onChange={setJobTypes}
            error={errors.jobTypes}
          />
          <ChoiceChips
            label="Work mode"
            options={WORK_MODES}
            value={workModes}
            onChange={setWorkModes}
            error={errors.workModes}
          />

          <Field
            label="Upload CV"
            error={errors.cv}
            hint="Employers see your CV when you apply."
          >
            <div
              className={`drop ${dragging ? 'drop--over' : ''}`}
              onClick={() => fileInput.current.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                pickCv(e.dataTransfer.files[0])
              }}
            >
              <svg
                className="drop__icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 15V3M7 8l5-5 5 5M4 17v3h16v-3" />
              </svg>
              {cv ? (
                <p className="drop__text">
                  <b>{cv.name}</b> · <span className="link">change file</span>
                </p>
              ) : (
                <p className="drop__text">
                  Drag your CV here, or{' '}
                  <span className="drop__browse">browse files</span>
                </p>
              )}
              <p className="drop__sub">PDF or Word</p>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.doc,.docx"
                hidden
                onChange={(e) => pickCv(e.target.files[0])}
              />
            </div>
          </Field>

          <Notice notice={notice} onClose={() => setNotice(null)} />
          <button className="btn btn--primary btn--block" type="submit" disabled={busy} aria-busy={busy}>
            {busy ? (
              <>
                <ButtonSpinner />
                Creating your account…
              </>
            ) : (
              'Create account & see my jobs'
            )}
          </button>
        </form>
        <SignInLink role="jobseeker" />
      </main>
    </SignupSplit>
  )
}

/* ================= COMPANY (2 steps) ================= */

// Nothing is paid at sign up: a paid plan is paid for after the admin approves the company
function Steps({ step }) {
  const names = ['Company details', 'Choose a plan']
  return (
    <div className={`steps ${step > 1 ? 'steps--center' : ''}`}>
      {names.map((name, i) => {
        const n = i + 1
        let cls = 'step'
        if (n === step) cls += ' step--active'
        else if (n < step) cls += ' step--done'
        return (
          <Fragment key={name}>
            {/* line fills only up to the current step */}
            {i > 0 && <span className={n <= step ? 'steps__line' : 'steps__line steps__line--todo'} />}
            <span className={cls}>
              {n}
              {/* on small phones only the current step shows its name */}
              <span className="step__name"> · {name}</span>
              {n < step && ' ✓'}
            </span>
          </Fragment>
        )
      })}
    </div>
  )
}

// 48 KB, 1.2 MB
const fileSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

// serverErrors = what the backend said when the account was created (e.g. email already used)
function CompanyDetails({ form, setForm, logo, setLogo, serverErrors, onNext }) {
  const [errors, setErrors] = useState(serverErrors || {})
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (serverErrors) scrollToFirstError()
  }, [serverErrors])
  const logoInput = useRef(null)
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const pickLogo = (file) => {
    if (file && file.type.startsWith('image/')) {
      if (logo) URL.revokeObjectURL(logo.url)
      setLogo({ file, url: URL.createObjectURL(file) })
    }
    logoInput.current.value = '' // so picking the same file again still works
  }
  const removeLogo = () => {
    URL.revokeObjectURL(logo.url)
    setLogo(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.companyName.trim()) errs.companyName = 'Required'
    const cr = form.crNumber.replace(/\s/g, '')
    if (!cr) errs.crNumber = 'Required'
    else if (!/^\d{3,8}(-\d{1,3})?$/.test(cr)) errs.crNumber = 'Enter a CR number like 123456-1'
    if (form.website && !/^https?:\/\/\S+\.\S+/.test(form.website))
      errs.website = 'Start with https://'
    if (!form.firstName.trim()) errs.firstName = 'Required'
    if (!form.lastName.trim()) errs.lastName = 'Required'
    if (form.password.length < 8) errs.password = 'At least 8 characters'
    if (!isEmail(form.email)) errs.email = 'Enter a valid email'
    if (!/^\d{8}$/.test(form.phone.replace(/\s/g, '')))
      errs.phone = 'Enter 8 digits'
    if (!form.industry.trim()) errs.industry = 'Required'
    if (!form.location.trim()) errs.location = 'Required'
    setErrors(errs)
    if (hasErrors(errs)) return scrollToFirstError()

    // email / company name already used? tell them now, not after choosing a plan and paying
    setChecking(true)
    try {
      const { fields } = await api('/auth/signup/check', {
        method: 'POST',
        body: { email: form.email, companyName: form.companyName }
      })
      if (hasErrors(fields)) {
        setErrors(fields)
        return scrollToFirstError()
      }
    } catch {
      // check failed (server busy): carry on, sign up checks again at the end
    } finally {
      setChecking(false)
    }
    onNext()
  }

  return (
    <main className="container">
      <div className="page-head">
        <Steps step={1} />
        <h1 className="title">Create your company account</h1>
        <p className="muted">
          Post jobs and internships, and get your applicants ranked by AI.
        </p>
      </div>

      <form className="card" onSubmit={submit} noValidate autoComplete="off">
        <h3 className="section-title">Company</h3>

        <div className="logo-upload">
          <div className={logo ? 'logo-upload__box logo-upload__box--filled' : 'logo-upload__box'}>
            {logo ? (
              <>
                <img src={logo.url} alt="Company logo" />
                <button type="button" className="logo-upload__x" onClick={removeLogo} aria-label="Remove logo">
                  <XIcon />
                </button>
              </>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            )}
          </div>
          <div className="logo-upload__info">
            <p className="logo-upload__name">{logo ? logo.file.name : 'Company logo (optional)'}</p>
            <p className="logo-upload__meta">
              {logo ? `Uploaded · ${fileSize(logo.file.size)}` : 'PNG, JPG or SVG, up to 5 MB'}
            </p>
            <div className="logo-upload__actions">
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => logoInput.current.click()}
              >
                {logo ? 'Change' : 'Upload logo'}
              </button>
            </div>
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pickLogo(e.target.files[0])}
            />
          </div>
        </div>

        <Field label="Company name" error={errors.companyName}>
          <input
            name="companyName"
            placeholder="Company name"
            value={form.companyName}
            onChange={change}
          />
        </Field>

        <Field
          label="Commercial Registration (CR) number"
          error={errors.crNumber}
          hint="We check it before your jobs go live. You can set up your profile and save drafts while we review it."
        >
          <input
            name="crNumber"
            inputMode="numeric"
            placeholder="123456-1"
            value={form.crNumber}
            onChange={change}
          />
        </Field>

        <Field
          label="Company website (optional)"
          error={errors.website}
          hint="Shown on every job you post, so applicants can learn about you."
        >
          <input
            name="website"
            type="url"
            placeholder="https://www.company.bh"
            value={form.website}
            onChange={change}
          />
        </Field>

        <Field
          label="Company phone number"
          error={errors.phone}
          hint="The company's main number. Shared with applicants you accept, so they can contact you."
        >
          <PhoneInput
            value={form.phone}
            onChange={change}
            placeholder="17XX XXXX"
          />
        </Field>

        <div className="grid2">
          <Field label="Industry" error={errors.industry}>
            <TypeOrPick
              name="industry"
              value={form.industry}
              onChange={change}
              options={INDUSTRIES}
              placeholder="Pick or type your industry"
            />
          </Field>
          <Field label="Location" error={errors.location}>
            <TypeOrPick
              name="location"
              value={form.location}
              onChange={change}
              options={LOCATIONS}
              placeholder="Pick or type a city"
            />
          </Field>
        </div>

        <Field label="About the company (optional)">
          <textarea
            name="about"
            rows={3}
            placeholder="What does your company do?"
            value={form.about}
            onChange={change}
          />
        </Field>

        <hr className="divider" />
        <h3 className="section-title">Your login (HR contact)</h3>

        <div className="grid2">
          <Field label="First name" error={errors.firstName}>
            <input
              name="firstName"
              placeholder="First name"
              value={form.firstName}
              onChange={change}
            />
          </Field>
          <Field label="Last name" error={errors.lastName}>
            <input
              name="lastName"
              placeholder="Last name"
              value={form.lastName}
              onChange={change}
            />
          </Field>
        </div>

        <Field label="Password" error={errors.password}>
          <PasswordInput
            placeholder="At least 8 characters"
            value={form.password}
            onChange={change}
          />
        </Field>

        <Field label="Work email" error={errors.email}>
          <input
            name="email"
            type="email"
            placeholder="hr@company.bh"
            value={form.email}
            onChange={change}
            autoComplete="off"
          />
        </Field>

        <button className="btn btn--primary btn--block" type="submit" disabled={checking} aria-busy={checking}>
          {checking ? (
            <>
              <ButtonSpinner />
              Checking…
            </>
          ) : (
            'Continue: choose a plan'
          )}
        </button>
      </form>
      <SignInLink role="company" />
    </main>
  )
}

function ChoosePlan({ plan, setPlan, onFinish, busy, notice, onCloseNotice }) {
  const selected = PLANS.find((p) => p.id === plan)
  return (
    <main className="container container--wide">
      <div className="page-head center">
        <Steps step={2} />
        <h1 className="title">Choose your plan</h1>
        <p className="muted">
          Nothing to pay now. We first check your company, then you pay for a paid plan once
          you're approved. Change or cancel any time.
        </p>
      </div>

      <Notice notice={notice} onClose={onCloseNotice} />

      <div className="plans">
        {PLANS.map((p) => {
          const active = p.id === plan
          return (
            <div
              key={p.id}
              className={`plan ${active ? 'plan--active' : ''}`}
              onClick={() => setPlan(p.id)}
            >
              {p.popular && <span className="plan__badge">Most popular</span>}
              <h3 className="plan__name">{p.name}</h3>
              <p className="plan__tagline">{p.tagline}</p>
              <p className="plan__price">
                {p.price} <span>/ month</span>
              </p>
              <ul className="plan__list">
                {p.features.map(([text, included]) => (
                  <li key={text} className={included ? '' : 'plan__no'}>
                    <span className="plan__tick">{included ? '✓' : '–'}</span>
                    {text}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={`btn btn--block ${active ? 'btn--white' : 'btn--outline'}`}
                onClick={() => setPlan(p.id)}
              >
                {active ? 'Selected' : `Choose ${p.name}`}
              </button>
            </div>
          )
        })}
      </div>

      <div className="plan-bar">
        {/* key={plan} restarts the fade-in each time the plan changes */}
        <p key={plan} className="swap">
          <b>
            Selected: {selected.name} · {selected.price} / month
          </b>
          {plan !== 'free' && <span className="plan-bar__note"> · You pay after we approve your company</span>}
        </p>
        <button type="button" className="btn btn--primary" onClick={onFinish} disabled={busy} aria-busy={busy}>
          {busy ? (
            <>
              <ButtonSpinner />
              Creating your account…
            </>
          ) : (
            <span key={plan} className="swap">
              {plan === 'free' ? 'Start free' : 'Create account'}
            </span>
          )}
        </button>
      </div>
    </main>
  )
}

function CompanySignup() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    companyName: '',
    crNumber: '',
    website: '',
    industry: '',
    location: '',
    about: '',
    firstName: '',
    lastName: '',
    password: '',
    email: '',
    phone: ''
  })
  const [logo, setLogo] = useState(null)
  const [plan, setPlan] = useState('starter')
  const [busy, setBusy] = useState(false)
  const [serverErrors, setServerErrors] = useState(null) // field errors from the backend → shown on step 1
  const [notice, setNotice] = useState(null) // other errors, shown on the plan step

  const navigate = useNavigate()

  const goToStep = (n) => {
    setStep(n)
    window.scrollTo(0, 0)
  }

  // the account is created here. Every company starts on Free while the admin checks it;
  // a paid plan picked here is kept and paid for from Plans once the company is approved
  const finish = async () => {
    const data = new FormData()
    data.append('role', 'company')
    Object.entries(form).forEach(([key, value]) => data.append(key, value))
    data.append('plan', plan)
    if (logo?.file) data.append('logo', logo.file)

    setBusy(true)
    setNotice(null)
    try {
      const res = await api('/auth/signup', {
        method: 'POST',
        body: data
      })
      localStorage.setItem('token', res.token)
      navigate('/company')
    } catch (err) {
      const fields = { ...err.fields }
      if (hasErrors(fields)) {
        // e.g. email or company name already used → back to step 1, under that field
        setServerErrors(fields)
        goToStep(1)
      } else {
        setNotice({ type: 'error', text: err.error || 'Could not reach the server' })
      }
    } finally {
      setBusy(false)
    }
  }

  const backTo = (n) => (
    <button type="button" className="back-link" onClick={() => goToStep(n)}>
      ← Back
    </button>
  )

  if (step === 1) {
    return (
      <SignupSplit role="company">
        <CompanyDetails
          form={form}
          setForm={setForm}
          logo={logo}
          setLogo={setLogo}
          serverErrors={serverErrors}
          onNext={() => {
            setServerErrors(null)
            goToStep(2)
          }}
        />
      </SignupSplit>
    )
  }

  // Step 2 keeps the full width so the three plan cards fit side by side.
  return (
    <div className="page">
      <Header employer right={backTo(1)} />
      <ChoosePlan
        plan={plan}
        setPlan={setPlan}
        onFinish={finish}
        busy={busy}
        notice={notice}
        onCloseNotice={() => setNotice(null)}
      />
    </div>
  )
}

/* ================= PAGE ================= */

export default function Signup() {
  const [params] = useSearchParams()
  return params.get('role') === 'company' ? (
    <CompanySignup />
  ) : (
    <JobSeekerSignup />
  )
}
