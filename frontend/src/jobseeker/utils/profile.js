// Helpers for the job seeker Profile page (/jobseeker/profile).

export const PROFILE_PATH = '/jobseeker/profile'

// The backend saves phones as "+973" + 8 digits (utils/fields.js toPhone)
// "+97333000001" → "+973 3300 0001" (anything else is shown as saved)
export function formatPhone(phone) {
  const match = /^\+973(\d{4})(\d{4})$/.exec(phone || '')
  return match ? `+973 ${match[1]} ${match[2]}` : phone || ''
}

// "+97333000001" → "33000001" for the +973 phone box
export const phoneDigits = (phone) => (phone || '').replace(/^\+973/, '').replace(/\s/g, '')

// A saved value that isn't in the list (e.g. an older major) is kept as the first option,
// so opening "Edit" never changes it silently.
export const withCurrent = (options, current) =>
  current && !options.includes(current) ? [current, ...options] : options

// ---------- Name / email changes → the avatar in the top bar ----------
// The profile page announces the saved name so the Navbar initials change straight away.
export const USER_UPDATED_EVENT = 'fursa:user-updated'

export const announceUser = (user) =>
  window.dispatchEvent(new CustomEvent(USER_UPDATED_EVENT, { detail: user }))
