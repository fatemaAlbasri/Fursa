import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { buildCvView } from '../../jobseeker/utils/cvText.js'
import { api } from '../../shared/api.js'
import { userInitials } from '../../shared/utils/jobFormat.js'
import { STATUS_LABELS, avatarColor } from '../data/applicants.js'
import { ButtonSpinner } from '../../shared/components/Loading.jsx'
import StatusPill from '../../shared/components/StatusPill'
import { LockIcon } from '../../shared/components/icons.jsx'
import ScoreRing from '../components/ScoreRing.jsx'
import '../styles/ApplicantView.css'

// Applicant details page for the company.
// the right side changes based on the applicant status

const REASONS = [
  'Missing a must-have skill',
  "Skills don't match the role",
  'Position filled',
  'Other'
]

// label and dot color for each history step
const HISTORY = {
  applied: ['Applied', '#159A9C'],
  shortlisted: ['Shortlisted by you', '#0284C7'],
  interview: ['Interview invite sent', '#6D4AFF'],
  accepted: ['Accepted · offer sent', '#12B76A'],
  rejected: ['Rejected by you', '#D92D20']
}

// backend saves interview times in Bahrain time (+03:00)
const TIME_ZONE = 'Asia/Bahrain'

// uploaded files are served from the server root, not /api
const SERVER = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/api\/?$/, '')

// e.g. 9 Oct
const shortDate = (date) =>
  new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: TIME_ZONE
  })

const yearsWord = (n) => `${n} ${n === 1 ? 'year' : 'years'}`

// e.g. Tue, 20 Oct - 10:00 AM
function interviewTime(date) {
  const d = new Date(date)
  const weekday = d.toLocaleDateString('en-GB', {
    weekday: 'short',
    timeZone: TIME_ZONE
  })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TIME_ZONE
  })
  return `${weekday}, ${shortDate(d)} · ${time}`
}

// fill the form with the current interview when rescheduling
function interviewToForm(interview) {
  if (!interview)
    return { date: '', time: '', type: 'in_person', location: '', note: '' }
  const d = new Date(interview.scheduled_at)
  return {
    date: d.toLocaleDateString('en-CA', { timeZone: TIME_ZONE }),
    time: d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: TIME_ZONE
    }),
    type: interview.type,
    location: interview.location_or_link,
    note: interview.note_to_applicant || ''
  }
}

// applicant's reply to the interview invite
const INTERVIEW_REPLY = {
  invited: ['apd-reply', 'Waiting for the applicant to confirm'],
  confirmed: ['apd-reply apd-reply--ok', '✓ Applicant confirmed attendance'],
  reschedule_requested: [
    'apd-reply apd-reply--warn',
    'Applicant asked for another time'
  ]
}

// highlight matched skills
function highlight(text, re) {
  if (!re) return text
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="apd-hl">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

// show the CV text with headings and highlighted skills
function HighlightedCv({ text, skills }) {
  // sort longest first so "React Native" matches before "React"
  const names = skills
    .filter((s) => s.has)
    .map((s) => s.name)
    .sort((x, y) => y.length - x.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  // match whole words only (Java shouldn't match inside JavaScript)
  const re = names.length
    ? new RegExp(`(?<![\\w])(${names.join('|')})(?![\\w#+])`, 'gi')
    : null

  // reuse the CV parser from the optimizer page (no suggestions here)
  const { name, header, items } = buildCvView(text, [])

  return (
    <div className="apd-cv__text">
      {name && <p className="apd-cv__name">{name}</p>}
      {header.length > 0 && <p className="apd-cv__sub">{header.join(' · ')}</p>}
      {items.map((item, i) =>
        item.type === 'heading' ? (
          <p key={i} className="apd-cv__heading">
            {item.text}
          </p>
        ) : (
          <p key={i} className="apd-cv__line">
            {highlight(item.text, re)}
          </p>
        )
      )}
    </div>
  )
}

// form for scheduling or rescheduling an interview
function ScheduleForm({
  initial,
  errors,
  busy,
  submitLabel,
  onSubmit,
  children
}) {
  const [form, setForm] = useState(initial)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <>
      <div className="apd-two">
        <div>
          <label htmlFor="apd-date">Date</label>
          <input
            id="apd-date"
            type="date"
            value={form.date}
            onChange={set('date')}
          />
        </div>
        <div>
          <label htmlFor="apd-time">Time</label>
          <input
            id="apd-time"
            type="time"
            value={form.time}
            onChange={set('time')}
          />
        </div>
      </div>
      {errors.date && <p className="field__error">{errors.date}</p>}
      <div>
        <label htmlFor="apd-type">Type</label>
        <select id="apd-type" value={form.type} onChange={set('type')}>
          <option value="in_person">In person</option>
          <option value="online">Online</option>
        </select>
      </div>
      <div>
        <label htmlFor="apd-loc">Location or meeting link</label>
        <input
          id="apd-loc"
          type="text"
          value={form.location}
          onChange={set('location')}
          placeholder={
            form.type === 'online' ? 'Meeting link' : 'Office address'
          }
        />
        {errors.location && <p className="field__error">{errors.location}</p>}
      </div>
      <div>
        <label htmlFor="apd-note">Note to applicant (optional)</label>
        <textarea
          id="apd-note"
          rows="2"
          value={form.note}
          onChange={set('note')}
          placeholder="e.g. Bring your Laptop"
        />
      </div>
      <button
        type="button"
        className="apd-btn apd-btn--blue"
        disabled={busy}
        onClick={() => onSubmit(form)}
      >
        {busy ? (
          <>
            <ButtonSpinner /> Sending…
          </>
        ) : (
          submitLabel
        )}
      </button>
      {children}
    </>
  )
}

// The same for every status: header, AI match, CV, the status card and History.
function ApplicantLoading() {
  const line = (width, thin) => <span className={thin ? 'sk sk--line sk--thin' : 'sk sk--line'} style={{ width }} />
  return (
    <div className="apd-loading" role="status" aria-label="Loading applicant">
      <section className="apd-head" aria-hidden="true">
        <span className="sk apd-avatar" />
        <div className="apd-head__who apd-loading__text">
          {line('60%')}
          {line('85%', true)}
        </div>
        <span className="sk sk--pill" />
        <span className="sk apd-sk-ring" />
      </section>
      <div className="apd-body" aria-hidden="true">
        <div className="apd-main">
          <section className="apd-card">
            {line(200)}
            {line('60%', true)}
            <div className="apd-skills">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="sk apd-sk-box" />
              ))}
            </div>
          </section>
          <section className="apd-card">
            {line(60)}
            {[90, 75, 95, 60, 85, 70].map((w, i) => (
              <span key={i} className="sk sk--line sk--thin" style={{ width: `${w}%` }} />
            ))}
          </section>
        </div>
        <aside className="apd-side">
          <section className="apd-card">
            {line(80, true)}
            {line(180)}
            {line('70%', true)}
            <span className="sk apd-sk-btn" />
            <span className="sk apd-sk-btn" />
          </section>
          <section className="apd-card">
            {line(70)}
            {[0, 1, 2].map((i) => (
              <div key={i} className="apd-loading__step">
                <span className="sk apd-sk-dot" />
                <div className="apd-loading__text">
                  {line(120)}
                  {line(50, true)}
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  )
}

function ApplicantPage() {
  const { id, appId } = useParams()

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const [reasonNote, setReasonNote] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [cvTab, setCvTab] = useState('text')

  const load = () =>
    api(`/jobs/mine/${id}/applicants/${appId}`)
      .then((res) => {
        setData(res)
        setNotes(res.interview?.employer_notes || '')
      })
      .catch((err) => setError(err.error || 'Could not load the applicant.'))

  useEffect(() => {
    load()
  }, [id, appId])

  if (!data) {
    return (
      <main className="container container--wide apd">
        <Link
          to="/company/applicants"
          state={{ jobId: Number(id) }}
          className="apd-back"
        >
          ← Back to applicants
        </Link>
        {error ? (
          <p className="field__error" role="alert">
            {error}
          </p>
        ) : (
          <ApplicantLoading />
        )}
      </main>
    )
  }

  const { applicant: a, interview, history, nav, features } = data
  // free plan has no score and no skills match
  const ranked = Boolean(features?.ai_ranking)
  const reasons = Boolean(features?.match_reasons)
  const status = a.status

  // only show a match if it's an exact major match
  const majorOk = Boolean(
    a.major &&
    a.field &&
    a.major.trim().toLowerCase() === a.field.trim().toLowerCase()
  )
  const experienceOk =
    a.years_experience != null && Number(a.years_experience) >= a.min_years
  const years = Number(a.years_experience || 0)

  // what the job asks for in years of experience
  const asksYears =
    a.min_years === 0
      ? a.max_years
        ? `Fresh graduate – ${yearsWord(a.max_years)}`
        : 'Fresh graduate'
      : a.max_years
        ? `${a.min_years}–${a.max_years} years`
        : `${a.min_years}+ years`

  // requirements cards - ok: true = matches, false = doesn't match, null = can't tell
  const reqs = [
    {
      label: a.major_must_have ? 'Major (must-have)' : 'Major',
      value: a.major || '—',
      asks: a.field || 'Any major',
      ok: majorOk ? true : null
    },
    {
      label: 'Experience',
      value:
        a.years_experience == null
          ? '—'
          : years === 0
            ? 'No experience'
            : yearsWord(years),
      asks: asksYears,
      ok: a.years_experience == null ? null : experienceOk
    },
    ...(a.language
      ? [{ label: 'Language (required)', value: a.language, ok: null }]
      : [])
  ]

  // date the applicant was last moved to this status
  const movedOn = (to) => {
    const step = [...history].reverse().find((h) => h.to_status === to)
    return step ? shortDate(step.changed_at) : ''
  }

  const isPdf = /\.pdf$/i.test(a.cv_url || '')

  // word files can't be previewed, so show the text only
  const cvView = !a.cv_text ? 'pdf' : isPdf ? cvTab : 'text'

  const downloadCv = async () => {
    try {
      const res = await fetch(SERVER + a.cv_url)
      if (!res.ok) throw new Error()
      const url = URL.createObjectURL(await res.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = a.cv_file_name || 'cv'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError('Could not download the CV.')
    }
  }

  const run = async (work) => {
    setBusy(true)
    setError('')
    try {
      await work()
      await load()
      return true
    } catch (err) {
      setError(err.error || 'Something went wrong. Try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const moveTo = (to, extra = {}) =>
    run(() =>
      api(`/jobs/mine/${id}/applicants/${appId}`, {
        method: 'PATCH',
        body: { status: to, ...extra }
      })
    )

  const confirmReject = async () => {
    const text = reason === 'Other' ? reasonNote.trim() : reason
    if (!text) return setError('Write the reason for the applicant.')
    if (await moveTo('rejected', { reason: text })) setRejecting(false)
  }

  const sendInvite = async (form) => {
    setFormErrors({})
    const ok = await run(() =>
      api(`/jobs/mine/${id}/applicants/${appId}/interview`, {
        method: 'POST',
        body: form
      }).catch((err) => {
        setFormErrors(err.errors || {})
        throw err
      })
    )
    if (ok) setRescheduling(false)
  }

  const saveNotes = async () => {
    if (notes === (interview?.employer_notes || '')) return
    try {
      await api(`/jobs/mine/${id}/applicants/${appId}/interview/notes`, {
        method: 'PATCH',
        body: { notes }
      })
      setData({ ...data, interview: { ...interview, employer_notes: notes } })
      setNotesSaved(true)
    } catch (err) {
      setError(err.error || 'Could not save the notes.')
    }
  }

  const openReject = () => {
    setRejecting(true)
    setError('')
  }

  const rejectButton = (
    <button
      type="button"
      className="apd-btn apd-btn--reject"
      disabled={busy}
      onClick={openReject}
    >
      Reject
    </button>
  )

  return (
    <main className="container container--wide apd">
      <div className="apd-top">
        <Link
          to="/company/applicants"
          state={{ jobId: Number(id) }}
          className="apd-back"
        >
          ← Back to applicants
        </Link>
        {nav && (
          <nav className="apd-nav" aria-label="Other applicants">
            <span className="apd-nav__count">
              Applicant {nav.position} of {a.total_applicants}
            </span>
            {nav.prev_id ? (
              <Link
                to={`/company/jobs/${id}/applicants/${nav.prev_id}`}
                className="apd-nav__btn"
              >
                ← Previous
              </Link>
            ) : (
              <span className="apd-nav__btn" aria-disabled="true">
                ← Previous
              </span>
            )}
            {nav.next_id ? (
              <Link
                to={`/company/jobs/${id}/applicants/${nav.next_id}`}
                className="apd-nav__btn"
              >
                Next →
              </Link>
            ) : (
              <span className="apd-nav__btn" aria-disabled="true">
                Next →
              </span>
            )}
          </nav>
        )}
      </div>

      {/* header */}
      <section className="apd-head">
        <span className="apd-avatar" style={{ background: avatarColor(a) }}>
          {userInitials(a.first_name, a.last_name)}
        </span>
        <div className="apd-head__who">
          <h1>
            {a.first_name} {a.last_name}
          </h1>
          <p>
            Applied for{' '}
            <Link to={`/company/jobs/${id}`} className="apd-job-link">
              {a.job_title}
            </Link>{' '}
            · {shortDate(a.applied_at)}
            {a.rank != null && ` · Rank #${a.rank} of ${a.total_applicants}`}
          </p>
        </div>
        <StatusPill status={STATUS_LABELS[status]} />
        {ranked && (
          <ScoreRing
            score={a.score}
            size={76}
            className="ap-score apd-score"
            byScore
            thickness={3.75}
          />
        )}
      </section>

      {error && (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}

      <div className="apd-body">
        {/* left side */}
        <div className="apd-main">
          <section className="apd-card">
            <h2>{reasons ? 'Why this score (AI match)' : 'Requirements'}</h2>
            {reasons ? (
              <p className="apd-muted">
                Skills in the job requirements compared with the skills found in
                the CV.
              </p>
            ) : (
              <p className="apd-locked">
                <LockIcon />
                AI match details are on the Starter plan.{' '}
                <Link to="/company/plans">See plans →</Link>
              </p>
            )}
            {a.skills.length > 0 && (
              <div className="apd-skills">
                {a.skills.map((s) => {
                  const kind = s.has
                    ? 'has'
                    : s.required
                      ? 'lacking'
                      : 'missing'
                  const mark = {
                    has: '✓ In CV',
                    lacking: '✗ Missing',
                    missing: '– Not in CV'
                  }[kind]
                  return (
                    <div
                      key={s.name}
                      className={`apd-skill apd-skill--${kind}`}
                    >
                      <span>
                        <b>{s.name}</b>
                        {s.required && (
                          <span className="apd-must"> Must-have</span>
                        )}
                      </span>
                      <b className="apd-skill__mark">{mark}</b>
                    </div>
                  )
                })}
              </div>
            )}
            {reasons && <p className="apd-subhead">Other requirements</p>}
            <div className="apd-reqs">
              {reqs.map((r) => (
                <div key={r.label} className="apd-req">
                  <div className="apd-req__top">
                    <span>{r.label}</span>
                    {r.ok === true && <b className="apd-req__ok">✓ Matches</b>}
                    {r.ok === false && (
                      <b className="apd-req__no">✗ Doesn't match</b>
                    )}
                  </div>
                  <b className="apd-req__value">{r.value}</b>
                  {r.asks && (
                    <span className="apd-req__asks">Job asks: {r.asks}</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="apd-card">
            <div className="apd-cv__head">
              <h2>CV</h2>
              <div className="apd-cv__actions">
                {a.cv_text && isPdf && (
                  <div
                    className="apd-tabs"
                    role="group"
                    aria-label="How to show the CV"
                  >
                    <button
                      type="button"
                      className="apd-tab"
                      aria-pressed={cvView === 'text'}
                      onClick={() => setCvTab('text')}
                    >
                      {reasons ? 'Highlighted text' : 'Text'}
                    </button>
                    <button
                      type="button"
                      className="apd-tab"
                      aria-pressed={cvView === 'pdf'}
                      onClick={() => setCvTab('pdf')}
                    >
                      PDF
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  className="apd-btn apd-btn--plain"
                  onClick={downloadCv}
                >
                  Download
                </button>
              </div>
            </div>

            {cvView === 'text' && (
              <>
                <p className="apd-muted apd-cv__note">
                  Text read from the uploaded file
                  {reasons && ' · skills the job asks for are highlighted'}
                </p>
                <div className="apd-cv__box">
                  <HighlightedCv text={a.cv_text} skills={a.skills} />
                  {reasons && (
                    <div className="apd-cv__legend">
                      <span aria-hidden="true" /> Matches the job requirements
                    </div>
                  )}
                </div>
              </>
            )}

            {cvView === 'pdf' &&
              (isPdf ? (
                <iframe
                  className="apd-cv__preview"
                  src={SERVER + a.cv_url}
                  title={`CV of ${a.first_name} ${a.last_name}`}
                />
              ) : (
                <p className="apd-cv__file">{a.cv_file_name}</p>
              ))}
          </section>
        </div>

        {/* right side */}
        <aside className="apd-side">
          {status === 'applied' && !rejecting && (
            <section className="apd-card apd-step apd-step--teal">
              <p className="apd-kicker">NEXT STEP</p>
              <h2>New applicant · decide</h2>
              <p className="apd-muted">
                Shortlist to move forward, or reject with a reason.
              </p>
              <button
                type="button"
                className="apd-btn apd-btn--teal"
                disabled={busy}
                onClick={() => moveTo('shortlisted')}
              >
                {busy ? (
                  <>
                    <ButtonSpinner /> Shortlisting…
                  </>
                ) : (
                  'Shortlist'
                )}
              </button>
              {rejectButton}
            </section>
          )}

          {status === 'shortlisted' && !rejecting && (
            <section className="apd-card apd-step apd-step--blue">
              <p className="apd-kicker">NEXT STEP</p>
              <h2>Schedule an interview</h2>
              <ScheduleForm
                initial={interviewToForm(null)}
                errors={formErrors}
                busy={busy}
                submitLabel="Send interview invite"
                onSubmit={sendInvite}
              >
                {rejectButton}
              </ScheduleForm>
            </section>
          )}

          {status === 'interview' && !rejecting && rescheduling && (
            <section className="apd-card apd-step apd-step--blue">
              <p className="apd-kicker">RESCHEDULE</p>
              <h2>Pick a new time</h2>
              <ScheduleForm
                initial={interviewToForm(interview)}
                errors={formErrors}
                busy={busy}
                submitLabel="Send new time"
                onSubmit={sendInvite}
              >
                <button
                  type="button"
                  className="apd-btn apd-btn--plain"
                  disabled={busy}
                  onClick={() => {
                    setRescheduling(false)
                    setFormErrors({})
                  }}
                >
                  Cancel
                </button>
              </ScheduleForm>
            </section>
          )}

          {status === 'interview' && !rejecting && !rescheduling && (
            <section className="apd-card apd-step apd-step--purple">
              <p className="apd-kicker">INTERVIEW</p>
              {interview && (
                <>
                  <h2>{interviewTime(interview.scheduled_at)}</h2>
                  <p className="apd-muted">
                    {interview.type === 'online' ? 'Online' : 'In person'} ·{' '}
                    {interview.location_or_link}
                  </p>
                  {INTERVIEW_REPLY[interview.status] && (
                    <p className={INTERVIEW_REPLY[interview.status][0]}>
                      {INTERVIEW_REPLY[interview.status][1]}
                    </p>
                  )}
                  <div>
                    <label htmlFor="apd-notes">Interview notes (private)</label>
                    <textarea
                      id="apd-notes"
                      rows="3"
                      value={notes}
                      placeholder="How did it go?"
                      onChange={(e) => {
                        setNotes(e.target.value)
                        setNotesSaved(false)
                      }}
                      onBlur={saveNotes}
                    />
                    {notesSaved && <span className="apd-saved">Saved</span>}
                  </div>
                </>
              )}
              <button
                type="button"
                className="apd-btn apd-btn--green"
                disabled={busy}
                onClick={() => moveTo('accepted')}
              >
                {busy ? (
                  <>
                    <ButtonSpinner /> Sending offer…
                  </>
                ) : (
                  'Accept · send offer'
                )}
              </button>
              {rejectButton}
              <button
                type="button"
                className="apd-btn apd-btn--link"
                disabled={busy}
                onClick={() => {
                  setRescheduling(true)
                  setError('')
                }}
              >
                Reschedule
              </button>
            </section>
          )}

          {rejecting && (
            <section className="apd-card apd-step apd-step--red">
              <h2>Reject this applicant?</h2>
              <div>
                <label htmlFor="apd-reason">
                  Reason (sent to the applicant)
                </label>
                <select
                  id="apd-reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value)
                    setError('')
                  }}
                >
                  {REASONS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              {reason === 'Other' && (
                <div>
                  <label htmlFor="apd-reason-note">Write the reason</label>
                  <textarea
                    id="apd-reason-note"
                    rows="3"
                    maxLength={300}
                    value={reasonNote}
                    autoFocus
                    onChange={(e) => setReasonNote(e.target.value)}
                    placeholder="e.g. We need someone with at least one year of React experience."
                  />
                </div>
              )}
              <button
                type="button"
                className="apd-btn apd-btn--red"
                disabled={busy}
                onClick={confirmReject}
              >
                {busy ? (
                  <>
                    <ButtonSpinner /> Rejecting…
                  </>
                ) : (
                  'Reject & notify'
                )}
              </button>
              <button
                type="button"
                className="apd-btn apd-btn--plain"
                disabled={busy}
                onClick={() => {
                  setRejecting(false)
                  setError('')
                }}
              >
                Cancel
              </button>
            </section>
          )}

          {status === 'accepted' && (
            <section className="apd-card apd-step apd-step--hired">
              <p className="apd-kicker">HIRED</p>
              <h2>Offer sent · {movedOn('accepted')}</h2>
              <p>
                The applicant was notified. Contact them to agree the start
                date.
              </p>
              <div className="apd-contact">
                <div>
                  <b>Email:</b> <a href={`mailto:${a.email}`}>{a.email}</a>
                </div>
                {a.phone && (
                  <div>
                    <b>Phone:</b> {a.phone}
                  </div>
                )}
              </div>
              <Link
                to={`/company/jobs/${id}`}
                className="apd-btn apd-btn--outline-red"
              >
                Position filled? Close this job
              </Link>
            </section>
          )}

          {status === 'rejected' && (
            <section className="apd-card apd-step apd-step--rejected">
              <p className="apd-kicker">REJECTED · {movedOn('rejected')}</p>
              <h2>Applicant notified</h2>
              {a.rejection_reason && (
                <div className="apd-contact">
                  <b>Reason sent:</b> {a.rejection_reason}
                </div>
              )}
              <button
                type="button"
                className="apd-btn apd-btn--plain"
                disabled={busy}
                onClick={() => moveTo('shortlisted')}
              >
                Undo · move to shortlist
              </button>
            </section>
          )}

          <section className="apd-card apd-history">
            <h2>History</h2>
            {history.map((h, i) => (
              <div key={i} className="apd-history__step">
                <div className="apd-history__line">
                  <span
                    className="apd-history__dot"
                    style={{ background: HISTORY[h.to_status]?.[1] }}
                  />
                  <span className="apd-history__bar" />
                </div>
                <div>
                  <b>{HISTORY[h.to_status]?.[0] ?? h.to_status}</b>
                  <span>{shortDate(h.changed_at)}</span>
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </main>
  )
}
// key resets the page state when moving to another applicant
export default function ApplicantView() {
  const { appId } = useParams()
  return <ApplicantPage key={appId} />
}
