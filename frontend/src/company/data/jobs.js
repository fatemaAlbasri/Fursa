// Options used by the job form (Post a job + Edit job)
export const JOB_TYPES = ['Full-time', 'Part-time', 'Internship'];
export const WORK_MODES = ['On-site', 'Remote', 'Hybrid'];
export const MAJORS = ['Computer Science', 'Information Systems', 'Computer Engineering', 'Business', 'Accounting', 'Any major'];
export const EXPERIENCE = ['No experience needed', '0–1 years', '0–2 years', '1–3 years'];
export const LANGUAGES = ['English & Arabic', 'English', 'Arabic'];
export const LOCATIONS = ['Manama', 'Seef', 'Muharraq', 'Riffa', 'Isa Town', 'Hamad Town'];

// An empty job (used by Post a job)
export const EMPTY_JOB = {
  jobType: 'Full-time', workMode: 'On-site',
  title: '', description: '', responsibilities: '', deadline: '', salary: '',
  major: MAJORS[0], majorMust: true, experience: EXPERIENCE[1], language: LANGUAGES[0], location: LOCATIONS[0],
  skills: [],
};

// Sample data until the backend is connected.
// TODO (backend): replace getJob with GET /api/company/jobs/:id
const SAMPLE_JOBS = {
  1: {
    id: 1, status: 'active', postedOn: '2026-10-05',
    jobType: 'Full-time', workMode: 'On-site',
    title: 'Junior Frontend Developer',
    description: 'Join our web team to build and improve the pages our customers use every day. Good for a recent graduate who enjoys frontend work.',
    responsibilities: 'Build and maintain website pages with React\nConnect pages to the company API\nFix bugs reported by users\nWork with the design team on new features',
    deadline: '2026-10-30', salary: '500',
    major: 'Computer Science', majorMust: true, experience: '0–1 years', language: 'English & Arabic', location: 'Manama',
    skills: [
      { name: 'JavaScript', must: true },
      { name: 'React', must: true },
      { name: 'SQL', must: false },
      { name: 'Git', must: false },
    ],
    stats: { applicants: 128, qualified: 86, newCount: 14 },
  },
};

export function getJob(id) {
  return SAMPLE_JOBS[id] ?? SAMPLE_JOBS[1];
}

// "2026-10-30" -> "30 Oct 2026"
export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function daysLeft(iso) {
  if (!iso) return 0;
  const ms = new Date(iso + 'T00:00:00') - new Date(new Date().toDateString());
  return Math.max(0, Math.ceil(ms / 86400000));
}
