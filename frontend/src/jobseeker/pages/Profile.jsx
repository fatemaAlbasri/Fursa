import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../shared/api.js'
import ConfirmDialog from '../../shared/components/ConfirmDialog.jsx'
import { CalendarIcon, LogOutIcon } from '../../shared/components/icons.jsx'
import { userInitials } from '../../shared/utils/jobFormat.js'
import PersonalDetails from '../components/profile/PersonalDetails.jsx'
import SkillsCard from '../components/profile/SkillsCard.jsx'
import PreferencesCard from '../components/profile/PreferencesCard.jsx'
import CvCard from '../components/profile/CvCard.jsx'
import AccountCard from '../components/profile/AccountCard.jsx'
import { CapIcon } from '../components/profile/ProfileParts.jsx'
import '../styles/Profile.css'

// =====================================================================
// Profile (/jobseeker/profile).
// Header (wireframe 11: banner, initials, name, major · status and join date chips, Log out) and one card per section:
// Personal details, My skills, Job preferences, My CV, Account.
// Data: GET /api/profile (the signed-in seeker only). Each card saves through its own endpoint
// and only changes its own fields, so editing one section never touches another.
// =====================================================================

// "Joined Oct 2026"
const joined = (date) => (date ? new Date(date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '')

// Banner with soft shapes, the initials overlapping it, then name, chips and Log out
function ProfileHeader({ profile, onLogout, loggingOut }) {
  const name = `${profile.first_name} ${profile.last_name}`
  const study = [profile.major, profile.graduation_status].filter(Boolean).join(' · ')
  return (
    <section className="card pf-header" aria-label="Your profile">
      <div className="pf-header__banner" aria-hidden="true">
        <span className="pf-header__dots" />
        <span className="pf-header__shape pf-header__shape--1" />
        <span className="pf-header__shape pf-header__shape--2" />
        <span className="pf-header__shape pf-header__shape--3" />
      </div>
      <div className="pf-header__body">
        <span className="pf-header__avatar" aria-hidden="true">
          <span>{userInitials(profile.first_name, profile.last_name)}</span>
        </span>
        <div className="pf-header__info">
          <h1 className="pf-header__name">{name}</h1>
          <div className="pf-header__chips">
            {study && (
              <span className="pf-chip pf-chip--teal">
                <CapIcon />
                {study}
              </span>
            )}
            {profile.created_at && (
              <span className="pf-chip">
                <CalendarIcon />
                Joined {joined(profile.created_at)}
              </span>
            )}
          </div>
        </div>
        <button type="button" className="pf-outline pf-logout" onClick={onLogout} disabled={loggingOut}>
          <LogOutIcon />
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </div>
    </section>
  )
}

// Grey shapes in the same layout as the page while it loads (wireframe 23)
function ProfileLoading() {
  const line = (width, thin) => <span className={thin ? 'sk sk--line sk--thin' : 'sk sk--line'} style={{ width }} />
  const head = (
    <div className="pf-card__head">
      <div className="pf-card__titles">
        <span className="sk pf-card__icon" />
        <div className="pf-loading__text">
          {line(140)}
          {line(200, true)}
        </div>
      </div>
      <span className="sk sk--btn" />
    </div>
  )
  return (
    <div className="pf-loading" role="status" aria-label="Loading your profile">
      <section className="card pf-header" aria-hidden="true">
        <div className="pf-header__banner" />
        <div className="pf-header__body">
          <span className="pf-header__avatar">
            <span className="sk" />
          </span>
          <div className="pf-header__info pf-loading__text">
            {line(220)}
            <div className="pf-header__chips">
              <span className="sk sk--pill pf-loading__chip" />
              <span className="sk sk--pill" />
            </div>
          </div>
          <span className="sk sk--btn" />
        </div>
      </section>
      <section className="card pf-card" aria-hidden="true">
        {head}
        <div className="pf-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="pf-tile">
              <span className="sk pf-tile__icon" />
              <div className="pf-loading__text pf-tile__text">
                {line('40%', true)}
                {line('70%')}
              </div>
            </div>
          ))}
        </div>
      </section>
      {[0, 1].map((i) => (
        <section key={i} className="card pf-card" aria-hidden="true">
          {head}
          <div className="pf-header__chips">
            {[90, 70, 110, 80].map((w) => (
              <span key={w} className="sk sk--pill" style={{ width: w }} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0) // "Try again" bumps this to load again
  const [loggingOut, setLoggingOut] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false) // "Are you sure?" dialog is open

  // Escape closes the log out dialog (= Cancel), never logs out. Ignored while logging out.
  useEffect(() => {
    if (!confirmLogout || loggingOut) return
    const onKey = (e) => {
      if (e.key === 'Escape') setConfirmLogout(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmLogout, loggingOut])

  // Load the signed-in user's profile. No token or a bad token → Sign In; a company → its own home.
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/signin?role=jobseeker', { replace: true })
      return
    }
    let ignore = false // stops a late answer from updating the page after leaving it
    setLoading(true)
    setError('')
    api('/profile')
      .then(({ profile }) => {
        if (ignore) return
        if (profile.role === 'employer') {
          navigate('/company', { replace: true })
          return
        }
        setProfile(profile)
        setLoading(false)
      })
      .catch((err) => {
        if (ignore) return
        // The server answered with an error (expired / invalid token) → sign in again
        if (err.error === 'Please sign in' || err.error?.startsWith('Session expired')) {
          navigate('/signin?role=jobseeker', { replace: true })
          return
        }
        setError(err.error || 'Could not reach the server')
        setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [navigate, reloadKey])

  // Each card hands back only what it saved
  const update = (changes) => setProfile((current) => ({ ...current, ...changes }))

  // Tell the backend (it can't cancel the token, so a failure doesn't matter), then forget the token
  async function logout() {
    setLoggingOut(true)
    await api('/auth/profile/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('token')
    navigate('/signin?role=jobseeker', { replace: true })
  }

  if (loading) {
    return (
      <main className="container pf">
        <ProfileLoading />
      </main>
    )
  }

  if (error) {
    return (
      <main className="container pf">
        <div className="card pf-state" role="alert">
          <h2>Could not load your profile</h2>
          <p>{error}</p>
          <button type="button" className="btn btn--outline" onClick={() => setReloadKey(reloadKey + 1)}>
            Try again
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="container pf">
      <ProfileHeader profile={profile} onLogout={() => setConfirmLogout(true)} loggingOut={loggingOut} />
      <ConfirmDialog
        open={confirmLogout}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmLabel="Log out"
        busy={loggingOut}
        onConfirm={logout}
        onCancel={() => setConfirmLogout(false)}
      />
      <PersonalDetails profile={profile} onSaved={update} />
      <SkillsCard skills={profile.skills} onSaved={(skills) => update({ skills })} />
      <PreferencesCard
        jobTypes={profile.job_types || []}
        workModes={profile.work_modes || []}
        onSaved={update}
      />
      <CvCard cv={profile.cv} onSaved={(cv) => update({ cv })} />
      <AccountCard />
    </main>
  )
}
