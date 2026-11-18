import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../shared/api.js';
import PasswordInput from '../../shared/components/PasswordInput.jsx';
import { ButtonSpinner } from '../../shared/components/Loading.jsx';
import { WarningIcon, XIcon, InfoIcon, TrashIcon, CheckIcon } from '../../shared/components/icons.jsx';
import '../styles/DeleteAccount.css';

// =====================================================================
// Delete company account (/company/delete-account).
// Wireframe "22 · Delete account warning: company".
// The password is checked by the backend; after deleting, the saved token is removed.
// =====================================================================

const LOST = [
  'Your company profile, logo and website link',
  'All your job posts, open and closed',
  'All applicants and their ranked results',
  'Your plan will stop renewing (no refund for the current month)',
];

export default function DeleteAccount() {
  // ---------- Page state ----------
  const [who, setWho] = useState(''); // "[Company] · hr@company.bh"
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    api('/profile')
      .then(({ profile }) => setWho([profile.company?.name, profile.email].filter(Boolean).join(' · ')))
      .catch(() => {});
  }, []);

  // ---------- Button ----------
  const remove = async () => {
    if (!password) return setError('Enter your password');
    setBusy(true);
    setError('');
    try {
      await api('/auth/profile/account', { method: 'DELETE', body: { password } });
      localStorage.removeItem('token');
      setDeleted(true);
    } catch (err) {
      setError(err.fields?.password || err.error || 'Could not delete the account. Try again.');
    } finally {
      setBusy(false);
    }
  };

  // ---------- Done ----------
  if (deleted) {
    return (
      <main className="container da">
        <section className="da-done">
          <span className="da-done__icon"><CheckIcon /></span>
          <h1>Your account has been deleted</h1>
          <p>Your company, job posts and applicant data have been removed.</p>
          <Link to="/" className="da-home">Go to the home page</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container da">
      <section className="da-card">
        {/* red icon + title */}
        <div className="da-head">
          <span className="da-head__icon"><WarningIcon /></span>
          <div>
            <h1>Delete your account?</h1>
            <p>{who && `${who} · `}This cannot be undone.</p>
          </div>
        </div>

        {/* what will be deleted */}
        <div className="da-lost">
          <p className="da-lost__title">What will be deleted</p>
          {LOST.map((text) => (
            <p key={text} className="da-lost__item"><XIcon /><span>{text}</span></p>
          ))}
        </div>

        {/* no plans page yet, so this is text only */}
        <p className="da-alt"><InfoIcon /><span>Only want to stop paying? You can <b>change your plan instead.</b></span></p>

        <div className="field">
          <label>Enter your password to confirm</label>
          <PasswordInput value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
          {error && <p className="field__error">{error}</p>}
        </div>

        {/* buttons */}
        <div className="da-actions">
          <Link to="/company/profile" className="da-keep">Keep my account</Link>
          <button type="button" className="da-delete" onClick={remove} disabled={busy}>
            {busy ? <><ButtonSpinner />Deleting…</> : <><TrashIcon />Delete my account</>}
          </button>
        </div>
      </section>
    </main>
  );
}
