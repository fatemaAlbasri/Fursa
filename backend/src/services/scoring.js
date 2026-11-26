const WEIGHTS = {
  skills: 60,
  cv: 20,
  education: 10,
  preference: 5,
  experience: 5
}
const CV_MIN = 0.6
const CV_MAX = 0.75

function skillsValue(skills) {
  const points = (s) => (s.required ? 2 : 1)
  const max = skills.reduce((sum, s) => sum + points(s), 0)
  if (max === 0) return null
  return (
    skills.filter((s) => s.has).reduce((sum, s) => sum + points(s), 0) / max
  )
}

function cvValue(sim) {
  if (sim === null) return null
  return Math.min(1, Math.max(0, (sim - CV_MIN) / (CV_MAX - CV_MIN)))
}

function educationValue(r) {
  if (!r.major || !r.field) return null
  if (r.major === r.field) return 1
  return r.related ? 0.5 : 0
}

function preferenceValue(r) {
  let typeHalf = 0
  if (r.job_types.length === 0) typeHalf = 0.25
  else if (r.job_types.includes(r.job_type)) typeHalf = 0.5

  let modeHalf = 0
  if (r.work_modes.length === 0) modeHalf = 0.25
  else if (r.work_modes.includes(r.work_mode)) modeHalf = 0.5
  else if (r.work_mode === 'hybrid' || r.work_modes.includes('hybrid'))
    modeHalf = 0.25

  return typeHalf + modeHalf
}

function experienceValue(r) {
  if (r.years_experience === null) return null
  const years = Number(r.years_experience)
  if (years < r.min_years) return 0
  if (r.max_years !== null && years > r.max_years) return 0.5
  return 1
}

function computeScore(r) {
  const values = {
    skills: skillsValue(r.skills),
    cv: cvValue(r.sim),
    education: educationValue(r),
    preference: preferenceValue(r),
    experience: experienceValue(r)
  }

  let points = 0
  let included = 0
  for (const [name, value] of Object.entries(values)) {
    if (value === null) continue
    points += value * WEIGHTS[name]
    included += WEIGHTS[name]
  }

  const score = Math.round((points / included) * 100)
  const tier = score >= 80 ? 'strong' : score >= 60 ? 'good' : 'low'

  const required = r.skills.filter((s) => s.required)
  const matched = required.filter((s) => s.has)
  const isQualified =
    matched.length === required.length &&
    (!r.major_must_have || r.major === r.field)

  const breakdown = {
    ...values,
    matchedRequired: `${matched.length}/${required.length}`,
    missing: r.skills.filter((s) => !s.has).map((s) => s.name),
    cvIncluded: values.cv !== null
  }
  return { score, tier, isQualified, breakdown }
}

module.exports = { computeScore }
