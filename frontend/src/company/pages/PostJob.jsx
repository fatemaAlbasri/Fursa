import { useNavigate } from 'react-router-dom';
import JobForm from '../components/JobForm.jsx';

// =====================================================================
// "Post a job" page (/company/post-job).
// The form itself is in components/JobForm.jsx — this page only decides
// what happens when the employer clicks "Publish job" or "Save draft".
// =====================================================================
export default function PostJob() {
  const navigate = useNavigate();

  // Get the form ready to send: salary as a number (or null if empty) + the job status.
  const toJob = (form, status) => ({ ...form, salary: form.salary ? Number(form.salary) : null, status });

  // "Publish job" → save as active, then open the new job's page
  const publish = (form) => {
    const job = toJob(form, 'active');
    // TODO (backend): POST /api/company/jobs  → returns the new job id
    // Free plan: only 1 active job — the backend should refuse a 2nd and ask to upgrade.
    console.log('Publish job', job);
    const newId = 1; // demo id until the backend returns a real one
    navigate(`/company/jobs/${newId}`, { state: { justPosted: true } }); // justPosted → shows the green banner
  };

  // "Save draft" → save as draft (only the title is required)
  const saveDraft = (form) => {
    const job = toJob(form, 'draft');
    // TODO (backend): POST /api/company/jobs  { ...job, status: 'draft' }
    console.log('Save draft', job);
    alert('Draft saved (demo)');
  };

  return (
    <main className="container container--form">
      {/* page title */}
      <div className="page-head">
        <h1 className="title">Post a job or internship</h1>
        <p className="muted">Fursa will rank every applicant against these requirements.</p>
      </div>

      {/* empty form (no "initial" → starts from EMPTY_JOB) */}
      <JobForm
        stacked
        submitLabel="Publish job"
        onSubmit={publish}
        secondary={{ label: 'Save draft', onClick: saveDraft, checkTitleOnly: true }}
      />
    </main>
  );
}
