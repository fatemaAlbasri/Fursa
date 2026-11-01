import { toDateInput } from '../../shared/utils/jobFormat.js'

// ---------- Lists shown in the job form ----------
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

export const EMPTY_JOB = {
  jobType: '',
  workMode: '',
  title: '',
  description: '',
  responsibilities: '',
  deadline: '',
  salary: '',

  major: '',
  majorMust: true,
  experience: EXPERIENCE[0],
  language: '',
  location: '',
  skills: []
}

export const EXPERIENCE_YEARS = {
  'No experience': { min_years: 0, max_years: 0 },
  '0–1 years':     { min_years: 0, max_years: 1 },
  '0–2 years':     { min_years: 0, max_years: 2 },
  '1–3 years':     { min_years: 1, max_years: 3 }
}

export const toJobBody = (form, status) => ({
  title: form.title,
  description: form.description,
  responsibilities: form.responsibilities,
  location: form.location,
  job_type: form.jobType,
  work_mode: form.workMode,
  deadline: form.deadline,
  salary: form.salary,
  field: form.major,
  major_must_have: form.majorMust,
  language: form.language,
  status,
  skills: form.skills.map((s) => ({ name: s.name, is_required: s.must })),
  ...EXPERIENCE_YEARS[form.experience],
})


export function experienceFromYears(min, max) {
  const found = Object.entries(EXPERIENCE_YEARS)
    .find(([, y]) => y.min_years === min && y.max_years === max)
  return found ? found[0] : EXPERIENCE[0]
}

export const jobToForm = (job) => ({
  ...job,
  jobType: job.job_type,
  workMode: job.work_mode,
  major: job.field || '',
  majorMust: job.major_must_have,
  experience: experienceFromYears(job.min_years, job.max_years),
  deadline: toDateInput(job.deadline),
  skills: job.skills.map((s) => ({ name: s.name, must: s.is_required })),
})