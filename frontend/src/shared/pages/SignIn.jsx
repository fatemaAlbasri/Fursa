import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function Field({ label, error, extra, children }) {
  return (
    <div className="field">
      <div className="field__top"><label>{label}</label>{extra}</div>
      {children}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

export default function SignIn() {
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get('role') === 'company' ? 'company' : 'jobseeker');
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});

  const isCompany = role === 'company';
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (!form.password) errs.password = 'Enter your password';
    setErrors(errs);
    if (Object.keys(errs).length) return;

   
    console.log('Sign in', { ...form, role });
    alert(`Signed in as ${isCompany ? 'company' : 'job seeker'} (demo)`);
  };

  return (
    <div className="split">
      <aside className="split__brand">
                <Link to="/" className="logo">
          <img src="/fursa-key.png" alt="" className="logo__key" />
          <img src="/fursa-wordmark-white.png" alt="Fursa" className="logo__wordmark" />
        </Link>
        <div className="split__copy">
          <h1>Match. Apply.<br /><span className="accent">Get hired.</span></h1>
                    <p>See the jobs and internships that match your skills, and improve your CV with AI.</p>
        </div>
        <div className="dots"><span /><span /><span /></div>
      </aside>

      <main className="split__form">
        <form className="auth" onSubmit={submit} noValidate>
          <h2>Welcome back</h2>
          <p className="muted">Sign in as a job seeker or a company.</p>

          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={!isCompany}
              className={!isCompany ? 'tab tab--active' : 'tab'} onClick={() => setRole('jobseeker')}>
              Job seeker
            </button>
            <button type="button" role="tab" aria-selected={isCompany}
              className={isCompany ? 'tab tab--active' : 'tab'} onClick={() => setRole('company')}>
              Company
            </button>
          </div>

          <Field label={isCompany ? 'Company email' : 'Email'} error={errors.email}>
            <input name="email" type="email" placeholder="name@email.com" value={form.email} onChange={change} />
          </Field>

          <Field label="Password" error={errors.password}
            extra={<a href="#" className="link small">Forgot password?</a>}>
            <input name="password" type="password" value={form.password} onChange={change} />
          </Field>

          <button className="btn btn--primary btn--block" type="submit">
            {isCompany ? 'Sign in as company' : 'Sign in as job seeker'}
          </button>

          <p className="center muted">
            New to Fursa?{' '}
            <Link className="link" to={`/signup?role=${role}`}>
              {isCompany ? 'Create a company account' : 'Create a job seeker account'}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
