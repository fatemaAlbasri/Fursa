import { userInitials } from '../../shared/utils/jobFormat.js';


// Applicant data for the company (employer) pages.
// Used by: Applicants dashboard, Reject applicants, Applicant page.


//  Applicant from the backend → row on the Applicants page 
// Comes from GET /api/jobs/mine/:id/applicants (already ranked by match score).
export const STATUS_LABELS = { applied: 'New', shortlisted: 'Shortlisted', interview: 'Interview', accepted: 'Accepted', rejected: 'Rejected' };
const AVATAR_COLORS = ['#117A7C', '#6D4AFF', '#0EA5E9', '#183B56', '#0E6466', '#657D93'];

// Same colour for an applicant on every page (grey = not qualified)
export const avatarColor = (row) => (row.is_qualified ? AVATAR_COLORS[row.id % AVATAR_COLORS.length] : '#8A9BAB');

export function toApplicant(row) {
  return {
    id: row.id,
    name: `${row.first_name} ${row.last_name}`,
    initials: userInitials(row.first_name, row.last_name),
    color: avatarColor(row),
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
