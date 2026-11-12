// Small helpers to read and check form fields (used by sign up and profile)
const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v)
const clean = (v) => (typeof v === 'string' ? v.trim() : '')

// FormData sends arrays as repeated fields ("skills"=a, "skills"=b) or one JSON string
function toList(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []
  if (value.trim().startsWith('[')) {
    try {
      return JSON.parse(value)
    } catch {
      return []
    }
  }
  return [value]
}

const JOB_TYPES = ['internship', 'full_time', 'part_time']
const WORK_MODES = ['onsite', 'remote', 'hybrid']
const pickList = (value, allowed) => [
  ...new Set(toList(value).map(clean).filter((v) => allowed.includes(v)))
]

// Phone is optional. "+973 3XXX XXXX" → "+9733XXXXXXX"; just "+973" means empty
function toPhone(value) {
  const digits = clean(value).replace(/\s/g, '').replace(/^\+973/, '')
  if (!digits) return { phone: null }
  if (!/^\d{8}$/.test(digits)) return { error: 'Enter 8 digits' }
  return { phone: '+973' + digits }
}

module.exports = { isEmail, clean, toList, JOB_TYPES, WORK_MODES, pickList, toPhone }
