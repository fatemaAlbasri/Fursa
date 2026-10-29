import { userInitials } from '../../jobseeker/utils/jobFormat.js';

// =====================================================================
// Applicant data for the company (employer) pages.
// Used by: Applicants dashboard, Reject applicants.
// =====================================================================


// ---------- Applicant from the backend → row on the Applicants page ----------
// Comes from GET /api/jobs/mine/:id/applicants (already ranked by match score).
const STATUS_LABELS = { applied: 'New', shortlisted: 'Shortlisted', interview: 'Interview', accepted: 'Accepted', rejected: 'Rejected' };
const AVATAR_COLORS = ['#117A7C', '#6D4AFF', '#0EA5E9', '#183B56', '#0E6466', '#657D93'];

export function toApplicant(row) {
  return {
    id: row.id,
    name: `${row.first_name} ${row.last_name}`,
    initials: userInitials(row.first_name, row.last_name),
    color: row.is_qualified ? AVATAR_COLORS[row.id % AVATAR_COLORS.length] : '#8A9BAB',
    score: row.score, // null = not ranked yet
    status: STATUS_LABELS[row.status],
    qualified: row.is_qualified,
    appliedOn: row.applied_at,
    // the "why" line under the name
    why: row.score == null
      ? 'Not ranked yet'
      : row.missing.length ? `Missing: ${row.missing.join(', ')}` : 'Matches every requirement',
  };
}

// Numbers for the stat boxes and tab labels
export function countStats(list) {
  const count = (test) => list.filter(test).length;
  return {
    total: list.length,
    qualified: count((a) => a.qualified),
    notQualified: count((a) => !a.qualified),
    shortlisted: count((a) => a.status === 'Shortlisted'),
    interview: count((a) => a.status === 'Interview'),
    accepted: count((a) => a.status === 'Accepted'),
    rejected: count((a) => a.status === 'Rejected'),
  };
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
