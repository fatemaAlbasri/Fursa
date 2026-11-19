import { useState } from 'react';
import { useSkills } from '../utils/skills.js';

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

// A "pick many" box: choose from the list or type your own (Enter). Used for Skills and Languages.
// showChips=false hides the chips inside the box (when the parent lists the picked items itself).
// options = the suggestions to show (skills by default; the job form passes LANGUAGES for Language).
export default function MultiSelect({ value, onChange, showChips = true, id, placeholder, options:optionsProp }) {
  const skills = useSkills();
  const suggestions = optionsProp ?? skills;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const typed = query.trim();
  const options = suggestions.filter(
    (s) => !value.some((v) => same(v, s)) && s.toLowerCase().includes(typed.toLowerCase())
  );
  // Offer "Add <typed>" when the text isn't already a suggestion or a picked skill.
  const canAddTyped = typed && !suggestions.some((s) => same(s, typed)) && !value.some((v) => same(v, typed));

  const add = (skill) => {
    const name = skill.trim();
    if (!name) return;
    // If it matches a suggestion (any case), keep the suggestion's spelling so matching works.
    const listed = suggestions.find((s) => same(s, name));
    const final = listed || name;
    if (!value.some((v) => same(v, final))) onChange([...value, final]);
    setQuery('');
  };
  const remove = (skill) => onChange(value.filter((s) => s !== skill));

  const keyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault(); // don't submit the form
      add(typed);
    } else if (showChips && e.key === 'Backspace' && !query && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className="skills">
      <div className="skills__box" onClick={() => setOpen(true)}>
        {showChips && value.map((s) => (
          <span key={s} className="chip">
            {s}
            <button type="button" aria-label={`Remove ${s}`} onClick={() => remove(s)}>×</button>
          </span>
        ))}
        <input
          id={id}
          className="skills__input"
          placeholder={placeholder || (value.length ? 'Add more…' : 'Search or type a skill ▾')}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={keyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && (options.length > 0 || canAddTyped) && (
        <ul className="skills__menu">
          {options.map((s) => (
            <li key={s} onMouseDown={() => add(s)}>{s}</li>
          ))}
          {canAddTyped && (
            <li className="skills__add" onMouseDown={() => add(typed)}>
              + Add “{typed}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
