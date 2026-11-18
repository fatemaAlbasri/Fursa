import { useState } from 'react'
import Notice from '../../../shared/components/Notice.jsx'
import { FileIcon } from '../../../shared/components/icons.jsx'
import UploadButton from '../cvOptimizer/UploadButton.jsx'
import { uploadCv, downloadPdf } from '../../utils/cvOptimizerApi.js'
import { formatDay } from '../../utils/cvFormat.js'

// "My CV": current CV's name + upload date, Download and Replace CV (or Upload CV when there is none).
// Download: GET /api/cv/file (the seeker's own current CV, original file name).
// Replace: POST /api/cv — same rules and checks as the AI CV Optimizer (PDF / Word, max 5 MB).
export default function CvCard({ cv, onSaved }) {
  const [notice, setNotice] = useState(null)
  const [downloading, setDownloading] = useState(false)

  async function download() {
    setNotice(null)
    setDownloading(true)
    try {
      await downloadPdf('/cv/file', cv.file_name)
    } catch (err) {
      setNotice({ type: 'error', text: err.error || 'Could not download your CV' })
    } finally {
      setDownloading(false)
    }
  }

  // UploadButton shows the outcome: { error } | { warning } | {} (= success)
  async function upload(file) {
    try {
      const data = await uploadCv(file)
      onSaved(data.resume)
      return data.warning ? { warning: data.warning } : {}
    } catch (err) {
      return { error: err.error }
    }
  }

  return (
    <section className="card pf-card" aria-labelledby="pf-cv-title">
      <div className="pf-cv">
        <span className="pf-cv__icon" aria-hidden="true">
          <FileIcon />
        </span>
        <div className="pf-cv__info">
          <h2 id="pf-cv-title" className="pf-card__title">My CV</h2>
          <p className="pf-cv__meta">
            {cv ? `${cv.file_name} · uploaded ${formatDay(cv.uploaded_at)}` : 'No CV uploaded yet. Add one so employers can see it when you apply.'}
          </p>
        </div>
        <div className="pf-cv__actions">
          {cv && (
            <button type="button" className="btn btn--cancel" onClick={download} disabled={downloading}>
              {downloading ? 'Downloading…' : 'Download'}
            </button>
          )}
          <UploadButton onUpload={upload} onNotice={setNotice} className="btn btn--primary">
            {cv ? 'Replace CV' : 'Upload CV'}
          </UploadButton>
        </div>
      </div>
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </section>
  )
}
