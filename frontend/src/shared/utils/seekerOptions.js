import { JOB_TYPES, WORK_MODES } from './jobFormat.js'

// Job seeker form choices, shared by Sign up and the Profile page so both offer the same values.

export const MAJORS = [
  'Computer Science',
  'Information Systems',
  'Computer Engineering',
  'Business',
  'Accounting'
]
export const STATUSES = ['Graduated', 'Final year student', 'Student']

// [{ label: 'Full-time', value: 'full_time' }, ...] — the values the backend accepts (utils/fields.js)
const toOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ label, value }))
export const JOB_TYPE_OPTIONS = toOptions(JOB_TYPES)
export const WORK_MODE_OPTIONS = toOptions(WORK_MODES)
