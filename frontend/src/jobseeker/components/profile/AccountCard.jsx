import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LockIcon, TrashIcon } from '../../../shared/components/icons.jsx'
import { Section, ShieldIcon } from './ProfileParts.jsx'
import DeleteAccountDialog from './DeleteAccountDialog.jsx'

// "Account": Change password (the existing page) and Delete my account (a pop-up, wireframe 21).
// onLogout = "log out instead" in the pop-up (the page's own Log out confirmation).
export default function AccountCard({ email, onLogout }) {
  const [open, setOpen] = useState(false)

  return (
    <Section title="Account" sub="Password and account settings" icon={<ShieldIcon />} labelledBy="pf-account-title">
      <div className="pf-account">
        <Link to="/jobseeker/change-password" className="pf-outline">
          <LockIcon />
          Change password
        </Link>
        <button type="button" className="btn pf-danger" onClick={() => setOpen(true)}>
          <TrashIcon />
          Delete my account
        </button>
      </div>

      <DeleteAccountDialog
        open={open}
        who={email}
        alt={{
          text: 'Just need a break? You can',
          label: 'log out instead.',
          onClick: () => {
            setOpen(false)
            onLogout()
          }
        }}
        onClose={() => setOpen(false)}
      />
    </Section>
  )
}
