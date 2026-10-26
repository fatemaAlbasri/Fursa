// =====================================================================
// Job data + small helpers for the company (employer) pages.
// Used by: Post a job, View job and Edit job.
// =====================================================================

// ---------- Lists shown in the job form ----------
export const JOB_TYPES = ['Full-time', 'Part-time', 'Internship'];
export const WORK_MODES = ['On-site', 'Remote', 'Hybrid'];
export const MAJORS = ['Computer Science', 'Information Systems', 'Computer Engineering', 'Business', 'Accounting'];
export const EXPERIENCE = ['No experience', '0–1 years', '0–2 years', '1–3 years'];
export const LOCATIONS = ['Manama', 'Seef', 'Muharraq', 'Riffa', 'Isa Town', 'Hamad Town'];
export const LANGUAGES = ['English', 'Arabic', 'Hindi', 'Urdu', 'French', 'Tagalog'];

// ---------- An empty job (the starting values for "Post a job") ----------
// major and location start empty, so the employer must choose them.
// experience starts on the first option: "No experience".
export const EMPTY_JOB = {
  // Job details
  jobType: 'Full-time',
  workMode: 'On-site',
  title: '',
  description: '',
  responsibilities: '',
  deadline: '',
  salary: '',

  // Requirements
  major: '',
  majorMust: true,
  experience: EXPERIENCE[0],
  language: '', // saved as text, e.g. 'English, Arabic'
  location: '', // one city, e.g. 'Manama'
  skills: [], // each skill looks like { name: 'React', must: true }
};

// ---------- Sample jobs (only until the backend is connected) ----------
// TODO (backend): replace getJob with GET /api/company/jobs/:id
const SAMPLE_JOBS = {
  1: {
    id: 1,
    status: 'active', // 'active' | 'closed' | 'draft'
    postedOn: '2026-10-05',

    jobType: 'Full-time',
    workMode: 'On-site',
    title: 'Junior Frontend Developer',
    description: 'Join our web team to build and improve the pages our customers use every day. Good for a recent graduate who enjoys frontend work.',
    // one responsibility per line
    responsibilities: 'Build and maintain website pages with React\nConnect pages to the company API\nFix bugs reported by users\nWork with the design team on new features',
    deadline: '2026-10-30',
    salary: '500',

    major: 'Computer Science',
    majorMust: true,
    experience: '0–1 years',
    language: 'English, Arabic',
    location: 'Manama',
    skills: [
      { name: 'JavaScript', must: true },
      { name: 'React', must: true },
      { name: 'SQL', must: false },
      { name: 'Git', must: false },
    ],

    // numbers shown in the stat boxes
    stats: { applicants: 128, qualified: 86, newCount: 14 },
  },
};

// Get one job by its id. If the id is not found, show job 1 (demo only).
export function getJob(id) {
  return SAMPLE_JOBS[id] ?? SAMPLE_JOBS[1];
}

// Turn a date into readable text: "2026-10-30" → "30 Oct 2026"
export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// How many days from today until the deadline (never below 0).
export function daysLeft(iso) {
  if (!iso) return 0;
  const today = new Date(new Date().toDateString()); // today at 00:00
  const ms = new Date(iso + 'T00:00:00') - today;
  const ONE_DAY = 86400000; // milliseconds in one day
  return Math.max(0, Math.ceil(ms / ONE_DAY));
}
