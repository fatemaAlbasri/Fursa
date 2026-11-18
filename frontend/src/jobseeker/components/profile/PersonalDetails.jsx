import { useState } from 'react'
import { api } from '../../../shared/api.js'
import Notice from '../../../shared/components/Notice.jsx'
import PhoneInput from '../../../shared/components/PhoneInput.jsx'
import { MAJORS, STATUSES } from '../../../shared/utils/seekerOptions.js'
import { formatPhone, phoneDigits, withCurrent, announceUser } from '../../utils/profile.js'
import { Section, EditButton, InfoTile, Field, FormActions, errorText } from './ProfileParts.jsx'

const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v)

const toForm = (p) => ({
  firstName: p.first_name || '',
  lastName: p.last_name || '',
  email: p.email || '',
  phone: phoneDigits(p.phone),
  major: p.major || '',
  graduationStatus: p.graduation_status || ''
})

// Same rules as PUT /api/profile/seeker/details (ProfileController.updateSeekerDetails)
function validate(form) {
  const errs = {}
  const first = form.firstName.trim()
  const last = form.lastName.trim()
  if (!first) errs.firstName = 'Required'
  else if (first.length > 50) errs.firstName = 'Too long (max 50 characters)'
  if (!last) errs.lastName = 'Required'
  else if (last.length > 50) errs.lastName = 'Too long (max 50 characters)'
  if (!isEmail(form.email.trim())) errs.email = 'Enter a valid email'
  const phone = form.phone.replace(/\s/g, '')
  if (phone && !/^\d{8}$/.test(phone)) errs.phone = 'Enter 8 digits'
  if (!form.major.trim()) errs.major = 'Required'
  if (!form.graduationStatus.trim()) errs.graduationStatus = 'Required'
  return errs
}

// "Personal details": first / last name, email, phone, major, graduation status.
// PUT /api/profile/seeker/details. Years of experience isn't on this page, so the saved value is sent back unchanged.
export default function PersonalDetails({ profile, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(() => toForm(profile))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState(null)

  const startEdit = () => {
    setForm(toForm(profile))
    setErrors({})
    setNotice(null)
    setEditing(true)
  }

  const change = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: undefined })
  }

  const submit = async (e) => {
    e.preventDefault()
    setNotice(null)
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) return

    const phone = form.phone.replace(/\s/g, '')
    const saved = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: phone ? `+973${phone}` : null,
      major: form.major.trim(),
      graduation_status: form.graduationStatus.trim()
    }

    setSaving(true)
    try {
      await api('/profile/seeker/details', {
        method: 'PUT',
        body: {
          firstName: saved.first_name,
          lastName: saved.last_name,
          email: saved.email,
          phone,
          major: saved.major,
          graduationStatus: saved.graduation_status,
          yearsExperience: profile.years_experience // keep what is saved
        }
      })
      onSaved(saved)
      announceUser({ first_name: saved.first_name, last_name: saved.last_name, email: saved.email })
      setEditing(false)
      setNotice({ type: 'success', text: 'Personal details saved.' })
    } catch (err) {
      if (err.fields) setErrors(err.fields)
      setNotice({ type: 'error', text: errorText(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section
      title="Personal details"
      labelledBy="pf-details-title"
      action={!editing && <EditButton onClick={startEdit} label="Edit personal details" />}
    >
      <Notice notice={notice} onClose={() => setNotice(null)} />

      {editing ? (
        <form className="pf-form" onSubmit={submit} noValidate autoComplete="off">
          <div className="pf-grid">
            <Field id="pf-first" label="First name" error={errors.firstName}>
              <input id="pf-first" name="firstName" value={form.firstName} onChange={change} maxLength={50} />
            </Field>
            <Field id="pf-last" label="Last name" error={errors.lastName}>
              <input id="pf-last" name="lastName" value={form.lastName} onChange={change} maxLength={50} />
            </Field>
            <Field id="pf-email" label="Email" error={errors.email}>
              <input id="pf-email" name="email" type="email" value={form.email} onChange={change} />
            </Field>
            <Field id="pf-phone" label="Phone number" error={errors.phone}>
              <PhoneInput id="pf-phone" value={form.phone} onChange={change} />
            </Field>
            <Field id="pf-major" label="Major" error={errors.major}>
              <select id="pf-major" name="major" value={form.major} onChange={change}>
                {!form.major && <option value="">Choose your major</option>}
                {withCurrent(MAJORS, profile.major).map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field id="pf-grad" label="Graduation status" error={errors.graduationStatus}>
              <select id="pf-grad" name="graduationStatus" value={form.graduationStatus} onChange={change}>
                {!form.graduationStatus && <option value="">Choose your status</option>}
                {withCurrent(STATUSES, profile.graduation_status).map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          <FormActions onCancel={() => setEditing(false)} saving={saving} />
        </form>
      ) : (
        <div className="pf-grid">
          <InfoTile label="First name">{profile.first_name}</InfoTile>
          <InfoTile label="Last name">{profile.last_name}</InfoTile>
          <InfoTile label="Email">{profile.email}</InfoTile>
          <InfoTile label="Phone number">
            {profile.phone ? formatPhone(profile.phone) : <span className="pf-empty">Not added</span>}
          </InfoTile>
          <InfoTile label="Major">{profile.major}</InfoTile>
          <InfoTile label="Graduation status">{profile.graduation_status}</InfoTile>
        </div>
      )}
    </Section>
  )
}
