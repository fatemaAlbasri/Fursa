import { PencilIcon } from '../../../shared/components/icons.jsx'

// Small building blocks shared by the Profile page cards (styles: jobseeker/styles/Profile.css, "pf-").

// Icons only this page uses (same shapes as the wireframe)
const Svg = ({ children }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
)
export const UserIcon = () => (
  <Svg>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </Svg>
)
export const MailIcon = () => (
  <Svg>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </Svg>
)
export const PhoneIcon = () => (
  <Svg>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </Svg>
)
export const BookIcon = () => (
  <Svg>
    <path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z" />
    <path d="M4 19V5" />
  </Svg>
)
export const CapIcon = () => (
  <Svg>
    <path d="M2 9l10-5 10 5-10 5z" />
    <path d="M6 11v5c3 2 9 2 12 0v-5" />
  </Svg>
)
export const ShieldIcon = () => (
  <Svg>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
  </Svg>
)

// White card: icon square + title + grey line under it, then the content. `action` = the button on the right.
export function Section({ title, sub, icon, optional = false, action, children, labelledBy }) {
  return (
    <section className="card pf-card" aria-labelledby={labelledBy}>
      <div className="pf-card__head">
        <div className="pf-card__titles">
          {icon && (
            <span className="pf-card__icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <div>
            <h2 id={labelledBy} className="pf-card__title">
              {title}
              {optional && <span className="pf-card__opt"> (optional)</span>}
            </h2>
            {sub && <p className="pf-card__sub">{sub}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

// "Edit" / "Edit skills" button in a card's title row
export function EditButton({ onClick, children = 'Edit', label }) {
  return (
    <button type="button" className="pf-ghost" onClick={onClick} aria-label={label}>
      <PencilIcon />
      {children}
    </button>
  )
}

// Read-only box: icon, small label above the saved value
export function InfoTile({ label, icon, children }) {
  return (
    <div className="pf-tile">
      {icon && (
        <span className="pf-tile__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="pf-tile__text">
        <span className="pf-tile__label">{label}</span>
        <span className="pf-tile__value">{children}</span>
      </div>
    </div>
  )
}

// Form field (uses the shared .field styles from index.css)
export function Field({ id, label, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

// Cancel + Save under an edit form
export function FormActions({ onCancel, saving, saveLabel = 'Save changes' }) {
  return (
    <div className="pf-actions">
      <button type="button" className="btn btn--cancel" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
      <button type="submit" className="btn btn--primary" disabled={saving}>
        {saving ? 'Saving…' : saveLabel}
      </button>
    </div>
  )
}

// Server error → message for the card. Field errors are shown next to their fields instead.
export const errorText = (err) => err?.error || 'Could not reach the server'
