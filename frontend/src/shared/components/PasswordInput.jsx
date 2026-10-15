import { useState } from 'react';

// Password box with an eye button to show / hide the password.
// readOnly until the user clicks in it stops the browser from auto-filling saved passwords.
export default function PasswordInput({ name = 'password', value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  const [locked, setLocked] = useState(true);

  return (
    <div className="password">
      <input
        name={name}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete="new-password"
        readOnly={locked}
        onFocus={() => setLocked(false)}
      />
      <button type="button" className="password__eye" onClick={() => setShow(!show)}
        aria-label={show ? 'Hide password' : 'Show password'} title={show ? 'Hide password' : 'Show password'}>
        {show ? (
          /* eye with a line through it = password is visible, click to hide */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.7 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.1 4.1" />
            <path d="M6.6 6.6C3.6 8.6 2 12 2 12s3.5 7 10 7a9.5 9.5 0 0 0 5.4-1.6" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            <path d="M3 3l18 18" />
          </svg>
        ) : (
          /* open eye = password is hidden, click to show */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
