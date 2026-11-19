import { useEffect, useState } from 'react'
import { api } from '../api.js'

// Used only if GET /api/skills fails (e.g. the server is down), so the dropdown is never empty
export const FALLBACK_SKILLS = [
  'JavaScript', 'React', 'Node.js', 'SQL', 'PostgreSQL', 'Python', 'Java', 'C#',
  'HTML', 'CSS', 'Git', 'Networking', 'Excel', 'Power BI', 'Data Analysis',
  'UI/UX Design', 'Communication', 'English', 'Arabic',
]

// Loaded once and shared by every skills dropdown on the page
let cache = null
let request = null

// The skills list from the backend (most used first)
export function useSkills() {
  const [skills, setSkills] = useState(cache || FALLBACK_SKILLS)

  useEffect(() => {
    if (cache) return
    if (!request) {
      request = api('/skills')
        .then((data) => (cache = data.skills))
        .catch(() => {
          request = null // try again next time
          return FALLBACK_SKILLS
        })
    }
    let active = true
    request.then((list) => active && setSkills(list))
    return () => { active = false }
  }, [])

  return skills
}
