// =====================================================================
// Applicant data for the company (employer) pages.
// Used by: Reject applicants (bulk reject from the Not qualified tab).
// =====================================================================

// ---------- Sample data (only until the backend is connected) ----------
// TODO (backend): replace with GET /api/company/jobs/:id/applicants?tab=not-qualified
// The backend works out each applicant's reason (the must-have they are missing).
const SAMPLE_NOT_QUALIFIED = {
  1: {
    count: 42, // how many applicants are in the Not qualified tab
    reasons: [
      { text: 'Missing must-have: Computer Science major', count: 31 },
      { text: 'Missing must-have skill: React', count: 11 },
    ],
  },
};

// Get the Not qualified summary for one job. If the id is not found, use job 1 (demo only).
export function getNotQualified(jobId) {
  return SAMPLE_NOT_QUALIFIED[jobId] ?? SAMPLE_NOT_QUALIFIED[1];
}
