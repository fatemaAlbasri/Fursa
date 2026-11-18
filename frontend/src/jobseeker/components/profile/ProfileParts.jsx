// Small building blocks shared by the Profile page cards (styles: jobseeker/styles/Profile.css, "pf-").

// White card with a title row. `action` = the button on the right (e.g. "Edit").
export function Section({ title, optional = false, action, children, labelledBy }) {
  return (
    <section className="card pf-card" aria-labelledby={labelledBy}>
      <div className="pf-card__head">
        <h2 id={labelledBy} className="pf-card__title">
          {title}
          {optional && <span className="pf-card__opt"> (optional)</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

// "Edit" / "Edit skills" button in a card's title row
export function EditButton({ onClick, children = 'Edit', label }) {
  return (
    <button type="button" className="btn btn--outline pf-edit" onClick={onClick} aria-label={label}>
      {children}
    </button>
  )
}

// Read-only box: small label above the saved value
export function InfoTile({ label, children }) {
  return (
    <div className="pf-tile">
      <span className="pf-tile__label">{label}</span>
      <span className="pf-tile__value">{children}</span>
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
