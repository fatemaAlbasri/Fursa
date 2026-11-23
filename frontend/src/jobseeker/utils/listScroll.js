import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Keep the place in a job list: opening a job remembers how far down the list was,
// coming back (the page's "Back" link or the browser's back button) scrolls there again.
// Saved per list address, so All jobs with other filters starts at the top.

const key = (address) => `fursa:scroll:${address}`

// call when leaving a list for a job; `from` = the list's pathname + search
export function rememberScroll(from) {
  try {
    sessionStorage.setItem(key(from), String(window.scrollY))
  } catch {
    // storage blocked (private mode): the list just opens at the top
  }
}

// call in a list page; ready = the jobs are on the page (so it is tall enough to scroll)
export function useRestoreScroll(ready) {
  const location = useLocation()
  const navType = useNavigationType()
  const address = location.pathname + location.search
  const cameBack = navType === 'POP' || location.state?.restoreScroll

  useEffect(() => {
    if (!ready) return
    let y = null
    try {
      y = sessionStorage.getItem(key(address))
      sessionStorage.removeItem(key(address)) // only once
    } catch {
      return
    }
    if (y != null && cameBack) {
      requestAnimationFrame(() => window.scrollTo({ top: Number(y), behavior: 'instant' }))
    }
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps
}
