// =====================================================================
// Applicant data for the company (employer) pages.
// Used by: Applicants dashboard, Reject applicants.
// =====================================================================

// ---------- Jobs in the "Job" drop-down on the Applicants page ----------
// TODO (backend): GET /api/company/jobs → id, title, applicant count
export const JOB_OPTIONS = [
  { id: 1, title: 'Junior Frontend Developer', applicants: 128 },
  { id: 2, title: 'Software Engineering Intern', applicants: 64 },
  { id: 3, title: 'IT Support Officer', applicants: 41 },
];

// ---------- Sample applicants (only until the backend is connected) ----------
// TODO (backend): replace with GET /api/company/jobs/:id/applicants
// The backend ranks applicants by match score and writes the "why" line.
// status: 'New' | 'Shortlisted' | 'Interview' | 'Accepted' | 'Rejected'
// qualified: false = missing a must-have (goes to the Not qualified tab)
const SAMPLE_APPLICANTS = {
  1: {
    // numbers for the stat boxes and tab labels
    stats: { total: 128, qualified: 86, notQualified: 42, shortlisted: 5, interview: 1, accepted: 1, rejected: 1 },
    list: [
      { id: 1, name: '[Applicant 1]', initials: 'A1', color: '#117A7C', score: 92, status: 'Accepted', qualified: true, appliedOn: '2026-10-06', why: 'Matches 5/5 skills · CS major · English & Arabic' },
      { id: 2, name: '[Applicant 2]', initials: 'A2', color: '#6D4AFF', score: 88, status: 'Interview', qualified: true, appliedOn: '2026-10-07', why: 'Matches 5/5 skills · 1 year internship' },
      { id: 3, name: '[Applicant 3]', initials: 'A3', color: '#0EA5E9', score: 85, status: 'Shortlisted', qualified: true, appliedOn: '2026-10-08', why: 'Matches 4/5 skills · Missing: SQL' },
      { id: 4, name: '[Applicant 4]', initials: 'A4', color: '#183B56', score: 79, status: 'New', qualified: true, appliedOn: '2026-10-10', why: 'Matches 4/5 skills · Missing: Git' },
      { id: 5, name: '[Applicant 5]', initials: 'A5', color: '#0E6466', score: 74, status: 'New', qualified: true, appliedOn: '2026-10-12', why: 'Matches 3/5 skills · Missing: SQL, Git' },
      { id: 6, name: '[Applicant 6]', initials: 'A6', color: '#657D93', score: 70, status: 'Rejected', qualified: true, appliedOn: '2026-10-09', why: 'Matches 3/5 skills · No project experience stated' },
      { id: 7, name: '[Applicant 7]', initials: 'A7', color: '#8A9BAB', score: 48, status: 'New', qualified: false, appliedOn: '2026-10-11', why: 'Missing must-have: Computer Science major' },
      { id: 8, name: '[Applicant 8]', initials: 'A8', color: '#8A9BAB', score: 41, status: 'New', qualified: false, appliedOn: '2026-10-13', why: 'Missing must-have skill: React' },
    ],
  },
};

// Get all applicants for one job. If the id is not found, use job 1 (demo only).
export function getApplicants(jobId) {
  return SAMPLE_APPLICANTS[jobId] ?? SAMPLE_APPLICANTS[1];
}

// ---------- Not qualified summary (used by Reject applicants) ----------
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
