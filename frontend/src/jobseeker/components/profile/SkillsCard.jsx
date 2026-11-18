import { useState } from 'react'
import { api } from '../../../shared/api.js'
import Notice from '../../../shared/components/Notice.jsx'
import MultiSelect from '../../../shared/components/MultiSelect.jsx'
import { Section, EditButton, FormActions, errorText } from './ProfileParts.jsx'

// "My skills": the saved skills as chips; "Edit skills" adds / removes them.
// PUT /api/profile/seeker/skills replaces the list and re-scores the seeker's job matches.
export default function SkillsCard({ skills, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const startEdit = () => {
    setDraft(skills.map((s) => s.name))
    setError('')
    setNotice(null)
    setEditing(true)
  }

  const change = (next) => {
    setDraft(next)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setNotice(null)
    if (draft.length === 0) return setError('Pick at least one skill')
    if (draft.length > 50) return setError('Too many skills (max 50)')

    setSaving(true)
    try {
      const data = await api('/profile/seeker/skills', { method: 'PUT', body: { skills: draft } })
      onSaved(data.skills)
      setEditing(false)
      setNotice({ type: 'success', text: 'Skills saved. Your job matches are being updated.' })
    } catch (err) {
      if (err.fields?.skills) setError(err.fields.skills)
      setNotice({ type: 'error', text: errorText(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section
      title="My skills"
      labelledBy="pf-skills-title"
      action={!editing && <EditButton onClick={startEdit}>Edit skills</EditButton>}
    >
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {editing ? (
        <form className="pf-form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="pf-skill">Your skills</label>
            <MultiSelect id="pf-skill" value={draft} onChange={change} placeholder="Search or type a skill ▾" />
            <p className="hint">Pick from the list or type your own and press Enter. Click × to remove a skill.</p>
            {error && <p className="field__error">{error}</p>}
          </div>
          <FormActions onCancel={() => setEditing(false)} saving={saving} saveLabel="Save skills" />
        </form>
      ) : skills.length > 0 ? (
        <ul className="pf-skills" aria-label="Your skills">
          {skills.map((s) => (
            <li key={s.id} className="pf-skill">{s.name}</li>
          ))}
        </ul>
      ) : (
        <p className="pf-empty">You haven't added any skills yet.</p>
      )}

      <p className="pf-note">Your job matches update when you change your skills.</p>
    </Section>
  )
}
