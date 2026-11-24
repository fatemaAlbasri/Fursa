const COUNT = new Intl.NumberFormat('en')
const MONEY = new Intl.NumberFormat('en', { maximumFractionDigits: 3 })

// 1240 → "1,240"
export const formatCount = (n) => COUNT.format(n)

// 1285.5 → "BHD 1,285.5"
export const formatBhd = (n) => `BHD ${MONEY.format(n)}`

// "2026-11-21T00:00:00Z" → "21 Nov" (adds the year if it is not this year)
export function formatShortDate(date) {
  const d = new Date(date)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' })
  })
}