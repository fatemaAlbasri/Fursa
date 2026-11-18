import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../shared/api.js';
import { formatSalary, formatDeadline } from '../../shared/utils/jobFormat.js';
import CompanyLogo from '../../jobseeker/components/CompanyLogo.jsx';
import Notice from '../../shared/components/Notice.jsx';
import '../styles/CompanyProfile.css';

// =====================================================================
// Company profile (/company/profile).
// Wireframe "16 · Company profile": company card + Log out, current plan,
// Company details (Edit + Change logo), HR contact (Edit) + Change password / Delete my account.
// =====================================================================

// icons
const LogoutIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" />
  </svg>
);
const TrashIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);
const PencilIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </svg>
);

// A small grey box: label on top, value under it
function Info({ label, children, wide }) {
  return (
    <div className={`cp-info${wide ? ' cp-info--wide' : ''}`}>
      <span className="cp-info__label">{label}</span>
      <span className="cp-info__value">{children || '—'}</span>
    </div>
  );
}

// Label + input + error (the shared .field style)
function Field({ label, error, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

// Backend data → the values in each Edit form (phone without +973, like the sign up form)
const detailsForm = (c) => ({
  companyName: c.name || '',
  industry: c.industry || '',
  location: c.location || '',
  website: c.website || '',
  phone: (c.phone || '').replace(/^\+973/, ''),
  about: c.about || '',
});
const contactForm = (p) => ({ firstName: p.first_name, lastName: p.last_name, email: p.email });

export default function CompanyProfile() {
  const navigate = useNavigate();
  const logoInput = useRef(null);

  // ---------- Page state ----------
  const [profile, setProfile] = useState(null); // { first_name, last_name, email, company }
  const [plan, setPlan] = useState(null); // GET /plans/mine (null = no plan)
  const [editing, setEditing] = useState(null); // null | 'details' | 'contact'
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text }

  // ---------- Load from the backend ----------
  useEffect(() => {
    api('/profile')
      .then((data) => setProfile(data.profile))
      .catch((err) => setNotice({ type: 'error', text: err.error || 'Could not load your profile.' }));
    api('/plans/mine')
      .then(setPlan)
      .catch(() => {}); // no active plan → the plan box is hidden
  }, []);

  if (!profile) {
    return (
      <main className="container cp">
        <Notice notice={notice} />
      </main>
    );
  }

  const company = profile.company || {};

  // ---------- Edit / Save / Cancel ----------
  const startEdit = (section) => {
    setEditing(section);
    setForm(section === 'details' ? detailsForm(company) : contactForm(profile));
    setErrors({});
    setNotice(null);
  };
  const cancelEdit = () => {
    setEditing(null);
    setErrors({});
  };
  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined }); // hide that field's error while typing
  };

  const save = async () => {
    setBusy(true);
    setNotice(null);
    try {
      if (editing === 'details') {
        const data = await api('/profile/company/details', { method: 'PUT', body: form });
        setProfile({ ...profile, company: data.company });
        setNotice({ type: 'success', text: 'Company details saved.' });
      } else {
        const data = await api('/profile/company/contact', { method: 'PUT', body: form });
        setProfile({ ...profile, ...data });
        setNotice({ type: 'success', text: 'HR contact saved.' });
      }
      setEditing(null);
    } catch (err) {
      setErrors(err.fields || {});
      setNotice({ type: 'error', text: err.error || 'Could not save. Try again.' });
    } finally {
      setBusy(false);
    }
  };

  // ---------- Change logo ----------
  const changeLogo = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // picking the same file again still works
    if (!file) return;
    const body = new FormData();
    body.append('logo', file);
    try {
      const data = await api('/profile/company/logo', { method: 'PUT', body });
      setProfile({ ...profile, company: { ...company, logo_url: data.logo_url } });
      setNotice({ type: 'success', text: 'Logo changed.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.error || 'Could not change the logo.' });
    }
  };

  // ---------- Log out ----------
  const logout = async () => {
    await api('/auth/profile/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('token');
    navigate('/');
  };

  // Save + Cancel under an Edit form
  const formButtons = (
    <div className="cp-actions">
      <button type="button" className="cp-btn" onClick={cancelEdit} disabled={busy}>Cancel</button>
      <button type="button" className="cp-btn cp-btn--teal" onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </div>
  );

  return (
    <main className="container cp">
      {/* ---------- Company card + Log out ---------- */}
      <section className="cp-head">
        <div className="cp-logo-wrap">
          <CompanyLogo job={{ company_logo: company.logo_url, company_name: company.name, company_id: company.id }} className="cp-logo" />
          <button type="button" className="cp-logo-edit" aria-label="Change logo" title="Change logo"
    onClick={() => logoInput.current.click()}>{PencilIcon}</button>
          <input ref={logoInput} type="file" accept="image/*" hidden onChange={changeLogo} />
        </div>

        <div className="cp-head__who">
          <h1>{company.name}</h1>
          <p>Employer Account</p>
        </div>
        <button type="button" className="cp-logout" onClick={logout}>{LogoutIcon}Log out</button>
      </section>

      {/* ---------- Current plan ---------- */}
      {plan && (
        <section className="cp-plan">
          <div className="cp-plan__text">
            <p className="cp-plan__kicker">CURRENT PLAN</p>
            <p className="cp-plan__name">
              {plan.plan.name} · {plan.plan.price_bhd ? `${formatSalary(plan.plan.price_bhd)} / month` : 'Free'}
            </p>
            <p className="cp-plan__usage">
              {plan.usage.max_active_jobs == null
                ? `${plan.usage.active_jobs} active jobs · no limit`
                : `${plan.usage.active_jobs} of ${plan.usage.max_active_jobs} active jobs used`}
              {plan.subscription.renews_at && ` · Renews ${formatDeadline(plan.subscription.renews_at)}`}
            </p>
          </div>
          {/* no plans page yet, so it can't be clicked */}
          <span className="cp-plan__change" aria-disabled="true" title="Change plan — coming soon">Change plan</span>
        </section>
      )}

      <Notice notice={notice} onClose={() => setNotice(null)} />

      {/* ---------- Company details ---------- */}
      <section className="cp-card">
        <div className="cp-card__head">
          <h2>Company details</h2>
          {editing !== 'details' && <button type="button" className="cp-edit" onClick={() => startEdit('details')}>Edit</button>}
        </div>

        {editing === 'details' ? (
          <>
            <div className="cp-grid">
              <Field label="Company name" error={errors.companyName}>
                <input name="companyName" value={form.companyName} onChange={change} />
              </Field>
              <Field label="Industry" error={errors.industry}>
                <input name="industry" value={form.industry} onChange={change} />
              </Field>
              <Field label="Location" error={errors.location}>
                <input name="location" value={form.location} onChange={change} />
              </Field>
              <Field label="Company phone" error={errors.phone}>
                <div className="phone">
                  <span className="phone__code">+973</span>
                  <input name="phone" type="tel" inputMode="numeric" maxLength={9} placeholder="1XXX XXXX"
                    value={form.phone} onChange={change} />
                </div>
              </Field>
              <Field label="Website" error={errors.website}>
                <input name="website" value={form.website} onChange={change} placeholder="https://" />
              </Field>
            </div>
            <Field label="About the company" error={errors.about}>
              <textarea name="about" rows="4" maxLength={2000} value={form.about} onChange={change} />
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
                  <a href={/^https?:\/\//.test(company.website) ? company.website : `https://${company.website}`}
                    target="_blank" rel="noreferrer">{company.website.replace(/^https?:\/\//, '')}</a>
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

      {/* ---------- HR contact (login) ---------- */}
      <section className="cp-card">
        <div className="cp-card__head">
          <h2>HR contact (login)</h2>
          {editing !== 'contact' && <button type="button" className="cp-edit" onClick={() => startEdit('contact')}>Edit</button>}
        </div>

        {editing === 'contact' ? (
          <>
            <div className="cp-grid">
              <Field label="First name" error={errors.firstName}>
                <input name="firstName" value={form.firstName} onChange={change} />
              </Field>
              <Field label="Last name" error={errors.lastName}>
                <input name="lastName" value={form.lastName} onChange={change} />
              </Field>
              <Field label="Work email" error={errors.email}>
                <input name="email" type="email" value={form.email} onChange={change} />
              </Field>
            </div>
            {formButtons}
          </>
        ) : (
          <div className="cp-grid">
            <Info label="Name">{profile.first_name} {profile.last_name}</Info>
            <Info label="Work email">{profile.email}</Info>
          </div>
        )}

        <div className="cp-links">
          <Link to="/company/change-password" className="cp-btn">Change password</Link>
          <Link to="/company/delete-account" className="cp-btn cp-btn--danger">{TrashIcon}Delete my account</Link>
        </div>
      </section>
    </main>
  );
}
