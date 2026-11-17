import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../shared/api.js'
import Loading from '../../shared/components/Loading.jsx'
import { LogOutIcon } from '../../shared/components/icons.jsx'
import { userInitials } from '../../shared/utils/jobFormat.js'
import PersonalDetails from '../components/profile/PersonalDetails.jsx'
import SkillsCard from '../components/profile/SkillsCard.jsx'
import PreferencesCard from '../components/profile/PreferencesCard.jsx'
import CvCard from '../components/profile/CvCard.jsx'
import AccountCard from '../components/profile/AccountCard.jsx'
import '../styles/Profile.css'

// =====================================================================
// Profile (/jobseeker/profile).
// Header (initials, name, major · status · email, Log out) and one card per section:
// Personal details, My skills, Job preferences, My CV, Account.
// Data: GET /api/profile (the signed-in seeker only). Each card saves through its own endpoint
// and only changes its own fields, so editing one section never touches another.
// =====================================================================

// Navy header card
function ProfileHeader({ profile, onLogout, loggingOut }) {
  const name = `${profile.first_name} ${profile.last_name}`
  const meta = [profile.major, profile.graduation_status, profile.email].filter(Boolean).join(' · ')
  return (
    <section className="pf-header" aria-label="Your profile">
      <span className="pf-header__avatar" aria-hidden="true">
        {userInitials(profile.first_name, profile.last_name)}
      </span>
      <div className="pf-header__info">
        <h1 className="pf-header__name">{name}</h1>
        <p className="pf-header__meta">{meta}</p>
      </div>
      <button type="button" className="btn pf-logout" onClick={onLogout} disabled={loggingOut}>
        <LogOutIcon />
        {loggingOut ? 'Logging out…' : 'Log out'}
      </button>
    </section>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0) // "Try again" bumps this to load again
  const [loggingOut, setLoggingOut] = useState(false)

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
        <Loading text="Loading your profile…" />
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
      <ProfileHeader profile={profile} onLogout={logout} loggingOut={loggingOut} />
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
