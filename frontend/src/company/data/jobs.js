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
