import { useState } from 'react';
import { SKILLS } from '../../shared/components/SkillSelect.jsx';
import { JOB_TYPES, WORK_MODES, MAJORS, EXPERIENCE, LANGUAGES, LOCATIONS, EMPTY_JOB } from '../data/jobs.js';
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
function ChooseOne({ id, label, options, value, onChange }) {
  return (
    <div className="field">
      <span id={id} className="jf-label">{label} <span>(choose one)</span></span>
      <div role="radiogroup" aria-labelledby={id} className="jf-pills">
        {options.map((opt) => {
          const on = value === opt;
          return (
            <button key={opt} type="button" role="radio" aria-checked={on}
              className={on ? 'jf-pill jf-pill--on' : 'jf-pill'} onClick={() => onChange(opt)}>
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
 */
export default function JobForm({ initial = EMPTY_JOB, submitLabel, onSubmit, secondary }) {
  const [form, setForm] = useState({ ...EMPTY_JOB, ...initial });
  const [picker, setPicker] = useState('');
  const [errors, setErrors] = useState({});
  const skills = form.skills;

  const set = (key, value) => setForm({ ...form, [key]: value });
  const change = (e) => set(e.target.name, e.target.value);

  const addSkill = (name) => {
    if (name && !skills.some((s) => s.name === name)) set('skills', [...skills, { name, must: false }]);
    setPicker('');
  };
  const toggleMust = (name) => set('skills', skills.map((s) => (s.name === name ? { ...s, must: !s.must } : s)));
  const removeSkill = (name) => set('skills', skills.filter((s) => s.name !== name));
  const available = SKILLS.filter((s) => !skills.some((x) => x.name === s));

  const validate = (titleOnly) => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Required';
    if (!titleOnly) {
      if (!form.description.trim()) errs.description = 'Required';
      if (!form.deadline) errs.deadline = 'Pick a deadline';
      else if (new Date(form.deadline) < new Date(new Date().toDateString())) errs.deadline = 'Deadline must be in the future';
      if (skills.length === 0) errs.skills = 'Add at least one skill';
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

  return (
    <form className="jf-grid" onSubmit={handleSubmit} noValidate autoComplete="off">
      {/* ---------- 1 · Job details ---------- */}
      <section className="jf-card">
        <h2 className="jf-step"><span>1</span>Job details</h2>

        <div className="jf-choices">
          <ChooseOne id="lbl-type" label="Job type" options={JOB_TYPES}
            value={form.jobType} onChange={(v) => set('jobType', v)} />
          <ChooseOne id="lbl-mode" label="Work mode" options={WORK_MODES}
            value={form.workMode} onChange={(v) => set('workMode', v)} />
        </div>

        <Field label="Job title" htmlFor="jf-title" error={errors.title}>
          <input id="jf-title" name="title" placeholder="e.g. Junior Frontend Developer" value={form.title} onChange={change} />
        </Field>

        <Field label="Job description" htmlFor="jf-desc" error={errors.description}>
          <textarea id="jf-desc" name="description" rows={2} placeholder="What is this job about?"
            value={form.description} onChange={change} />
        </Field>

        <Field label="Role & responsibilities (one per line)" htmlFor="jf-resp">
          <textarea id="jf-resp" name="responsibilities" rows={2} placeholder="What will this person be responsible for?"
            value={form.responsibilities} onChange={change} />
        </Field>

        <div className="grid2">
          <Field label="Application deadline" htmlFor="jf-deadline" error={errors.deadline}>
            <input id="jf-deadline" name="deadline" type="date" value={form.deadline} onChange={change} />
          </Field>
          <Field label="Salary per month (optional)" htmlFor="jf-salary" error={errors.salary}>
            <div className="jf-money">
              <span>BHD</span>
              <input id="jf-salary" name="salary" inputMode="numeric" placeholder="Leave empty to hide"
                value={form.salary} onChange={change} />
            </div>
          </Field>
        </div>
      </section>

      {/* ---------- 2 · Requirements ---------- */}
      <section className="jf-card">
        <div>
          <h2 className="jf-step"><span>2</span>Requirements</h2>
          <p className="hint jf-note">
            Tick <b>Must-have</b> for anything an applicant cannot miss. Applicants missing a must-have go to the Not qualified tab.
          </p>
        </div>

        <div className="field">
          <label htmlFor="jf-skill">Skills</label>
          {skills.length > 0 && (
            <div className="jf-skills">
              {skills.map((s) => (
                <div key={s.name} className="jf-skill">
                  <span className="chip">{s.name}</span>
                  <div className="jf-skill__right">
                    <label className="jf-must">
                      <input type="checkbox" checked={s.must} onChange={() => toggleMust(s.name)} /> Must-have
                    </label>
                    <button type="button" className="jf-remove" aria-label={`Remove ${s.name}`} onClick={() => removeSkill(s.name)}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <select id="jf-skill" className="jf-add" value={picker} onChange={(e) => addSkill(e.target.value)}>
            <option value="">+ Add skill from list</option>
            {available.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.skills && <p className="field__error">{errors.skills}</p>}
        </div>

        <div className="grid2">
          <Field label="Major / field" htmlFor="jf-major">
            <select id="jf-major" name="major" value={form.major} onChange={change}>
              {MAJORS.map((m) => <option key={m}>{m}</option>)}
            </select>
            <label className="jf-must">
              <input type="checkbox" checked={form.majorMust} onChange={(e) => set('majorMust', e.target.checked)} /> Must-have
            </label>
          </Field>
          <Field label="Experience range" htmlFor="jf-exp">
            <select id="jf-exp" name="experience" value={form.experience} onChange={change}>
              {EXPERIENCE.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Language" htmlFor="jf-lang">
            <select id="jf-lang" name="language" value={form.language} onChange={change}>
              {LANGUAGES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Location" htmlFor="jf-loc">
            <input id="jf-loc" name="location" list="jf-loc-list" value={form.location} onChange={change} placeholder="Pick or type a city" />
            <datalist id="jf-loc-list">{LOCATIONS.map((x) => <option key={x} value={x} />)}</datalist>
          </Field>
        </div>

        <div className="jf-actions">
          {secondary && (
            <button type="button" className="btn btn--outline" onClick={handleSecondary}>{secondary.label}</button>
          )}
          <button type="submit" className="btn btn--primary">{submitLabel}</button>
        </div>
      </section>
    </form>
  );
}
