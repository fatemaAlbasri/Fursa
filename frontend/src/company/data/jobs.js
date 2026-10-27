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

export function experienceFromYears(min, max) {
  const found = Object.entries(EXPERIENCE_YEARS)
    .find(([, y]) => y.min_years === min && y.max_years === max)
  return found ? found[0] : EXPERIENCE[0]
}
