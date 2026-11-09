import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../shared/api.js';
import { toApplicant, countStats } from '../data/applicants.js';
import StatusPill from '../../shared/components/StatusPill';
import '../styles/Applicants.css';

// =====================================================================
// Applicants dashboard (/company/applicants).
// All applicants for one job, ranked by AI match score.
// The employer picks a tab, ticks applicants, then shortlists or rejects them.
// =====================================================================

// ---------- Tabs ----------
// label(stats) → text on the tab · show(applicant) → is this applicant in the tab?
const TABS = [
  { id: 'top', label: () => 'Top 10', show: (a) => a.qualified },
  { id: 'qualified', label: (s) => `All qualified (${s.qualified})`, show: (a) => a.qualified },
  { id: 'notQualified', label: (s) => `Not qualified (${s.notQualified})`, show: (a) => !a.qualified },
  { id: 'shortlisted', label: (s) => `Shortlisted (${s.shortlisted})`, show: (a) => a.status === 'Shortlisted' },
  { id: 'interview', label: (s) => `Interview (${s.interview})`, show: (a) => a.status === 'Interview' },
  { id: 'accepted', label: (s) => `Accepted (${s.accepted})`, show: (a) => a.status === 'Accepted' },
  { id: 'rejected', label: (s) => `Rejected (${s.rejected})`, show: (a) => a.status === 'Rejected' },
  { id: 'all', label: (s) => `All (${s.total})`, show: () => true },
];

// Round match-score ring (e.g. 92%). score = null → empty ring with "–"
function ScoreRing({ score }) {
  const CIRCLE = 125.66; // length of the circle's edge (2 × π × 20)
  const filled = ((score ?? 0) / 100) * CIRCLE;
  return (
    <div className="ap-score" role="img" aria-label={score == null ? 'Not ranked yet' : `${score}% match`}>
      <svg width="50" height="50" viewBox="0 0 50 50" aria-hidden="true">
        <circle cx="25" cy="25" r="20" fill="none" stroke="#DDF1F1" strokeWidth="5" />
        {score != null && (
          <circle cx="25" cy="25" r="20" fill="none" stroke="#159A9C" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${filled.toFixed(1)} ${CIRCLE}`} transform="rotate(-90 25 25)" />
        )}
      </svg>
      <span>{score == null ? '–' : `${score}%`}</span>
    </div>
  );
}

export default function Applicants() {
  const navigate = useNavigate();

  // ---------- Page state ----------
  const [jobs, setJobs] = useState([]); // the company's jobs (for the drop-down)
  const [jobId, setJobId] = useState(null); // job in the drop-down
  const [applicants, setApplicants] = useState([]);
  const [tab, setTab] = useState('top');
  const [sort, setSort] = useState('score'); // 'score' | 'date'
  const [selected, setSelected] = useState([]); // ids of the ticked applicants
  const [error, setError] = useState('');

  const stats = countStats(applicants);

  // ---------- Load from the backend ----------
  // 1) the company's jobs → open the first one that has applicants
  useEffect(() => {
    api('/jobs/mine')
      .then(({ jobs }) => {
        setJobs(jobs);
        const first = jobs.find((j) => j.applicants > 0) || jobs[0];
        if (first) setJobId(first.id);
      })
      .catch((err) => setError(err.error || 'Could not load your jobs.'));
  }, []);

  // 2) the applicants of the picked job
  useEffect(() => {
    if (!jobId) return;
    api(`/jobs/mine/${jobId}/applicants`)
      .then((data) => setApplicants(data.applicants.map(toApplicant)))
      .catch((err) => setError(err.error || 'Could not load the applicants.'));
  }, [jobId]);

  // ---------- The list for the open tab ----------
  const currentTab = TABS.find((t) => t.id === tab);
  let rows = applicants.filter(currentTab.show);
  rows = [...rows].sort((a, b) =>
    sort === 'score' ? (b.score ?? -1) - (a.score ?? -1) : b.appliedOn.localeCompare(a.appliedOn) // newest first
  );
  if (tab === 'top') rows = rows.slice(0, 10);

  // ---------- Ticking applicants ----------
  const allChecked = rows.length > 0 && rows.every((a) => selected.includes(a.id));
  const toggleOne = (id) =>
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const toggleAll = () => setSelected(allChecked ? [] : rows.map((a) => a.id));

  // ---------- Drop-down / tab changes ----------
  const changeJob = (e) => {
    setJobId(Number(e.target.value));
    setSelected([]);
  };
  const changeTab = (id) => {
    setTab(id);
    setSelected([]);
  };

  // ---------- Buttons ----------
  const shortlistSelected = async () => {
    if (selected.length === 0) return;
    try {
      const data = await api(`/jobs/mine/${jobId}/applicants`, { method: 'PATCH', body: { ids: selected, status: 'shortlisted' } });

      setApplicants(applicants.map((a) => (data.updated.includes(a.id) ? { ...a, status: 'Shortlisted' } : a)));
      
      setApplicants(applicants.map((a) => (selected.includes(a.id) ? { ...a, status: 'Shortlisted' } : a)));
      setSelected([]);
    } catch (err) {
      setError(err.error || 'Could not shortlist. Try again.');
    }
  };
  const rejectSelected = () => {
    // goes to the confirm page; the ticked ids go with it
    navigate(`/company/jobs/${jobId}/reject`, { state: { applicantIds: selected } });
  };

  return (
    <main className="container container--wide ap">
      {/* ---------- Title + job drop-down ---------- */}
      <div className="ap-head">
        <div>
          <Link to="/company/jobs" className="ap-back">← All jobs</Link>
          <h1>Applicants</h1>
          <p className="ap-sub">Ranked by AI · you make every decision</p>
        </div>
        <div className="ap-job">
          <label htmlFor="ap-jobpick">Job</label>
          <select id="ap-jobpick" value={jobId ?? ''} onChange={changeJob}>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title} · {j.applicants} applicants</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="field__error" role="alert">{error}</p>}

      {/* ---------- Stat boxes ---------- */}
      <div className="ap-stats">
        <div className="ap-stat ap-stat--total"><b>{stats.total}</b><span>Total applicants</span></div>
        <div className="ap-stat ap-stat--good"><b>{stats.qualified}</b><span>Qualified</span></div>
        <div className="ap-stat ap-stat--bad"><b>{stats.notQualified}</b><span>Not qualified</span></div>
        <div className="ap-stat ap-stat--short"><b>{stats.shortlisted}</b><span>Shortlisted</span></div>
      </div>

      {/* ---------- Tabs ---------- */}
      <div className="ap-tabs" role="tablist" aria-label="Applicant groups">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            className={tab === t.id ? 'ap-tab ap-tab--on' : 'ap-tab'} onClick={() => changeTab(t.id)}>
            {t.label(stats)}
          </button>
        ))}
      </div>

      {/* ---------- Applicant list ---------- */}
      <section className="ap-list">
        {/* toolbar: select all · shortlist · reject · sort */}
        <div className="ap-toolbar">
          <label className="ap-selectall">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} />
            Select all <span>({selected.length} selected)</span>
          </label>
          <div className="ap-toolbar__right">
            <button type="button" className="ap-btn ap-btn--teal" onClick={shortlistSelected}>Shortlist selected</button>
            <button type="button" className="ap-btn ap-btn--reject" onClick={rejectSelected}>Reject selected</button>
            <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="score">Sort: match score</option>
              <option value="date">Sort: date applied</option>
            </select>
          </div>
        </div>

        {/* one row per applicant (scrolls sideways on small screens) */}
        <div className="ap-rows">
          {rows.map((a, i) => (
            <div key={a.id} className="ap-row">
              <input type="checkbox" aria-label={`Select ${a.name}`}
                checked={selected.includes(a.id)} onChange={() => toggleOne(a.id)} />
              <span className="ap-rank">#{i + 1}</span>
              <span className="ap-avatar" style={{ background: a.color }}>{a.initials}</span>
              <div className="ap-who">
                <b>{a.name}</b>
                <span>{a.why}</span>
              </div>
              <ScoreRing score={a.score} />
              <StatusPill status={a.status} />
              {/* TODO: applicant page (/company/applicants/:id) is not built yet */}
              <Link to={`/company/applicants/${a.id}`} className="ap-view">View applicant</Link>
            </div>
          ))}
          {rows.length === 0 && <p className="ap-empty">No applicants here yet.</p>}
        </div>

        {/* footer link → opens the All qualified tab */}
        {stats.qualified > 0 && (
          <div className="ap-foot">
            <button type="button" onClick={() => changeTab('qualified')}>
              Show all {stats.qualified} qualified applicants →
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
