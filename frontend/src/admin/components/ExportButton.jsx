import { useState } from 'react'
import { DownloadIcon } from '../../shared/components/icons.jsx'
import { downloadPdf as downloadFile } from '../../jobseeker/utils/cvOptimizerApi.js'

// "Export CSV (7)" on the admin lists: downloads every row of the current tab + search.
// path  = '/admin/jobs/export', query = list.exportQuery
// name  = 'jobs', filter = the tab's label when it isn't "All" (e.g. 'Active'), searched = a search is on
// count = rows in the file (data.total) → shown on the button so the admin sees a filter is on
// File: fursa-jobs-2026-11-27.csv, fursa-jobs-active-2026-11-27.csv, fursa-jobs-active-search-2026-11-27.csv

const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ExportButton({ path, query, name, filter, searched, count }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const fileName = ['fursa', name, filter && slug(filter), searched && 'search', today()].filter(Boolean).join('-') + '.csv'

  const download = async () => {
    setBusy(true)
    setError('')
    try {
      await downloadFile(`${path}?${query}`, fileName)
    } catch (err) {
      setError(err.status ? 'Could not export the list.' : err.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-export">
      <button
        type="button"
        className="btn btn--outline"
        onClick={download}
        disabled={busy || count === 0}
        aria-busy={busy}
        title={count === 0 ? 'Nothing to export' : `Download ${fileName}`}
      >
        <DownloadIcon />
        {busy ? 'Exporting…' : `Export CSV (${count})`}
      </button>
      {error && (
        <p className="admin-export__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
