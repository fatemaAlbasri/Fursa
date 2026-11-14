import { formatDeadline } from '../../shared/utils/jobFormat.js';

// =====================================================================
// Notification data for the company (employer) pages.
// Used by: Notifications page.
// =====================================================================

// ---------- Icons (one path each) ----------
const PEOPLE = 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2.4.6 4 2.4 4 5.5';
const CALENDAR = 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4';
const CLOCK = 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z';
const CARD = 'M3 6h18v12H3zM3 10h18';
const LOCK = 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4';

// ---------- Look of each type: icon + colours + where clicking it goes ----------
// link(row) → page to open, or null = nothing to open
const TYPES = {
  new_applicants: { icon: PEOPLE, bg: '#DDF1F1', fg: '#117A7C', link: () => '/company/applicants' },
  interview_reply: { icon: CALENDAR, bg: '#EFEBFF', fg: '#5235D6', link: (n) => `/company/jobs/${n.job_id}/applicants/${n.application_id}` },
  deadline: { icon: CLOCK, bg: '#FEF3E2', fg: '#B54708', link: (n) => `/company/jobs/${n.job_id}` },
  job_closed: { icon: LOCK, bg: '#EEF2F5', fg: '#3E5468', link: (n) => `/company/jobs/${n.job_id}` },
  plan: { icon: CARD, bg: '#DDF1F1', fg: '#117A7C', link: () => null },
};
// "Reschedule requested" is an interview reply too, but red
const RESCHEDULE = { bg: '#FDECEA', fg: '#B42318' };

// ---------- Time under each notification ----------
// "Just now" · "1 hour ago" · "Yesterday" · "2 days ago" · older than a week → "30 Oct 2026"
export function timeAgo(date) {
  const minutes = Math.floor((Date.now() - new Date(date)) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDeadline(date);
}

// ---------- Notification from the backend → row on the page ----------
// Comes from GET /api/notifications (newest first).
export function toNotice(row) {
  const type = TYPES[row.type] ?? TYPES.plan;
  const colors = row.title === 'Reschedule requested' ? RESCHEDULE : type;
  return {
    id: row.id,
    title: row.title,
    body: row.message,
    time: timeAgo(row.created_at),
    unread: !row.is_read,
    icon: type.icon,
    iconBg: colors.bg,
    iconFg: colors.fg,
    link: type.link(row),
  };
}
