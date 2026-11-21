import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../shared/api.js';
import { toApplicant, countStats } from '../data/applicants.js';
import StatusPill from '../../shared/components/StatusPill';
import { LockIcon } from '../../shared/components/icons.jsx';
import ScoreRing from '../components/ScoreRing.jsx';
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

export default function Applicants() {
  const navigate = useNavigate();
  const { state } = useLocation(); // { jobId } when coming back from one applicant's page

  // ---------- Page state ----------
  const [jobs, setJobs] = useState([]); // the company's jobs (for the drop-down)
  const [jobId, setJobId] = useState(null); // job in the drop-down
  const [applicants, setApplicants] = useState([]);
  const [tab, setTab] = useState('top');
  const [sort, setSort] = useState('score'); // 'score' | 'date'
  const [selected, setSelected] = useState([]); // ids of the ticked applicants
  const [error, setError] = useState('');
  const [features, setFeatures] = useState(null); // what the company's plan allows

  const stats = countStats(applicants);

  // ---------- Load from the backend ----------
  // 1) the company's jobs → open the job we came back from, else the first one that has applicants
  useEffect(() => {
    api('/jobs/mine')
      .then(({ jobs }) => {
        setJobs(jobs);
        const first = jobs.find((j) => j.id === state?.jobId) || jobs.find((j) => j.applicants > 0) || jobs[0];
        if (first) setJobId(first.id);
      })
      .catch((err) => setError(err.error || 'Could not load your jobs.'));
  }, []);

  // 2) the applicants of the picked job
  useEffect(() => {
    if (!jobId) return;
    api(`/jobs/mine/${jobId}/applicants`)
      .then((data) => {
        setApplicants(data.applicants.map(toApplicant));
        setFeatures(data.features);
      })
      .catch((err) => setError(err.error || 'Could not load the applicants.'));
  }, [jobId]);

  // ---------- Plan limits ----------
  // Free plan: no scores, no Top 10, no reasons, no bulk actions
  const ranked = Boolean(features?.ai_ranking);
  const reasons = Boolean(features?.match_reasons);
  const bulk = Boolean(features?.bulk_actions);
  const onFree = features && !ranked;

  // ---------- The list for the open tab ----------
  const tabs = TABS.filter((t) => ranked || t.id !== 'top'); // Top 10 needs AI ranking
  const currentTab = tabs.find((t) => t.id === tab) || tabs.find((t) => t.id === 'all');
  const sortBy = ranked ? sort : 'date'; // no scores, so sort by date
  let rows = applicants.filter(currentTab.show);
  rows = [...rows].sort((a, b) =>
    sortBy === 'score' ? (b.score ?? -1) - (a.score ?? -1) : b.appliedOn.localeCompare(a.appliedOn) // newest first
  );
  if (currentTab.id === 'top') rows = rows.slice(0, 10);

  const appliedText = (date) =>
    'Applied ' + new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

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
      // the backend skips some, e.g. accepted applicants
      setApplicants(applicants.map((a) => (data.updated.includes(a.id) ? { ...a, status: 'Shortlisted' } : a)));
      setSelected([]);
    } catch (err) {
      setError(err.error || 'Could not shortlist. Try again.');
    }
  };
  const rejectSelected = () => {
    if (selected.length === 0) return;
    const picked = applicants.filter((a) => selected.includes(a.id));
    navigate(`/company/jobs/${jobId}/reject`, {
      state: { applicantIds: selected, allNotQualified: picked.every((a) => !a.qualified) }
    });
  };

  return (
    <main className="container container--wide ap">
      {/* ---------- Title + job drop-down ---------- */}
      <div className="ap-head">
        <div>
          <Link to="/company/jobs" className="ap-back">← All jobs</Link>
          <h1>Applicants</h1>
          <p className="ap-sub">
            {onFree ? 'Sorted by date applied' : 'Ranked by AI'} · you make every decision
          </p>
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

      {onFree && (
        <div className="ap-upgrade" role="note">
          <span className="ap-upgrade__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
            </svg>
          </span>
          <p>
            <b>You're on the Free plan.</b> Applicants are sorted by date. Upgrade to see AI match scores,
            your Top 10 and the reason behind every score.
          </p>
          <Link to="/company/plans" className="ap-upgrade__link">See plans →</Link>
        </div>
      )}

      {/* ---------- Stat boxes ---------- */}
      <div className="ap-stats">
        <div className="ap-stat ap-stat--total"><b>{stats.total}</b><span>Total applicants</span></div>
        <div className="ap-stat ap-stat--good"><b>{stats.qualified}</b><span>Qualified</span></div>
        <div className="ap-stat ap-stat--bad"><b>{stats.notQualified}</b><span>Not qualified</span></div>
        <div className="ap-stat ap-stat--short"><b>{stats.shortlisted}</b><span>Shortlisted</span></div>
      </div>

      {/* ---------- Tabs ---------- */}
      <div className="ap-tabs" role="tablist" aria-label="Applicant groups">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={currentTab.id === t.id}
            className={currentTab.id === t.id ? 'ap-tab ap-tab--on' : 'ap-tab'} onClick={() => changeTab(t.id)}>
            {t.label(stats)}
          </button>
        ))}
      </div>

      {/* ---------- Applicant list ---------- */}
      <section className="ap-list">
        {/* toolbar: select all · shortlist · reject · sort */}
        <div className="ap-toolbar">
          {bulk ? (
            <>
              <label className="ap-selectall">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                Select all <span>({selected.length} selected)</span>
              </label>
              <div className="ap-toolbar__right">
                <button type="button" className="ap-btn ap-btn--teal" onClick={shortlistSelected}>Shortlist selected</button>
                <button type="button" className="ap-btn ap-btn--reject" onClick={rejectSelected}>Reject selected</button>
                {ranked && (
                  <select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="score">Sort: match score</option>
                    <option value="date">Sort: date applied</option>
                  </select>
                )}
              </div>
            </>
          ) : (
            <p className="ap-locked">
              <LockIcon />
              Bulk shortlist / reject is on the Starter plan. Open an applicant to decide one by one.
            </p>
          )}
        </div>

        {/* one row per applicant (scrolls sideways on small screens) */}
        <div className="ap-rows">
          {rows.map((a, i) => (
            <div key={a.id} className={bulk ? 'ap-row' : 'ap-row ap-row--plain'}>
              {bulk && (
                <input type="checkbox" aria-label={`Select ${a.name}`}
                  checked={selected.includes(a.id)} onChange={() => toggleOne(a.id)} />
              )}
              {ranked && <span className="ap-rank">#{i + 1}</span>}
              <span className="ap-avatar" style={{ background: a.color }}>{a.initials}</span>
              <div className="ap-who">
                <b>{a.name}</b>
                <span>{reasons ? a.why : appliedText(a.appliedOn)}</span>
              </div>
              {ranked && <ScoreRing score={a.score} />}
              <StatusPill status={a.status} />
              <Link to={`/company/jobs/${jobId}/applicants/${a.id}`} className="ap-view">View applicant</Link>
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
