// Password rules shown under "New password". The first three are required (same as the wireframe).
const RULES = [
  { key: 'length', label: 'At least 8 characters' },
  { key: 'number', label: 'One number' },
  { key: 'symbol', label: 'One symbol (e.g. ! @ #)' },
];
const LABELS = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'];

// Checks a password. Score 0–3 = how many required rules pass; 4 = all pass plus 12+ characters or mixed case.
// So "Good" always means the password is valid, and nothing below "Good" can be submitted.
export function checkPassword(password) {
  const length = password.length >= 8;
  const number = /\d/.test(password);
  const symbol = /[^A-Za-z0-9\s]/.test(password);
  const valid = length && number && symbol;
  const extra = password.length >= 12 || (/[a-z]/.test(password) && /[A-Z]/.test(password));

  let score = [length, number, symbol].filter(Boolean).length;
  if (valid && extra) score = 4;

  return { length, number, symbol, valid, score, label: LABELS[score] };
}

// Strength bars + requirements list. Use it right under a new-password input.
export default function PasswordStrength({ password }) {
  const result = checkPassword(password);

  return (
    <>
      {password && (
        <>
          <div className="pw-strength" aria-hidden="true">
            {[1, 2, 3, 4].map((n) => (
              <span key={n} className={n <= result.score ? 'pw-strength__bar pw-strength__bar--on' : 'pw-strength__bar'} />
            ))}
          </div>
          <p className="pw-strength__label" aria-live="polite">Strength: {result.label}</p>
        </>
      )}

      <ul className="pw-rules">
        {RULES.map((rule) => (
          <li key={rule.key} className={result[rule.key] ? 'pw-rules__ok' : undefined}>
            {result[rule.key] ? '✓' : '–'} {rule.label}
          </li>
        ))}
      </ul>
    </>
  );
}
