// =====================================================================
// Plan data for the company (employer) pages.
// Used by: Plans page, Payment page.
// Data comes from GET /api/plans (name, price, max_active_jobs, features).
// =====================================================================

// The line under each plan name (the backend has no tagline, so it is chosen by plan name)
const TAGLINES = {
  Free: 'Try Fursa with one job',
  Starter: 'For small teams hiring 1–2 roles',
  Growth: 'For companies hiring often',
};
export const planTagline = (plan) => TAGLINES[plan.name] || '';

// The plan with the "Most popular" badge (wireframe "5 · Company payment plans")
export const isPopular = (plan) => plan.name === 'Starter';

// 1 → "1 active job" · 2 → "Up to 2 active jobs" · null → "Unlimited active jobs"
function jobsLimit(max) {
  if (max == null) return 'Unlimited active jobs';
  return max === 1 ? '1 active job' : `Up to ${max} active jobs`;
}

// Every line on a plan card: [text, included?]
export function planFeatures(plan) {
  return [
    [jobsLimit(plan.max_active_jobs), true],
    ['AI ranking & Top 10', plan.features.ai_ranking],
    ['Match reasons for every applicant', plan.features.match_reasons],
    ['Bulk shortlist / reject', plan.features.bulk_actions],
    ['Hiring summary per job', plan.features.hiring_summary],
  ];
}

// 38.5 → "BHD 38.500" (prices on the payment page always show fils)
export const formatBHD = (amount) => `BHD ${Number(amount).toFixed(3)}`;
