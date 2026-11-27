import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api.js'
import { formatJobType, formatWorkMode } from '../../shared/utils/jobFormat.js'
import { BriefcaseIcon, PencilIcon, SparkleIcon } from '../../shared/components/icons.jsx'
import { OPTIMIZER_PATH } from '../utils/cvFormat.js'

// Right side of Jobs for you: "Your preferences" + "Get better matches" (CV strength).
// Each card loads on its own and shows grey placeholders until then.

function SideCard({ icon, title, sub, children }) {
  return (
    <section className="jfy-side">
      <div className="jfy-side__head">
        <span className="jfy-side__icon">{icon}</span>
        <div>
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function Chips({ label, values, format }) {
  return (
    <div>
      <p className="jfy-side__label">{label}</p>
      <div className="jfy-side__chips">
        {values.map((v) => (
          <span key={v} className="jfy-side__chip">
            {format(v)}
          </span>
        ))}
      </div>
    </div>
  )
}

function Preferences() {
  const [prefs, setPrefs] = useState(null) // null = loading
  useEffect(() => {
    api('/profile')
      .then(({ profile }) => setPrefs({ types: profile.job_types || [], modes: profile.work_modes || [] }))
      .catch(() => setPrefs({ types: [], modes: [] }))
  }, [])

  const none = prefs && prefs.types.length === 0 && prefs.modes.length === 0
  return (
    <SideCard icon={<BriefcaseIcon />} title="Your preferences" sub="Your matches are based on these">
      {!prefs ? (
        <div className="jfy-side__loading" role="status" aria-label="Loading preferences">
          <span className="sk sk--line sk--thin" style={{ width: '30%' }} />
          <span className="sk sk--pill" />
          <span className="sk sk--line sk--thin" style={{ width: '35%' }} />
          <span className="sk sk--pill" />
        </div>
      ) : none ? (
        <p className="jfy-side__text">You haven't set any. We're showing all job types and work modes.</p>
      ) : (
        <div className="jfy-side__prefs">
          {prefs.types.length > 0 && <Chips label="Job type" values={prefs.types} format={formatJobType} />}
          {prefs.modes.length > 0 && <Chips label="Work mode" values={prefs.modes} format={formatWorkMode} />}
        </div>
      )}
      {!prefs ? (
        <span className="sk sk--wide" aria-hidden="true" />
      ) : (
        <Link to="/jobseeker/profile" className="jfy-side__edit">
          <PencilIcon />
          {none ? 'Set your preferences' : 'Edit preferences'}
        </Link>
      )}
    </SideCard>
  )
}

// small round score, red / amber / green like the CV Optimizer (circle length 2πr = 301.6 for r = 48)
function StrengthRing({ score }) {
  return (
    <div className={`jfy-strength jfy-strength--${scoreTone(score)}`} role="img" aria-label={`CV strength ${score} out of 100`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="jfy-strength__track" cx="60" cy="60" r="48" />
        <circle
          className="jfy-strength__bar"
          cx="60"
          cy="60"
          r="48"
          style={{ strokeDasharray: `${((score / 100) * 301.6).toFixed(1)} 301.6` }}
        />
      </svg>
      <span>{score}</span>
    </div>
  )
}

function CvStrength() {
  return (
    <SideCard icon={<SparkleIcon />} title="Get better matches" sub="A stronger CV ranks you higher">
      <p className="jfy-side__text">See how strong your CV is and get AI suggestions to improve it.</p>
      <Link to={OPTIMIZER_PATH} className="btn btn--primary jfy-side__btn">
        <SparkleIcon />
        Check my CV
      </Link>
    </SideCard>
  )
}

export default function HomeSidebar() {
  return (
    <aside className="jfy-home__side">
      <Preferences />
      <CvStrength />
    </aside>
  )
}
