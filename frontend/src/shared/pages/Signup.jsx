import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SkillSelect from '../components/SkillSelect.jsx';
import Navbar from '../components/Navbar.jsx';

const MAJORS = ['Computer Science', 'Information Systems', 'Computer Engineering', 'Business', 'Accounting', 'Other'];
const STATUSES = ['Graduated', 'Final year student', 'Student'];
const INDUSTRIES = ['Technology', 'Banking & Finance', 'Telecom', 'Consulting', 'Healthcare', 'Retail', 'Government', 'Other'];
const LOCATIONS = ['Manama', 'Seef', 'Muharraq', 'Riffa', 'Isa Town', 'Hamad Town', 'Other'];

const PLANS = [
  {
    id: 'free', name: 'Free', tagline: 'Try Fursa with one job', price: 'BHD 0',
    features: [
      ['1 active job', true], ['Basic job listing', true], ['Applicants sorted by date', true],
      ['AI ranking & Top 10', false], ['Bulk shortlist / reject', false],
    ],
  },
  {
    id: 'starter', name: 'Starter', tagline: 'For small teams hiring 1–2 roles', price: 'BHD [price]', popular: true,
    features: [
      ['Up to 2 active jobs', true], ['AI ranking & Top 10', true], ['Match reasons for every applicant', true],
      ['Bulk shortlist / reject', true], ['Unlimited jobs', false],
    ],
  },
  {
    id: 'growth', name: 'Growth', tagline: 'For companies hiring often', price: 'BHD [price]',
    features: [
      ['Unlimited active jobs', true], ['AI ranking & Top 10', true], ['Match reasons for every applicant', true],
      ['Bulk shortlist / reject', true], ['Hiring summary per job', true],
    ],
  },
];

const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v);
const hasErrors = (errs) => Object.keys(errs).length > 0;

function Field({ label, error, hint, children }) {
  return (
    <div className="field">
      <div className="field__top"><label>{label}</label></div>
      {children}
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

/* ================= JOB SEEKER ================= */

function JobSeekerSignup() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', password: '', email: '', phone: '',
    major: MAJORS[0], graduationStatus: STATUSES[0],
  });
  const [skills, setSkills] = useState([]);
  const [cv, setCv] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInput = useRef(null);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const pickCv = (file) => {
    if (!file) return;
    const ok = /\.(pdf|docx?)$/i.test(file.name);
    setErrors({ ...errors, cv: ok ? undefined : 'Please upload a PDF or Word file' });
    if (ok) setCv(file);
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'Required';
    if (!form.lastName.trim()) errs.lastName = 'Required';
    if (form.password.length < 8) errs.password = 'At least 8 characters';
    if (!isEmail(form.email)) errs.email = 'Enter a valid email';
    if (form.phone && !/^\d{8}$/.test(form.phone.replace(/\s/g, ''))) errs.phone = 'Enter 8 digits';
    if (skills.length === 0) errs.skills = 'Pick at least one skill';
    setErrors(errs);
    if (hasErrors(errs)) return;

    // TODO (backend): POST /api/auth/signup as FormData
    // { role: 'jobseeker', ...form, phone: '+973' + form.phone, skills, cv }
    console.log('Sign up job seeker', { ...form, phone: '+973' + form.phone, skills, cv: cv?.name });
    alert('Account created (demo)');
  };

  return (
    <div className="page">
      <Navbar right={<>Already have an account? <Link className="link link--light" to="/signin?role=jobseeker">Sign in</Link></>} />

      <main className="container">
        <span className="pill">Job seeker account</span>
        <h1 className="title">Create your account</h1>
        <p className="muted">Add your skills and CV so Fursa can show you the jobs that match you.</p>

        <form className="card" onSubmit={submit} noValidate>
          <div className="row">
            <Field label="First name" error={errors.firstName}>
              <input name="firstName" placeholder="First name" value={form.firstName} onChange={change} />
            </Field>
            <Field label="Last name" error={errors.lastName}>
              <input name="lastName" placeholder="Last name" value={form.lastName} onChange={change} />
            </Field>
          </div>

          <Field label="Password" error={errors.password}>
            <input name="password" type="password" placeholder="At least 8 characters" value={form.password} onChange={change} />
          </Field>

          <div className="row">
            <Field label="Email" error={errors.email}>
              <input name="email" type="email" placeholder="name@email.com" value={form.email} onChange={change} />
            </Field>
            <Field label="Phone number" error={errors.phone}>
              <div className="phone">
                <span className="phone__code">+973</span>
                <input name="phone" type="tel" inputMode="numeric" maxLength={9} placeholder="3XXX XXXX"
                  value={form.phone} onChange={change} />
              </div>
            </Field>
          </div>

          <div className="row">
            <Field label="Major / field of study">
              <select name="major" value={form.major} onChange={change}>
                {MAJORS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Graduation status">
              <select name="graduationStatus" value={form.graduationStatus} onChange={change}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Skills" error={errors.skills} hint="Pick from the list. We use these to show you jobs that match.">
            <SkillSelect value={skills} onChange={setSkills} />
          </Field>

          <Field label="Upload CV" error={errors.cv} hint="Employers see your CV when you apply.">
            <div
              className={`drop ${dragging ? 'drop--over' : ''}`}
              onClick={() => fileInput.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickCv(e.dataTransfer.files[0]); }}
            >
              <svg className="drop__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15V3M7 8l5-5 5 5M4 17v3h16v-3" />
              </svg>
              {cv ? (
                <p className="drop__text"><b>{cv.name}</b> · <span className="link">change file</span></p>
              ) : (
                <p className="drop__text">Drag your CV here, or <span className="drop__browse">browse files</span></p>
              )}
              <p className="drop__sub">PDF or Word</p>
              <input ref={fileInput} type="file" accept=".pdf,.doc,.docx" hidden onChange={(e) => pickCv(e.target.files[0])} />
            </div>
          </Field>

          <button className="btn btn--primary btn--block" type="submit">Create account & see my jobs</button>
        </form>
      </main>
    </div>
  );
}

/* ================= COMPANY (2 steps) ================= */

function Steps({ step }) {
  return (
    <div className={`steps ${step === 2 ? 'steps--center' : ''}`}>
      <span className={step === 1 ? 'step step--active' : 'step step--done'}>
        1 · Company details{step === 2 && ' ✓'}
      </span>
      <span className="steps__line" />
      <span className={step === 2 ? 'step step--active' : 'step'}>2 · Choose a plan</span>
    </div>
  );
}

function CompanyDetails({ form, setForm, logo, setLogo, onNext }) {
  const [errors, setErrors] = useState({});
  const logoInput = useRef(null);
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const pickLogo = (file) => {
    if (file && file.type.startsWith('image/')) setLogo({ file, url: URL.createObjectURL(file) });
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.companyName.trim()) errs.companyName = 'Required';
    if (form.website && !/^https?:\/\/\S+\.\S+/.test(form.website)) errs.website = 'Start with https://';
    if (!form.firstName.trim()) errs.firstName = 'Required';
    if (!form.lastName.trim()) errs.lastName = 'Required';
    if (form.password.length < 8) errs.password = 'At least 8 characters';
    if (!isEmail(form.email)) errs.email = 'Enter a valid email';
    setErrors(errs);
    if (!hasErrors(errs)) onNext();
  };

  return (
    <main className="container">
      <Steps step={1} />
      <h1 className="title">Create your company account</h1>
      <p className="muted">Post jobs and internships, and get your applicants ranked by AI.</p>

      <form className="card" onSubmit={submit} noValidate>
        <h3 className="section-title">Company</h3>

        <div className="logo-upload">
          <div className="logo-upload__box">
            {logo ? <img src={logo.url} alt="Company logo" /> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="M21 15l-5-5L5 21" />
              </svg>
            )}
          </div>
          <div>
            <p className="logo-upload__label">Company logo (optional)</p>
            <button type="button" className="btn btn--outline" onClick={() => logoInput.current.click()}>
              {logo ? 'Change logo' : 'Upload logo'}
            </button>
            <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => pickLogo(e.target.files[0])} />
          </div>
        </div>

        <Field label="Company name" error={errors.companyName}>
          <input name="companyName" placeholder="Company name" value={form.companyName} onChange={change} />
        </Field>

        <Field label="Company website (optional)" error={errors.website}
          hint="Shown on every job you post, so applicants can learn about you.">
          <input name="website" type="url" placeholder="https://www.company.bh" value={form.website} onChange={change} />
        </Field>

        <div className="row">
          <Field label="Industry">
            <select name="industry" value={form.industry} onChange={change}>
              {INDUSTRIES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Location">
            <select name="location" value={form.location} onChange={change}>
              {LOCATIONS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
        </div>

        <Field label="About the company (optional)">
          <textarea name="about" rows={3} placeholder="What does your company do?" value={form.about} onChange={change} />
        </Field>

        <hr className="divider" />
        <h3 className="section-title">Your login (HR contact)</h3>

        <div className="row">
          <Field label="First name" error={errors.firstName}>
            <input name="firstName" placeholder="First name" value={form.firstName} onChange={change} />
          </Field>
          <Field label="Last name" error={errors.lastName}>
            <input name="lastName" placeholder="Last name" value={form.lastName} onChange={change} />
          </Field>
        </div>

        <Field label="Password" error={errors.password}>
          <input name="password" type="password" placeholder="At least 8 characters" value={form.password} onChange={change} />
        </Field>

        <Field label="Work email" error={errors.email}>
          <input name="email" type="email" placeholder="hr@company.bh" value={form.email} onChange={change} />
        </Field>

        <button className="btn btn--primary btn--block" type="submit">Continue: choose a plan</button>
      </form>
    </main>
  );
}

function ChoosePlan({ plan, setPlan, onFinish }) {
  const selected = PLANS.find((p) => p.id === plan);
  return (
    <main className="container container--wide">
      <Steps step={2} />
      <h1 className="title center">Choose your plan</h1>
      <p className="muted center">Start free. Upgrade when you want AI ranking. Change or cancel any time.</p>

      <div className="plans">
        {PLANS.map((p) => {
          const active = p.id === plan;
          return (
            <div key={p.id} className={`plan ${active ? 'plan--active' : ''}`}>
              {p.popular && <span className="plan__badge">Most popular</span>}
              <h3 className="plan__name">{p.name}</h3>
              <p className="plan__tagline">{p.tagline}</p>
              <p className="plan__price">{p.price} <span>/ month</span></p>
              <ul className="plan__list">
                {p.features.map(([text, included]) => (
                  <li key={text} className={included ? '' : 'plan__no'}>
                    <span className="plan__tick">{included ? '✓' : '–'}</span>{text}
                  </li>
                ))}
              </ul>
              <button type="button" className={`btn btn--block ${active ? 'btn--white' : 'btn--outline'}`}
                onClick={() => setPlan(p.id)}>
                {active ? 'Selected' : `Choose ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="plan-bar">
        <p><b>Selected: {selected.name} · {selected.price} / month</b></p>
        <button type="button" className="btn btn--primary" onClick={onFinish}>
          {plan === 'free' ? 'Start free' : 'Pay & Start'}
        </button>
      </div>
    </main>
  );
}

function CompanySignup() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    companyName: '', website: '', industry: INDUSTRIES[0], location: LOCATIONS[0], about: '',
    firstName: '', lastName: '', password: '', email: '',
  });
  const [logo, setLogo] = useState(null);
  const [plan, setPlan] = useState('starter');

  const goToStep = (n) => { setStep(n); window.scrollTo(0, 0); };

  const finish = () => {
    // TODO (backend): POST /api/auth/signup as FormData { role: 'company', ...form, logo, plan }
    // Free plan → go to /company. Paid plan → go to the payment page.
    console.log('Sign up company', { ...form, logo: logo?.file.name, plan });
    alert(plan === 'free' ? 'Company account created (demo)' : 'Going to payment (demo)');
  };

  const right = step === 1
    ? <>Already have an account? <Link className="link link--light" to="/signin?role=company">Sign in</Link></>
    : <button type="button" className="back-link" onClick={() => goToStep(1)}>← Back</button>;

  return (
    <div className="page">
      <Navbar tag="Employer" right={right} />
      {step === 1
        ? <CompanyDetails form={form} setForm={setForm} logo={logo} setLogo={setLogo} onNext={() => goToStep(2)} />
        : <ChoosePlan plan={plan} setPlan={setPlan} onFinish={finish} />}
    </div>
  );
}

/* ================= PAGE ================= */

export default function Signup() {
  const [params] = useSearchParams();
  return params.get('role') === 'company' ? <CompanySignup /> : <JobSeekerSignup />;
}