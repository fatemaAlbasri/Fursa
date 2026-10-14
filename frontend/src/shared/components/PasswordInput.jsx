import { useState } from 'react';

// Password box with an eye button to show / hide the password.
export default function PasswordInput({ name = 'password', value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password">
      <input name={name} type={show ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={onChange} />
      <button type="button" className="password__eye" onClick={() => setShow(!show)}
        aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19M1 1l22 22" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
