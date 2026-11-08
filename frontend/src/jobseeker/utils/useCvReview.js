import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../shared/api.js'
import {
  getMe,
  getReview,
  analyseCv,
  setSuggestionStatus,
  unlockReport,
  uploadCv
} from './cvOptimizerApi.js'

// Loads the signed-in job seeker and their CV review (GET /api/cv/optimizer), and holds the actions.
// No token or a bad token → Sign In; a company → its own home; any other non-seeker → the home page.
// Used by both optimizer pages.
//
// phase: 'loading' | 'error' | 'no-cv' | 'unreadable' | 'ready-to-analyse' | 'analysing' | 'ready'
export default function useCvReview() {
  const navigate = useNavigate()
  const alive = useRef(true)
  const saving = useRef(false) // a suggestion update is in flight (only one at a time)

  const [phase, setPhase] = useState('loading')
  const [error, setError] = useState('') // why the page couldn't load
  const [analyseError, setAnalyseError] = useState('') // last "Analyse my CV" failure
  const [user, setUser] = useState(null)
  const [review, setReview] = useState(null)
  const [fileName, setFileName] = useState('') // current CV, before it has been reviewed
  const [busyId, setBusyId] = useState(null) // suggestion being accepted / dismissed
  const [reloadKey, setReloadKey] = useState(0)

  const toSignIn = useCallback(() => navigate('/signin?role=jobseeker', { replace: true }), [navigate])

  // The review for the current CV → the matching phase. Returns true if the state could be loaded
  const refresh = useCallback(async () => {
    try {
      const data = await getReview()
      if (!alive.current) return false
      setReview(data.review)
      if (data.review) {
        setPhase('ready')
        return true
      }
      if (!data.canReview) {
        setPhase('unreadable')
        return true
      }
      // Not reviewed yet: show the CV's file name next to "Analyse my CV"
      const cv = await api('/cv').catch(() => null)
      if (!alive.current) return false
      setFileName(cv?.resume?.file_name || '')
      setPhase('ready-to-analyse')
      return true
    } catch (err) {
      if (!alive.current) return false
      if (err.status === 401) {
        toSignIn()
        return false
      }
      if (err.status === 404) {
        setReview(null)
        setPhase('no-cv')
        return true
      }
      setError(err.error)
      setPhase('error')
      return false
    }
  }, [toSignIn])

  useEffect(() => {
    alive.current = true
    if (!localStorage.getItem('token')) {
      toSignIn()
      return
    }

    async function load() {
      setPhase('loading')
      setError('')
      let me
      try {
        me = (await getMe()).user
      } catch (err) {
        if (!alive.current) return
        // The server answered with an error (expired / invalid token) → sign in again
        if (err.status) return toSignIn()
        setError(err.error)
        setPhase('error')
        return
      }
      if (!alive.current) return
      // The optimizer is for job seekers only (the backend allows only the "seeker" role)
      if (me.role !== 'seeker') {
        navigate(me.role === 'employer' ? '/company' : '/', { replace: true })
        return
      }
      setUser(me)
      await refresh()
    }
    load()

    return () => {
      alive.current = false
    }
  }, [navigate, toSignIn, refresh, reloadKey])

  // POST /api/cv/optimizer: can take a few minutes (the backend retries the AI)
  const analyse = useCallback(async () => {
    setAnalyseError('')
    setPhase('analysing')
    try {
      const data = await analyseCv()
      if (!alive.current) return
      setReview(data.review)
      setPhase('ready')
    } catch (err) {
      if (!alive.current) return
      if (err.status === 401) return toSignIn()
      if (err.status === 404) return setPhase('no-cv')
      if (err.status === 422) return setPhase('unreadable')
      setAnalyseError(err.error)
      setPhase('ready-to-analyse')
    }
  }, [toSignIn])

  // PATCH a suggestion. The backend answers with the suggestion and the new score; nothing is worked out here.
  // Only one update at a time: every card's buttons stay disabled while one is saving.
  // Returns an error message, or null
  const decide = useCallback(
    async (id, status) => {
      if (saving.current) return null
      saving.current = true
      setBusyId(id)
      try {
        const data = await setSuggestionStatus(id, status)
        if (!alive.current) return null
        setReview((current) => ({
          ...current,
          currentScore: data.currentScore,
          suggestions: current.suggestions.map((s) => (s.id === data.suggestion.id ? data.suggestion : s))
        }))
        return null
      } catch (err) {
        if (err.status === 401) toSignIn()
        return err.error
      } finally {
        saving.current = false
        if (alive.current) setBusyId(null)
      }
    },
    [toSignIn]
  )

  // Simulated payment. Returns an error message, or null
  const unlock = useCallback(async () => {
    try {
      const data = await unlockReport()
      if (alive.current) setReview(data.review)
      return null
    } catch (err) {
      if (err.status === 401) toSignIn()
      return err.error
    }
  }, [toSignIn])

  // POST /api/cv with a new file, then load the review state of the new current CV.
  // Succeeds only if both work. Returns { error } or { warning }
  const upload = useCallback(
    async (file) => {
      try {
        const data = await uploadCv(file)
        setAnalyseError('')
        if (!(await refresh())) {
          return { error: "Your CV was uploaded, but we couldn't load it. Please try again." }
        }
        return { warning: data.warning || '' }
      } catch (err) {
        if (err.status === 401) toSignIn()
        return { error: err.error }
      }
    },
    [refresh, toSignIn]
  )

  return {
    phase,
    error,
    analyseError,
    user,
    review,
    fileName,
    busyId,
    saving: busyId !== null, // any suggestion update in flight
    analyse,
    decide,
    unlock,
    upload,
    reload: () => setReloadKey((key) => key + 1)
  }
}
