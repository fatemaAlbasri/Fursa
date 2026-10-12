import { useState } from 'react';

// Same list employers use when posting a job, so matching is exact.
// Later this will come from the backend: GET /api/skills
export const SKILLS = [
  'JavaScript', 'React', 'Node.js', 'SQL', 'PostgreSQL', 'Python', 'Java', 'C#',
  'HTML', 'CSS', 'Git', 'Networking', 'Excel', 'Power BI', 'Data Analysis',
  'UI/UX Design', 'Communication', 'English', 'Arabic',
];

export default function SkillSelect({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const options = SKILLS.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(query.toLowerCase())
  );

  const add = (skill) => {
    onChange([...value, skill]);
    setQuery('');
  };
  const remove = (skill) => onChange(value.filter((s) => s !== skill));

  return (
    <div className="skills">
      <div className="skills__box" onClick={() => setOpen(true)}>
        {value.map((s) => (
          <span key={s} className="chip">
            {s}
            <button type="button" aria-label={`Remove ${s}`} onClick={() => remove(s)}>×</button>
          </span>
        ))}
        <input
          className="skills__input"
          placeholder={value.length ? 'Add more…' : 'Search skills ▾'}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && options.length > 0 && (
        <ul className="skills__menu">
          {options.map((s) => (
            <li key={s} onMouseDown={() => add(s)}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
