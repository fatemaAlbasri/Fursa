import { useEffect, useRef, useState } from 'react';
import MultiSelect from '../../shared/components/MultiSelect.jsx';
import { JOB_TYPES, WORK_MODES, MAJORS, EXPERIENCE, LOCATIONS, LANGUAGES, EMPTY_JOB } from '../data/jobs.js';
import '../styles/JobForm.css';

// =====================================================================
// The job form — used by BOTH "Post a job" and "Edit job".
// =====================================================================

// One form field: label on top, the input, then a red error under it (if any).
function Field({ label, htmlFor, error, children }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

// "Choose one" pill buttons (used for Job type and Work mode).
// Only one pill can be on at a time.
function ChooseOne({ id, label, options, value, onChange, hint = true }) {
  return (
    <div className="field">
      <span id={id} className="field__label">
        {label} {hint && <span>(choose one)</span>}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="choice-box__chips">
        {options.map((opt) => {
          const on = value === opt;
          return (
            <button key={opt} type="button" role="radio" aria-checked={on}
              className={on ? 'choice choice--on' : 'choice'} onClick={() => onChange(opt)}>
              {on && <span className="choice__dot" aria-hidden="true" />}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Props:
 *  initial      : the job to start with (empty for Post, the saved job for Edit)
 *  submitLabel  : text on the main button ("Publish job" / "Save changes")
 *  onSubmit(job): called after the form is checked
 *  secondary    : the other button { label, onClick(job), checkTitleOnly }
 *  stacked      : true = the two boxes go one under the other, full width (page scrolls)
 *  edit         : true = Edit job look (no step numbers, 3 fields per row)
 */
export default function JobForm({ initial = EMPTY_JOB, submitLabel, onSubmit, secondary, stacked = false, edit = false }) {
  // ---------- Form state ----------
  const [form, setForm] = useState({ ...EMPTY_JOB, ...initial }); // all field values
  const [errors, setErrors] = useState({}); // e.g. { title: 'Required' }
  const skills = form.skills;

  // ---------- Auto-scroll the skills list ----------
  // When a skill is added, scroll the skills list down so the new row is visible.
  const skillList = useRef(null);
  const skillCount = useRef(skills.length);
  useEffect(() => {
    if (skills.length > skillCount.current && skillList.current) {
      skillList.current.scrollTop = skillList.current.scrollHeight;
    }
    skillCount.current = skills.length;
  }, [skills.length]);

  // ---------- Update a field ----------
  const set = (key, value) => setForm({ ...form, [key]: value });
  const change = (e) => set(e.target.name, e.target.value); // for normal inputs (uses the input's name)

  // ---------- Skills ----------
  // MultiSelect works with skill names; keep each skill's Must-have tick when the list changes.
  // MultiSelect already blocks duplicates (any letter case).
  const setSkillNames = (names) =>
    set('skills', names.map((name) => skills.find((s) => s.name === name) || { name, must: false }));
  // Turn Must-have on/off for one skill
  const toggleMust = (name) => set('skills', skills.map((s) => (s.name === name ? { ...s, must: !s.must } : s)));
  // Remove one skill (the × button)
  const removeSkill = (name) => set('skills', skills.filter((s) => s.name !== name));

  // ---------- Check the form ----------
  // titleOnly = true → only the title is needed (used by "Save draft").
  // Returns true when there are no errors.
  const validate = (titleOnly) => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Required';

    if (!titleOnly) {
      if (!form.description.trim()) errs.description = 'Required';

      const today = new Date(new Date().toDateString());
      if (!form.deadline) errs.deadline = 'Pick a deadline';
      else if (new Date(form.deadline) < today) errs.deadline = 'Deadline must be in the future';

      if (skills.length === 0) errs.skills = 'Add at least one skill';
      if (!form.major) errs.major = 'Choose a major';
      if (!form.language.trim()) errs.language = 'Required';
      if (!form.location.trim()) errs.location = 'Required';
      if (form.salary && Number.isNaN(Number(form.salary))) errs.salary = 'Numbers only';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ---------- Buttons ----------
  // Main button ("Publish job" / "Save changes"): check everything first
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate(false)) onSubmit(form);
  };
  // Other button ("Save draft" / "Cancel")
  const handleSecondary = () => {
    if (secondary.checkTitleOnly && !validate(true)) return;
    secondary.onClick(form);
  };

  // ---------- Fields ----------
  // Each field is built once here, then placed in the layout below
  // (Post and Edit put some of them in different places).
  const deadline = (
    <Field label="Application deadline" htmlFor="jf-deadline" error={errors.deadline}>
      <input id="jf-deadline" name="deadline" type="date" value={form.deadline} onChange={change} />
    </Field>
  );

  const salary = (
    <Field label="Salary (optional)" htmlFor="jf-salary" error={errors.salary}>
      <input id="jf-salary" name="salary" inputMode="numeric" placeholder="BHD · leave empty to hide"
        value={form.salary} onChange={change} />
    </Field>
  );

  const location = (
    <Field label="Location" htmlFor="jf-loc" error={errors.location}>
      <input id="jf-loc" list="jf-loc-options" value={form.location}
        onChange={(e) => set('location', e.target.value)}
        placeholder="Pick or type a city" autoComplete="off" />
      <datalist id="jf-loc-options">
        {LOCATIONS.map((x) => <option key={x} value={x} />)}
      </datalist>
    </Field>
  );

  const major = (
    <Field label="Major / field" htmlFor="jf-major" error={errors.major}>
      <input id="jf-major" list="jf-major-options" value={form.major}
        onChange={(e) => set('major', e.target.value)}
        placeholder="Pick or type a major" autoComplete="off" />
      <datalist id="jf-major-options">
        {MAJORS.map((x) => <option key={x} value={x} />)}
      </datalist>
      <label className="jf-check">
        <input type="checkbox" checked={form.majorMust} onChange={(e) => set('majorMust', e.target.checked)} />
        Must-have
      </label>
    </Field>
  );

  const experience = (
    /* default: "No experience" (the first option) */
    <Field label={edit ? 'Experience' : 'Experience range'} htmlFor="jf-exp">
      <select id="jf-exp" name="experience" value={form.experience} onChange={change}>
        {EXPERIENCE.map((x) => <option key={x}>{x}</option>)}
      </select>
    </Field>
  );

  // Languages are saved as one text ("English, Arabic") → split it into a list for the box, join it back when it changes.
  const languages = form.language.split(',').map((x) => x.trim()).filter(Boolean);
  const language = (
    /* Works like Skills: pick from the list OR type one. More than one language is allowed. */
    <Field label="Language" htmlFor="jf-lang" error={errors.language}>
      <MultiSelect id="jf-lang" options={LANGUAGES} placeholder={languages.length ? 'Add more…' : 'Search or type a language ▾'}
        value={languages} onChange={(names) => set('language', names.join(', '))} />
    </Field>
  );

  // CSS classes for the whole form, e.g. "jf-grid jf-grid--stacked jf-grid--edit"
  const formClass = ['jf-grid', stacked && 'jf-grid--stacked', edit && 'jf-grid--edit'].filter(Boolean).join(' ');

  return (
    <form className={formClass} onSubmit={handleSubmit} noValidate autoComplete="off">
      {/* =================== Box 1: Job details =================== */}
      <section className="card">
        <h2 className="jf-step">{!edit && <span>1</span>}Job details</h2>

        <div className="jf-choices">
          <ChooseOne id="lbl-type" label="Job type" options={JOB_TYPES} hint={!edit}
            value={form.jobType} onChange={(v) => set('jobType', v)} />
          <ChooseOne id="lbl-mode" label="Work mode" options={WORK_MODES} hint={!edit}
            value={form.workMode} onChange={(v) => set('workMode', v)} />
        </div>

        <Field label="Job title" htmlFor="jf-title" error={errors.title}>
          <input id="jf-title" name="title" placeholder="e.g. Junior Frontend Developer"
            value={form.title} onChange={change} />
        </Field>

        <Field label="Job description" htmlFor="jf-desc" error={errors.description}>
          <textarea id="jf-desc" name="description" rows={edit ? 3 : stacked ? 3 : 2}
            placeholder="What is this job about?" value={form.description} onChange={change} />
        </Field>

        <Field label="Role & responsibilities" htmlFor="jf-resp">
          <textarea id="jf-resp" name="responsibilities" rows={edit ? 4 : stacked ? 3 : 2}
            placeholder="What will this person be responsible for?" value={form.responsibilities} onChange={change} />
        </Field>

        {/* Edit: deadline | salary | location in one row.  Post: deadline | salary. */}
        {edit ? (
          <div className="grid3">{deadline}{salary}{location}</div>
        ) : (
          <div className="grid2">{deadline}{salary}</div>
        )}
      </section>

      {/* =================== Box 2: Requirements =================== */}
      <section className="card">
        <div>
          <h2 className="jf-step">{!edit && <span>2</span>}Requirements</h2>
          {edit ? (
            <p className="hint jf-note">Tap <b className="jf-note--navy">Must-have</b> to turn it on or off. Remove a skill with ×.</p>
          ) : (
            <p className="hint jf-note">
              Tap <b>Must-have</b> for anything an applicant cannot miss. Applicants missing a must-have go to the Not qualified tab.
            </p>
          )}
        </div>

        {/* ----- Skills ----- */}
        <div className="field">
          {!edit && <label htmlFor="jf-skill">Skills</label>}

          {/* one row per skill: name on the left, Must-have + × on the right */}
          {skills.length > 0 && (
            <div className="jf-skills" ref={skillList}>
              {skills.map((s) => (
                <div key={s.name} className="jf-skill">
                  <span className="chip">{s.name}</span>
                  <div className="jf-skill__right">
                    <button type="button" aria-pressed={s.must} onClick={() => toggleMust(s.name)}
                      className={s.must ? 'jf-toggle jf-toggle--on' : 'jf-toggle'}>
                      {s.must && '✓ '}Must-have
                    </button>
                    <button type="button" className="jf-remove jf-remove--box"
                      aria-label={`Remove ${s.name}`} onClick={() => removeSkill(s.name)}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* "+ Add skill from list" box */}
          <div className="jf-skill-add">
            <MultiSelect id="jf-skill" showChips={false} placeholder="+ Add skill from list ▾"
              value={skills.map((s) => s.name)} onChange={setSkillNames} />
          </div>
          {errors.skills && <p className="field__error">{errors.skills}</p>}
        </div>

        {/* Edit: major | experience | language.  Post: also location (2 per row). */}
        {edit ? (
          <div className="grid3">{major}{experience}{language}</div>
        ) : (
          <div className="grid2">{major}{experience}{language}{location}</div>
        )}
      </section>

      {/* =================== Buttons (under the boxes, on the right) =================== */}
      <div className="jf-actions">
        {secondary && (
          <button type="button" className={edit ? 'btn jf-cancel' : 'btn btn--outline'} onClick={handleSecondary}>
            {secondary.label}
          </button>
        )}
        <button type="submit" className="btn btn--primary">{submitLabel}</button>
      </div>
    </form>
  );
}
