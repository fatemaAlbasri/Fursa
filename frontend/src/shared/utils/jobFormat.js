export  const JOB_TYPES = { full_time: 'Full-time', part_time: 'Part-time', internship: 'Internship' }
export const WORK_MODES = { onsite: 'On-site', remote: 'Remote', hybrid: 'Hybrid' }

export const formatJobType = (type) => JOB_TYPES[type] || type
export const formatWorkMode = (mode) => WORK_MODES[mode] || mode

// Salary comes as text like "450.000" (or null = the company hid it)
export function formatSalary(salary) {
  if (salary == null) return null
  return `BHD ${Number(salary).toLocaleString('en-US', { maximumFractionDigits: 3 })}`
}

// Deadline → "30 Oct 2026"
export function formatDeadline(deadline) {
  const date = new Date(deadline)
  if (isNaN(date)) return ''
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'})
}

// Any date → "YYYY-MM-DD" for <input type="date"> (uses local time, so the day doesn't shift)
export function toDateInput(date) {
  const d = new Date(date)
  if (isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}


// Whole days from today until the deadline (0 = today is the last day)
export function daysLeft(deadline) {
  const end = new Date(deadline)
  if (isNaN(end)) return null
  end.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((end - today) / (24 * 60 * 60 * 1000))
}

// 0 → "Last day", 1 → "1 day left", 18 → "18 days left"
export function daysLeftText(days) {
  if (days == null || days < 0) return ''
  if (days === 0) return 'Last day'
  return days === 1 ? '1 day left' : `${days} days left`
}

// min_years / max_years → "0–2 years", "3+ years" or "No experience needed"
export function formatExperience(min, max) {
  if (!min && !max) return 'No experience needed'
  if (max == null) return `${min}+ years`
  if (max === min) return `${max} ${max === 1 ? 'year' : 'years'}`
  return `${min}–${max} years`
}

// Responsibilities are saved as one text, one per line → list (drops "-" or "•" at the start)
export function splitLines(text) {
  return (text || '')
    .split('\n')
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter(Boolean)
}

// Letter in the coloured box when the company has no logo: "Nakhla Tech" → "N"
export const companyInitial = (name) => (name || '?').trim().charAt(0).toUpperCase()

// "Fatima" + "Ali" → "FA" (profile button in the navbar)
export function userInitials(firstName, lastName) {
  return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase()
}

// "Good morning" / "Good afternoon" / "Good evening" from the user's clock
export function greeting(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

