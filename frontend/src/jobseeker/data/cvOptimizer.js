// AI CV Optimizer: the review shown on the AI CV Optimizer page (free) and the Advanced CV report.
// Field names match cv_reviews / cv_suggestions in backend/database/schema.sql,
// so this can later be replaced by an API call without changing the pages.

// Price of the Advanced CV report (payments.item = 'advanced_cv_report')
export const REPORT_PRICE_BHD = 2

// cv_suggestions.section → name shown on the page
export const SECTION_LABELS = {
  summary: 'Summary',
  projects: 'Projects',
  skills: 'Skills',
  education: 'Education',
  layout: 'Layout'
}

export const REVIEW = {
  strength_score: 72,
  potential_score: 88, // strength_score + all suggestion points
  suggestions: [
    {
      section: 'summary',
      before_text: 'IT graduate looking for a job.',
      after_text:
        'IT graduate (University of Bahrain, 2026) focused on frontend development with React and JavaScript.',
      reason: 'A clear summary tells employers what you do in one line.',
      teaser: 'Write a clear one-line summary',
      points: 7,
      is_free_preview: true
    },
    {
      section: 'projects',
      before_text: 'Made a website for my senior project.',
      after_text:
        'Built the React frontend for my senior project and connected it to a PostgreSQL database.',
      reason: 'Shows the tools you used. Uses only what you already did.',
      teaser: 'Reword your senior project to show the tools you used',
      points: 5,
      is_free_preview: false
    },
    {
      section: 'skills',
      before_text: 'JS, react, databases',
      after_text: 'JavaScript · React · SQL (PostgreSQL)',
      reason: 'Full skill names are recognised by employers and by Fursa matching.',
      teaser: 'Use the full names of your skills',
      points: 2,
      is_free_preview: false
    },
    {
      section: 'education',
      before_text: 'BSc Computer Science, University of Bahrain',
      after_text:
        'BSc Computer Science, University of Bahrain (2026) · Courses: Web Development, Database Systems',
      reason: 'Courses you took show your skills when you have little work experience.',
      teaser: 'Add your relevant courses',
      points: 1,
      is_free_preview: false
    },
    {
      section: 'layout',
      before_text: 'Education → Hobbies → Projects → Skills',
      after_text: 'Summary → Projects → Skills → Education',
      reason: 'Puts your strongest section first, where employers look.',
      teaser: 'Reorder sections so your strongest part comes first',
      points: 1,
      is_free_preview: false
    }
  ],
  // "How your CV compares with strong IT CVs" (cv_reviews.comparison), report only
  comparison: [
    { label: 'A short, specific summary', ok: true },
    { label: 'Projects with the tools used', ok: true },
    { label: 'Skills written in full names', ok: true },
    { label: 'A link to your work (GitHub or portfolio), if you have one', ok: false },
    { label: 'Relevant courses listed under Education', ok: false },
    { label: 'One page, clear headings', ok: true }
  ]
}

// ---------- Saved progress (kept in the browser until the backend stores it) ----------
// { unlocked: bool, paidAt: ISO date | null, statuses: { summary: 'accepted' | 'dismissed', ... } }
const KEY = 'fursa-cv-optimizer'
const EMPTY = { unlocked: false, paidAt: null, statuses: {} }

export function loadProgress() {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY)) }
  } catch {
    return EMPTY
  }
}

export function saveProgress(progress) {
  localStorage.setItem(KEY, JSON.stringify(progress))
}

// Score after the accepted suggestions are added, e.g. 72 + 7 = 79
export function currentScore(statuses) {
  return REVIEW.suggestions.reduce(
    (score, s) => (statuses[s.section] === 'accepted' ? score + s.points : score),
    REVIEW.strength_score
  )
}

// 7 → "+7 points", 1 → "+1 point"
export const pointsText = (points) => `+${points} ${points === 1 ? 'point' : 'points'}`
