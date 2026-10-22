import { useNavigate } from 'react-router-dom';
import JobForm from '../components/JobForm.jsx';

export default function PostJob() {
  const navigate = useNavigate();

  const toJob = (form, status) => ({ ...form, salary: form.salary ? Number(form.salary) : null, status });

  const publish = (form) => {
    const job = toJob(form, 'active');
    // TODO (backend): POST /api/company/jobs  → returns the new job id
    // Free plan: only 1 active job — the backend should refuse a 2nd and ask to upgrade.
    console.log('Publish job', job);
    const newId = 1; // demo id until the backend returns a real one
    navigate(`/company/jobs/${newId}`, { state: { justPosted: true } });
  };

  const saveDraft = (form) => {
    const job = toJob(form, 'draft');
    // TODO (backend): POST /api/company/jobs  { ...job, status: 'draft' }
    console.log('Save draft', job);
    alert('Draft saved (demo)');
  };

  return (
    <main className="container container--form">
      <div className="page-head">
        <h1 className="title">Post a job or internship</h1>
        <p className="muted">Fursa will rank every applicant against these requirements.</p>
      </div>

      <JobForm
        stacked
        submitLabel="Publish job"
        onSubmit={publish}
        secondary={{ label: 'Save draft', onClick: saveDraft, checkTitleOnly: true }}
      />
    </main>
  );
}
