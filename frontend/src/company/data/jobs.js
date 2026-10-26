// ---------- Lists shown in the job form ----------
export const JOB_TYPES = ['Full-time', 'Part-time', 'Internship']
export const WORK_MODES = ['On-site', 'Remote', 'Hybrid']
export const MAJORS = [
  'Computer Science',
  'Information Systems',
  'Computer Engineering',
  'Business',
  'Accounting'
]
export const EXPERIENCE = [
  'No experience',
  '0–1 years',
  '0–2 years',
  '1–3 years'
]
export const LOCATIONS = [
  'Manama',
  'Seef',
  'Muharraq',
  'Riffa',
  'Isa Town',
  'Hamad Town'
]
export const LANGUAGES = [
  'English',
  'Arabic',
  'Hindi',
  'Urdu',
  'French',
  'Tagalog'
]

// ---------- An empty job (the starting values for "Post a job") ----------
export const EMPTY_JOB = {
  // Job details
  jobType: '',
  workMode: '',
  title: '',
  description: '',
  responsibilities: '',
  deadline: '',
  salary: '',

  // Requirements
  major: '',
  majorMust: true,
  experience: EXPERIENCE[0],
  language: '',
  location: '',
  skills: []
}

// Turn a date into readable text: "2026-10-30" → "30 Oct 2026"
export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Days from today until the deadline 
export function daysLeft(iso) {
  if (!iso) return 0
  const today = new Date(new Date().toDateString()) // today at 00:00
  const ms = new Date(iso + 'T00:00:00') - today
  const ONE_DAY = 86400000 // milliseconds in one day
  return Math.max(0, Math.ceil(ms / ONE_DAY))
}
