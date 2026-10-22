import { useEffect, useRef, useState } from 'react';
import SkillSelect from '../../shared/components/SkillSelect.jsx';
import { JOB_TYPES, WORK_MODES, MAJORS, EXPERIENCE, LOCATIONS, EMPTY_JOB } from '../data/jobs.js';
import './JobForm.css';

function Field({ label, htmlFor, error, children }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

// "Choose one" pill buttons (Job type / Work mode)
function ChooseOne({ id, label, options, value, onChange, hint = true }) {
  return (
    <div className="field">
      <span id={id} className="field__label">{label} {hint && <span>(choose one)</span>}</span>
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
 * The job form — used by BOTH "Post a job" and "Edit job".
 *  initial      : the job to start with (empty for Post, the saved job for Edit)
 *  submitLabel  : text on the main button ("Publish job" / "Save changes")
 *  onSubmit(job): called after the form is checked
 *  secondary    : the other button { label, onClick(job), checkTitleOnly }
 *  stacked      : true = the two boxes go one under the other, full width (page scrolls)
 *  edit         : true = Edit job look (no step numbers, 3 fields per row)
 */
export default function JobForm({ initial = EMPTY_JOB, submitLabel, onSubmit, secondary, stacked = false, edit = false }) {
  const [form, setForm] = useState({ ...EMPTY_JOB, ...initial });
  const [errors, setErrors] = useState({});
  const skills = form.skills;

  // When a skill is added, scroll the skills list down so the new row is visible.
  const skillList = useRef(null);
  const skillCount = useRef(skills.length);
  useEffect(() => {
    if (skills.length > skillCount.current && skillList.current) {
      skillList.current.scrollTop = skillList.current.scrollHeight;
    }
    skillCount.current = skills.length;
  }, [skills.length]);

  const set = (key, value) => setForm({ ...form, [key]: value });
  const change = (e) => set(e.target.name, e.target.value);

  // SkillSelect works with skill names; keep each skill's Must-have tick when the list changes.
  // SkillSelect already blocks duplicates (any letter case).
  const setSkillNames = (names) =>
    set('skills', names.map((name) => skills.find((s) => s.name === name) || { name, must: false }));
  const toggleMust = (name) => set('skills', skills.map((s) => (s.name === name ? { ...s, must: !s.must } : s)));
  const removeSkill = (name) => set('skills', skills.filter((s) => s.name !== name));

  const validate = (titleOnly) => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Required';
    if (!titleOnly) {
      if (!form.description.trim()) errs.description = 'Required';
      if (!form.deadline) errs.deadline = 'Pick a deadline';
      else if (new Date(form.deadline) < new Date(new Date().toDateString())) errs.deadline = 'Deadline must be in the future';
      if (skills.length === 0) errs.skills = 'Add at least one skill';
      if (!form.language.trim()) errs.language = 'Required';
      if (form.salary && Number.isNaN(Number(form.salary))) errs.salary = 'Numbers only';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate(false)) onSubmit(form);
  };
  const handleSecondary = () => {
    if (secondary.checkTitleOnly && !validate(true)) return;
    secondary.onClick(form);
  };

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
    <Field label="Location" htmlFor="jf-loc">
      <input id="jf-loc" name="location" list="jf-loc-list" value={form.location} onChange={change} placeholder="Pick or type a city" />
      <datalist id="jf-loc-list">{LOCATIONS.map((x) => <option key={x} value={x} />)}</datalist>
    </Field>
  );
  const major = (
    <Field label="Major / field" htmlFor="jf-major">
      <select id="jf-major" name="major" value={form.major} onChange={change}>
        {MAJORS.map((m) => <option key={m}>{m}</option>)}
      </select>
    </Field>
  );
  const experience = (
    <Field label={edit ? 'Experience' : 'Experience range'} htmlFor="jf-exp">
      <select id="jf-exp" name="experience" value={form.experience} onChange={change}>
        {EXPERIENCE.map((x) => <option key={x}>{x}</option>)}
      </select>
    </Field>
  );
  const language = (
    <Field label="Language" htmlFor="jf-lang" error={errors.language}>
      <input id="jf-lang" name="language" placeholder="e.g. English, Arabic" required
        value={form.language} onChange={change} />
    </Field>
  );

  const formClass = ['jf-grid', stacked && 'jf-grid--stacked', edit && 'jf-grid--edit'].filter(Boolean).join(' ');

  return (
    <form className={formClass} onSubmit={handleSubmit} noValidate autoComplete="off">
      {/* ---------- Job details ---------- */}
      <section className="card">
        <h2 className="jf-step">{!edit && <span>1</span>}Job details</h2>

        <div className="jf-choices">
          <ChooseOne id="lbl-type" label="Job type" options={JOB_TYPES} hint={!edit}
            value={form.jobType} onChange={(v) => set('jobType', v)} />
          <ChooseOne id="lbl-mode" label="Work mode" options={WORK_MODES} hint={!edit}
            value={form.workMode} onChange={(v) => set('workMode', v)} />
        </div>

        <Field label="Job title" htmlFor="jf-title" error={errors.title}>
          <input id="jf-title" name="title" placeholder="e.g. Junior Frontend Developer" value={form.title} onChange={change} />
        </Field>

        <Field label="Job description" htmlFor="jf-desc" error={errors.description}>
          <textarea id="jf-desc" name="description" rows={edit ? 3 : stacked ? 3 : 2} placeholder="What is this job about?"
            value={form.description} onChange={change} />
        </Field>

        <Field label="Role & responsibilities" htmlFor="jf-resp">
          <textarea id="jf-resp" name="responsibilities" rows={edit ? 4 : stacked ? 3 : 2} placeholder="What will this person be responsible for?"
            value={form.responsibilities} onChange={change} />
        </Field>

        {edit ? (
          <div className="grid3">{deadline}{salary}{location}</div>
        ) : (
          <div className="grid2">{deadline}{salary}</div>
        )}
      </section>

      {/* ---------- Requirements ---------- */}
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

        <div className="field">
          {!edit && <label htmlFor="jf-skill">Skills</label>}
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
          <div className="jf-skill-add">
            <SkillSelect id="jf-skill" showChips={false} placeholder="+ Add skill from list ▾"
              value={skills.map((s) => s.name)} onChange={setSkillNames} />
          </div>
          {errors.skills && <p className="field__error">{errors.skills}</p>}
        </div>

        {edit ? (
          <div className="grid3">{major}{experience}{language}</div>
        ) : (
          <div className="grid2">{major}{experience}{language}{location}</div>
        )}
      </section>

      {/* buttons sit under the boxes, on the right */}
      <div className="jf-actions">
        {secondary && (
          <button type="button" className={edit ? 'btn jf-cancel' : 'btn btn--outline'} onClick={handleSecondary}>{secondary.label}</button>
        )}
        <button type="submit" className="btn btn--primary">{submitLabel}</button>
      </div>
    </form>
  );
}
