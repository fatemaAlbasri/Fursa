import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../shared/api.js'

// Loads the signed-in job seeker, then all open jobs (GET /api/jobs).
// Used by: Jobs for you and All jobs. No token or a bad token → Sign In; a company → its own home.
// reload() = "Try again" after an error.
export default function useOpenJobs() {
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0) // "Try again" bumps this to load again

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/signin?role=jobseeker', { replace: true })
      return
    }
    let ignore = false // stops a late answer from updating the page after leaving it

    async function load() {
      setLoading(true)
      setError('')

      // 1. Who is signed in?
      let user
      try {
        const data = await api('/auth/me')
        user = data.user
      } catch (err) {
        if (ignore) return
        // The server answered with an error (expired / invalid token) → sign in again
        if (err.error) navigate('/signin?role=jobseeker', { replace: true })
        else {
          setError('Could not reach the server')
          setLoading(false)
        }
        return
      }
      if (ignore) return
      // A company opened the job seeker page: send them to their own home
      if (user.role === 'employer') {
        navigate('/company', { replace: true })
        return
      }
      setFirstName(user.first_name)

      // 2. The open jobs
      try {
        const data = await api('/jobs')
        if (!ignore) setJobs(data.jobs)
      } catch (err) {
        if (!ignore) setError(err.error || 'Could not reach the server')
      }
      if (!ignore) setLoading(false)
    }
    load()

    return () => {
      ignore = true
    }
  }, [navigate, reloadKey])

  return { firstName, jobs, loading, error, reload: () => setReloadKey((key) => key + 1) }
}
