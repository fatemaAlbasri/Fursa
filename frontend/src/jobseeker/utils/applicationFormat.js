// =====================================================================
// Application helpers for the job seeker.
// Used by: My applications (cards + progress) and Application details (timeline + panels).
// Data comes from GET /api/applications and GET /api/applications/:id.
// =====================================================================

// ---------- Statuses ----------
// The seeker says "Applied" (employers see the same status as "New")
export const STATUS_LABELS = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  accepted: 'Accepted',
  rejected: 'Rejected'
}

export const formatStatus = (status) => STATUS_LABELS[status] || status

// Filter tabs on My applications: All first, then one per status
export const APPLICATION_TABS = [
  { id: 'all', label: 'All' },
  ...Object.entries(STATUS_LABELS).map(([id, label]) => ({ id, label }))
]

// Interview type → text on the Interview details panel
const INTERVIEW_TYPES = { in_person: 'In person', online: 'Online' }
export const formatInterviewType = (type) => INTERVIEW_TYPES[type] || type

// ---------- Dates ----------
// Shown when a step has no date yet
export const NO_DATE = '–'

// Any date value → Date, or null when it is missing / not a real date
function toDate(value) {
  if (!value) return null
  const date = new Date(value)
  return isNaN(date) ? null : date
}

// Fixed names: newer browsers write September as "Sept" in en-GB, the wireframes use "Sep"
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// → "11 Oct" (local time, so the day doesn't shift)
export function formatShortDate(value) {
  const date = toDate(value)
  return date ? `${date.getDate()} ${MONTHS[date.getMonth()]}` : ''
}

// → "Tue, 20 Oct 2026"
export function formatFullDate(value) {
  const date = toDate(value)
  return date ? `${WEEKDAYS[date.getDay()]}, ${formatShortDate(date)} ${date.getFullYear()}` : ''
}

// → "10:00 AM" (some browsers put a narrow space before AM/PM; make it a normal one)
export function formatTime(value) {
  const date = toDate(value)
  if (!date) return ''
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, ' ')
}

// → "20 Oct, 10:00 AM" (the interview step on Application details)
export function formatShortDateTime(value) {
  const date = toDate(value)
  return date ? `${formatShortDate(date)}, ${formatTime(date)}` : ''
}

// ---------- Steps ----------
// Every step is { key, label, state, date }
//   key   = 'applied' | 'shortlisted' | 'interview' | 'decision'
//   state = 'done' | 'current' | 'next'
//           'accepted' / 'rejected' = the decision step once it is made
//           'skipped'  = a stage a rejected application never reached
//   date  = text ready to show ("11 Oct", "Now", or "–")

// How far each status goes: Applied 0 → Shortlisted 1 → Interview 2 → a decision 3
const STEP_INDEX = { applied: 0, shortlisted: 1, interview: 2, accepted: 3, rejected: 3 }

const step = (key, label, state, date) => ({ key, label, state, date: date || NO_DATE })

// Stages before the current one are done, the current one is highlighted, later ones are next
const stateFor = (index, current) => (index < current ? 'done' : index === current ? 'current' : 'next')

// The 4 fixed steps on a My applications card. `application` = one row from GET /api/applications
// (status, applied_at, shortlisted_at, interview_at, decided_at).
export function progressSteps(application) {
  const { status, applied_at, shortlisted_at, interview_at, decided_at } = application
  const applied = step('applied', 'Applied', status === 'applied' ? 'current' : 'done', formatShortDate(applied_at))

  // Rejected can happen at any stage: only the stages it really reached are done
  if (status === 'rejected') {
    const reachedInterview = Boolean(interview_at)
    const reachedShortlist = Boolean(shortlisted_at) || reachedInterview
    return [
      applied,
      reachedShortlist
        ? step('shortlisted', 'Shortlisted', 'done', formatShortDate(shortlisted_at))
        : step('shortlisted', 'Shortlisted', 'skipped'),
      reachedInterview
        ? step('interview', 'Interview', 'done', formatShortDate(interview_at))
        : step('interview', 'Interview', 'skipped'),
      step('decision', 'Not selected', 'rejected', formatShortDate(decided_at))
    ]
  }

  // Other statuses: the status decides how far the steps go, not the dates.
  // (After an Undo an old interview date can stay in the database, e.g. shortlisted with an
  // interview_at. It is ignored because Interview comes after the current step.)
  const current = STEP_INDEX[status] ?? 0
  const dateIfReached = (index, value) => (index <= current ? formatShortDate(value) : '')
  return [
    applied,
    step('shortlisted', 'Shortlisted', stateFor(1, current), dateIfReached(1, shortlisted_at)),
    step('interview', 'Interview', stateFor(2, current), dateIfReached(2, interview_at)),
    status === 'accepted'
      ? step('decision', 'Accepted', 'accepted', formatShortDate(decided_at))
      : step('decision', 'Decision', 'next')
  ]
}

// Latest time the application moved to `status`, from its history (an Undo can repeat a status)
function lastChange(history, status) {
  const times = history.filter((row) => row.to_status === status).map((row) => toDate(row.changed_at)).filter(Boolean)
  return times.length ? new Date(Math.max(...times)) : null
}

// The vertical timeline on Application details.
// `application` = GET /api/applications/:id → application (status, applied_at, interview_at)
// `history`     = the same response's history ([{ from_status, to_status, changed_at }], oldest first)
export function timelineSteps(application, history = []) {
  const { status, applied_at, interview_at } = application
  const shortlistedOn = formatShortDate(lastChange(history, 'shortlisted'))
  // The interview step shows when the interview is (or was), not when it was booked
  const interviewOn = formatShortDate(interview_at || lastChange(history, 'interview'))

  const applied = step('applied', 'Applied', 'done', formatShortDate(applied_at))
  const shortlisted = step('shortlisted', 'Shortlisted', 'done', shortlistedOn)
  const interviewNext = step('interview', 'Interview', 'next')
  const decisionNext = step('decision', 'Decision', 'next')

  switch (status) {
    case 'applied':
      return [applied, step('shortlisted', 'Waiting for review', 'current', 'Now'), interviewNext, decisionNext]

    case 'shortlisted':
      return [applied, { ...shortlisted, state: 'current' }, interviewNext, decisionNext]

    case 'interview':
      return [
        applied,
        shortlisted,
        step('interview', 'Interview scheduled', 'current', formatShortDateTime(interview_at) || interviewOn),
        decisionNext
      ]

    case 'accepted':
      return [
        applied,
        shortlisted,
        step('interview', 'Interview', 'done', interviewOn),
        step('decision', 'Accepted', 'accepted', formatShortDate(lastChange(history, 'accepted')))
      ]

    case 'rejected': {
      // Only the stages that really happened (from the history), then Not selected.
      // No "CV reviewed" step: no review date is recorded.
      const reachedInterview = history.some((row) => row.to_status === 'interview') || Boolean(interview_at)
      const reachedShortlist = history.some((row) => row.to_status === 'shortlisted') || reachedInterview
      return [
        applied,
        ...(reachedShortlist ? [shortlisted] : []),
        ...(reachedInterview ? [step('interview', 'Interview', 'done', interviewOn)] : []),
        step('decision', 'Not selected', 'rejected', formatShortDate(lastChange(history, 'rejected')))
      ]
    }

    default:
      return [applied]
  }
}
