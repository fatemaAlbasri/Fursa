// Display helpers for the AI CV Optimizer. Every number shown comes from the backend; these only format it.

export const OPTIMIZER_PATH = '/jobseeker/cv-optimizer'
export const REPORT_PATH = '/jobseeker/cv-optimizer/report'
export const PAY_PATH = '/jobseeker/cv-optimizer/pay'

// 2.2 → "2.200" (Bahraini dinar has 3 decimals)
export const formatBhd = (value) => Number(value).toFixed(3)

// en-GB writes "Sept", so the month comes from en-US: "3 Nov" / "3 Nov 2026"
const month = (date) => date.toLocaleDateString('en-US', { month: 'short' })
export function formatDay(value) {
  const date = new Date(value)
  return `${date.getDate()} ${month(date)}`
}
export function formatFullDate(value) {
  const date = new Date(value)
  return `${date.getDate()} ${month(date)} ${date.getFullYear()}`
}

// Same bands as the backend PDF report: 75+ good, 50+ fair, below 50 weak
export const scoreTone = (score) => (score >= 75 ? 'good' : score >= 50 ? 'fair' : 'weak')

export const pointsLabel = (points) => `+${points} ${points === 1 ? 'point' : 'points'}`
