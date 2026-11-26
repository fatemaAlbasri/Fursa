import { useState } from 'react'
import Notice from '../../../shared/components/Notice.jsx'
import { DownloadIcon, FileIcon } from '../../../shared/components/icons.jsx'
import { Section } from './ProfileParts.jsx'
import UploadButton from '../cvOptimizer/UploadButton.jsx'
import { uploadCv, downloadPdf } from '../../utils/cvOptimizerApi.js'
import { formatDay } from '../../utils/cvFormat.js'

// PDF / DOC badge from the file name
const fileKind = (name = '') => (/\.docx?$/i.test(name) ? 'DOC' : 'PDF')

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
    <Section title="My CV" sub="Companies see this CV when you apply" icon={<FileIcon />} labelledBy="pf-cv-title">
      <div className="pf-tile pf-cv">
        {cv && (
          <span className={`pf-cv__badge pf-cv__badge--${fileKind(cv.file_name).toLowerCase()}`} aria-hidden="true">
            {fileKind(cv.file_name)}
          </span>
        )}
        <div className="pf-cv__info">
          {cv ? (
            <>
              <p className="pf-cv__name">{cv.file_name}</p>
              <p className="pf-cv__meta">Uploaded {formatDay(cv.uploaded_at)}</p>
            </>
          ) : (
            <p className="pf-cv__meta">No CV uploaded yet. Add one so employers can see it when you apply.</p>
          )}
        </div>
        <div className="pf-cv__actions">
          {cv && (
            <button type="button" className="pf-ghost" onClick={download} disabled={downloading}>
              <DownloadIcon />
              {downloading ? 'Downloading…' : 'Download'}
            </button>
          )}
          <UploadButton onUpload={upload} onNotice={setNotice} className="btn btn--primary pf-cv__upload">
            {cv ? 'Replace CV' : 'Upload CV'}
          </UploadButton>
        </div>
      </div>
      <Notice notice={notice} onClose={() => setNotice(null)} />
    </Section>
  )
}
