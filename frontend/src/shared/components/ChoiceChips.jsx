// A row of buttons where several can be on. Click a selected one again to remove it.
// options = [{ label, value }], value = the selected values. Styled by .choice-box / .choice in index.css.
export default function ChoiceChips({ label, options, value, onChange, error }) {
  const toggle = (opt) =>
    onChange(
      value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]
    )
  return (
    <div className="choice-box">
      <p className="choice-box__label">
        {label} <span className="choice-box__opt">(choose one or more)</span>
      </p>
      <div className="choice-box__chips" role="group" aria-label={label}>
        {options.map((opt) => {
          const on = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              role="checkbox"
              className={on ? 'choice choice--on' : 'choice'}
              aria-checked={on}
              onClick={() => toggle(opt.value)}
            >
              {on && <span className="choice__tick">✓</span>}
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}
