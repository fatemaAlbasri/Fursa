import { useState } from 'react'
import { DownloadIcon } from '../../shared/components/icons.jsx'
import { downloadPdf as downloadFile } from '../../jobseeker/utils/cvOptimizerApi.js'

// "Export CSV" on the admin lists: downloads every row of the current tab + search.
// path = '/admin/jobs/export', query = list.exportQuery, name = 'jobs' (→ fursa-jobs-2026-11-27.csv)
export default function ExportButton({ path, query, name }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const download = async () => {
    setBusy(true)
    setError('')
    try {
      const d = new Date()
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      await downloadFile(`${path}?${query}`, `fursa-${name}-${date}.csv`)
    } catch (err) {
      setError(err.status ? 'Could not export the list.' : err.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-export">
      <button type="button" className="btn btn--outline" onClick={download} disabled={busy} aria-busy={busy}>
        <DownloadIcon />
        {busy ? 'Exporting…' : 'Export CSV'}
      </button>
      {error && (
        <p className="admin-export__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
