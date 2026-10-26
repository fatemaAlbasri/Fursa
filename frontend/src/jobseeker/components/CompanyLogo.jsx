import { useState } from 'react'
import { companyInitial } from '../utils/jobFormat.js'

// Logos are saved as "/uploads/logo/..." on the backend server (not under /api)
const SERVER = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')

// Company logo image, or the first letter in a coloured box if there is none (or it fails to load).
// className = the page's own style: 'jfy-logo' (Jobs for you) or 'jd-logo' (Job details).
// The box colour comes from the company id, so a company keeps the same colour on every page:
// 0 = teal (the base style), 1 = purple, 2 = blue, 3 = navy  →  e.g. "jfy-logo jfy-logo--2"
export default function CompanyLogo({ job, className }) {
  const [broken, setBroken] = useState(false)

  if (job.company_logo && !broken) {
    return <img src={SERVER + job.company_logo} alt="" className={className} onError={() => setBroken(true)} />
  }

  const color = Number.isInteger(job.company_id) ? job.company_id % 4 : 0
  return <span className={`${className} ${className}--${color}`}>{companyInitial(job.company_name)}</span>
}
