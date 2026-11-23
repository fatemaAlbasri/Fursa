import { SearchIcon, XIcon } from '../../shared/components/icons.jsx'
import '../styles/FilterParts.css'

// Pieces of the search + filters boxes on All jobs and Companies 

// Search box with a magnifier, and an × to empty it once something is typed
export function SearchBox({ id, label, placeholder, value, onChange, onClear }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="fp-search">
        <SearchIcon />
        <input
          id={id}
          name="search"
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete="off"
        />
        {value && (
          <button type="button" className="fp-search__clear" onClick={onClear} aria-label="Clear search" title="Clear search">
            <XIcon />
          </button>
        )}
      </div>
    </div>
  )
}

// "Filters: [web ×] [Manama ×] … Clear all" — shown only while something is switched on.
// chips = [{ key, label }], onRemove(key), onClearAll()
export function FilterChips({ chips, onRemove, onClearAll }) {
  if (chips.length === 0) return null
  return (
    <div className="fp-chips">
      <span className="fp-chips__label">Filters:</span>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="fp-chip"
          onClick={() => onRemove(chip.key)}
          aria-label={`Remove ${chip.label}`}
        >
          {chip.label}
          <span className="fp-chip__x" aria-hidden="true">
            <XIcon />
          </span>
        </button>
      ))}
      <button type="button" className="fp-chips__clear" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  )
}
