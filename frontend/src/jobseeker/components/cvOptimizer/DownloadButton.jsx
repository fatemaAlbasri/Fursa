import { useState } from 'react'
import { DownloadIcon } from '../../../shared/components/icons.jsx'
import { downloadPdf } from '../../utils/cvOptimizerApi.js'

// Downloads one of the optimizer PDFs with the sign-in token, and shows the backend's message if it fails
// (e.g. 422 for a CV that isn't in English)
export default function DownloadButton({ path, fileName, className, children }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function download() {
    setBusy(true)
    setError('')
    try {
      await downloadPdf(path, fileName)
    } catch (err) {
      setError(err.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cvo-download">
      <button type="button" className={className} onClick={download} disabled={busy}>
        <DownloadIcon />
        {busy ? 'Preparing PDF…' : children}
      </button>
      {error && (
        <p className="cvo-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
