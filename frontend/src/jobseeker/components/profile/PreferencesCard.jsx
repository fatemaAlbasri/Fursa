import { useState } from 'react'
import { api } from '../../../shared/api.js'
import Notice from '../../../shared/components/Notice.jsx'
import ChoiceChips from '../../../shared/components/ChoiceChips.jsx'
import { JOB_TYPE_OPTIONS, WORK_MODE_OPTIONS } from '../../../shared/utils/seekerOptions.js'
import { formatJobType, formatWorkMode } from '../../../shared/utils/jobFormat.js'
import { Section, EditButton, InfoTile, FormActions, errorText } from './ProfileParts.jsx'

// Saved values as small pills, or "No preference" when the list is empty (= every option scores the same)
function PrefPills({ values, format }) {
  if (!values.length) return <span className="pf-empty">No preference</span>
  return (
    <span className="pf-prefs">
      {values.map((v) => (
        <span key={v} className="pf-pref">{format(v)}</span>
      ))}
    </span>
  )
}

// Keep the options' order (Full-time, Part-time, Internship…) whatever order they were clicked in
const ordered = (values, options) => options.map((o) => o.value).filter((v) => values.includes(v))

// "Job preferences (optional)": job types + work modes.
// PUT /api/profile/seeker/preferences only changes these two lists; nothing else on the profile.
export default function PreferencesCard({ jobTypes, workModes, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [draftTypes, setDraftTypes] = useState([])
  const [draftModes, setDraftModes] = useState([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const startEdit = () => {
    setDraftTypes(jobTypes)
    setDraftModes(workModes)
    setNotice(null)
    setEditing(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    setNotice(null)
    setSaving(true)
    try {
      const data = await api('/profile/seeker/preferences', {
        method: 'PUT',
        body: {
          jobTypes: ordered(draftTypes, JOB_TYPE_OPTIONS),
          workModes: ordered(draftModes, WORK_MODE_OPTIONS)
        }
      })
      onSaved({ job_types: data.job_types, work_modes: data.work_modes })
      setEditing(false)
      setNotice({ type: 'success', text: 'Job preferences saved.' })
    } catch (err) {
      setNotice({ type: 'error', text: errorText(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section
      title="Job preferences"
      optional
      labelledBy="pf-prefs-title"
      action={!editing && <EditButton onClick={startEdit} label="Edit job preferences" />}
    >
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {editing ? (
        <form className="pf-form" onSubmit={submit} noValidate>
          <ChoiceChips label="Job type" options={JOB_TYPE_OPTIONS} value={draftTypes} onChange={setDraftTypes} />
          <ChoiceChips label="Work mode" options={WORK_MODE_OPTIONS} value={draftModes} onChange={setDraftModes} />
          <p className="hint">Leave a group empty if you have no preference.</p>
          <FormActions onCancel={() => setEditing(false)} saving={saving} saveLabel="Save preferences" />
        </form>
      ) : (
        <div className="pf-grid">
          <InfoTile label="Job type">
            <PrefPills values={jobTypes} format={formatJobType} />
          </InfoTile>
          <InfoTile label="Work mode">
            <PrefPills values={workModes} format={formatWorkMode} />
          </InfoTile>
        </div>
      )}
    </Section>
  )
}
