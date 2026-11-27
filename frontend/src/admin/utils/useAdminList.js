import { useEffect, useState } from 'react'
import { api } from '../../shared/api.js'

// Loads one page of an admin list.
// path = '/admin/seekers', tabKey = the query name for the tab ('tab', 'plan' or 'status')
export default function useAdminList(path, tabKey) {
  // ?tab=pending in the address opens that tab first (e.g. the Overview's "waiting for review" link)
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'all')
  const [search, setSearch] = useState('') // what the search box shows
  const [q, setQ] = useState('') // what we send, 300ms after typing stops
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0) // bumped after a change (e.g. approve) to load the page again

  // Don't call the API on every key, wait until the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    let ignore = false // a slower old request must not overwrite a newer one
    const params = new URLSearchParams({ [tabKey]: tab, page })
    if (q) params.set('q', q)

    api(`${path}?${params}`)
      .then((d) => {
        if (ignore) return
        setData(d)
        setError('')
      })
      .catch((err) => !ignore && setError(err.error || 'Could not load the list.'))
    return () => {
      ignore = true
    }
  }, [path, tabKey, tab, q, page, reloadKey])

  // A new tab starts from page 1
  const pickTab = (key) => {
    setTab(key)
    setPage(1)
  }

  // the same tab + search the list shows, without the page (for the CSV export)
  const exportQuery = new URLSearchParams({ [tabKey]: tab, ...(q && { q }) }).toString()

  const reload = () => setReloadKey((k) => k + 1)

  return { data, error, tab, pickTab, search, setSearch, page, setPage, exportQuery, searching: Boolean(q), reload }
}