// Plan helpers for the plans and payment pages

// the backend has no tagline, so we pick it by plan name
const TAGLINES = {
  Free: 'Try Fursa with one job',
  Starter: 'For small teams hiring 1–2 roles',
  Growth: 'For companies hiring often'
}
export const planTagline = (plan) => TAGLINES[plan.name] || ''

export const isPopular = (plan) => plan.name === 'Starter'

function jobsLimit(max) {
  if (max == null) return 'Unlimited active jobs'
  return max === 1 ? '1 active job' : `Up to ${max} active jobs`
}

// each line on a plan card: [text, included]
export function planFeatures(plan) {
  return [
    [jobsLimit(plan.max_active_jobs), true],
    ['AI ranking & Top 10', plan.features.ai_ranking],
    ['Match reasons for every applicant', plan.features.match_reasons],
    ['Bulk shortlist / reject', plan.features.bulk_actions],
    ['Hiring summary per job', plan.features.hiring_summary]
  ]
}

// always show fils, e.g. "BHD 38.500"
export const formatBHD = (amount) => `BHD ${Number(amount).toFixed(3)}`
