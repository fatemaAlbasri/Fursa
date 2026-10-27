import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JobForm from '../components/JobForm.jsx';
import { api } from '../../shared/api.js';
import { toJobBody } from '../data/jobs.js';

export default function PostJob() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false); 

  // POST /api/jobs → { job }  (then open the new job's page)
  // Plan limit: the backend answers 403 with a message if the plan has no active jobs left.
  const send = (form, status) => {
    if (saving) return;
    setSaving(true);
    api('/jobs', { method: 'POST', body: toJobBody(form, status) })
      .then((data) => {
        const state = status === 'open' ? { justPosted: true } : { justSaved: true };
        navigate(`/company/jobs/${data.job.id}`, { state }); 
      })
      .catch((err) => {
        alert(err.error || 'Could not save the job');
        setSaving(false);
      });
  };

  const publish = (form) => send(form, 'open');
  const saveDraft = (form) => send(form, 'draft');

  return (
    <main className="container container--form">
      <div className="page-head">
        <h1 className="title">Post a job or internship</h1>
        <p className="muted">Fursa will rank every applicant against these requirements.</p>
      </div>

      <JobForm
        stacked
        saving={saving}
        submitLabel="Publish job"
        onSubmit={publish}
        secondary={{ label: 'Save draft', onClick: saveDraft, checkTitleOnly: true }}
      />
    </main>
  );
}
