import { useRef, useState } from 'react'
import { CV_ACCEPT, checkCvFile } from '../../utils/cvOptimizerApi.js'

// Opens the file picker and uploads the chosen CV (POST /api/cv), with the backend's rules checked first.
// onUpload(file) → { error } | { warning }; onNotice({ type, text }) shows the outcome on the page.
export default function UploadButton({ onUpload, onNotice, className, children }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)

  async function choose(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // so the same file can be chosen again
    if (!file) return
    const problem = checkCvFile(file)
    if (problem) {
      onNotice({ type: 'error', text: problem })
      return
    }
    setBusy(true)
    onNotice(null)
    const result = await onUpload(file)
    setBusy(false)
    if (result.error) onNotice({ type: 'error', text: result.error })
    else if (result.warning) onNotice({ type: 'error', text: result.warning })
    else onNotice({ type: 'success', text: `${file.name} uploaded. It is now your current CV.` })
  }

  return (
    <>
      <input ref={input} type="file" accept={CV_ACCEPT} hidden onChange={choose} />
      <button type="button" className={className} disabled={busy} onClick={() => input.current.click()}>
        {busy ? 'Uploading…' : children}
      </button>
    </>
  )
}
