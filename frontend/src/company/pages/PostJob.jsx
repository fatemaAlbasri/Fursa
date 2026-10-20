import { useState } from 'react';
import { SKILLS } from '../../shared/components/SkillSelect.jsx';
import './PostJob.css';

const JOB_TYPES = ['Full-time', 'Part-time', 'Internship'];
const WORK_MODES = ['On-site', 'Remote', 'Hybrid'];
const MAJORS = ['Computer Science', 'Information Systems', 'Computer Engineering', 'Business', 'Accounting', 'Any major'];
const EXPERIENCE = ['No experience needed', '0–1 years', '0–2 years', '1–3 years'];
const LANGUAGES = ['English & Arabic', 'English', 'Arabic'];
const LOCATIONS = ['Manama', 'Seef', 'Muharraq', 'Riffa', 'Isa Town', 'Hamad Town'];

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
      <span id={id} className="pj-label">{label} <span>(choose one)</span></span>
      <div role="radiogroup" aria-labelledby={id} className="pj-pills">
        {options.map((opt) => {
          const on = value === opt;
          return (
            <button key={opt} type="button" role="radio" aria-checked={on}
              className={on ? 'pj-pill pj-pill--on' : 'pj-pill'} onClick={() => onChange(opt)}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PostJob() {
  const [form, setForm] = useState({
    jobType: 'Full-time', workMode: 'On-site',
    title: '', description: '', responsibilities: '', deadline: '', salary: '',
    major: MAJORS[0], majorMust: true, experience: EXPERIENCE[1], language: LANGUAGES[0], location: LOCATIONS[0],
  });
  // each skill: { name, must }
  const [skills, setSkills] = useState([]);
  const [picker, setPicker] = useState('');
  const [errors, setErrors] = useState({});

  const set = (key, value) => setForm({ ...form, [key]: value });
  const change = (e) => set(e.target.name, e.target.value);

  const addSkill = (name) => {
    if (name && !skills.some((s) => s.name === name)) setSkills([...skills, { name, must: false }]);
    setPicker('');
  };
  const toggleMust = (name) => setSkills(skills.map((s) => (s.name === name ? { ...s, must: !s.must } : s)));
  const removeSkill = (name) => setSkills(skills.filter((s) => s.name !== name));
  const available = SKILLS.filter((s) => !skills.some((x) => x.name === s));

  const validate = (isDraft) => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Required';
    if (!isDraft) {
      if (!form.description.trim()) errs.description = 'Required';
      if (!form.deadline) errs.deadline = 'Pick a deadline';
      else if (new Date(form.deadline) < new Date(new Date().toDateString())) errs.deadline = 'Deadline must be in the future';
      if (skills.length === 0) errs.skills = 'Add at least one skill';
      if (form.salary && Number.isNaN(Number(form.salary))) errs.salary = 'Numbers only';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = (status) => (e) => {
    e.preventDefault();
    if (!validate(status === 'draft')) return;
    const job = { ...form, salary: form.salary ? Number(form.salary) : null, skills, status };
    // TODO (backend): POST /api/company/jobs  { ...job }
    // Free plan: only 1 active job — the backend should refuse a 2nd and ask to upgrade.
    console.log(status === 'draft' ? 'Save draft' : 'Publish job', job);
    alert(status === 'draft' ? 'Draft saved (demo)' : 'Job published (demo)');
  };

  return (
    <main className="pj">
      <div className="pj-head">
        <h1 className="title">Post a job or internship</h1>
        <p className="muted">Fursa will rank every applicant against these requirements.</p>
      </div>

      <form className="pj-grid" onSubmit={submit('published')} noValidate autoComplete="off">
        {/* ---------- 1 · Job details ---------- */}
        <section className="pj-card">
          <h2 className="pj-step"><span>1</span>Job details</h2>

          <div className="pj-choices">
            <ChooseOne id="lbl-type" label="Job type" options={JOB_TYPES}
              value={form.jobType} onChange={(v) => set('jobType', v)} />
            <ChooseOne id="lbl-mode" label="Work mode" options={WORK_MODES}
              value={form.workMode} onChange={(v) => set('workMode', v)} />
          </div>

          <Field label="Job title" htmlFor="pj-title" error={errors.title}>
            <input id="pj-title" name="title" placeholder="e.g. Junior Frontend Developer" value={form.title} onChange={change} />
          </Field>

          <Field label="Job description" htmlFor="pj-desc" error={errors.description}>
            <textarea id="pj-desc" name="description" rows={2} placeholder="What is this job about?"
              value={form.description} onChange={change} />
          </Field>

          <Field label="Role & responsibilities" htmlFor="pj-resp">
            <textarea id="pj-resp" name="responsibilities" rows={2} placeholder="What will this person be responsible for?"
              value={form.responsibilities} onChange={change} />
          </Field>

          <div className="grid2">
            <Field label="Application deadline" htmlFor="pj-deadline" error={errors.deadline}>
              <input id="pj-deadline" name="deadline" type="date" value={form.deadline} onChange={change} />
            </Field>
            <Field label="Salary (optional)" htmlFor="pj-salary" error={errors.salary}>
              <div className="pj-money">
                <span>BHD</span>
                <input id="pj-salary" name="salary" inputMode="numeric" placeholder="Leave empty to hide"
                  value={form.salary} onChange={change} />
              </div>
            </Field>
          </div>
        </section>

        {/* ---------- 2 · Requirements ---------- */}
        <section className="pj-card">
          <div>
            <h2 className="pj-step"><span>2</span>Requirements</h2>
            <p className="hint pj-note">
              Tick <b>Must-have</b> for anything an applicant cannot miss. Applicants missing a must-have go to the Not qualified tab.
            </p>
          </div>

          <div className="field">
            <label htmlFor="pj-skill">Skills</label>
            {skills.length > 0 && (
            <div className="pj-skills">
              {skills.map((s) => (
                <div key={s.name} className="pj-skill">
                  <span className="chip">{s.name}</span>
                  <div className="pj-skill__right">
                    <label className="pj-must">
                      <input type="checkbox" checked={s.must} onChange={() => toggleMust(s.name)} /> Must-have
                    </label>
                    <button type="button" className="pj-remove" aria-label={`Remove ${s.name}`} onClick={() => removeSkill(s.name)}>×</button>
                  </div>
                </div>
              ))}
            </div>
            )}
            <select id="pj-skill" className="pj-add" value={picker} onChange={(e) => addSkill(e.target.value)}>
              <option value="">+ Add skill from list</option>
              {available.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.skills && <p className="field__error">{errors.skills}</p>}
          </div>

          <div className="grid2">
            <Field label="Major / field" htmlFor="pj-major">
              <select id="pj-major" name="major" value={form.major} onChange={change}>
                {MAJORS.map((m) => <option key={m}>{m}</option>)}
              </select>
              <label className="pj-must">
                <input type="checkbox" checked={form.majorMust} onChange={(e) => set('majorMust', e.target.checked)} /> Must-have
              </label>
            </Field>
            <Field label="Experience range" htmlFor="pj-exp">
              <select id="pj-exp" name="experience" value={form.experience} onChange={change}>
                {EXPERIENCE.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Language" htmlFor="pj-lang">
              <select id="pj-lang" name="language" value={form.language} onChange={change}>
                {LANGUAGES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Location" htmlFor="pj-loc">
              <input id="pj-loc" name="location" list="pj-loc-list" value={form.location} onChange={change} placeholder="Pick or type a city" />
              <datalist id="pj-loc-list">{LOCATIONS.map((x) => <option key={x} value={x} />)}</datalist>
            </Field>
          </div>

          <div className="pj-actions">
            <button type="button" className="btn btn--outline" onClick={submit('draft')}>Save draft</button>
            <button type="submit" className="btn btn--primary">Publish job</button>
          </div>
        </section>
      </form>
    </main>
  );
}
