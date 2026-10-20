import { useState } from 'react';

// Suggested skills — the same list employers use when posting a job, so these match exactly.
// The user can also type a skill that isn't listed. Later this will come from the backend: GET /api/skills
export const SKILLS = [
  'JavaScript', 'React', 'Node.js', 'SQL', 'PostgreSQL', 'Python', 'Java', 'C#',
  'HTML', 'CSS', 'Git', 'Networking', 'Excel', 'Power BI', 'Data Analysis',
  'UI/UX Design', 'Communication', 'English', 'Arabic',
];

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

// showChips=false hides the chips inside the box (when the parent lists picked skills itself).
export default function SkillSelect({ value, onChange, showChips = true, id }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const typed = query.trim();
  const options = SKILLS.filter(
    (s) => !value.some((v) => same(v, s)) && s.toLowerCase().includes(typed.toLowerCase())
  );
  // Offer "Add <typed>" when the text isn't already a suggestion or a picked skill.
  const canAddTyped = typed && !SKILLS.some((s) => same(s, typed)) && !value.some((v) => same(v, typed));

  const add = (skill) => {
    const name = skill.trim();
    if (!name) return;
    // If it matches a suggestion (any case), keep the suggestion's spelling so matching works.
    const listed = SKILLS.find((s) => same(s, name));
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
          placeholder={value.length ? 'Add more…' : 'Search or type a skill ▾'}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={keyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && (options.length > 0 || canAddTyped) && (
        <ul className="skills__menu">
          {canAddTyped && (
            <li className="skills__add" onMouseDown={() => add(typed)}>
              + Add “{typed}”
            </li>
          )}
          {options.map((s) => (
            <li key={s} onMouseDown={() => add(s)}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
